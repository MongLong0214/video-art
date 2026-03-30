import Replicate from "replicate";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

import { withRetry, validateReplicateUrl, getToken } from "./replicate-utils.js";

export const SAM2_MODEL = "lucataco/segment-anything-2";
export const SAM2_VERSION = "be7cbde9fdf0eecdc8b20ffec9dd0d1cfeace0832d4d0b58a071d993182e1be0";

export const DAV2_MODEL = "chenxwh/depth-anything-v2";
export const DAV2_VERSION = "b239ea33cff32bb7abb5db39ffe9a09c14cbc2894331d1ef66fe096eed88ebd4";

export const SAM3_MODEL = "mattsays/sam3-image";
export const SAM3_VERSION = "d73db077226443ba4fafd34e233b3626b552eac2a433f90c7c32a9ac89bd9e72";

export const VLM_MODEL = "lucataco/qwen3-vl-8b-instruct";
export const VLM_VERSION = "39e893666996acf464cff75688ad49ac95ef54e9f1c688fbc677330acc478e11";

const DEFAULT_PROMPTS = ["main subject", "background", "foreground details"];

// --- VLM Prompt Utilities ---

export function parseVlmResponse(text: string): string[] | null {
  const match = text.match(/\[.*\]/s);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed) || !parsed.every((p: unknown) => typeof p === "string")) return null;
    return parsed as string[];
  } catch {
    return null;
  }
}

export function sanitizePrompts(prompts: string[], maxCount: number): string[] {
  return prompts
    .map(p => p.replace(/[\x00-\x1f\x7f]/g, "").trim().slice(0, 100))
    .filter(p => p.length > 0)
    .slice(0, maxCount);
}

export function ensureMinPrompts(prompts: string[], defaults: string[] = DEFAULT_PROMPTS): string[] {
  if (prompts.length >= 3) return prompts;
  const needed = defaults.filter(d => !prompts.includes(d));
  return [...prompts, ...needed].slice(0, Math.max(3, prompts.length));
}

export async function getVlmPrompts(
  replicate: Replicate,
  imagePath: string,
  options: { vlmMaxPrompts?: number } = {},
): Promise<string[]> {
  const maxPrompts = options.vlmMaxPrompts ?? 6;
  try {
    const imageData = fs.readFileSync(imagePath);
    const ext = path.extname(imagePath).toLowerCase().replace(".", "");
    const mime = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" }[ext] || "image/png";
    const dataUri = `data:${mime};base64,${imageData.toString("base64")}`;

    console.log("  Running VLM (Qwen3-VL) for auto-prompts...");
    const output = await withRetry(async () => {
      return replicate.run(`${VLM_MODEL}:${VLM_VERSION}`, {
        input: {
          media: dataUri,
          prompt: `/no_think List the ${maxPrompts} distinct visual regions/objects in this image as a JSON array. Each item: short description (3-8 words) for segmentation. Output ONLY the JSON array.`,
          max_new_tokens: 256,
          temperature: 0.1,
        },
      });
    });

    const text = typeof output === "string" ? output : Array.isArray(output) ? output.join("") : String(output);
    const parsed = parseVlmResponse(text);
    if (!parsed) {
      console.warn("  VLM response parsing failed, using defaults");
      return ensureMinPrompts([]);
    }
    return ensureMinPrompts(sanitizePrompts(parsed, maxPrompts));
  } catch (err) {
    console.warn(`  VLM failed: ${err instanceof Error ? err.message : err}, using defaults`);
    return ensureMinPrompts([]);
  }
}

interface DecomposeOptions {
  maxLayers?: number;
  alphaThreshold?: number;
  minCoverage?: number;
  pointsPerSide?: number;
  predIouThresh?: number;
  stabilityScoreThresh?: number;
}

interface FileSourceMeta {
  source: "sam2-segment";
  groupId?: string;
}

export interface DecomposeResult {
  files: string[];
  coverages: number[];
  method: string;
  fileMeta: FileSourceMeta[];
  depthMap?: Buffer;
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

// --- Depth Anything V2: Monocular Depth Estimation ---
const MAX_INPUT_BYTES = 20 * 1024 * 1024; // 20MB

export async function getDepthMap(
  replicate: Replicate,
  imagePath: string,
): Promise<Buffer | null> {
  try {
  let imageData: Buffer = fs.readFileSync(imagePath);

  // AC-1.10: Downsample if input exceeds 20MB to keep base64 data URI safe
  let mime: string;
  if (imageData.length > MAX_INPUT_BYTES) {
    console.warn(`  Input image ${(imageData.length / 1024 / 1024).toFixed(1)}MB exceeds 20MB — downsampling for DA V2`);
    imageData = Buffer.from(await sharp(imageData).resize({ width: 1024, withoutEnlargement: true }).png().toBuffer());
    mime = "image/png";
  } else {
    const ext = path.extname(imagePath).toLowerCase().replace(".", "");
    mime = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" }[ext] || "image/png";
  }
  const dataUri = `data:${mime};base64,${imageData.toString("base64")}`;

  console.log("  Running Depth Anything V2...");
    const output = await withRetry(async () => {
      return replicate.run(
        `${DAV2_MODEL}:${DAV2_VERSION}`,
        { input: { image: dataUri } },
      );
    });

    // DA V2 returns { grey_depth: FileOutput, color_depth: FileOutput }
    // FileOutput.toString() gives the URL
    let url: string;
    if (typeof output === "string") {
      url = output;
    } else if (output && typeof output === "object") {
      const obj = output as Record<string, unknown>;
      if (obj.grey_depth) {
        url = String(obj.grey_depth);
      } else if ("url" in obj) {
        const urlVal = obj.url;
        url = typeof urlVal === "function" ? (urlVal as () => string)() : String(urlVal);
      } else {
        url = String(output);
      }
    } else {
      url = String(output);
    }

    validateReplicateUrl(url);
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Failed to fetch depth map: HTTP ${resp.status} ${resp.statusText}`);
    }
    const rawBuffer = Buffer.from(await resp.arrayBuffer());

    // Ensure grayscale — metadata first to avoid non-null assertion
    const meta = await sharp(rawBuffer).metadata();
    if (!meta.width || !meta.height) {
      throw new Error("DA V2 depth map has no valid dimensions");
    }
    const depthGray = await sharp(rawBuffer).grayscale().raw().toBuffer();
    // Convention: 0=far, 255=near (DA V2 disparity map default — high value = near)
    return await sharp(depthGray, {
      raw: { width: meta.width, height: meta.height, channels: 1 },
    }).png().toBuffer();
  } catch (err) {
    console.warn(
      `  DA V2 failed, continuing without depth: ${err instanceof Error ? err.message : err}`,
    );
    return null;
  }
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

// --- Main Decompose (SAM 2) ---
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

  // Step 1: SAM 2 + DA V2 parallel execution
  console.log("  [1/2] SAM 2 segmentation + DA V2 depth...");
  const [maskBuffers, depthMap] = await Promise.all([
    getSam2Masks(replicate, imagePath, {
      maskLimit: maxLayers,
      pointsPerSide,
      predIouThresh,
      stabilityScoreThresh,
    }),
    getDepthMap(replicate, imagePath),
  ]);
  console.log(`  ${maskBuffers.length} masks returned${depthMap ? " + depth map" : " (no depth)"}`);


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
    allLayers.push({
      ...layer,
      meta: { source: "sam2-segment", groupId: `sam2-${i}` },
    });
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
  return { files, coverages, method: "sam2", fileMeta, depthMap: depthMap ?? undefined };
}

