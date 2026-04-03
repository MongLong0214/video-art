import * as fs from "node:fs";
import * as path from "node:path";

const targetDir = process.argv[2];
const listeningIdx = process.argv.indexOf("--listening");

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log("Usage: npx tsx scripts/research/release-gate-303.ts <render-303-output-dir> [--listening listening-results.json]");
  process.exit(0);
}

if (!targetDir) {
  console.error("Usage: npx tsx scripts/research/release-gate-303.ts <render-303-output-dir> [--listening listening-results.json]");
  process.exit(1);
}

const outputDir = path.resolve(targetDir);
const listeningPath = listeningIdx >= 0 ? path.resolve(process.argv[listeningIdx + 1]) : null;

const readJson = (filePath: string) => JSON.parse(fs.readFileSync(filePath, "utf-8"));

const purityPath = path.join(outputDir, "source-purity-audit.json");
const qcPath = path.join(outputDir, "technical-qc.json");
const evaluationPath = path.join(outputDir, "evaluation-303.json");

const missing = [purityPath, qcPath, evaluationPath].filter((p) => !fs.existsSync(p));
if (missing.length > 0) {
  console.error(`Missing required artifacts: ${missing.join(", ")}`);
  process.exit(1);
}

const purity = readJson(purityPath);
const qc = readJson(qcPath);
const evaluation = readJson(evaluationPath);

let listeningSummary: Record<string, unknown> | null = null;
if (listeningPath && fs.existsSync(listeningPath)) {
  const listening = readJson(listeningPath);
  const entries = Array.isArray(listening.entries) ? listening.entries : [];
  const usableRate = entries.length === 0 ? 0 : entries.filter((e: any) => e.usable).length / entries.length;
  const releaseAdjacentRate = entries.length === 0 ? 0 : entries.filter((e: any) => e.release_adjacent).length / entries.length;
  const qualityAvg = entries.length === 0 ? 0 : entries.reduce((sum: number, e: any) => sum + (e.release_adjacent_quality ?? 0), 0) / entries.length;
  listeningSummary = {
    panel_size: listening.panel_size ?? entries.length,
    usable_rate: Number(usableRate.toFixed(3)),
    release_adjacent_rate: Number(releaseAdjacentRate.toFixed(3)),
    release_adjacent_quality_avg: Number(qualityAvg.toFixed(3)),
    passed: usableRate >= 0.7 && releaseAdjacentRate >= 0.7 && qualityAvg >= 3.5,
  };
}

const checks = {
  source_purity_pass: purity.all_within_bank === true,
  technical_qc_pass: qc.passed === true,
  benchmark_score_pass: Number(evaluation.total_score ?? 0) >= 75,
  listening_pass: listeningSummary ? listeningSummary.passed === true : null,
};

const failReasons = Object.entries(checks)
  .filter(([, passed]) => passed === false)
  .map(([name]) => name);

if (listeningSummary === null) {
  failReasons.push("listening_pending");
}

const status = failReasons.length === 0
  ? "pass"
  : listeningSummary === null && failReasons.every((reason) => reason === "listening_pending")
    ? "manual_review_required"
    : "fail";

const report = {
  version: 1,
  target_dir: outputDir,
  status,
  checks,
  fail_reasons: failReasons,
  source_purity: {
    all_within_bank: purity.all_within_bank,
    unique_source_count: purity.unique_source_count,
  },
  technical_qc: {
    passed: qc.passed,
    lufs_integrated: qc.lufs_integrated,
    peak_dbfs: qc.peak_dbfs,
    clipping_count: qc.clipping_count,
    warnings: qc.warnings,
  },
  evaluation_303: {
    total_score: evaluation.total_score,
    breakdown: evaluation.breakdown,
    penalties: evaluation.penalties,
  },
  listening: listeningSummary,
};

const outPath = path.join(outputDir, "release-report.json");
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log(`303 release report saved: ${outPath}`);
console.log(`Status: ${status}`);
