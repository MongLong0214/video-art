import Replicate from "replicate";
import sharp from "sharp";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { extractCandidates } from "./candidate-extraction.js";
import { withRetry, validateReplicateUrl, maskToken, getToken } from "./replicate-utils.js";
import type { LayerCandidate } from "../../src/lib/scene-schema.js";
import type { ResearchConfig } from "../research/research-config.js";

export const SAM2_MODEL = "lucataco/segment-anything-2";
export const SAM2_VERSION = "be7cbde9fdf0eecdc8b20ffec9dd0d1cfeace0832d4d0b58a071d993182e1be0";

interface DecomposeOptions {
  maxLayers?: number;
  alphaThreshold?: number;
  minCoverage?: number;
  pointsPerSide?: number;
  predIouThresh?: number;
  stabilityScoreThresh?: number;
  luminanceFallbackEnabled?: boolean;
  luminanceFallbackMinSamLayers?: number;
  luminanceFallbackZoneCount?: number;
  luminanceFallbackResidualOnly?: boolean;
  luminanceFallbackResidualCoverageMin?: number;
}

interface FileSourceMeta {
  source: "sam2-segment" | "luminance-split";
  groupId?: string;
}

interface DecomposeResult {
  files: string[];
  coverages: number[];
  method: string;
  fileMeta: FileSourceMeta[];
}

interface ResidualMaskResult {
  residualMask: Uint8Array;
  residualCoverage: number;
}

// --- SAM 2 Automatic Mask Generation ---
async function getSam2Masks(
  replicate: Replicate,
  imagePath: string,
  options: {
    maskLimit?: number;
    pointsPerSide?: number;
    predIouThresh?: number;
    stabilityScoreThresh?: number;
  } = {},
): Promise<Buffer[]> {
  const {
    maskLimit = 12,
    pointsPerSide = 64,
    predIouThresh = 0.7,
    stabilityScoreThresh = 0.92,
  } = options;

  const imageData = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase().replace(".", "");
  const mime =
    { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" }[ext] ||
    "image/png";
  const dataUri = `data:${mime};base64,${imageData.toString("base64")}`;

  console.log(`  Running SAM 2 (mask_limit=${maskLimit}, points_per_side=${pointsPerSide})...`);
  return withRetry(async () => {
    const output = (await replicate.run(
      `${SAM2_MODEL}:${SAM2_VERSION}`,
      {
        input: {
          image: dataUri,
          mask_limit: maskLimit,
          points_per_side: pointsPerSide,
          pred_iou_thresh: predIouThresh,
          stability_score_thresh: stabilityScoreThresh,
          multimask_output: false,
        },
      },
    )) as unknown[];

    const buffers: Buffer[] = [];
    for (const item of output) {
      let url: string;
      if (typeof item === "string") url = item;
      else if (item && typeof item === "object" && "url" in item) {
        const urlVal = (item as Record<string, unknown>).url;
        url = typeof urlVal === "function" ? (urlVal as () => string)() : String(urlVal);
      } else {
        url = String(item);
      }
      validateReplicateUrl(url);
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error(`Failed to fetch SAM 2 mask: HTTP ${resp.status} ${resp.statusText}`);
      }
      buffers.push(Buffer.from(await resp.arrayBuffer()));
    }
    return buffers;
  });
}

// --- Apply binary mask to original image → RGBA layer ---
async function applyMaskToImage(
  originalImage: Buffer,
  maskBuffer: Buffer,
  width: number,
  height: number,
  alphaThreshold: number = 128,
): Promise<{ pixels: Buffer; coverage: number; width: number; height: number; binaryMask: Uint8Array }> {
  // Resize mask to match original dimensions
  const maskGray = await sharp(maskBuffer)
    .resize(width, height)
    .grayscale()
    .raw()
    .toBuffer();

  const origRaw = await sharp(originalImage)
    .resize(width, height)
    .ensureAlpha()
    .raw()
    .toBuffer();

  const total = width * height;
  const layerBuf = Buffer.alloc(total * 4);
  const binaryMask = new Uint8Array(total);
  let opaqueCount = 0;

  for (let i = 0; i < total; i++) {
    // SAM masks: white (255) = object, black (0) = background
    if (maskGray[i] > alphaThreshold) {
      binaryMask[i] = 1;
      const si = i * 4;
      layerBuf[si] = origRaw[si];
      layerBuf[si + 1] = origRaw[si + 1];
      layerBuf[si + 2] = origRaw[si + 2];
      layerBuf[si + 3] = 255;
      opaqueCount++;
    }
  }

  return { pixels: layerBuf, coverage: opaqueCount / total, width, height, binaryMask };
}

export function buildResidualMask(
  masks: Uint8Array[],
  width: number,
  height: number,
): ResidualMaskResult {
  const total = width * height;
  const claimed = new Uint8Array(total);

  for (const mask of masks) {
    for (let i = 0; i < total; i++) {
      if (mask[i] === 1) {
        claimed[i] = 1;
      }
    }
  }

  const residualMask = new Uint8Array(total);
  let residualCount = 0;
  for (let i = 0; i < total; i++) {
    if (claimed[i] === 0) {
      residualMask[i] = 1;
      residualCount++;
    }
  }

  return {
    residualMask,
    residualCoverage: total === 0 ? 0 : residualCount / total,
  };
}

export function shouldRunLuminanceFallback(
  samLayerCount: number,
  residualCoverage: number,
  options: {
    enabled?: boolean;
    minSamLayers?: number;
    residualCoverageMin?: number;
  } = {},
): boolean {
  const enabled = options.enabled ?? true;
  const minSamLayers = options.minSamLayers ?? 3;
  const residualCoverageMin = options.residualCoverageMin ?? 0;

  if (!enabled) return false;
  if (samLayerCount >= minSamLayers) return false;
  return residualCoverage >= residualCoverageMin;
}

// --- Luminance-based splitting (for unclaimed regions) ---
async function splitByLuminanceZones(
  originalImage: Buffer,
  numZones: number,
  inclusionMask?: Uint8Array,
): Promise<{ pixels: Buffer; coverage: number; width: number; height: number }[]> {
  const origInfo = await sharp(originalImage).ensureAlpha().metadata();
  const width = origInfo.width!;
  const height = origInfo.height!;
  const total = width * height;

  const origRaw = await sharp(originalImage)
    .resize(width, height)
    .ensureAlpha()
    .raw()
    .toBuffer();

  const luminanceValues: number[] = [];
  const luminanceMap = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const offset = i * 4;
    const lum = origRaw[offset] * 0.299 + origRaw[offset + 1] * 0.587 + origRaw[offset + 2] * 0.114;
    luminanceMap[i] = lum;
    const inMask = !inclusionMask || inclusionMask[i] === 1;
    if (inMask) luminanceValues.push(lum);
  }
  luminanceValues.sort((a, b) => a - b);

  const thresholds: number[] = [];
  for (let t = 1; t < numZones; t++) {
    thresholds.push(luminanceValues[Math.floor(luminanceValues.length * t / numZones)] ?? 255);
  }

  const zones: { pixels: Buffer; coverage: number; width: number; height: number }[] = [];
  for (let z = 0; z < numZones; z++) {
    const layerBuf = Buffer.alloc(width * height * 4);
    let count = 0;
    for (let i = 0; i < total; i++) {
      const inMask = !inclusionMask || inclusionMask[i] === 1;
      if (!inMask) continue;
      let zone = numZones - 1;
      for (let t = 0; t < thresholds.length; t++) {
        if (luminanceMap[i] <= thresholds[t]) { zone = t; break; }
      }
      if (zone === z) {
        const si = i * 4;
        layerBuf[si] = origRaw[si];
        layerBuf[si + 1] = origRaw[si + 1];
        layerBuf[si + 2] = origRaw[si + 2];
        layerBuf[si + 3] = 255;
        count++;
      }
    }
    zones.push({ pixels: layerBuf, coverage: count / total, width, height });
  }
  return zones;
}

// --- Main Decompose (SAM 2 + Luminance fallback) ---
export async function decomposeImage(
  imagePath: string,
  outputDir: string,
  options: DecomposeOptions = {},
): Promise<DecomposeResult> {
  const {
    maxLayers = 12,
    alphaThreshold = 128,
    minCoverage = 0.001,
    pointsPerSide = 64,
    predIouThresh = 0.7,
    stabilityScoreThresh = 0.92,
    luminanceFallbackEnabled = true,
    luminanceFallbackMinSamLayers = 3,
    luminanceFallbackZoneCount = 6,
    luminanceFallbackResidualOnly = false,
    luminanceFallbackResidualCoverageMin = 0,
  } = options;
  const replicate = new Replicate({ auth: getToken() });
  const originalImage = fs.readFileSync(imagePath);
  const origMeta = await sharp(originalImage).metadata();
  if (!origMeta.width || !origMeta.height) {
    throw new Error("Failed to read image dimensions. Input may be corrupt.");
  }
  const width = origMeta.width;
  const height = origMeta.height;

  fs.mkdirSync(outputDir, { recursive: true });

  interface LayerEntry {
    pixels: Buffer;
    coverage: number;
    width: number;
    height: number;
    meta: FileSourceMeta;
  }

  const allLayers: LayerEntry[] = [];
  const samMasks: Uint8Array[] = [];

  // Step 1: SAM 2 automatic mask generation
  console.log("  [1/2] SAM 2 segmentation...");
  const maskBuffers = await getSam2Masks(replicate, imagePath, {
    maskLimit: maxLayers,
    pointsPerSide,
    predIouThresh,
    stabilityScoreThresh,
  });
  console.log(`  ${maskBuffers.length} masks returned`);

  // Step 2: Convert each mask to RGBA layer
  console.log("  [2/2] Applying masks to original image...");
  for (let i = 0; i < maskBuffers.length; i++) {
    const layer = await applyMaskToImage(
      originalImage,
      maskBuffers[i],
      width,
      height,
      alphaThreshold,
    );
    if (layer.coverage < minCoverage) {
      console.log(`  mask[${i}]: ${(layer.coverage * 100).toFixed(1)}% — skipped (empty)`);
      continue;
    }
    console.log(`  mask[${i}]: ${(layer.coverage * 100).toFixed(1)}% — kept`);
    samMasks.push(layer.binaryMask);
    allLayers.push({
      ...layer,
      meta: { source: "sam2-segment", groupId: `sam2-${i}` },
    });
  }

  const { residualMask, residualCoverage } = buildResidualMask(samMasks, width, height);

  if (
    shouldRunLuminanceFallback(allLayers.length, residualCoverage, {
      enabled: luminanceFallbackEnabled,
      minSamLayers: luminanceFallbackMinSamLayers,
      residualCoverageMin: luminanceFallbackResidualCoverageMin,
    })
  ) {
    const fallbackZones = luminanceFallbackZoneCount;
    console.log(
      `  SAM 2 produced ${allLayers.length} layers (residual ${(residualCoverage * 100).toFixed(1)}%)` +
      ` — fallback: ${fallbackZones} luminance zones${luminanceFallbackResidualOnly ? " on residual only" : ""}`,
    );
    const fallbackLayers = await splitByLuminanceZones(
      originalImage,
      fallbackZones,
      luminanceFallbackResidualOnly ? residualMask : undefined,
    );
    allLayers.push(...fallbackLayers.filter((z) => z.coverage >= minCoverage).map((z) => ({
      ...z, meta: { source: "luminance-split" as const, groupId: "luminance-fallback" },
    })));
  }

  // Sort by coverage descending
  allLayers.sort((a, b) => b.coverage - a.coverage);

  // Save layers
  const files: string[] = [];
  const coverages: number[] = [];
  const fileMeta: FileSourceMeta[] = [];
  for (let i = 0; i < allLayers.length; i++) {
    const layer = allLayers[i];
    const fp = path.join(outputDir, `layer-${i}.png`);
    await sharp(Buffer.from(layer.pixels), {
      raw: { width: layer.width, height: layer.height, channels: 4 },
    })
      .png()
      .toFile(fp);
    files.push(fp);
    coverages.push(layer.coverage);
    fileMeta.push(layer.meta);
  }

  console.log(`  Total: ${files.length} layers`);
  return { files, coverages, method: "sam2", fileMeta };
}

// --- Selective Recursive (disabled — SAM 2 doesn't benefit from recursive decomposition) ---

export function shouldRecurse(
  _candidate: { coverage: number; componentCount: number; edgeDensity: number },
  _config?: Partial<ResearchConfig>,
): boolean {
  return false;
}

export async function recursiveDecompose(
  _candidate: LayerCandidate,
  _options: { outputDir: string; apiCallCount: { current: number }; maxRecursiveCalls: number },
): Promise<LayerCandidate[]> {
  return [];
}
