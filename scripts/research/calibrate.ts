// Calibrate: measure noise floor by running full pipeline N times with identical config
// Outputs: per-metric stats, composite stats, delta_min = max(2*sigma, 0.01)

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import type { EvalResult, MetricValues } from "./evaluate.js";
import { compositeScore } from "./evaluate.js";
import { runFullPipeline, resolveInputImagePath } from "./pipeline-runner.js";

const DELTA_MIN_FLOOR = 0.01;
const CALIBRATION_DIR = ".cache/research";
const CALIBRATION_PATH = `${CALIBRATION_DIR}/calibration.json`;
const REFERENCE_CACHE_DIR = ".cache/research/reference";

export interface Stats {
  mean: number;
  std: number;
  min: number;
  max: number;
}

export type MetricKey = "M1" | "M2" | "M3" | "M4" | "M5" | "M6" | "M7" | "M8" | "M9" | "M10";

export type PerMetricStats = Record<MetricKey, Stats>;

export interface CalibrationResult {
  baselineScore: number;
  deltaMin: number;
  compositeStats: Stats;
  perMetricStats: PerMetricStats;
  modelVersion: string;
  runCount: number;
  calibratedAt: string;
}

export function computeStats(values: number[]): Stats {
  if (values.length === 0) return { mean: 0, std: 0, min: 0, max: 0 };

  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;

  let sumSqDiff = 0;
  for (const v of values) sumSqDiff += (v - mean) ** 2;
  const std = n > 1 ? Math.sqrt(sumSqDiff / (n - 1)) : 0;

  return {
    mean,
    std,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function computePerMetricStats(results: EvalResult[]): PerMetricStats {
  const keys: MetricKey[] = ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10"];
  const perMetric = {} as PerMetricStats;

  for (const key of keys) {
    const values = results.map((r) => r.metrics[key]);
    perMetric[key] = computeStats(values);
  }

  return perMetric;
}

export function computeDeltaMin(compositeSigma: number): number {
  return Math.max(2 * compositeSigma, DELTA_MIN_FLOOR);
}

export function buildCalibrationResult(
  results: EvalResult[],
  modelVersion: string,
): CalibrationResult {
  const compositeScores = results.map((r) => compositeScore(r.metrics));
  const compositeStatsResult = computeStats(compositeScores);
  const deltaMin = computeDeltaMin(compositeStatsResult.std);
  const perMetricStats = computePerMetricStats(results);

  return {
    baselineScore: compositeStatsResult.mean,
    deltaMin,
    compositeStats: compositeStatsResult,
    perMetricStats,
    modelVersion,
    runCount: results.length,
    calibratedAt: new Date().toISOString(),
  };
}

export function saveCalibration(result: CalibrationResult): string {
  mkdirSync(CALIBRATION_DIR, { recursive: true });
  writeFileSync(CALIBRATION_PATH, JSON.stringify(result, null, 2));
  return CALIBRATION_PATH;
}

export function readModelVersion(): string {
  const manifestPath = "public/manifest.json";
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      if (manifest.modelVersion) return manifest.modelVersion;
      if (manifest.model_version) return manifest.model_version;
      if (manifest.version) return manifest.version;
    } catch {
      // Fall through to default
    }
  }
  return `local-${new Date().toISOString().slice(0, 10)}`;
}

export function parseRunsArg(argv: string[]): number {
  const idx = argv.indexOf("--runs");
  if (idx !== -1 && argv[idx + 1]) {
    const n = parseInt(argv[idx + 1], 10);
    if (!Number.isNaN(n) && n >= 1) return n;
  }
  return 10;
}

// ── Calibration Loop (testable) ──────────────────────────

export interface RunDeps {
  runPipeline: (cwd: string, inputPath: string) => Promise<{ videoPath: string; manifestPath: string }>;
  evaluate: (opts: {
    videoPath: string;
    referenceCacheDir: string;
    manifestPath?: string;
    sourceVideoPath: string;
  }) => Promise<EvalResult>;
}

export async function runCalibrationLoop(
  runs: number,
  cwd: string,
  inputPath: string,
  refMeta: { sourcePath: string },
  deps: RunDeps,
): Promise<EvalResult[]> {
  const results: EvalResult[] = [];

  for (let i = 1; i <= runs; i++) {
    console.log(`[calibrate ${i}/${runs}] Running full pipeline...`);
    const runStart = Date.now();

    try {
      const pipeline = await deps.runPipeline(cwd, inputPath);

      const result = await deps.evaluate({
        videoPath: pipeline.videoPath,
        referenceCacheDir: REFERENCE_CACHE_DIR,
        manifestPath: pipeline.manifestPath || undefined,
        sourceVideoPath: refMeta.sourcePath,
      });

      results.push(result);
      const elapsed = ((Date.now() - runStart) / 1000).toFixed(1);
      console.log(`[calibrate ${i}/${runs}] composite=${compositeScore(result.metrics).toFixed(4)} (${elapsed}s)\n`);
    } catch (err) {
      const elapsed = ((Date.now() - runStart) / 1000).toFixed(1);
      console.error(`[calibrate ${i}/${runs}] FAILED (${elapsed}s): ${err instanceof Error ? err.message : err}\n`);
    }
  }

  return results;
}

// CLI entry point
if (process.argv[1]?.endsWith("calibrate.ts")) {
  const runs = parseRunsArg(process.argv);
  const modelVersion = readModelVersion();
  const cwd = process.cwd();

  console.log(`Calibration: ${runs} runs, model=${modelVersion}`);

  // Verify prerequisites
  if (!existsSync(`${REFERENCE_CACHE_DIR}/metadata.json`)) {
    console.error("Reference not prepared. Run: npm run research:prepare -- source.mp4");
    process.exit(1);
  }

  const inputPath = resolveInputImagePath(cwd);
  console.log(`Input image: ${inputPath}`);
  console.log("Running full pipeline (layers → video → evaluate) per run...\n");

  // Dynamic import to avoid pulling heavy deps at module load
  import("./evaluate.js").then(async ({ evaluateVideo }) => {
    const refMeta = JSON.parse(readFileSync(`${REFERENCE_CACHE_DIR}/metadata.json`, "utf-8"));

    const results = await runCalibrationLoop(runs, cwd, inputPath, refMeta, {
      runPipeline: (c, i) => runFullPipeline(c, i),
      evaluate: evaluateVideo,
    });

    const minRequired = Math.max(3, Math.ceil(runs * 0.5));
    if (results.length === 0) {
      console.error("No successful runs. Cannot calibrate.");
      process.exit(1);
    }
    if (results.length < minRequired) {
      console.error(
        `Insufficient successful runs: ${results.length}/${runs} (need at least ${minRequired}). ` +
        `Calibration aborted — sigma estimate unreliable with too few samples.`,
      );
      process.exit(1);
    }

    const calibration = buildCalibrationResult(results, modelVersion);
    const outPath = saveCalibration(calibration);

    console.log(`\nCalibration complete (${results.length}/${runs} successful runs)`);
    console.log(`  baseline: ${calibration.baselineScore.toFixed(4)}`);
    console.log(`  deltaMin: ${calibration.deltaMin.toFixed(4)}`);
    console.log(`  sigma:    ${calibration.compositeStats.std.toFixed(4)}`);
    console.log(`  saved:    ${outPath}`);
  }).catch((err) => {
    console.error("Fatal:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
