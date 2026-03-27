/**
 * T10: Variant B depth utilities
 *
 * Depth statistics computation and selective depth split for ZoeDepth-augmented pipeline.
 * Separated from image-decompose.ts to avoid T9 conflicts.
 */
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import type { LayerCandidate } from "../../src/lib/scene-schema.js";
import type { ResearchConfig } from "../research/research-config.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Normalized depthStd threshold: only split candidates above this value */
export const DEPTH_SPLIT_THRESHOLD = 0.15;

/** Variant B API budget */
export const VARIANT_B_API_BUDGET = {
  qwen: 1,
  zoedepth: 1,
  recursiveMax: 2,
  total: 4,
} as const;

/** Alpha threshold for mask binarization (unified: same as candidate-extraction + layer-resolve) */
const ALPHA_THRESHOLD = 128;

// ---------------------------------------------------------------------------
// Depth Stats
// ---------------------------------------------------------------------------

export interface DepthStats {
  meanDepth: number;
  depthStd: number;
}

/**
 * Computes meanDepth and depthStd for a candidate using its alpha mask
 * and the provided depth map.
 *
 * - Depth map is a grayscale PNG (0=far, 255=near).
 * - Candidate filePath is an RGBA PNG; alpha channel is used as the mask.
 * - meanDepth is the raw mean of depth values within the mask (0-255 scale).
 * - depthStd is the standard deviation normalized by 255 (0-1 scale).
 */
export async function computeDepthStats(
  candidate: LayerCandidate,
  depthMapPath: string,
): Promise<DepthStats> {
  const { width, height } = candidate;

  // Load depth map resized to candidate dimensions, grayscale
  const depthRaw = await sharp(depthMapPath)
    .resize(width, height)
    .grayscale()
    .raw()
    .toBuffer();

  // Load candidate alpha mask
  const maskRaw = await sharp(candidate.filePath)
    .resize(width, height)
    .ensureAlpha()
    .raw()
    .toBuffer();

  const totalPixels = width * height;
  let sum = 0;
  let count = 0;

  // Pass 1: compute mean
  for (let i = 0; i < totalPixels; i++) {
    const alpha = maskRaw[i * 4 + 3];
    if (alpha > ALPHA_THRESHOLD) {
      sum += depthRaw[i];
      count++;
    }
  }

  if (count === 0) {
    return { meanDepth: 0, depthStd: 0 };
  }

  const meanDepth = sum / count;

  // Pass 2: compute variance
  let varianceSum = 0;
  for (let i = 0; i < totalPixels; i++) {
    const alpha = maskRaw[i * 4 + 3];
    if (alpha > ALPHA_THRESHOLD) {
      const diff = depthRaw[i] - meanDepth;
      varianceSum += diff * diff;
    }
  }

  const std = Math.sqrt(varianceSum / count);
  const depthStd = std / 255; // normalize to 0-1

  return { meanDepth, depthStd };
}

// ---------------------------------------------------------------------------
// Selective Depth Split
// ---------------------------------------------------------------------------

/**
 * Conditionally splits a candidate by depth zones if its depthStd exceeds the threshold.
 *
 * - If depthStd <= DEPTH_SPLIT_THRESHOLD, returns [candidate] unchanged.
 * - If depthStd > DEPTH_SPLIT_THRESHOLD, splits into 2 sub-candidates using
 *   median depth as the split point.
 * - Sub-candidates have source="depth-split" and parentId=candidate.id.
 */
export async function selectiveDepthSplit(
  candidate: LayerCandidate,
  depthMapPath: string,
  outputDir: string,
  config?: Partial<ResearchConfig>,
): Promise<LayerCandidate[]> {
  const threshold = config?.depthSplitThreshold ?? DEPTH_SPLIT_THRESHOLD;
  const depthStd = candidate.depthStd ?? 0;

  if (depthStd <= threshold) {
    return [candidate];
  }

  const { width, height } = candidate;
  const totalPixels = width * height;

  // Load depth map
  const depthRaw = await sharp(depthMapPath)
    .resize(width, height)
    .grayscale()
    .raw()
    .toBuffer();

  // Load candidate RGBA
  const candidateRaw = await sharp(candidate.filePath)
    .resize(width, height)
    .ensureAlpha()
    .raw()
    .toBuffer();

  // Collect depth values within the mask to find median
  const maskedDepths: number[] = [];
  for (let i = 0; i < totalPixels; i++) {
    if (candidateRaw[i * 4 + 3] > ALPHA_THRESHOLD) {
      maskedDepths.push(depthRaw[i]);
    }
  }

  if (maskedDepths.length === 0) {
    return [candidate];
  }

  maskedDepths.sort((a, b) => a - b);
  const medianDepth = maskedDepths[Math.floor(maskedDepths.length / 2)];

  // Split into two zones: foreground (>= median) and background (< median)
  const fgBuf = Buffer.alloc(totalPixels * 4);
  const bgBuf = Buffer.alloc(totalPixels * 4);
  let fgCount = 0;
  let bgCount = 0;

  for (let i = 0; i < totalPixels; i++) {
    const alpha = candidateRaw[i * 4 + 3];
    if (alpha <= ALPHA_THRESHOLD) continue;

    const off = i * 4;
    if (depthRaw[i] >= medianDepth) {
      fgBuf[off] = candidateRaw[off];
      fgBuf[off + 1] = candidateRaw[off + 1];
      fgBuf[off + 2] = candidateRaw[off + 2];
      fgBuf[off + 3] = alpha;
      fgCount++;
    } else {
      bgBuf[off] = candidateRaw[off];
      bgBuf[off + 1] = candidateRaw[off + 1];
      bgBuf[off + 2] = candidateRaw[off + 2];
      bgBuf[off + 3] = alpha;
      bgCount++;
    }
  }

  const subCandidates: LayerCandidate[] = [];

  // Background zone (far, lower depth values)
  if (bgCount > 0) {
    const bgPath = path.join(outputDir, `depth-split-bg-${candidate.id.slice(0, 8)}.png`);
    await sharp(bgBuf, { raw: { width, height, channels: 4 } }).png().toFile(bgPath);

    subCandidates.push({
      id: crypto.randomUUID(),
      source: "depth-split",
      filePath: bgPath,
      width,
      height,
      coverage: bgCount / totalPixels,
      bbox: candidate.bbox,
      centroid: candidate.centroid,
      edgeDensity: candidate.edgeDensity,
      componentCount: 1,
      parentId: candidate.id,
    });
  }

  // Foreground zone (near, higher depth values)
  if (fgCount > 0) {
    const fgPath = path.join(outputDir, `depth-split-fg-${candidate.id.slice(0, 8)}.png`);
    await sharp(fgBuf, { raw: { width, height, channels: 4 } }).png().toFile(fgPath);

    subCandidates.push({
      id: crypto.randomUUID(),
      source: "depth-split",
      filePath: fgPath,
      width,
      height,
      coverage: fgCount / totalPixels,
      bbox: candidate.bbox,
      centroid: candidate.centroid,
      edgeDensity: candidate.edgeDensity,
      componentCount: 1,
      parentId: candidate.id,
    });
  }

  return subCandidates.length > 0 ? subCandidates : [candidate];
}

// ---------------------------------------------------------------------------
// Archive Structure
// ---------------------------------------------------------------------------

/**
 * Returns the expected archive file list for a variant.
 * Both variants produce the same structure -- this enforces the contract.
 */
export function getVariantArchiveFiles(
  _variant: "qwen-only" | "qwen-zoedepth",
): string[] {
  return [
    "scene.json",
    "manifest.json",
    "layers/",
  ];
}

// ---------------------------------------------------------------------------
// Variant B runner (with injectable dependencies for testing)
// ---------------------------------------------------------------------------

export interface VariantBDeps {
  getDepthMap: (imagePath: string) => Promise<Buffer>;
  getQwenLayers: (imagePath: string) => Promise<Buffer[]>;
}

export interface VariantBResult {
  files: string[];
  coverages: number[];
  method: string;
}

/**
 * Runs the Variant B pipeline: Qwen semantic + ZoeDepth depth.
 * Falls back to qwen-only if ZoeDepth fails.
 */
export async function runVariantB(
  imagePath: string,
  outputDir: string,
  deps: VariantBDeps,
): Promise<VariantBResult> {
  fs.mkdirSync(outputDir, { recursive: true });

  // Step 1: Qwen semantic layers
  const qwenBuffers = await deps.getQwenLayers(imagePath);

  // Step 2: ZoeDepth (with fallback)
  let depthBuf: Buffer | null = null;
  try {
    depthBuf = await deps.getDepthMap(imagePath);
  } catch {
    console.warn("[variant-b] ZoeDepth failed, falling back to qwen-only");
  }

  const files: string[] = [];
  const coverages: number[] = [];

  for (let q = 0; q < qwenBuffers.length; q++) {
    const { data, info } = await sharp(qwenBuffers[q])
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let opaque = 0;
    for (let i = 3; i < data.length; i += info.channels) {
      if (data[i] > ALPHA_THRESHOLD) opaque++;
    }
    const coverage = opaque / (info.width * info.height);

    if (coverage < 0.001) continue;

    const fp = path.join(outputDir, `layer-${q}.png`);
    await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    }).png().toFile(fp);

    files.push(fp);
    coverages.push(coverage);
  }

  return {
    files,
    coverages,
    method: depthBuf ? "qwen-zoedepth" : "qwen-only-fallback",
  };
}
