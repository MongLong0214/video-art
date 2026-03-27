// Run-Once Engine: single experiment executor
// config → pipeline → evaluate → keep/discard → results.tsv

import { existsSync } from "fs";
import type { MetricValues } from "./evaluate";

const CALIBRATION_PATH = ".cache/research/calibration.json";

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
