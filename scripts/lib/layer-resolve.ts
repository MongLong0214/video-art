import path from "node:path";
import sharp from "sharp";
import type { LayerCandidate, LayerRole } from "../../src/lib/scene-schema.js";

const ALPHA_THRESHOLD = 128;
const IOU_DEDUPE_THRESHOLD = 0.70;

// ---------- T5 constants ----------

const UNIQUE_COVERAGE_THRESHOLD = 0.02;
const DEFAULT_MAX_LAYERS = 8;
const MIN_RETAINED_LAYERS = 3;
const HOLE_WARNING_THRESHOLD = 0.5;
const EDGE_TOLERANCE_PX = 2;
const CENTRALITY_THRESHOLD = 0.25;
const BG_PLATE_MIN_BBOX_RATIO = 0.3;

/**
 * Role-critical roles are retained even when uniqueCoverage < 2%.
 * PRD §5.11: background-plate and subject are role-critical.
 */
const ROLE_CRITICAL: ReadonlySet<LayerRole> = new Set(["background-plate", "subject"]);

/**
 * Role priority ladder (highest priority first).
 * When capping layers, lowest priority roles are dropped first.
 * PRD §5.11.
 */
const ROLE_PRIORITY: Record<LayerRole, number> = {
  "background-plate": 6,
  "subject": 5,
  "foreground-occluder": 4,
  "background": 3,
  "midground": 2,
  "detail": 1,
};

/**
 * Z-order ladder: determines the front-to-back stacking order.
 * Lower value = further back. background-plate is always at 0.
 */
const ROLE_Z_ORDER: Record<LayerRole, number> = {
  "background-plate": 0,
  "background": 1,
  "midground": 2,
  "subject": 3,
  "detail": 4,
  "foreground-occluder": 5,
};

// ---------- mask loading ----------

/**
 * Load the binarized alpha mask from a candidate's filePath.
 * Returns a Uint8Array where 1 = opaque, 0 = transparent.
 */
async function loadBinaryMask(
  filePath: string,
  width: number,
  height: number,
): Promise<Uint8Array> {
  const { data } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const totalPixels = width * height;
  const mask = new Uint8Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    mask[i] = rgba[i * 4 + 3] > ALPHA_THRESHOLD ? 1 : 0;
  }

  return mask;
}

/**
 * Build exclusive masks for all candidates by accumulating a claimed_mask.
 * Shared by resolveExclusiveOwnership and computePairwiseOverlap.
 */
export async function buildExclusiveMasks(
  candidates: LayerCandidate[],
  width: number,
  height: number,
): Promise<{ exclusiveMasks: Uint8Array[]; exclusiveCounts: number[]; claimedMask: Uint8Array }> {
  const totalPixels = width * height;
  const claimedMask = new Uint8Array(totalPixels);
  const exclusiveMasks: Uint8Array[] = [];
  const exclusiveCounts: number[] = [];

  for (const candidate of candidates) {
    const binaryAlpha = await loadBinaryMask(candidate.filePath, width, height);
    const exclusiveMask = new Uint8Array(totalPixels);
    let count = 0;

    for (let i = 0; i < totalPixels; i++) {
      if (binaryAlpha[i] === 1 && claimedMask[i] === 0) {
        exclusiveMask[i] = 1;
        claimedMask[i] = 1;
        count++;
      }
    }

    exclusiveMasks.push(exclusiveMask);
    exclusiveCounts.push(count);
  }

  return { exclusiveMasks, exclusiveCounts, claimedMask };
}

// ---------- IoU computation ----------

/**
 * Compute Intersection over Union between two binary masks.
 * Single-pass over typed arrays for cache-friendly access.
 */
function computeIoU(maskA: Uint8Array, maskB: Uint8Array): number {
  const len = maskA.length;
  let intersection = 0;
  let union = 0;

  for (let i = 0; i < len; i++) {
    const a = maskA[i];
    const b = maskB[i];
    // Bitwise: intersection = a & b, union = a | b (both 0 or 1)
    intersection += a & b;
    union += a | b;
  }

  if (union === 0) return 0;
  return intersection / union;
}

// ---------- public API ----------

/**
 * Deduplicate candidates by pairwise IoU.
 * If IoU > 0.85, the candidate with lower coverage is dropped.
 *
 * Returns all candidates (both retained and dropped).
 * Dropped candidates have `droppedReason` populated.
 */
export async function deduplicateCandidates(
  candidates: LayerCandidate[],
): Promise<LayerCandidate[]> {
  if (candidates.length <= 1) return candidates;

  // Load all masks once
  const masks = await Promise.all(
    candidates.map((c) => loadBinaryMask(c.filePath, c.width, c.height)),
  );

  // Track which indices are dropped
  const dropped = new Set<number>();

  // Pairwise comparison (skip depth-split siblings sharing the same parentId)
  for (let i = 0; i < candidates.length; i++) {
    if (dropped.has(i)) continue;
    for (let j = i + 1; j < candidates.length; j++) {
      if (dropped.has(j)) continue;

      // Depth-split siblings: exempt from IoU dedup
      const pi = candidates[i].parentId;
      const pj = candidates[j].parentId;
      if (pi && pj && pi === pj) continue;

      const iou = computeIoU(masks[i], masks[j]);
      if (iou > IOU_DEDUPE_THRESHOLD) {
        // Drop the one with lower coverage
        const dropIdx = candidates[i].coverage >= candidates[j].coverage ? j : i;
        dropped.add(dropIdx);
      }
    }
  }

  // Build result: attach droppedReason to dropped candidates
  return candidates.map((c, idx) => {
    if (dropped.has(idx)) {
      return { ...c, droppedReason: `dedupe: IoU > ${IOU_DEDUPE_THRESHOLD}` };
    }
    return c;
  });
}

/**
 * Resolve exclusive pixel ownership among candidates (input order).
 *
 * Algorithm (PRD section 5.9 -- binarized):
 *   binary_alpha = candidate_alpha > 128 ? 1 : 0
 *   exclusive_mask = binary_alpha AND NOT claimed_mask
 *   claimed_mask = claimed_mask OR binary_alpha
 *   uniqueCoverage = count(exclusive_mask) / totalPixels
 *
 * T5 will re-run this with role-adjusted ordering.
 */
export async function resolveExclusiveOwnership(
  candidates: LayerCandidate[],
  width: number,
  height: number,
): Promise<LayerCandidate[]> {
  const totalPixels = width * height;
  const { exclusiveCounts } = await buildExclusiveMasks(candidates, width, height);

  return candidates.map((c, idx) => ({
    ...c,
    uniqueCoverage: exclusiveCounts[idx] / totalPixels,
  }));
}

/**
 * Compute pairwise overlap ratio between resolved candidates.
 *
 * After exclusive ownership, overlaps should be near zero.
 * The overlap ratio for a pair (i, j) is:
 *   intersection(exclusive_i, exclusive_j) / min(count_i, count_j)
 *
 * Returns array of { idA, idB, overlap } for each pair.
 */
export async function computePairwiseOverlap(
  candidates: LayerCandidate[],
  width: number,
  height: number,
): Promise<{ idA: string; idB: string; overlap: number }[]> {
  const totalPixels = width * height;
  const { exclusiveMasks, exclusiveCounts } = await buildExclusiveMasks(
    candidates,
    width,
    height,
  );

  const overlaps: { idA: string; idB: string; overlap: number }[] = [];

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      // Single pass: count intersection using bitwise AND on typed arrays
      let intersection = 0;
      for (let p = 0; p < totalPixels; p++) {
        intersection += exclusiveMasks[i][p] & exclusiveMasks[j][p];
      }

      const minCount = Math.min(exclusiveCounts[i], exclusiveCounts[j]);
      const overlap = minCount === 0 ? 0 : intersection / minCount;

      overlaps.push({
        idA: candidates[i].id,
        idB: candidates[j].id,
        overlap,
      });
    }
  }

  return overlaps;
}

// ==========================================================================
// T5: Role Assignment + Background Plate + Final Drop/Cap
// ==========================================================================

// ---------- role assignment heuristics ----------

/**
 * Check if a bbox touches any image edge.
 * "Touching" means within 2px of the border (tolerance for slight offsets).
 */
function touchesEdge(
  bbox: { x: number; y: number; w: number; h: number },
  imageWidth: number,
  imageHeight: number,
): boolean {
  const touchLeft = bbox.x <= EDGE_TOLERANCE_PX;
  const touchTop = bbox.y <= EDGE_TOLERANCE_PX;
  const touchRight = bbox.x + bbox.w >= imageWidth - EDGE_TOLERANCE_PX;
  const touchBottom = bbox.y + bbox.h >= imageHeight - EDGE_TOLERANCE_PX;
  return touchLeft || touchTop || touchRight || touchBottom;
}

/**
 * Check if a centroid is near the center of the image.
 * "Near center" = within 25% of the image dimensions from the center point.
 */
function isCentral(
  centroid: { x: number; y: number },
  imageWidth: number,
  imageHeight: number,
): boolean {
  const cx = imageWidth / 2;
  const cy = imageHeight / 2;
  const dx = Math.abs(centroid.x - cx) / imageWidth;
  const dy = Math.abs(centroid.y - cy) / imageHeight;
  return dx <= CENTRALITY_THRESHOLD && dy <= CENTRALITY_THRESHOLD;
}

/**
 * Compute bbox area as fraction of image area.
 */
function bboxCoverageRatio(
  bbox: { x: number; y: number; w: number; h: number },
  imageWidth: number,
  imageHeight: number,
): number {
  return (bbox.w * bbox.h) / (imageWidth * imageHeight);
}

/**
 * Assign roles to candidates based on bbox/centroid/coverage heuristics.
 * PRD §5.11.
 *
 * Heuristic order:
 * 1. Widest coverage candidate = background-plate
 * 2. Edge-touching, not-bg-plate = foreground-occluder (if small-medium coverage)
 * 3. Central bbox, not-bg-plate = subject
 * 4. Second-widest (after bg-plate) = background
 * 5. Small isolated = detail
 * 6. Everything else = midground
 */
export function assignRoles(
  candidates: LayerCandidate[],
  imageWidth: number,
  imageHeight: number,
): LayerCandidate[] {
  if (candidates.length === 0) return [];

  // Sort by coverage descending to identify the widest candidate
  const sorted = [...candidates].sort((a, b) => b.coverage - a.coverage);

  const assigned = new Map<string, LayerRole>();

  // Step 1: background-plate = widest candidate with large bbox coverage
  const bgPlateCandidate = sorted[0];
  if (bgPlateCandidate && bboxCoverageRatio(bgPlateCandidate.bbox, imageWidth, imageHeight) >= BG_PLATE_MIN_BBOX_RATIO) {
    assigned.set(bgPlateCandidate.id, "background-plate");
  }

  // Step 2: Assign remaining candidates
  for (const candidate of sorted) {
    if (assigned.has(candidate.id)) continue;

    const bboxRatio = bboxCoverageRatio(candidate.bbox, imageWidth, imageHeight);
    const isEdgeTouching = touchesEdge(candidate.bbox, imageWidth, imageHeight);
    const isCentralBbox = isCentral(candidate.centroid, imageWidth, imageHeight);

    // foreground-occluder: edge-touching + not the bg-plate + moderate coverage
    if (isEdgeTouching && candidate.coverage < 0.5) {
      if (!isCentralBbox || candidate.coverage < 0.2) {
        assigned.set(candidate.id, "foreground-occluder");
        continue;
      }
    }

    // subject: central bbox, medium coverage
    if (isCentralBbox && bboxRatio < 0.5) {
      assigned.set(candidate.id, "subject");
      continue;
    }

    // background: second-widest with large bbox
    if (bboxRatio >= 0.2 && candidate.coverage >= 0.15) {
      assigned.set(candidate.id, "background");
      continue;
    }

    // detail: small isolated elements
    if (candidate.coverage < 0.05) {
      assigned.set(candidate.id, "detail");
      continue;
    }

    // midground: everything else
    assigned.set(candidate.id, "midground");
  }

  return candidates.map((c) => ({
    ...c,
    role: assigned.get(c.id) ?? "midground",
  }));
}

/**
 * Order candidates by role-based z-order ladder.
 * PRD §5.11: background-plate at z=0, foreground-occluder at z=max.
 *
 * Within the same role tier, order by coverage descending (larger behind smaller).
 */
export function orderByRole(candidates: LayerCandidate[]): LayerCandidate[] {
  return [...candidates].sort((a, b) => {
    const roleA = a.role ?? "midground";
    const roleB = b.role ?? "midground";
    const zDiff = ROLE_Z_ORDER[roleA] - ROLE_Z_ORDER[roleB];
    if (zDiff !== 0) return zDiff;
    // Within same role: coverage tie-break first
    const covDiff = b.coverage - a.coverage;
    if (Math.abs(covDiff) > 1e-6) return covDiff;
    // Depth tie-breaker: lower meanDepth (farther) placed behind (lower z-index)
    const depthA = a.meanDepth ?? 128;
    const depthB = b.meanDepth ?? 128;
    return depthA - depthB;
  });
}

/**
 * Apply retention rules: drop low uniqueCoverage + cap at maxLayers.
 * PRD §5.9, §5.11.
 *
 * 1. Drop candidates with uniqueCoverage below threshold (unless role-critical)
 * 2. Progressive relaxation: if retained < MIN_RETAINED_LAYERS, lower threshold
 * 3. If count > maxLayers, drop lowest-priority roles first
 * 4. Guarantee bg-plate: synthesize from original if none exists
 *
 * Returns all candidates with droppedReason populated for dropped ones.
 */
export function applyRetentionRules(
  candidates: LayerCandidate[],
  maxLayers: number = DEFAULT_MAX_LAYERS,
  originalImagePath?: string,
): LayerCandidate[] {
  // Progressive threshold relaxation to guarantee minimum retained layers
  const thresholds = [UNIQUE_COVERAGE_THRESHOLD, 0.01, 0.005, 0.001, 0];

  let result: LayerCandidate[] = [];
  let retained: LayerCandidate[] = [];
  let usedThreshold = UNIQUE_COVERAGE_THRESHOLD;

  for (const threshold of thresholds) {
    result = [];
    retained = [];
    usedThreshold = threshold;

    for (const c of candidates) {
      const uc = c.uniqueCoverage ?? 0;
      const role = c.role ?? "midground";
      const isRoleCritical = ROLE_CRITICAL.has(role);

      if (uc < threshold && !isRoleCritical) {
        const pct = (threshold * 100).toFixed(1);
        result.push({ ...c, droppedReason: `uniqueCoverage ${(uc * 100).toFixed(1)}% < ${pct}%` });
      } else {
        result.push(c);
        retained.push(c);
      }
    }

    if (retained.length >= MIN_RETAINED_LAYERS) break;
  }

  if (usedThreshold < UNIQUE_COVERAGE_THRESHOLD && retained.length > 1) {
    console.log(`  Retention relaxed: threshold ${(usedThreshold * 100).toFixed(1)}% → ${retained.length} layers retained`);
  }

  // Step 2: Cap at maxLayers by dropping lowest-priority roles first
  if (retained.length > maxLayers) {
    const sortedByPriority = [...retained].sort((a, b) => {
      const pa = ROLE_PRIORITY[a.role ?? "midground"];
      const pb = ROLE_PRIORITY[b.role ?? "midground"];
      if (pa !== pb) return pa - pb;
      return (a.uniqueCoverage ?? 0) - (b.uniqueCoverage ?? 0);
    });

    const toDrop = retained.length - maxLayers;
    const dropIds = new Set(sortedByPriority.slice(0, toDrop).map((c) => c.id));

    for (let i = 0; i < result.length; i++) {
      if (dropIds.has(result[i].id) && !result[i].droppedReason) {
        result[i] = { ...result[i], droppedReason: `cap: exceeded ${maxLayers} layers` };
      }
    }
  }

  // Step 3: Guarantee bg-plate exists
  const finalRetained = result.filter((c) => !c.droppedReason);
  const hasBgPlate = finalRetained.some((c) => c.role === "background-plate");

  if (!hasBgPlate && originalImagePath) {
    const fallbackPlate: LayerCandidate = {
      id: "fallback-bg-plate",
      source: "qwen-base",
      filePath: originalImagePath,
      width: candidates[0]?.width ?? 0,
      height: candidates[0]?.height ?? 0,
      coverage: 1.0,
      uniqueCoverage: 1.0,
      bbox: { x: 0, y: 0, w: candidates[0]?.width ?? 0, h: candidates[0]?.height ?? 0 },
      centroid: {
        x: (candidates[0]?.width ?? 0) / 2,
        y: (candidates[0]?.height ?? 0) / 2,
      },
      edgeDensity: 0,
      componentCount: 1,
      role: "background-plate",
    };
    result.push(fallbackPlate);
  }

  return result;
}

/**
 * Fill unclaimed pixels in the background plate from the original image.
 * PRD §5.10 Tier A.
 *
 * - claimedMask: binary mask of all pixels claimed by any layer
 * - Unclaimed pixels are extracted from the original image
 * - Returns updated candidate with new filePath + warning flag if hole > 50%
 */
export async function fillBackgroundPlate(
  bgCandidate: LayerCandidate,
  originalImagePath: string,
  claimedMask: Uint8Array,
  width: number,
  height: number,
  outputDir: string,
): Promise<LayerCandidate & { warning?: boolean }> {
  const totalPixels = width * height;

  // Count unclaimed pixels
  let unclaimedCount = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (claimedMask[i] === 0) unclaimedCount++;
  }

  const holeRatio = unclaimedCount / totalPixels;
  const warning = holeRatio > HOLE_WARNING_THRESHOLD;

  // Load the bg candidate and original image as raw RGBA
  const bgRaw = await sharp(bgCandidate.filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bgRgba = new Uint8Array(bgRaw.data.buffer, bgRaw.data.byteOffset, bgRaw.data.byteLength);

  const origRaw = await sharp(originalImagePath)
    .resize(width, height)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const origRgba = new Uint8Array(origRaw.data.buffer, origRaw.data.byteOffset, origRaw.data.byteLength);

  // Composite: bg plate pixels + unclaimed pixels from original
  const outputRgba = new Uint8Array(totalPixels * 4);

  for (let i = 0; i < totalPixels; i++) {
    const px = i * 4;
    const bgAlpha = bgRgba[px + 3];

    if (bgAlpha > ALPHA_THRESHOLD) {
      // Keep bg plate pixel
      outputRgba[px] = bgRgba[px];
      outputRgba[px + 1] = bgRgba[px + 1];
      outputRgba[px + 2] = bgRgba[px + 2];
      outputRgba[px + 3] = bgRgba[px + 3];
    } else if (claimedMask[i] === 0) {
      // Fill from original image (unclaimed pixel)
      outputRgba[px] = origRgba[px];
      outputRgba[px + 1] = origRgba[px + 1];
      outputRgba[px + 2] = origRgba[px + 2];
      outputRgba[px + 3] = origRgba[px + 3];
    }
    // else: claimed by another layer, leave transparent
  }

  // Write filled plate
  const filledPath = path.join(outputDir, "bg-plate-filled.png");
  await sharp(Buffer.from(outputRgba.buffer), { raw: { width, height, channels: 4 } })
    .png()
    .toFile(filledPath);

  return {
    ...bgCandidate,
    filePath: filledPath,
    coverage: 1.0, // filled plate now covers the full image (unclaimed + bg)
    warning,
  };
}
