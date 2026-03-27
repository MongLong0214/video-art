// Run-Once Engine: single experiment executor
// config → pipeline → evaluate → keep/discard → results.tsv

import { existsSync, readFileSync, appendFileSync, mkdirSync } from "fs";
import { execFileSync } from "child_process";
import type { MetricValues } from "./evaluate.js";
import { evaluateVideo } from "./evaluate.js";
import { ResearchConfigSchema } from "./research-config.js";
import type { CalibrationResult } from "./calibrate.js";
import { loadBaseline, type BaselineRecord } from "./promote.js";
import {
  gitCommitConfig,
  gitRestoreConfig,
  registerSigintHandler,
  CrashCounter,
  ensureBranch,
} from "./git-automation.js";

const CALIBRATION_PATH = ".cache/research/calibration.json";
const RESULTS_TSV_PATH = ".cache/research/results.tsv";
const REFERENCE_CACHE_DIR = ".cache/research/reference";

export function ensureCalibrationExists(): void {
  if (!existsSync(CALIBRATION_PATH)) {
    throw new Error(
      "Calibration not found. Run `npm run research:calibrate` first to measure noise floor.",
    );
  }
}

const TSV_HEADER = [
  "commit", "quality_score", "gate_pass",
  "M1_palette", "M2_dominant", "M3_cct",
  "M4_msssim", "M5_edge", "M6_texture",
  "M7_vmaf", "M8_temporal",
  "M9_layer_indep", "M10_role_cohere",
  "model_version", "elapsed_ms", "status", "description",
].join("\t");

export interface TsvRowData {
  commit: string;
  qualityScore: number;
  gatePassed: boolean;
  metrics: MetricValues;
  modelVersion: string;
  elapsedMs: number;
  status: "keep" | "discard" | "crash";
  description: string;
}

export function makeKeepDecision(
  gatePassed: boolean,
  score: number,
  baselineScore: number,
  deltaMin: number,
): "keep" | "discard" {
  if (!gatePassed) return "discard";
  return score >= baselineScore + deltaMin ? "keep" : "discard";
}

export function formatTsvRow(data: TsvRowData): string {
  const m = data.metrics;
  return [
    data.commit,
    data.qualityScore.toFixed(4),
    data.gatePassed ? "1" : "0",
    m.M1.toFixed(4), m.M2.toFixed(4), m.M3.toFixed(4),
    m.M4.toFixed(4), m.M5.toFixed(4), m.M6.toFixed(4),
    m.M7.toFixed(4), m.M8.toFixed(4),
    m.M9.toFixed(4), m.M10.toFixed(4),
    data.modelVersion,
    String(data.elapsedMs),
    data.status,
    data.description,
  ].join("\t");
}

export function parseTsvHeader(): string {
  return TSV_HEADER;
}

export function formatConsoleOutput(
  expNum: number,
  score: number,
  status: string,
  delta: number,
  elapsedMs: number,
): string {
  return `[exp #${expNum}] quality: ${score.toFixed(4)} (${status}) | Δ${delta >= 0 ? "+" : ""}${delta.toFixed(4)} | ${elapsedMs}ms`;
}

export function countExperiments(tsvContent: string): number {
  if (!tsvContent.trim()) return 0;
  const lines = tsvContent.trim().split("\n");
  return Math.max(0, lines.length - 1); // minus header
}

// ── Baseline Loading (A6.3 fix) ──────────────────────────

function loadBaselineScore(): { score: number; deltaMin: number; modelVersion: string } {
  // Prefer baseline-config.json (from promote.ts) over calibration.json
  const baseline: BaselineRecord | null = loadBaseline();
  if (baseline) {
    // Load deltaMin from calibration (it's calibration-specific)
    const calibration = loadCalibration();
    return {
      score: baseline.qualityScore,
      deltaMin: calibration.deltaMin,
      modelVersion: baseline.modelVersion,
    };
  }

  // Fallback: calibration.json
  const calibration = loadCalibration();
  return {
    score: calibration.baselineScore,
    deltaMin: calibration.deltaMin,
    modelVersion: calibration.modelVersion,
  };
}

function loadCalibration(): CalibrationResult {
  ensureCalibrationExists();
  return JSON.parse(readFileSync(CALIBRATION_PATH, "utf-8"));
}

// ── Pipeline Execution ───────────────────────────────────

function runPipeline(
  config: Record<string, unknown>,
  cwd: string,
): { videoPath: string; manifestPath: string } {
  const args = ["scripts/pipeline-layers.ts"];

  // Derive CLI args from config
  if (config.method) {
    args.push("--variant", String(config.method));
  }
  if (config.numLayers) {
    args.push("--layers", String(config.numLayers));
  }

  // Input image: use source from reference metadata
  const metaPath = `${REFERENCE_CACHE_DIR}/metadata.json`;
  if (!existsSync(metaPath)) {
    throw new Error("Reference metadata not found. Run `npm run research:prepare` first.");
  }
  const refMeta = JSON.parse(readFileSync(metaPath, "utf-8"));

  // The pipeline takes an input image — use the first reference frame as proxy
  const inputPath = refMeta.sourcePath ?? "input.png";
  args.unshift(inputPath);

  const output = execFileSync("npx", ["tsx", ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 300_000, // 5 min timeout
    stdio: ["pipe", "pipe", "pipe"],
  });

  // Parse output for video path and manifest path
  // Pipeline writes to public/archive/<run>/video.mp4 and manifest.json
  const videoMatch = output.match(/video:\s*(.+\.mp4)/i) ??
    output.match(/output:\s*(.+\.mp4)/i);
  const manifestMatch = output.match(/manifest:\s*(.+\.json)/i);

  // Default paths based on pipeline convention
  const videoPath = videoMatch?.[1]?.trim() ?? "public/video.mp4";
  const manifestPath = manifestMatch?.[1]?.trim() ?? "";

  return { videoPath, manifestPath };
}

// ── main() ───────────────────────────────────────────────

export async function main(): Promise<void> {
  const cwd = process.cwd();
  const crashCounter = new CrashCounter();

  // SIGINT handler: restore config on interrupt
  registerSigintHandler(
    () => gitRestoreConfig(cwd),
    (msg) => console.log(msg),
  );

  // Step 0: Ensure autoresearch branch (AC-3.3)
  const tag = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  ensureBranch(tag, cwd);

  // Step 1: Validate config
  const configPath = "scripts/research/research-config.ts";
  let config: Record<string, unknown>;
  try {
    config = ResearchConfigSchema.parse({}) as Record<string, unknown>;
  } catch (err) {
    throw new Error(`Config validation failed: ${err instanceof Error ? err.message : err}`);
  }

  // Step 2: Load calibration
  const calibration = loadCalibration();

  // Step 3: Load baseline score (A6.3: prefer baseline-config.json)
  const { score: baselineScore, deltaMin, modelVersion: baselineModelVersion } =
    loadBaselineScore();

  // Step 4: A1.12 fix — version mismatch check
  if (calibration.modelVersion !== baselineModelVersion) {
    console.warn(
      `[WARN] Model version mismatch: calibration=${calibration.modelVersion}, baseline=${baselineModelVersion}. ` +
      `Baseline may be stale. Consider running \`npm run research:calibrate\` to recalibrate.`,
    );
  }

  // Ensure results.tsv dir exists
  mkdirSync(".cache/research", { recursive: true });

  // Count previous experiments for numbering
  let expNum = 0;
  if (existsSync(RESULTS_TSV_PATH)) {
    const existing = readFileSync(RESULTS_TSV_PATH, "utf-8");
    expNum = countExperiments(existing);
  }
  expNum += 1;

  const startMs = Date.now();
  let status: "keep" | "discard" | "crash" = "crash";
  let qualityScore = 0;
  let gatePassed = false;
  let metrics: MetricValues = {
    M1: 0, M2: 0, M3: 0, M4: 0, M5: 0,
    M6: 0, M7: 0, M8: 0, M9: 0, M10: 0,
  };
  let commitHash = "none";

  try {
    // Step 5: Run pipeline
    console.log(`[exp #${expNum}] Running pipeline...`);
    const { videoPath, manifestPath } = runPipeline(config, cwd);

    // Step 6: Evaluate generated video
    console.log(`[exp #${expNum}] Evaluating...`);
    const refMeta = JSON.parse(readFileSync(`${REFERENCE_CACHE_DIR}/metadata.json`, "utf-8"));
    const evalResult = await evaluateVideo({
      videoPath,
      referenceCacheDir: REFERENCE_CACHE_DIR,
      manifestPath: manifestPath || undefined,
      sourceVideoPath: refMeta.sourcePath,
    });

    qualityScore = evalResult.qualityScore;
    gatePassed = evalResult.gatePassed;
    metrics = evalResult.metrics;

    // Step 7: Keep/discard decision
    status = makeKeepDecision(gatePassed, qualityScore, baselineScore, deltaMin);
    const delta = qualityScore - baselineScore;

    // Step 8: Git actions
    if (status === "keep") {
      const msg = `research: exp #${expNum} score=${qualityScore.toFixed(4)} (Δ+${delta.toFixed(4)})`;
      commitHash = gitCommitConfig(msg, cwd);
      console.log(`[exp #${expNum}] KEEP — committed ${commitHash}`);
    } else {
      gitRestoreConfig(cwd);
      console.log(`[exp #${expNum}] DISCARD — config restored`);
    }

    crashCounter.recordSuccess();

    // Console output
    const elapsedMs = Date.now() - startMs;
    console.log(formatConsoleOutput(expNum, qualityScore, status, delta, elapsedMs));
  } catch (err) {
    // Step 10: Crash handling
    const elapsedMs = Date.now() - startMs;
    status = "crash";
    crashCounter.recordCrash();

    console.error(
      `[exp #${expNum}] CRASH: ${err instanceof Error ? err.message : err}`,
    );

    // Restore config on crash
    try {
      gitRestoreConfig(cwd);
    } catch { /* best-effort restore */ }

    if (crashCounter.shouldStop()) {
      throw new Error(
        `${crashCounter.count} consecutive crashes — halting. Fix the issue and retry.`,
      );
    }

    console.log(formatConsoleOutput(expNum, 0, "crash", 0, elapsedMs));
  }

  // Step 9: Append row to results.tsv
  const elapsedMs = Date.now() - startMs;

  // Write header if file doesn't exist
  if (!existsSync(RESULTS_TSV_PATH)) {
    appendFileSync(RESULTS_TSV_PATH, parseTsvHeader() + "\n");
  }

  const row = formatTsvRow({
    commit: commitHash,
    qualityScore,
    gatePassed,
    metrics,
    modelVersion: calibration.modelVersion,
    elapsedMs,
    status,
    description: `exp #${expNum}`,
  });
  appendFileSync(RESULTS_TSV_PATH, row + "\n");
}

// ── CLI entry point ──────────────────────────────────────

if (process.argv[1]?.endsWith("run-once.ts")) {
  main().catch((err) => {
    console.error("Fatal:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
