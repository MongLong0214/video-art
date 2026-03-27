// Evaluate Harness — Hard Gate + Secondary Ranking
// 10 metrics (M1-M10), 4-tier weighted composite

import { existsSync, readdirSync, readFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import sharp from "sharp";
import {
  getVideoMetadata,
  extractSingleFrame,
  checkFfmpegAvailable,
  calcProportionalTimestamps,
  calcTemporalPairTimestamps,
  normalizeFramePair,
  type FrameData,
} from "./frame-extractor.js";
import { srgbToLab, computeColorPaletteSimilarity } from "./metrics/color-palette.js";
import { computeDominantColorAccuracy } from "./metrics/dominant-color.js";
import { computeColorTemperatureSimilarity } from "./metrics/color-temperature.js";
import { computeMsssimYCbCr } from "./metrics/ms-ssim.js";
import { computeEdgePreservation } from "./metrics/edge-preservation.js";
import { computeTextureRichness } from "./metrics/texture-richness.js";
import { computeVmaf, checkVmafAvailable } from "./metrics/vmaf.js";
import { computeTemporalCoherence } from "./metrics/temporal-coherence.js";
import { computeLayerIndependence, computeRoleCoherence } from "./metrics/layer-quality.js";

const GATE_THRESHOLD = 0.15;

const TIER_WEIGHTS = {
  color: 0.35,    // M1, M2, M3
  visual: 0.25,   // M4, M5, M6
  temporal: 0.20,  // M7, M8
  layer: 0.20,    // M9, M10
};

export interface MetricValues {
  M1: number;  // Color Palette Sinkhorn
  M2: number;  // Dominant Color CIEDE2000
  M3: number;  // Color Temperature Ohno+Duv
  M4: number;  // MS-SSIM YCbCr
  M5: number;  // Canny Edge Preservation
  M6: number;  // Bidirectional Texture
  M7: number;  // VMAF
  M8: number;  // Temporal Coherence
  M9: number;  // Layer Independence
  M10: number; // Role Coherence
}

export interface EvalResult {
  metrics: MetricValues;
  gatePassed: boolean;
  qualityScore: number;
}

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function hardGate(
  metrics: MetricValues,
  threshold: number = GATE_THRESHOLD,
): boolean {
  return Object.values(metrics).every((v) => v >= threshold);
}

export function compositeScore(metrics: MetricValues): number {
  const colorMean = (metrics.M1 + metrics.M2 + metrics.M3) / 3;
  const visualMean = (metrics.M4 + metrics.M5 + metrics.M6) / 3;
  const temporalMean = (metrics.M7 + metrics.M8) / 2;
  const layerMean = (metrics.M9 + metrics.M10) / 2;

  return clamp01(
    TIER_WEIGHTS.color * colorMean +
    TIER_WEIGHTS.visual * visualMean +
    TIER_WEIGHTS.temporal * temporalMean +
    TIER_WEIGHTS.layer * layerMean,
  );
}

export function makeEvalResult(rawMetrics: MetricValues): EvalResult {
  // Clamp all metrics to 0-1
  const metrics: MetricValues = {
    M1: clamp01(rawMetrics.M1),
    M2: clamp01(rawMetrics.M2),
    M3: clamp01(rawMetrics.M3),
    M4: clamp01(rawMetrics.M4),
    M5: clamp01(rawMetrics.M5),
    M6: clamp01(rawMetrics.M6),
    M7: clamp01(rawMetrics.M7),
    M8: clamp01(rawMetrics.M8),
    M9: clamp01(rawMetrics.M9),
    M10: clamp01(rawMetrics.M10),
  };

  const gatePassed = hardGate(metrics);
  const qualityScore = gatePassed ? compositeScore(metrics) : 0;

  return { metrics, gatePassed, qualityScore };
}

// ── Frame Helpers ─────────────────────────────────────────

async function loadFrameRgb(imgPath: string): Promise<FrameData> {
  const { data, info } = await sharp(imgPath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function rgbToLab(frame: FrameData): [number, number, number][] {
  const pixels: [number, number, number][] = [];
  for (let i = 0; i < frame.data.length; i += 3) {
    pixels.push(srgbToLab(frame.data[i], frame.data[i + 1], frame.data[i + 2]));
  }
  return pixels;
}

function rgbMean(frame: FrameData): [number, number, number] {
  let rSum = 0, gSum = 0, bSum = 0;
  const n = frame.data.length / 3;
  for (let i = 0; i < frame.data.length; i += 3) {
    rSum += frame.data[i];
    gSum += frame.data[i + 1];
    bSum += frame.data[i + 2];
  }
  return [rSum / n, gSum / n, bSum / n];
}

function rgbToGray(frame: FrameData): Float64Array {
  const n = frame.width * frame.height;
  const gray = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const ri = i * 3;
    gray[i] = (0.299 * frame.data[ri] + 0.587 * frame.data[ri + 1] + 0.114 * frame.data[ri + 2]) / 255;
  }
  return gray;
}

// ── evaluateVideo: end-to-end video → score ──────────────

export interface EvaluateVideoOptions {
  videoPath: string;
  referenceCacheDir: string;
  manifestPath?: string;
  sourceVideoPath?: string;
}

export async function evaluateVideo(opts: EvaluateVideoOptions): Promise<EvalResult> {
  const { videoPath, referenceCacheDir, manifestPath, sourceVideoPath } = opts;

  if (!existsSync(videoPath)) {
    throw new Error(`Generated video not found: ${videoPath}`);
  }
  if (!existsSync(referenceCacheDir)) {
    throw new Error(`Reference cache not found: ${referenceCacheDir}. Run \`npm run research:prepare\` first.`);
  }
  if (!checkFfmpegAvailable()) {
    throw new Error("ffmpeg not found. Install with: brew install ffmpeg");
  }

  // Load reference metadata
  const metaPath = join(referenceCacheDir, "metadata.json");
  if (!existsSync(metaPath)) {
    throw new Error(`Reference metadata.json not found in ${referenceCacheDir}`);
  }
  const refMeta = JSON.parse(readFileSync(metaPath, "utf-8"));

  // Get generated video metadata
  const genMeta = getVideoMetadata(videoPath);

  // ── Extract reference keyframes ─────────────────────────
  const refFrameFiles = readdirSync(referenceCacheDir)
    .filter((f) => f.startsWith("frame_p") && f.endsWith(".png"))
    .sort();

  if (refFrameFiles.length === 0) {
    throw new Error(`No reference keyframes found in ${referenceCacheDir}`);
  }

  // Extract generated keyframes at matching timestamps
  const genTimestamps = calcProportionalTimestamps(genMeta.duration, 1);
  const tmpDir = "/tmp/research-eval-" + Date.now();
  mkdirSync(tmpDir, { recursive: true });

  const numFrames = Math.min(refFrameFiles.length, genTimestamps.length);

  // ── Color Metrics (M1, M2, M3): average over all frame pairs ──
  let m1Sum = 0, m2Sum = 0, m3Sum = 0;
  let m4Sum = 0, m5Sum = 0, m6Sum = 0;
  let colorPairCount = 0;

  for (let i = 0; i < numFrames; i++) {
    const refPath = join(referenceCacheDir, refFrameFiles[i]);
    const genFramePath = join(tmpDir, `gen_frame_${i}.png`);
    extractSingleFrame(videoPath, genFramePath, genTimestamps[i]);

    const refFrame = await loadFrameRgb(refPath);
    const genFrame = await loadFrameRgb(genFramePath);
    const [normRef, normGen] = await normalizeFramePair(refFrame, genFrame);

    // M1: Color Palette Sinkhorn
    const refLab = rgbToLab(normRef);
    const genLab = rgbToLab(normGen);
    m1Sum += computeColorPaletteSimilarity(refLab, genLab);

    // M2: Dominant Color CIEDE2000
    m2Sum += computeDominantColorAccuracy(refLab, genLab);

    // M3: Color Temperature
    m3Sum += computeColorTemperatureSimilarity(rgbMean(normRef), rgbMean(normGen));

    // M4: MS-SSIM YCbCr
    m4Sum += computeMsssimYCbCr(normRef.data, normGen.data, normRef.width, normRef.height);

    // M5: Canny Edge Preservation
    const refGray = rgbToGray(normRef);
    const genGray = rgbToGray(normGen);
    m5Sum += computeEdgePreservation(refGray, genGray, normRef.width, normRef.height);

    // M6: Texture Richness
    m6Sum += computeTextureRichness(refGray, genGray, normRef.width, normRef.height);

    colorPairCount++;
  }

  const M1 = colorPairCount > 0 ? m1Sum / colorPairCount : 0;
  const M2 = colorPairCount > 0 ? m2Sum / colorPairCount : 0;
  const M3 = colorPairCount > 0 ? m3Sum / colorPairCount : 0;
  const M4 = colorPairCount > 0 ? m4Sum / colorPairCount : 0;
  const M5 = colorPairCount > 0 ? m5Sum / colorPairCount : 0;
  const M6 = colorPairCount > 0 ? m6Sum / colorPairCount : 0;

  // ── M7: VMAF (video-level) ─────────────────────────────
  let M7 = 0.5; // fallback if VMAF not available
  if (sourceVideoPath && existsSync(sourceVideoPath) && checkVmafAvailable()) {
    try {
      M7 = computeVmaf(sourceVideoPath, videoPath);
    } catch {
      console.warn("VMAF computation failed, using fallback score 0.5");
    }
  } else if (!checkVmafAvailable()) {
    console.warn("VMAF not available (libvmaf required). Using fallback score 0.5");
  }

  // ── M8: Temporal Coherence ─────────────────────────────
  let M8 = 0.5;
  const temporalPairs = calcTemporalPairTimestamps(genMeta.duration, genMeta.fps);
  if (temporalPairs.length > 0) {
    const framePairsGray: [Float64Array, Float64Array][] = [];
    for (const [tA, tB] of temporalPairs) {
      const pathA = join(tmpDir, `temporal_a_${tA}.png`);
      const pathB = join(tmpDir, `temporal_b_${tB}.png`);
      try {
        extractSingleFrame(videoPath, pathA, tA);
        extractSingleFrame(videoPath, pathB, tB);
        const frameA = await loadFrameRgb(pathA);
        const frameB = await loadFrameRgb(pathB);
        // Normalize to same size
        const [normA, normB] = await normalizeFramePair(frameA, frameB);
        framePairsGray.push([rgbToGray(normA), rgbToGray(normB)]);
      } catch {
        // Skip pairs that fail extraction (e.g., timestamp beyond duration)
      }
    }
    if (framePairsGray.length > 0) {
      const firstPairW = Math.round(Math.sqrt(framePairsGray[0][0].length));
      const firstPairH = framePairsGray[0][0].length / firstPairW;
      M8 = computeTemporalCoherence(framePairsGray, firstPairW, firstPairH);
    }
  }

  // ── M9, M10: Layer Quality ─────────────────────────────
  let M9 = 0.5;
  let M10 = 0.5;
  if (manifestPath && existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      M9 = computeLayerIndependence(manifest);
      M10 = computeRoleCoherence(manifest);
    } catch {
      console.warn("Failed to parse manifest for layer metrics, using fallback 0.5");
    }
  }

  // ── Cleanup tmp ────────────────────────────────────────
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch { /* best-effort cleanup */ }

  return makeEvalResult({ M1, M2, M3, M4, M5, M6, M7, M8, M9, M10 });
}

// ── CLI entry point ──────────────────────────────────────

if (process.argv[1]?.endsWith("evaluate.ts")) {
  const videoPath = process.argv[2];
  if (!videoPath) {
    console.error("Usage: npm run research:eval -- <video.mp4> [--ref-cache <dir>] [--manifest <path>] [--source <path>]");
    process.exit(1);
  }

  const args = process.argv.slice(3);
  const refCacheIdx = args.indexOf("--ref-cache");
  const referenceCacheDir = refCacheIdx !== -1 && args[refCacheIdx + 1]
    ? args[refCacheIdx + 1]
    : ".cache/research/reference";

  const manifestIdx = args.indexOf("--manifest");
  const manifestPath = manifestIdx !== -1 && args[manifestIdx + 1]
    ? args[manifestIdx + 1]
    : undefined;

  const sourceIdx = args.indexOf("--source");
  const sourceVideoPath = sourceIdx !== -1 && args[sourceIdx + 1]
    ? args[sourceIdx + 1]
    : undefined;

  evaluateVideo({ videoPath, referenceCacheDir, manifestPath, sourceVideoPath })
    .then((result) => {
      console.log("\n=== Evaluation Results ===");
      console.log(`Gate: ${result.gatePassed ? "PASS" : "FAIL"}`);
      console.log(`Composite Score: ${result.qualityScore.toFixed(4)}`);
      console.log("\nMetrics:");
      const labels = [
        "M1  Color Palette", "M2  Dominant Color", "M3  Color Temperature",
        "M4  MS-SSIM", "M5  Edge Preservation", "M6  Texture Richness",
        "M7  VMAF", "M8  Temporal Coherence",
        "M9  Layer Independence", "M10 Role Coherence",
      ];
      const vals = Object.values(result.metrics);
      for (let i = 0; i < labels.length; i++) {
        console.log(`  ${labels[i]}: ${vals[i].toFixed(4)}`);
      }
    })
    .catch((err) => {
      console.error("Evaluation failed:", err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
