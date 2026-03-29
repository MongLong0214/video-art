/**
 * Phase 2 E2E tests — T14 AC-3 (sections), AC-4 (buildNrtScore), AC-6 (dual-score)
 * Also covers T10, T02, T08, T11 integration points.
 */

import { describe, it, expect } from "vitest";
import { generatePreset, generateSections, generateTidalSections, mapRmsToOverrides, extractAccents } from "./track-analyzer.js";
import { presetSchema } from "./genre-preset.js";
import { buildNrtScore, type ExtendedNrtScore, type SectionOverride } from "./nrt-builder.js";
import type { NrtCommand } from "./wavetable-utils.js";
import * as fs from "node:fs";
import * as path from "node:path";

// === Fixtures ===
const makeAnalysis = (overrides: Record<string, unknown> = {}) => ({
  bpm: { value: 140, confidence: 0.9 },
  key: "Am",
  spectral_centroid: { mean: 2500, max: 5000, min: 500 },
  spectral_bandwidth: 2000,
  spectral_rolloff: 6000,
  energy_curve: Array.from({ length: 100 }, (_, i) =>
    i < 15 ? 0.2 : i < 50 ? 0.8 : i < 65 ? 0.3 : i < 80 ? 0.6 : 0.7,
  ),
  onset_density: 6,
  frequency_balance: { low: 0.5, mid: 0.3, hi: 0.2 },
  dynamic_range: { crest: 4, rms_mean: 0.15, rms_max: 0.4 },
  stereo_width: 0.5,
  kick_pattern: { positions: [0, 0.428, 0.857, 1.285] },
  hat_pattern: { positions: [0.214, 0.428, 0.642, 0.857] },
  bass_profile: { centroid: 300, variance: 100, flux: 0.5, type: "acid" },
  structure: {
    segments: [
      { start: 0, end: 30, label: "intro" },
      { start: 30, end: 90, label: "drop" },
      { start: 90, end: 120, label: "break" },
      { start: 120, end: 160, label: "build" },
      { start: 160, end: 240, label: "drop" },
      { start: 240, end: 270, label: "outro" },
    ],
  },
  loudness: { integrated: -14, range: 8, short_term_max: -8 },
  mfcc: { mean: Array(13).fill(0), std: Array(13).fill(1) },
  spectral_contrast: { mean: [20, 20, 18, 16, 14, 12, 10], std: Array(7).fill(2) },
  danceability: { score: 2.5 },
  pitch_contour: {
    tracker_used: "torchcrepe",
    note_events: [
      { time: 30, freq: 110, duration: 0.3, velocity: 0.9, slide: false },
      { time: 30.5, freq: 130.8, duration: 0.2, velocity: 0.6, slide: true },
      { time: 31, freq: 146.8, duration: 0.25, velocity: 0.8, slide: false },
    ],
  },
  warnings: [],
  ...overrides,
});

// === T14 AC-3: generatePreset outputs sections with overrides ===
describe("T14 AC-3: Preset sections", () => {
  it("generatePreset includes sections when structure available", () => {
    const preset = generatePreset(makeAnalysis(), "test-track");
    const validated = presetSchema.parse(preset);
    expect(validated.sections).toBeDefined();
    expect(validated.sections!.length).toBe(6);
  });

  it("sections have correct labels", () => {
    const preset = generatePreset(makeAnalysis(), "test-track");
    const labels = preset.sections!.map((s) => s.label);
    expect(labels).toEqual(["intro", "drop", "break", "build", "drop", "outro"]);
  });

  it("sections have synthOverrides and fxOverrides", () => {
    const preset = generatePreset(makeAnalysis(), "test-track");
    for (const section of preset.sections!) {
      expect(section.synthOverrides).toBeDefined();
      expect(section.fxOverrides).toBeDefined();
    }
  });

  it("drop section has high compress/drive", () => {
    const preset = generatePreset(makeAnalysis(), "test-track");
    const drop = preset.sections!.find((s) => s.label === "drop")!;
    expect(drop.fxOverrides!.compress).toBeGreaterThanOrEqual(0.4);
    expect(drop.fxOverrides!.saturate).toBeGreaterThanOrEqual(0.2);
  });

  it("break section has low compress/drive", () => {
    const preset = generatePreset(makeAnalysis(), "test-track");
    const brk = preset.sections!.find((s) => s.label === "break")!;
    expect(brk.fxOverrides!.compress).toBeLessThanOrEqual(0.3);
    expect(brk.fxOverrides!.drive).toBeLessThanOrEqual(0.2);
  });

  it("no sections when structure is null", () => {
    const preset = generatePreset(makeAnalysis({ structure: null }), "test-track");
    expect(preset.sections).toBeUndefined();
  });

  it("acid_bass routing: type=acid → stemGroups.bass=acid_bass", () => {
    const preset = generatePreset(makeAnalysis(), "test-track");
    expect(preset.stemGroups.bass).toEqual(["acid_bass"]);
    expect(preset.synthParams.acid_bass).toBeDefined();
  });

  it("acid_bass routing: type=sub → no acid_bass", () => {
    const preset = generatePreset(
      makeAnalysis({ bass_profile: { centroid: 200, variance: 50, flux: 0.1, type: "sub" } }),
      "test-track",
    );
    expect(preset.stemGroups.bass).toEqual(["bass"]);
    expect(preset.synthParams.acid_bass).toBeUndefined();
  });
});

// === T14 AC-4: buildNrtScore produces merged score ===
describe("T14 AC-4: buildNrtScore", () => {
  const makeBaseScore = (): ExtendedNrtScore => ({
    metadata: { duration: 30, eventCount: 3, mapped: 3, skipped: 0, skipRate: 0 },
    events: [
      { time: 0, synthDef: "pad", stem: "synth", bus: 4, nodeId: 1000, params: { freq: 220, amp: 0.4, dur: 30 } },
      { time: 0, synthDef: "kick", stem: "drums", bus: 0, nodeId: 1001, params: { freq: 50, amp: 0.5, dur: 0.3 } },
      { time: 5, synthDef: "bass", stem: "bass", bus: 2, nodeId: 1002, params: { freq: 110, amp: 0.4, dur: 0.5 } },
    ],
  });

  it("merges buffer commands", () => {
    const bufCmds: NrtCommand[] = [
      { time: 0, msg: ["/b_alloc", 8, 2048, 1] },
    ];
    const result = buildNrtScore(makeBaseScore(), bufCmds, []);
    expect(result.bufferCommands).toEqual(bufCmds);
  });

  it("generates control events at section boundaries", () => {
    const sections: SectionOverride[] = [
      { label: "drop", start: 0, end: 15, synthOverrides: { pad: { amp: 0.15 } } },
      { label: "break", start: 15, end: 30, synthOverrides: { pad: { amp: 0.5 } } },
    ];
    const result = buildNrtScore(makeBaseScore(), [], sections);
    // pad node (1000) spans 0-30, so should get n_set at section boundaries
    expect(result.controlEvents).toBeDefined();
    const padControls = result.controlEvents!.filter((e) => e.nodeId === 1000);
    // break boundary at t=15 (pad is active 0-30)
    expect(padControls.some((e) => e.time === 15 && e.params.amp === 0.5)).toBe(true);
  });

  it("empty sections → no control events", () => {
    const result = buildNrtScore(makeBaseScore(), [], []);
    expect(result.controlEvents).toEqual([]);
  });

  it("overlapping sections → Error", () => {
    const sections: SectionOverride[] = [
      { label: "drop", start: 0, end: 20 },
      { label: "break", start: 15, end: 30 },
    ];
    expect(() => buildNrtScore(makeBaseScore(), [], sections)).toThrow(/Overlapping/);
  });

  it("negative section start → clamped to 0", () => {
    const sections: SectionOverride[] = [
      { label: "intro", start: -5, end: 10, synthOverrides: { pad: { amp: 0.3 } } },
    ];
    const result = buildNrtScore(makeBaseScore(), [], sections);
    // Should not throw, start clamped to 0
    expect(result).toBeDefined();
  });
});

// === RMS envelope following ===
describe("T10 AC-3: RMS envelope following", () => {
  it("high RMS → high compress/drive", () => {
    const result = mapRmsToOverrides([0.8, 0.9, 0.85, 0.75], 0, 1);
    expect(result.compress).toBe(0.8);
    expect(result.drive).toBe(0.6);
  });

  it("low RMS → low compress/drive", () => {
    const result = mapRmsToOverrides([0.1, 0.15, 0.2, 0.1], 0, 1);
    expect(result.compress).toBe(0.25);
    expect(result.drive).toBe(0.15);
  });

  it("empty curve → defaults", () => {
    const result = mapRmsToOverrides([], 0, 1);
    expect(result.compress).toBe(0.5);
    expect(result.drive).toBe(0.3);
  });
});

// === Accent extraction ===
describe("T10 AC-4: Accent extraction", () => {
  it("extracts high-velocity notes as accents", () => {
    const notes = [
      { time: 1.0, velocity: 0.9 },
      { time: 2.0, velocity: 0.5 },
      { time: 3.0, velocity: 0.8 },
      { time: 4.0, velocity: 0.3 },
    ];
    const accents = extractAccents(notes, 0, 5, 0.7);
    expect(accents).toEqual([1.0, 3.0]);
  });

  it("respects segment boundaries", () => {
    const notes = [
      { time: 1.0, velocity: 0.9 },
      { time: 10.0, velocity: 0.9 },
    ];
    const accents = extractAccents(notes, 0, 5);
    expect(accents).toEqual([1.0]);
  });
});

// === Tidal sections ===
describe("T10 AC-7: Tidal section blocks", () => {
  it("generates section-aware output", () => {
    const output = generateTidalSections(makeAnalysis());
    expect(output).toContain("-- drop");
    expect(output).toContain("-- break");
    expect(output).toContain("-- intro");
  });

  it("includes section time ranges", () => {
    const output = generateTidalSections(makeAnalysis());
    expect(output).toContain("0.0s");
    expect(output).toContain("30.0s");
  });

  it("single block when no structure", () => {
    const output = generateTidalSections(makeAnalysis({ structure: null }));
    expect(output).toContain("BPM: 140");
    expect(output).not.toContain("-- drop");
  });
});

// === T02 AC-3: RLPFD detect ===
describe("T02 AC-3: SC plugins detect", () => {
  it("sc-plugins-detect module exists", async () => {
    const modPath = path.resolve(import.meta.dirname, "sc-plugins-detect.ts");
    expect(fs.existsSync(modPath)).toBe(true);
  });

  it("exports hasRLPFD function", async () => {
    const mod = await import("./sc-plugins-detect.js");
    expect(typeof mod.hasRLPFD).toBe("function");
  });

  it("acid_bass_rlpfd.scd exists", () => {
    const rlpfdPath = path.resolve(import.meta.dirname, "../../audio/sc/synthdefs/acid_bass_rlpfd.scd");
    expect(fs.existsSync(rlpfdPath)).toBe(true);
  });
});

// === T11 AC-7: Benchmark tracks schema ===
describe("T11 AC-7: Benchmark tracks", () => {
  it("benchmark-tracks.json exists and is valid", () => {
    const benchPath = path.resolve(import.meta.dirname, "../../audio/analyzer/benchmark-tracks.json");
    expect(fs.existsSync(benchPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(benchPath, "utf-8"));
    expect(data.tracks).toHaveLength(5);
    expect(data.scoring.per_stem_targets.drums).toBe(80);
    expect(data.scoring.per_stem_targets.bass).toBe(75);
    expect(data.scoring.per_stem_targets.synth).toBe(70);
  });
});

// === Schema backward compatibility ===
describe("Schema backward compatibility", () => {
  it("preset without sections validates", () => {
    const preset = generatePreset(makeAnalysis({ structure: null }), "test");
    expect(() => presetSchema.parse(preset)).not.toThrow();
    expect(preset.sections).toBeUndefined();
  });

  it("preset with sections validates", () => {
    const preset = generatePreset(makeAnalysis(), "test");
    expect(() => presetSchema.parse(preset)).not.toThrow();
    expect(preset.sections!.length).toBeGreaterThan(0);
  });
});
