import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";

const TMP_ROOT = fs.mkdtempSync("/tmp/render-303-");
const ANALYSIS_DIR = path.join(TMP_ROOT, "analysis");
const BANK_DIR = path.join(TMP_ROOT, "bank");
const OUT_A = path.join(TMP_ROOT, "out-a");
const OUT_B = path.join(TMP_ROOT, "out-b");
const CWD = path.resolve(import.meta.dirname, "../..");

const ANALYSIS_FIXTURE = {
  bpm: { value: 120, confidence: 0.9 },
  key: "Am",
  energy_curve: Array(64).fill(0.6),
  onset_density: 6,
  kick_pattern: { positions: [0, 0.5, 1.0, 1.5] },
  hat_pattern: null,
  bass_profile: { centroid: 180, variance: 60, flux: 0.3, type: "rolling" },
  structure: {
    segments: [
      { start: 0, end: 8, label: "intro" },
      { start: 8, end: 24, label: "drop" },
      { start: 24, end: 30, label: "outro" },
    ],
  },
  spectral_centroid: { mean: 2400, max: 4000, min: 1000 },
  pitch_contour: null,
  warnings: [],
};

const writeDummyWav = (filePath: string) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "RIFF");
};

const BANK_MANIFEST = {
  version: 2,
  samples: [
    {
      id: "A3_saw_normal_rr1",
      file: "audio/samples/303/A3_saw_normal_rr1.wav",
      root_note: "A3",
      midi: 57,
      waveform: "saw",
      articulation: "normal",
      role_tags: ["bass", "riff"],
      duration_ms: 400,
      lufs: -18,
      centroid_hz: 1800,
      transient_strength: 1.1,
      recommended_rate_range: { min: 0.9, max: 1.1 },
      slide: null,
      round_robin: 1,
    },
    {
      id: "A3_saw_stab_rr1",
      file: "audio/samples/303/A3_saw_stab_rr1.wav",
      root_note: "A3",
      midi: 57,
      waveform: "saw",
      articulation: "stab",
      role_tags: ["riff", "top"],
      duration_ms: 120,
      lufs: -17,
      centroid_hz: 2600,
      transient_strength: 4.2,
      recommended_rate_range: { min: 0.9, max: 1.2 },
      slide: null,
      round_robin: 1,
    },
    {
      id: "A3_saw_squelch_rr1",
      file: "audio/samples/303/A3_saw_squelch_rr1.wav",
      root_note: "A3",
      midi: 57,
      waveform: "saw",
      articulation: "squelch",
      role_tags: ["riff", "fx"],
      duration_ms: 300,
      lufs: -16,
      centroid_hz: 3200,
      transient_strength: 2.4,
      recommended_rate_range: { min: 0.9, max: 1.15 },
      slide: null,
      round_robin: 1,
    },
    {
      id: "A3_to_C4_slide_rr1",
      file: "audio/samples/303/A3_to_C4_slide_rr1.wav",
      root_note: "A3",
      midi: 57,
      waveform: "saw",
      articulation: "slide",
      role_tags: ["bass", "riff"],
      duration_ms: 500,
      lufs: -16,
      centroid_hz: 2400,
      transient_strength: 1.6,
      recommended_rate_range: { min: 0.95, max: 1.05 },
      slide: { from: "A3", to: "C4", type: "minor_third" },
      round_robin: 1,
    },
    {
      id: "click_rr1",
      file: "audio/samples/303/click_rr1.wav",
      root_note: "C3",
      midi: 48,
      waveform: "saw",
      articulation: "click",
      role_tags: ["top", "pseudo_hat"],
      duration_ms: 50,
      lufs: -19,
      centroid_hz: 4200,
      transient_strength: 8.0,
      recommended_rate_range: { min: 0.9, max: 1.3 },
      slide: null,
      round_robin: 1,
    },
    {
      id: "chirp_rr1",
      file: "audio/samples/303/chirp_rr1.wav",
      root_note: "C3",
      midi: 48,
      waveform: "saw",
      articulation: "chirp",
      role_tags: ["top", "fx"],
      duration_ms: 120,
      lufs: -18,
      centroid_hz: 5000,
      transient_strength: 6.0,
      recommended_rate_range: { min: 0.8, max: 1.25 },
      slide: null,
      round_robin: 1,
    },
    {
      id: "hat_short_rr1",
      file: "audio/samples/303/hat_short_rr1.wav",
      root_note: "C3",
      midi: 48,
      waveform: "saw",
      articulation: "hat_short",
      role_tags: ["top", "pseudo_hat"],
      duration_ms: 80,
      lufs: -18,
      centroid_hz: 6000,
      transient_strength: 10.0,
      recommended_rate_range: { min: 0.9, max: 1.15 },
      slide: null,
      round_robin: 1,
    },
    {
      id: "fx_sweep_acid",
      file: "audio/samples/303/fx_sweep_acid.wav",
      root_note: "C3",
      midi: 48,
      waveform: "saw",
      articulation: "sweep",
      role_tags: ["fx"],
      duration_ms: 1000,
      lufs: -17,
      centroid_hz: 3500,
      transient_strength: 1.4,
      recommended_rate_range: { min: 0.9, max: 1.1 },
      slide: null,
      round_robin: 1,
    },
    {
      id: "fx_zap",
      file: "audio/samples/303/fx_zap.wav",
      root_note: "C3",
      midi: 48,
      waveform: "saw",
      articulation: "zap",
      role_tags: ["fx", "top"],
      duration_ms: 300,
      lufs: -16,
      centroid_hz: 4200,
      transient_strength: 5.5,
      recommended_rate_range: { min: 0.9, max: 1.2 },
      slide: null,
      round_robin: 1,
    },
  ],
};

const runRender303 = (outDir: string, extraArgs: string[] = []) =>
  execFileSync(
    "npx",
    [
      "tsx",
      "scripts/render-303.ts",
      ANALYSIS_DIR,
      "--dry-run",
      "--bank-manifest",
      path.join(BANK_DIR, "manifest.json"),
      "--out-dir",
      outDir,
      "--seed",
      "1337",
      ...extraArgs,
    ],
    { encoding: "utf-8", timeout: 15000, cwd: CWD },
  );

describe("render-303 CLI", () => {
  beforeAll(() => {
    fs.mkdirSync(ANALYSIS_DIR, { recursive: true });
    fs.mkdirSync(BANK_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(ANALYSIS_DIR, "analysis.json"),
      JSON.stringify(ANALYSIS_FIXTURE, null, 2),
    );
    fs.writeFileSync(
      path.join(BANK_DIR, "manifest.json"),
      JSON.stringify(BANK_MANIFEST, null, 2),
    );
    for (const sample of BANK_MANIFEST.samples) {
      writeDummyWav(path.join(BANK_DIR, sample.file));
    }
  });

  it("writes abstraction, IR, purity audit, and score artifacts", () => {
    const output = runRender303(OUT_A, ["--stems"]);
    expect(output).toContain("render-303 dry run complete");

    const abstraction = JSON.parse(fs.readFileSync(path.join(OUT_A, "reference-abstraction.json"), "utf-8"));
    const ir = JSON.parse(fs.readFileSync(path.join(OUT_A, "composition-ir.json"), "utf-8"));
    const audit = JSON.parse(fs.readFileSync(path.join(OUT_A, "source-purity-audit.json"), "utf-8"));
    const scd = fs.readFileSync(path.join(OUT_A, "render-303.scd"), "utf-8");

    expect(abstraction.version).toBe(1);
    expect(ir.mode).toBe("303_only");
    expect(ir.voices).toHaveLength(4);
    expect(audit.all_within_bank).toBe(true);
    expect(audit.unique_source_count).toBeGreaterThan(0);
    expect(scd).toContain("sample_player");
    expect(scd).not.toContain("acid_bass");
  });

  it("render-303 source wires mastering and technical QC for non-dry-run", () => {
    const content = fs.readFileSync(path.join(CWD, "scripts/render-303.ts"), "utf-8");
    expect(content).toContain("master.py");
    expect(content).toContain("technical_qc.py");
    expect(content).toContain("technical-qc.json");
    expect(content).toContain("execFileSync(\"uv\"");
  });

  it("is deterministic for the same seed", () => {
    runRender303(OUT_A);
    runRender303(OUT_B);

    const irA = fs.readFileSync(path.join(OUT_A, "composition-ir.json"), "utf-8");
    const irB = fs.readFileSync(path.join(OUT_B, "composition-ir.json"), "utf-8");
    const auditA = JSON.parse(fs.readFileSync(path.join(OUT_A, "source-purity-audit.json"), "utf-8"));
    const auditB = JSON.parse(fs.readFileSync(path.join(OUT_B, "source-purity-audit.json"), "utf-8"));

    expect(irA).toBe(irB);
    expect(auditA.sources).toEqual(auditB.sources);
  });

  afterAll(() => {
    fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  });
});
