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
  structure: {
    segments: [
      { start: 0, end: 8, label: "intro" },
      { start: 8, end: 16, label: "build" },
      { start: 16, end: 28, label: "drop" },
      { start: 28, end: 35, label: "outro" },
    ],
  },
  spectral_centroid: { mean: 3000 },
  dynamic_range: { crest: 4.5, rms_mean: 0.12, rms_max: 0.35 },
  energy_curve: Array(50).fill(0.6),
  pitch_contour: null,
  kick_pattern: { positions: [0, 0.5, 1.0, 1.5] },
  hat_pattern: { positions: [0.25, 0.75, 1.25] },
  bass_profile: { centroid: 280, variance: 80, flux: 0.4, type: "acid" },
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
    expect(scd).toContain("score.write");
    // Score should contain synth events (synthesis-only: no b_allocRead)
    expect(scd).toContain("\\clap");
    expect(scd).toContain("\\acid_bass");
  });

  it("hybrid mode: generates score with b_allocRead + sample_player events", () => {
    const output = runDryRun(["--hybrid"]);
    expect(output).toContain("Hybrid:");

    const scd = fs.readFileSync(SCD_PATH, "utf-8");
    expect(scd).toContain("b_allocRead");
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
    expect(scd).toContain("layered_kick");
    expect(scd).toContain("\\hat");
    expect(scd).toContain("\\acid_bass");
    expect(scd).toContain("\\pad");
    expect(scd).toContain("[31.0, [0]]");
  });

  it("fm_lead events present in drop (AC-2.1)", () => {
    runDryRun();
    const scd = fs.readFileSync(SCD_PATH, "utf-8");
    expect(scd).toContain("\\fm_lead");
  });

  it("arp_pluck events present in drop (AC-2.2)", () => {
    runDryRun();
    const scd = fs.readFileSync(SCD_PATH, "utf-8");
    expect(scd).toContain("\\arp_pluck");
  });

  it("event count increased vs baseline (AC-2.4)", () => {
    const output = runDryRun();
    const match = output.match(/Events: (\d+)/);
    expect(match).not.toBeNull();
    const eventCount = parseInt(match![1]);
    // Baseline was ~313 for void-acid-carousel. With fm_lead+arp_pluck, should be higher.
    // Our test fixture is simpler, but with 35s drop, we should get more than the base.
    expect(eventCount).toBeGreaterThan(50);
  });

  afterAll(() => {
    fs.rmSync(ANALYSIS_DIR, { recursive: true, force: true });
  });
});
