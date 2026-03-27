// Report: parse results.tsv + compute experiment statistics

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export interface ExperimentRow {
  commit: string;
  qualityScore: number;
  gatePassed: boolean;
  status: "keep" | "discard" | "crash";
  description: string;
  elapsedMs: number;
  modelVersion: string;
}

export interface ReportStats {
  totalCount: number;
  keepCount: number;
  discardCount: number;
  crashCount: number;
  best: ExperimentRow;
  worst: ExperimentRow;
  mean: number;
  trend: number[]; // last 10 scores
}

const EMPTY_ROW: ExperimentRow = {
  commit: "", qualityScore: 0, gatePassed: false,
  status: "crash", description: "", elapsedMs: 0, modelVersion: "",
};

export function parseTsvRows(tsvContent: string): ExperimentRow[] {
  const lines = tsvContent.trim().split("\n");
  if (lines.length <= 1) return [];

  return lines.slice(1).filter((l) => l.trim()).map((line) => {
    const cols = line.split("\t");
    return {
      commit: cols[0] ?? "",
      qualityScore: parseFloat(cols[1]) || 0,
      gatePassed: cols[2] === "1",
      status: (cols[15] as "keep" | "discard" | "crash") ?? "crash",
      description: cols[16] ?? "",
      elapsedMs: parseInt(cols[14]) || 0,
      modelVersion: cols[13] ?? "",
    };
  });
}

export function computeReportStats(rows: ExperimentRow[]): ReportStats {
  if (rows.length === 0) {
    return {
      totalCount: 0, keepCount: 0, discardCount: 0, crashCount: 0,
      best: EMPTY_ROW, worst: EMPTY_ROW, mean: 0, trend: [],
    };
  }

  const sorted = [...rows].sort((a, b) => b.qualityScore - a.qualityScore);
  const scores = rows.map((r) => r.qualityScore);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;

  return {
    totalCount: rows.length,
    keepCount: rows.filter((r) => r.status === "keep").length,
    discardCount: rows.filter((r) => r.status === "discard").length,
    crashCount: rows.filter((r) => r.status === "crash").length,
    best: sorted[0],
    worst: sorted[sorted.length - 1],
    mean,
    trend: scores.slice(-10),
  };
}

// ── Config diff for top experiments ────────────────────────

export interface ConfigParamDiff {
  param: string;
  from: unknown;
  to: unknown;
}

export interface ConfigDiffEntry {
  rank: number;
  commit: string;
  score: number;
  changedParams: ConfigParamDiff[];
}

/**
 * Extract config at a specific commit via `git show`.
 * Returns null if the commit or file is unavailable.
 */
function getConfigAtCommit(commit: string): Record<string, unknown> | null {
  try {
    const raw = execSync(
      `git show ${commit}:scripts/research/research-config.ts`,
      { encoding: "utf-8", timeout: 5000, stdio: ["pipe", "pipe", "pipe"] },
    );
    // Parse default values from Zod .default() calls
    const defaults: Record<string, unknown> = {};
    const defaultPattern = /(\w+):\s*z\.\w+\([^)]*\)(?:\.[^.]*)*\.default\(([^)]+)\)/g;
    let match;
    while ((match = defaultPattern.exec(raw)) !== null) {
      const key = match[1];
      const rawVal = match[2].trim();
      // Parse numeric / string / boolean
      if (rawVal === "true") defaults[key] = true;
      else if (rawVal === "false") defaults[key] = false;
      else if (/^-?\d+\.?\d*$/.test(rawVal)) defaults[key] = parseFloat(rawVal);
      else defaults[key] = rawVal.replace(/^["']|["']$/g, "");
    }
    return Object.keys(defaults).length > 0 ? defaults : null;
  } catch {
    return null;
  }
}

/**
 * Compare two config snapshots, returning changed params.
 */
function diffConfigs(
  baseline: Record<string, unknown>,
  target: Record<string, unknown>,
): ConfigParamDiff[] {
  const diffs: ConfigParamDiff[] = [];
  const allKeys = new Set([...Object.keys(baseline), ...Object.keys(target)]);
  for (const key of allKeys) {
    const from = baseline[key];
    const to = target[key];
    if (from !== to) {
      diffs.push({ param: key, from: from ?? "(absent)", to: to ?? "(absent)" });
    }
  }
  return diffs;
}

/**
 * Get config diffs for the top-5 "keep" experiments vs the baseline
 * (first commit in the data, or the current default config).
 *
 * Gracefully skips commits where git show fails (e.g. shallow clone,
 * amended/rebased history).
 */
export function getTopConfigDiffs(rows: ExperimentRow[]): ConfigDiffEntry[] {
  const keepRows = [...rows]
    .filter((r) => r.status === "keep")
    .sort((a, b) => b.qualityScore - a.qualityScore)
    .slice(0, 5);

  if (keepRows.length === 0) return [];

  // Baseline = first commit's config, fallback to first keep row's commit
  const baselineCommit = rows[0]?.commit ?? keepRows[0].commit;
  const baseline = getConfigAtCommit(baselineCommit);
  if (!baseline) return []; // can't diff without baseline

  const results: ConfigDiffEntry[] = [];
  for (let i = 0; i < keepRows.length; i++) {
    const row = keepRows[i];
    if (row.commit === baselineCommit) continue; // skip self-diff

    const target = getConfigAtCommit(row.commit);
    if (!target) continue; // gracefully skip unavailable commits

    const changedParams = diffConfigs(baseline, target);
    results.push({
      rank: i + 1,
      commit: row.commit,
      score: row.qualityScore,
      changedParams,
    });
  }

  return results;
}

// ── CLI entry point ────────────────────────────────────────

const __reportFilename = fileURLToPath(import.meta.url);

function main(): void {
  const researchDir = dirname(__reportFilename);
  const tsvPath = join(researchDir, "results.tsv");

  if (!existsSync(tsvPath)) {
    console.error("No results.tsv found at", tsvPath);
    process.exit(1);
  }

  const tsv = readFileSync(tsvPath, "utf-8");
  const rows = parseTsvRows(tsv);
  const stats = computeReportStats(rows);

  console.log("\n=== Research Report ===\n");
  console.log(`Total: ${stats.totalCount}  Keep: ${stats.keepCount}  Discard: ${stats.discardCount}  Crash: ${stats.crashCount}`);
  console.log(`Mean score: ${stats.mean.toFixed(4)}`);
  if (stats.totalCount > 0) {
    console.log(`Best:  ${stats.best.commit} (${stats.best.qualityScore}) — ${stats.best.description}`);
    console.log(`Worst: ${stats.worst.commit} (${stats.worst.qualityScore}) — ${stats.worst.description}`);
    console.log(`Trend (last 10): [${stats.trend.map((s) => s.toFixed(3)).join(", ")}]`);
  }

  // Top-5 config diff
  const diffs = getTopConfigDiffs(rows);
  if (diffs.length > 0) {
    console.log("\n--- Top-5 Config Diffs (vs baseline) ---\n");
    for (const d of diffs) {
      console.log(`#${d.rank}  ${d.commit.slice(0, 7)}  score=${d.score.toFixed(4)}`);
      if (d.changedParams.length === 0) {
        console.log("  (no config changes)");
      } else {
        for (const p of d.changedParams) {
          console.log(`  ${p.param}: ${JSON.stringify(p.from)} → ${JSON.stringify(p.to)}`);
        }
      }
    }
  } else if (stats.keepCount > 0) {
    console.log("\n(Config diffs unavailable — commits may not be in git history)");
  }

  console.log("");
}

// Only run CLI when executed directly (not imported by tests)
const isDirectRun = process.argv[1] &&
  __reportFilename.includes(process.argv[1].replace(/^\.\//, ""));
if (isDirectRun) {
  main();
}
