import Replicate from "replicate";
import sharp from "sharp";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { extractCandidates } from "./candidate-extraction.js";
import { withRetry, validateReplicateUrl, enforceVersionPin } from "./replicate-utils.js";
import type { LayerCandidate } from "../../src/lib/scene-schema.js";

function getToken(): string {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error(
      "REPLICATE_API_TOKEN is not set. Add it to .env file.\n" +
        "Get your token at https://replicate.com/account/api-tokens",
    );
  }
  return token;
}

interface DecomposeOptions {
  numLayers?: number;
  depthZones?: number;
  method?: "hybrid" | "depth-only" | "qwen-only";
}

interface DecomposeResult {
  files: string[];
  coverages: number[];
  method: string;
}

// --- ZoeDepth ---
async function getDepthMap(
  replicate: Replicate,
  imagePath: string,
  options?: { versionPin?: string; production?: boolean },
): Promise<Buffer> {
  const versionPin = options?.versionPin;
  const production = options?.production ?? false;
  const defaultVersion = "6375723d97400d3ac7b88e3022b738bf6f433ae165c4a2acd1955eaa6b8fcb62";
  const version = versionPin ?? defaultVersion;

  if (production) {
    enforceVersionPin(version, true);
  }

  const imageData = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase().replace(".", "");
  const mime =
    { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" }[ext] ||
    "image/png";
  const dataUri = `data:${mime};base64,${imageData.toString("base64")}`;

  console.log("  Running ZoeDepth...");
  return withRetry(async () => {
    const output = await replicate.run(
      `cjwbw/zoedepth:${version}`,
      { input: { image: dataUri, model_type: "ZoeD_NK" } },
    );

    const url =
      typeof output === "string"
        ? output
        : typeof (output as { url?: unknown }).url === "function"
          ? ((output as { url: () => string }).url)()
          : String(output);

    validateReplicateUrl(url);
    const resp = await fetch(url);
    return Buffer.from(await resp.arrayBuffer());
  });
}

// --- Qwen Image Layered ---
export interface QwenLayerOptions {
  numLayers?: number;
  disableSafetyChecker?: boolean;
  versionPin?: string;
  production?: boolean;
}

async function getQwenLayers(
  replicate: Replicate,
  imagePath: string,
  numLayersOrOpts?: number | QwenLayerOptions,
): Promise<Buffer[]> {
  // Backward-compatible: accept number (legacy) or options object
  const opts: QwenLayerOptions = typeof numLayersOrOpts === "number"
    ? { numLayers: numLayersOrOpts }
    : numLayersOrOpts ?? {};

  const numLayers = opts.numLayers ?? 8;
  const disableSafetyChecker = opts.disableSafetyChecker ?? false;
  const production = opts.production ?? false;

  if (production && opts.versionPin) {
    enforceVersionPin(opts.versionPin, true);
  }

  const imageData = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase().replace(".", "");
  const mime =
    { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" }[ext] ||
    "image/png";
  const dataUri = `data:${mime};base64,${imageData.toString("base64")}`;

  const modelRef = (opts.versionPin
    ? `qwen/qwen-image-layered:${opts.versionPin}`
    : "qwen/qwen-image-layered") as `${string}/${string}`;

  console.log(`  Running qwen-image-layered (${numLayers} layers)...`);
  return withRetry(async () => {
    const output = (await replicate.run(modelRef, {
      input: {
        image: dataUri,
        num_layers: numLayers,
        go_fast: false,
        disable_safety_checker: disableSafetyChecker,
        output_format: "png",
        output_quality: 100,
      },
    })) as unknown[];

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
      buffers.push(Buffer.from(await resp.arrayBuffer()));
    }
    return buffers;
  });
}

// --- Depth-based splitting ---
async function splitByDepthZones(
  originalImage: Buffer,
  depthMap: Buffer,
  numZones: number,
  alphaMask?: Buffer,
): Promise<{ pixels: Buffer; coverage: number; width: number; height: number }[]> {
  // Use original image resolution as the target
  const origInfo = await sharp(originalImage).ensureAlpha().metadata();
  const width = origInfo.width!;
  const height = origInfo.height!;
  const total = width * height;

  // Resize depth map UP to original resolution
  const depthGray = await sharp(depthMap)
    .resize(width, height)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const depthData = depthGray.data;

  // Original at full resolution
  const origRaw = await sharp(originalImage)
    .resize(width, height)
    .ensureAlpha()
    .raw()
    .toBuffer();

  // Optional alpha mask (from qwen layer) — upscale to original resolution
  let maskData: Buffer | null = null;
  if (alphaMask) {
    const maskRaw = await sharp(alphaMask)
      .resize(width, height)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    maskData = maskRaw.data;
  }

  // Compute quantile thresholds from depth values (only within mask)
  const depthValues: number[] = [];
  for (let i = 0; i < total; i++) {
    const inMask = !maskData || maskData[i * 4 + 3] > 10;
    if (inMask) depthValues.push(depthData[i]);
  }
  depthValues.sort((a, b) => a - b);

  const thresholds: number[] = [];
  for (let t = 1; t < numZones; t++) {
    thresholds.push(depthValues[Math.floor(depthValues.length * t / numZones)] ?? 255);
  }

  // Create zone layers
  const zones: { pixels: Buffer; coverage: number; width: number; height: number }[] = [];
  for (let z = 0; z < numZones; z++) {
    const layerBuf = Buffer.alloc(width * height * 4);
    let count = 0;

    for (let i = 0; i < total; i++) {
      const inMask = !maskData || maskData[i * 4 + 3] > 10;
      if (!inMask) continue;

      let zone = numZones - 1;
      for (let t = 0; t < thresholds.length; t++) {
        if (depthData[i] <= thresholds[t]) { zone = t; break; }
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

// --- Main Hybrid Decompose ---
export async function decomposeHybrid(
  imagePath: string,
  outputDir: string,
  options: DecomposeOptions = {},
): Promise<DecomposeResult> {
  const { numLayers = 8, depthZones = 4, method = "hybrid" } = options;
  const replicate = new Replicate({ auth: getToken() });
  const originalImage = fs.readFileSync(imagePath);

  fs.mkdirSync(outputDir, { recursive: true });

  const allLayers: { pixels: Buffer; coverage: number; width: number; height: number }[] = [];

  if (method === "depth-only") {
    // Pure depth approach
    console.log("  Depth-only decomposition...");
    const depthBuf = await getDepthMap(replicate, imagePath);
    const totalZones = numLayers * depthZones;
    const zones = await splitByDepthZones(originalImage, depthBuf, totalZones);
    allLayers.push(...zones.filter(z => z.coverage > 0.001));
  } else if (method === "qwen-only") {
    // Pure qwen approach
    console.log("  Qwen-only decomposition...");
    const qwenBuffers = await getQwenLayers(replicate, imagePath, numLayers);
    for (const buf of qwenBuffers) {
      const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let opaque = 0;
      for (let i = 3; i < data.length; i += info.channels) { if (data[i] > 10) opaque++; }
      const coverage = opaque / (info.width * info.height);
      if (coverage > 0.001) {
        allLayers.push({ pixels: data, coverage, width: info.width, height: info.height });
      }
    }
  } else {
    // Hybrid: qwen semantic + depth refinement
    console.log("  [1/2] Semantic decomposition (qwen)...");
    const qwenBuffers = await getQwenLayers(replicate, imagePath, numLayers);

    console.log("  [2/2] Depth estimation (ZoeDepth)...");
    const depthBuf = await getDepthMap(replicate, imagePath);

    // Process each qwen layer
    for (let q = 0; q < qwenBuffers.length; q++) {
      const { data, info } = await sharp(qwenBuffers[q])
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let opaque = 0;
      for (let i = 3; i < data.length; i += info.channels) { if (data[i] > 10) opaque++; }
      const coverage = opaque / (info.width * info.height);

      if (coverage < 0.005) {
        console.log(`  qwen[${q}]: ${(coverage * 100).toFixed(1)}% — skipped (empty)`);
        continue;
      }

      if (coverage > 0.10) {
        // Large layer: split further by depth
        const subZones = coverage > 0.5 ? depthZones : Math.max(2, Math.floor(depthZones / 2));
        console.log(`  qwen[${q}]: ${(coverage * 100).toFixed(1)}% → split into ${subZones} depth sub-layers`);
        const subLayers = await splitByDepthZones(
          originalImage,
          depthBuf,
          subZones,
          qwenBuffers[q],
        );
        allLayers.push(...subLayers.filter(s => s.coverage > 0.001));
      } else {
        // Small layer: upscale to original resolution using qwen alpha as mask
        console.log(`  qwen[${q}]: ${(coverage * 100).toFixed(1)}% — kept (upscaled to original res)`);
        const origMeta = await sharp(originalImage).metadata();
        const ow = origMeta.width!;
        const oh = origMeta.height!;
        const origFull = await sharp(originalImage).resize(ow, oh).ensureAlpha().raw().toBuffer();
        const maskUp = await sharp(qwenBuffers[q]).resize(ow, oh).ensureAlpha().raw().toBuffer();
        const layerBuf = Buffer.alloc(ow * oh * 4);
        const oTotal = ow * oh;
        let opaqueCount = 0;
        for (let p = 0; p < oTotal; p++) {
          if (maskUp[p * 4 + 3] > 10) {
            layerBuf[p * 4] = origFull[p * 4];
            layerBuf[p * 4 + 1] = origFull[p * 4 + 1];
            layerBuf[p * 4 + 2] = origFull[p * 4 + 2];
            layerBuf[p * 4 + 3] = maskUp[p * 4 + 3];
            opaqueCount++;
          }
        }
        allLayers.push({ pixels: layerBuf, coverage: opaqueCount / oTotal, width: ow, height: oh });
      }
    }
  }

  // Sort by coverage descending (biggest = background = zIndex 0)
  allLayers.sort((a, b) => b.coverage - a.coverage);

  // Save layers
  const files: string[] = [];
  const coverages: number[] = [];
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
  }

  console.log(`  Total: ${files.length} layers`);
  return { files, coverages, method };
}

// --- Selective Recursive Qwen ---

// Trigger thresholds for recursive decomposition (AC-1)
const RECURSIVE_COVERAGE_THRESHOLD = 0.30;
const RECURSIVE_COMPONENT_COUNT_THRESHOLD = 3;
const RECURSIVE_EDGE_DENSITY_THRESHOLD = 0.15;

/**
 * Determines whether a candidate should be recursively decomposed.
 * Trigger: coverage > 30% AND (componentCount > 3 OR edgeDensity > 0.15)
 */
export function shouldRecurse(candidate: {
  coverage: number;
  componentCount: number;
  edgeDensity: number;
}): boolean {
  return (
    candidate.coverage > RECURSIVE_COVERAGE_THRESHOLD &&
    (candidate.componentCount > RECURSIVE_COMPONENT_COUNT_THRESHOLD ||
      candidate.edgeDensity > RECURSIVE_EDGE_DENSITY_THRESHOLD)
  );
}

interface RecursiveDecomposeOptions {
  outputDir: string;
  apiCallCount: { current: number };
  maxRecursiveCalls: number;
}

/**
 * Recursively decomposes a complex candidate via Qwen.
 * - Checks API call cap before proceeding
 * - On success: returns sub-candidates extracted from Qwen layers
 * - On failure: returns empty array (caller retains parent)
 * - EC-1: if recursive results are worse (lower total coverage or fewer components),
 *   returns empty so the caller keeps the parent
 */
export async function recursiveDecompose(
  candidate: LayerCandidate,
  options: RecursiveDecomposeOptions,
): Promise<LayerCandidate[]> {
  const { outputDir, apiCallCount, maxRecursiveCalls } = options;

  // Cap check: no more API calls allowed
  if (apiCallCount.current >= maxRecursiveCalls) {
    return [];
  }

  // Increment before the call (the attempt counts even if it fails)
  apiCallCount.current++;

  try {
    const replicate = new Replicate({ auth: getToken() });

    // Re-send the candidate's alpha mask to Qwen for sub-decomposition
    const subDir = path.join(outputDir, `recursive-${candidate.id}`);
    fs.mkdirSync(subDir, { recursive: true });

    const qwenBuffers = await withRetry(
      () => getQwenLayers(replicate, candidate.filePath, 4),
      { maxAttempts: 2, backoffMs: [1000, 2000] },
    );

    // Save Qwen output layers and extract candidates from each
    const allSubCandidates: LayerCandidate[] = [];

    for (let i = 0; i < qwenBuffers.length; i++) {
      const layerPath = path.join(subDir, `sub-layer-${i}.png`);
      await sharp(qwenBuffers[i]).png().toFile(layerPath);

      const subCandidates = await extractCandidates(layerPath, subDir);

      for (const sub of subCandidates) {
        allSubCandidates.push({
          ...sub,
          id: crypto.randomUUID(),
          source: "qwen-recursive",
          parentId: candidate.id,
        });
      }
    }

    if (allSubCandidates.length === 0) {
      return [];
    }

    // EC-1: Compare recursive results with parent
    // Use raw coverage sum and component count (uniqueCoverage not computed yet)
    const totalChildCoverage = allSubCandidates.reduce((sum, c) => sum + c.coverage, 0);
    const totalChildComponents = allSubCandidates.reduce((sum, c) => sum + c.componentCount, 0);

    if (
      totalChildCoverage < candidate.coverage &&
      totalChildComponents <= candidate.componentCount
    ) {
      // Recursive result is worse: discard children, parent is retained by caller
      return [];
    }

    return allSubCandidates;
  } catch {
    // API failure: return empty so caller retains parent (AC-5)
    return [];
  }
}
