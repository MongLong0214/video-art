import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";

const TMP_DIR = fs.mkdtempSync("/tmp/release-gate-303-");
const CWD = path.resolve(import.meta.dirname, "../..");

describe("release-gate-303 CLI", () => {
  beforeAll(() => {
    fs.writeFileSync(path.join(TMP_DIR, "source-purity-audit.json"), JSON.stringify({
      all_within_bank: true,
      unique_source_count: 8,
    }, null, 2));
    fs.writeFileSync(path.join(TMP_DIR, "technical-qc.json"), JSON.stringify({
      passed: true,
      lufs_integrated: -14.2,
      peak_dbfs: -0.4,
      clipping_count: 0,
      warnings: [],
    }, null, 2));
    fs.writeFileSync(path.join(TMP_DIR, "evaluation-303.json"), JSON.stringify({
      total_score: 82.5,
      breakdown: { groove: 80, contour: 85, section_shape: 78, density: 79, filter_motion: 83, technical: 100 },
      penalties: { source_purity_penalty: 0, fallback_penalty: 0 },
    }, null, 2));
    fs.writeFileSync(path.join(TMP_DIR, "listening-results.json"), JSON.stringify({
      panel_size: 3,
      entries: [
        { listener: "L1", release_adjacent_quality: 4, usable: true, release_adjacent: true },
        { listener: "L2", release_adjacent_quality: 4, usable: true, release_adjacent: true },
        { listener: "L3", release_adjacent_quality: 3.5, usable: true, release_adjacent: true },
      ],
    }, null, 2));
  });

  it("produces manual_review_required when listening is missing", () => {
    const output = execFileSync(
      "npx",
      ["tsx", "scripts/research/release-gate-303.ts", TMP_DIR],
      { encoding: "utf-8", timeout: 15000, cwd: CWD },
    );
    expect(output).toContain("manual_review_required");
    const report = JSON.parse(fs.readFileSync(path.join(TMP_DIR, "release-report.json"), "utf-8"));
    expect(report.status).toBe("manual_review_required");
  });

  it("produces pass when all auto and listening gates pass", () => {
    const output = execFileSync(
      "npx",
      [
        "tsx",
        "scripts/research/release-gate-303.ts",
        TMP_DIR,
        "--listening",
        path.join(TMP_DIR, "listening-results.json"),
      ],
      { encoding: "utf-8", timeout: 15000, cwd: CWD },
    );
    expect(output).toContain("Status: pass");
    const report = JSON.parse(fs.readFileSync(path.join(TMP_DIR, "release-report.json"), "utf-8"));
    expect(report.status).toBe("pass");
    expect(report.checks.benchmark_score_pass).toBe(true);
    expect(report.listening.passed).toBe(true);
  });

  afterAll(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });
});
