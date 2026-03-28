import Replicate from "replicate";
import sharp from "sharp";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { extractCandidates } from "./candidate-extraction.js";
import { withRetry, validateReplicateUrl, enforceVersionPin, maskToken, getToken } from "./replicate-utils.js";
import type { LayerCandidate } from "../../src/lib/scene-schema.js";
import type { ResearchConfig } from "../research/research-config.js";

interface DecomposeOptions {
  numLayers?: number;
  luminanceZones?: number;
  description?: string;
}

interface FileSourceMeta {
  source: "qwen-semantic" | "luminance-split";
  groupId?: string;
}

interface DecomposeResult {
  files: string[];
  coverages: number[];
  method: string;
  fileMeta: FileSourceMeta[];
}

// --- Qwen Image Layered ---
export interface QwenLayerOptions {
  numLayers?: number;
  description?: string;
  disableSafetyChecker?: boolean;
  versionPin?: string;
  production?: boolean;
}

async function getQwenLayers(
  replicate: Replicate,
  imagePath: string,
  numLayersOrOpts?: number | QwenLayerOptions,
): Promise<Buffer[]> {
  const opts: QwenLayerOptions = typeof numLayersOrOpts === "number"
    ? { numLayers: numLayersOrOpts }
    : numLayersOrOpts ?? {};

  const numLayers = opts.numLayers ?? 8;
  const description = opts.description ?? "auto";
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
        description,
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

// --- Luminance-based splitting ---
async function splitByLuminanceZones(
  originalImage: Buffer,
  numZones: number,
  alphaMask?: Buffer,
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

  let maskData: Buffer | null = null;
  if (alphaMask) {
    const maskRaw = await sharp(alphaMask)
      .resize(width, height)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    maskData = maskRaw.data;
  }

  const luminanceValues: number[] = [];
  const luminanceMap = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const offset = i * 4;
    const r = origRaw[offset];
    const g = origRaw[offset + 1];
    const b = origRaw[offset + 2];
    const lum = r * 0.299 + g * 0.587 + b * 0.114;
    luminanceMap[i] = lum;
    const inMask = !maskData || maskData[i * 4 + 3] > 10;
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
      const inMask = !maskData || maskData[i * 4 + 3] > 10;
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

// --- Main Decompose (Qwen + Luminance) ---
export async function decomposeImage(
  imagePath: string,
  outputDir: string,
  options: DecomposeOptions = {},
): Promise<DecomposeResult> {
  const { numLayers = 8, luminanceZones = 6, description } = options;
  const replicate = new Replicate({ auth: getToken() });
  const originalImage = fs.readFileSync(imagePath);

  fs.mkdirSync(outputDir, { recursive: true });

  interface LayerEntry {
    pixels: Buffer;
    coverage: number;
    width: number;
    height: number;
    meta: FileSourceMeta;
  }

  const allLayers: LayerEntry[] = [];

  // Step 1: Qwen semantic decomposition
  console.log("  [1/2] Semantic decomposition (qwen)...");
  const qwenBuffers = await getQwenLayers(replicate, imagePath, { numLayers, description });

  // Step 2: Luminance analysis (local, no API cost)
  console.log("  [2/2] Luminance analysis (local)...");

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

    const groupId = `qwen-${q}`;

    if (coverage > 0.50) {
      // Large background-like layers: split by luminance zones
      console.log(`  qwen[${q}]: ${(coverage * 100).toFixed(1)}% → split into ${luminanceZones} luminance sub-layers`);
      const subLayers = await splitByLuminanceZones(originalImage, luminanceZones, qwenBuffers[q]);
      allLayers.push(...subLayers.filter(s => s.coverage > 0.001).map(s => ({
        ...s, meta: { source: "luminance-split" as const, groupId },
      })));
    } else {
      // Semantic layers: keep intact (upscale to original res)
      console.log(`  qwen[${q}]: ${(coverage * 100).toFixed(1)}% — kept (semantic)`);
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
      allLayers.push({
        pixels: layerBuf, coverage: opaqueCount / oTotal, width: ow, height: oh,
        meta: { source: "qwen-semantic" },
      });
    }
  }

  // Fallback: if Qwen produced too few usable layers, split full image by luminance
  if (allLayers.length < 3) {
    console.log(`  Qwen produced only ${allLayers.length} layers — fallback: ${luminanceZones} luminance zones`);
    const fallbackLayers = await splitByLuminanceZones(originalImage, luminanceZones);
    allLayers.push(...fallbackLayers.filter(z => z.coverage > 0.001).map(z => ({
      ...z, meta: { source: "luminance-split" as const, groupId: "luminance-fallback" },
    })));
  }

  // Sort by coverage descending (biggest = background = zIndex 0)
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
  return { files, coverages, method: "qwen-luminance", fileMeta };
}

// --- Selective Recursive Qwen ---

const RECURSIVE_COVERAGE_THRESHOLD = 0.30;
const RECURSIVE_COMPONENT_COUNT_THRESHOLD = 3;
const RECURSIVE_EDGE_DENSITY_THRESHOLD = 0.15;

export function shouldRecurse(
  candidate: {
    coverage: number;
    componentCount: number;
    edgeDensity: number;
  },
  config?: Partial<ResearchConfig>,
): boolean {
  const coverageThreshold = config?.recurseCoverageThreshold ?? RECURSIVE_COVERAGE_THRESHOLD;
  const componentThreshold = config?.recurseComponentThreshold ?? RECURSIVE_COMPONENT_COUNT_THRESHOLD;
  const edgeDensityThreshold = config?.recurseEdgeDensityThreshold ?? RECURSIVE_EDGE_DENSITY_THRESHOLD;

  return (
    candidate.coverage > coverageThreshold &&
    (candidate.componentCount > componentThreshold ||
      candidate.edgeDensity > edgeDensityThreshold)
  );
}

interface RecursiveDecomposeOptions {
  outputDir: string;
  apiCallCount: { current: number };
  maxRecursiveCalls: number;
}

export async function recursiveDecompose(
  candidate: LayerCandidate,
  options: RecursiveDecomposeOptions,
): Promise<LayerCandidate[]> {
  const { outputDir, apiCallCount, maxRecursiveCalls } = options;

  if (apiCallCount.current >= maxRecursiveCalls) {
    return [];
  }

  apiCallCount.current++;

  try {
    const replicate = new Replicate({ auth: getToken() });
    const subDir = path.join(outputDir, `recursive-${candidate.id}`);
    fs.mkdirSync(subDir, { recursive: true });

    const qwenBuffers = await withRetry(
      () => getQwenLayers(replicate, candidate.filePath, 4),
      { maxAttempts: 2, backoffMs: [1000, 2000] },
    );

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

    if (allSubCandidates.length === 0) return [];

    const totalChildCoverage = allSubCandidates.reduce((sum, c) => sum + c.coverage, 0);
    const totalChildComponents = allSubCandidates.reduce((sum, c) => sum + c.componentCount, 0);

    if (totalChildCoverage < candidate.coverage && totalChildComponents <= candidate.componentCount) {
      return [];
    }

    return allSubCandidates;
  } catch (err) {
    const token = process.env.REPLICATE_API_TOKEN ?? "";
    const safeMsg = err instanceof Error
      ? maskToken(err.message, token)
      : maskToken(String(err), token);
    console.warn(`[recursive-decompose] API failure (parent retained): ${safeMsg}`);
    return [];
  }
}
