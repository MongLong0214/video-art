import Replicate from "replicate";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

import { withRetry, validateReplicateUrl, getToken } from "./replicate-utils.js";

export const DAV2_MODEL = "chenxwh/depth-anything-v2";
export const DAV2_VERSION = "b239ea33cff32bb7abb5db39ffe9a09c14cbc2894331d1ef66fe096eed88ebd4";

export const SAM3_MODEL = "mattsays/sam3-image";
export const SAM3_VERSION = "d73db077226443ba4fafd34e233b3626b552eac2a433f90c7c32a9ac89bd9e72";

export const VLM_MODEL = "lucataco/qwen3-vl-8b-instruct";
export const VLM_VERSION = "39e893666996acf464cff75688ad49ac95ef54e9f1c688fbc677330acc478e11";

const DEFAULT_PROMPTS = ["main subject", "background", "foreground details", "shadows and lighting"];

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
  if (prompts.length >= 4) return prompts;
  const needed = defaults.filter(d => !prompts.includes(d));
  return [...prompts, ...needed].slice(0, Math.max(4, prompts.length));
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

export function parseCliPrompts(input: string): string[] {
  return input.split(",").map(s => s.trim()).filter(s => s.length > 0);
}

interface DecomposeOptions {
  alphaThreshold?: number;
  minCoverage?: number;
  sam3Threshold?: number;
  vlmMaxPrompts?: number;
  secondPassEnabled?: boolean;
  secondPassThreshold?: number;
  manualPrompts?: string[];
}

export interface FileSourceMeta {
  source: "sam2-segment" | "sam3-semantic";
  groupId?: string;
  prompt?: string;
}

export interface DecomposeResult {
  files: string[];
  coverages: number[];
  method: string;
  fileMeta: FileSourceMeta[];
  depthMap?: Buffer;
  candidates?: import("../../src/lib/scene-schema.js").LayerCandidate[];
  vlmPrompts?: string[];
}

// --- SAM 3 Overlap + Second Pass Utilities ---

export function sortCandidatesForOverlap<T extends { meanDepth?: number; coverage: number }>(
  candidates: T[],
  hasDepth: boolean,
): T[] {
  const sorted = [...candidates];
  if (hasDepth) {
    sorted.sort((a, b) => (b.meanDepth ?? 0) - (a.meanDepth ?? 0));
  } else {
    sorted.sort((a, b) => a.coverage - b.coverage);
  }
  return sorted;
}

export function shouldTriggerSecondPass(
  unionCoverage: number,
  config: { secondPassEnabled?: boolean; secondPassThreshold?: number },
): boolean {
  if (config.secondPassEnabled === false) return false;
  const threshold = config.secondPassThreshold ?? 0.8;
  return unionCoverage < threshold;
}

export function buildSecondPassVlmPrompt(existingPrompts: string[], maxPrompts: number): string {
  const exclusionList = existingPrompts.join(", ");
  return `/no_think The following regions have already been segmented: [${exclusionList}]. List ${maxPrompts} NEW distinct visual regions/objects NOT in the above list as a JSON array. Each item: short description (3-8 words) for segmentation. Output ONLY the JSON array.`;
}

// --- SAM 3 Text-Prompted Segmentation ---

import { computeMaskStats } from "./mask-stats.js";
import { computeMeanDepth } from "./depth-computation.js";
import type { LayerCandidate } from "../../src/lib/scene-schema.js";

export async function getSam3Mask(
  replicate: Replicate,
  dataUri: string,
  prompt: string,
  threshold: number = 0.25,
): Promise<Buffer | null> {
  try {
    const output = await withRetry(async () => {
      return replicate.run(`${SAM3_MODEL}:${SAM3_VERSION}`, {
        input: { image: dataUri, prompt, threshold, mask_only: true, return_zip: false },
      });
    });

    let url: string;
    if (typeof output === "string") url = output;
    else if (output && typeof output === "object" && "url" in output) {
      const urlVal = (output as Record<string, unknown>).url;
      url = typeof urlVal === "function" ? (urlVal as () => string)() : String(urlVal);
    } else {
      url = String(output);
    }

    validateReplicateUrl(url);
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const buf = Buffer.from(await resp.arrayBuffer());
    await sharp(buf).metadata(); // validate decodable
    return buf;
  } catch (err) {
    console.warn(`  SAM3 mask failed for "${prompt}": ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

export async function buildSam3Candidate(
  maskBuffer: Buffer,
  originalImage: Buffer,
  depthGray: Uint8Array | null,
  width: number,
  height: number,
  prompt: string,
  index: number,
  outputDir: string,
  minCoverage: number = 0.001,
): Promise<LayerCandidate | null> {
  const applied = await applyMaskToImage(originalImage, maskBuffer, width, height);
  if (applied.coverage < minCoverage) return null;

  const rgbaRaw = await sharp(applied.pixels, { raw: { width, height, channels: 4 } })
    .raw().toBuffer();
  const rgba = new Uint8Array(rgbaRaw.buffer, rgbaRaw.byteOffset, rgbaRaw.byteLength);
  const stats = computeMaskStats(rgba, width, height, 0);

  // meanDepth from depth map
  let meanDepth: number | undefined;
  if (depthGray) {
    meanDepth = computeMeanDepth(depthGray, applied.binaryMask, width, height);
  }

  // edge density via sobel
  let edgeDensity = 0;
  try {
    const edgeBuf = await sharp(applied.pixels, { raw: { width, height, channels: 4 } })
      .greyscale().convolve({ width: 3, height: 3, kernel: [-1, -2, -1, 0, 0, 0, 1, 2, 1] })
      .raw().toBuffer();
    let edgeSum = 0;
    for (let i = 0; i < edgeBuf.length; i++) edgeSum += edgeBuf[i];
    edgeDensity = edgeSum / (255 * edgeBuf.length);
  } catch { /* sobel optional */ }

  // Save RGBA layer
  const layerPath = path.join(outputDir, `sam3-${index}.png`);
  await sharp(applied.pixels, { raw: { width, height, channels: 4 } }).png().toFile(layerPath);

  return {
    id: crypto.randomUUID(),
    source: "sam3-semantic",
    filePath: layerPath,
    width,
    height,
    coverage: applied.coverage,
    uniqueCoverage: applied.coverage,
    meanDepth,
    bbox: stats.bbox,
    centroid: stats.centroid,
    edgeDensity,
    componentCount: 1,
  };
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

// --- Main Decompose (SAM 3) ---
async function decomposeImageSam3(
  replicate: Replicate,
  imagePath: string,
  originalImage: Buffer,
  width: number,
  height: number,
  outputDir: string,
  options: DecomposeOptions,
): Promise<DecomposeResult> {
  const {
    sam3Threshold = 0.25,
    vlmMaxPrompts = 6,
    minCoverage = 0.001,
    manualPrompts,
    secondPassEnabled = true,
    secondPassThreshold = 0.8,
  } = options;

  // Build data URI for API calls
  const imageData = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase().replace(".", "");
  const mime = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" }[ext] || "image/png";
  const dataUri = `data:${mime};base64,${imageData.toString("base64")}`;

  // Step 1: VLM prompts + DA V2 depth (parallel)
  console.log("  [1/3] VLM prompts + DA V2 depth...");
  const [prompts, depthMap] = await Promise.all([
    manualPrompts ? Promise.resolve(ensureMinPrompts(sanitizePrompts(manualPrompts, vlmMaxPrompts))) : getVlmPrompts(replicate, imagePath, { vlmMaxPrompts }),
    getDepthMap(replicate, imagePath),
  ]);
  console.log(`  ${prompts.length} prompts: ${prompts.join(", ")}`);

  // Prepare depth gray for meanDepth computation
  let depthGray: Uint8Array | null = null;
  if (depthMap) {
    const depthRaw = await sharp(depthMap).resize(width, height).grayscale().raw().toBuffer();
    depthGray = new Uint8Array(depthRaw.buffer, depthRaw.byteOffset, depthRaw.byteLength);
  }

  // Step 2: SAM3 per-prompt segmentation
  console.log("  [2/3] SAM3 per-prompt segmentation...");
  const candidates: LayerCandidate[] = [];
  const fileMeta: FileSourceMeta[] = [];
  const files: string[] = [];
  const coverages: number[] = [];
  // Track pixel-level union for second pass trigger
  const unionMask = new Uint8Array(width * height);

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    console.log(`  SAM3[${i}]: "${prompt}"...`);
    const maskBuf = await getSam3Mask(replicate, dataUri, prompt, sam3Threshold);
    if (!maskBuf) { console.log(`    → skipped (mask failed)`); continue; }

    const candidate = await buildSam3Candidate(maskBuf, originalImage, depthGray, width, height, prompt, i, outputDir, minCoverage);
    if (!candidate) { console.log(`    → skipped (empty mask)`); continue; }

    console.log(`    → ${(candidate.coverage * 100).toFixed(1)}% coverage, depth=${candidate.meanDepth?.toFixed(0) ?? "N/A"}`);
    candidates.push(candidate);
    files.push(candidate.filePath);
    coverages.push(candidate.coverage);
    fileMeta.push({ source: "sam3-semantic", prompt });
    // Update pixel-level union mask
    try {
      const layerRgba = await sharp(candidate.filePath).ensureAlpha().raw().toBuffer();
      for (let p = 0; p < width * height; p++) {
        if (layerRgba[p * 4 + 3] > 0) unionMask[p] = 1;
      }
    } catch { /* non-critical */ }
  }

  // Compute actual pixel union coverage
  let unionPixels = 0;
  for (let p = 0; p < unionMask.length; p++) { if (unionMask[p]) unionPixels++; }
  const unionCoverage = unionPixels / (width * height);

  // Step 2.5: Second pass if needed
  if (candidates.length > 0 && shouldTriggerSecondPass(
    unionCoverage,
    { secondPassEnabled, secondPassThreshold },
  )) {
    console.log("  [2.5/3] Second pass — coverage below threshold...");
    const secondPromptText = buildSecondPassVlmPrompt(prompts, vlmMaxPrompts);
    const secondOutput = await withRetry(async () => {
      return replicate.run(`${VLM_MODEL}:${VLM_VERSION}`, {
        input: { media: dataUri, prompt: secondPromptText, max_new_tokens: 256, temperature: 0.1 },
      });
    }).catch(() => null);

    if (secondOutput) {
      const text = typeof secondOutput === "string" ? secondOutput : Array.isArray(secondOutput) ? secondOutput.join("") : String(secondOutput);
      const newPrompts = parseVlmResponse(text);
      if (newPrompts) {
        const sanitized = sanitizePrompts(newPrompts, vlmMaxPrompts).filter(p => !prompts.includes(p));
        for (let j = 0; j < sanitized.length; j++) {
          const p = sanitized[j];
          console.log(`  SAM3-2nd[${j}]: "${p}"...`);
          const maskBuf = await getSam3Mask(replicate, dataUri, p, sam3Threshold);
          if (!maskBuf) continue;
          const candidate = await buildSam3Candidate(maskBuf, originalImage, depthGray, width, height, p, candidates.length + j, outputDir, minCoverage);
          if (!candidate) continue;
          console.log(`    → ${(candidate.coverage * 100).toFixed(1)}% coverage`);
          candidates.push(candidate);
          files.push(candidate.filePath);
          coverages.push(candidate.coverage);
          fileMeta.push({ source: "sam3-semantic", prompt: p });
        }
      }
    }
  }

  console.log(`  [3/3] ${candidates.length} SAM3 layers generated`);
  return {
    files, coverages, method: "sam3", fileMeta,
    depthMap: depthMap ?? undefined,
    candidates,
    vlmPrompts: prompts,
  };
}

// --- Main Entry ---
export async function decomposeImage(
  imagePath: string,
  outputDir: string,
  options: DecomposeOptions = {},
): Promise<DecomposeResult> {
  const replicate = new Replicate({ auth: getToken() });
  const originalImage = fs.readFileSync(imagePath);
  const origMeta = await sharp(originalImage).metadata();
  if (!origMeta.width || !origMeta.height) {
    throw new Error("Failed to read image dimensions. Input may be corrupt.");
  }
  const width = origMeta.width;
  const height = origMeta.height;
  fs.mkdirSync(outputDir, { recursive: true });

  const result = await decomposeImageSam3(replicate, imagePath, originalImage, width, height, outputDir, options);
  if (result.files.length === 0) {
    throw new Error("SAM3 produced 0 valid masks. Check sam3Threshold, image complexity, or use --prompts for manual prompts.");
  }
  return result;
}

