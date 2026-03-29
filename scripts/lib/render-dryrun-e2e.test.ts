/**
 * Dry-run E2E: render-analysis.ts CLI validation.
 * Uses --dry-run to skip sclang, validates generated SC score (.scd).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";

const ANALYSIS_DIR = fs.mkdtempSync("/tmp/dryrun-e2e-");
const SCD_PATH = "/tmp/render-analysis.scd";
const CWD = path.resolve(import.meta.dirname, "../..");

const ANALYSIS_FIXTURE = {
  bpm: { value: 120, confidence: 0.9 },
  key: "Am",
  frequency_balance: { low: 0.4, mid: 0.35, hi: 0.25 },
  loudness: { integrated: -16, range: 8, short_term_max: -10 },
  structure: { segments: [{ start: 0, end: 35, label: "drop" }] },
  spectral_centroid: { mean: 1800 },
  dynamic_range: { crest: 4.5, rms_mean: 0.12, rms_max: 0.35 },
  energy_curve: Array(50).fill(0.6),
  pitch_contour: null,
  kick_pattern: { positions: [0, 0.5, 1.0, 1.5] },
  hat_pattern: { positions: [0.25, 0.75, 1.25] },
  bass_profile: { centroid: 280, variance: 80, flux: 0.15, type: "rolling" },
  stereo_width: 0.4,
  danceability: { score: 1.6 },
  spectral_contrast: { mean: [18, 18, 16, 14, 12, 10, 8] },
  onset_density: 6,
};

const MANIFEST_FIXTURE = {
  kick: [
    { file: "kick_001.wav", duration: 0.12, onset_time: 0.0 },
    { file: "kick_002.wav", duration: 0.11, onset_time: 0.5 },
  ],
};

const runDryRun = (extraArgs: string[] = []) => {
  return execFileSync(
    "npx",
    ["tsx", "scripts/render-analysis.ts", ANALYSIS_DIR, "--dry-run", ...extraArgs],
    { encoding: "utf-8", timeout: 15000, cwd: CWD },
  );
};

describe("Dry-run E2E: render-analysis.ts pipeline", () => {
  beforeAll(() => {
    fs.writeFileSync(
      path.join(ANALYSIS_DIR, "analysis.json"),
      JSON.stringify(ANALYSIS_FIXTURE),
    );
    fs.writeFileSync(
      path.join(ANALYSIS_DIR, "manifest.json"),
      JSON.stringify(MANIFEST_FIXTURE),
    );
  });

  it("synthesis-only: generates valid SC score with events", () => {
    const output = runDryRun();
    expect(output).toContain("Dry run");

    const scd = fs.readFileSync(SCD_PATH, "utf-8");
    expect(scd).toContain("Score([");
    expect(scd).toContain("score.recordNRT");
    expect(scd).toContain("kick.scd");
    expect(scd).toContain("bass.scd");
    expect(scd).toContain("hat.scd");
    expect(scd).toContain("sample_player.scd");
    expect(scd).toContain("render-synthesis.wav");
    // No b_allocRead in synthesis-only mode
    expect(scd).not.toContain("b_allocRead");
  });

  it("hybrid mode: generates score with b_allocRead + sample_player events", () => {
    const output = runDryRun(["--hybrid"]);
    expect(output).toContain("Hybrid:");

    const scd = fs.readFileSync(SCD_PATH, "utf-8");
    expect(scd).toContain("b_allocRead");
    expect(scd).toContain("render-hybrid.wav");
    expect(scd).toContain("sample_player");
  });

  it("--offset applies correctly (no NaN in score)", () => {
    runDryRun(["--offset", "5"]);

    const scd = fs.readFileSync(SCD_PATH, "utf-8");
    expect(scd).toContain("Score([");
    expect(scd).not.toContain("NaN");
  });

  it("--offset with missing value falls back to 0 (NaN guard)", () => {
    // --offset is last arg, no value follows → Number(undefined) was NaN, now guarded
    runDryRun(["--offset"]);

    const scd = fs.readFileSync(SCD_PATH, "utf-8");
    expect(scd).toContain("Score([");
    expect(scd).not.toContain("NaN");
  });

  it("score contains expected event types for 120bpm drop", () => {
    runDryRun();

    const scd = fs.readFileSync(SCD_PATH, "utf-8");
    // Kick events (4-on-the-floor in drop)
    expect(scd).toContain("layered_kick");
    // Hat events
    expect(scd).toContain("\\hat");
    // Bass events (key-based since no pitch_contour)
    expect(scd).toContain("\\bass");
    // Pad events (drop section)
    expect(scd).toContain("\\pad");
    // End marker
    expect(scd).toContain("[31.0, [0]]");
  });

  afterAll(() => {
    fs.rmSync(ANALYSIS_DIR, { recursive: true, force: true });
  });
});
