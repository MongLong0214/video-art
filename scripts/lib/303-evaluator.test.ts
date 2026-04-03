import { describe, expect, it } from "vitest";

import { buildReferenceAbstractionAndIR } from "./303-compiler.js";
import { evaluate303Domain } from "./303-evaluator.js";

const makeAnalysis = (overrides: Record<string, unknown> = {}) => ({
  bpm: { value: 138, confidence: 0.9 },
  key: "Am",
  energy_curve: Array.from({ length: 64 }, (_, i) => (i < 12 ? 0.2 : i < 40 ? 0.8 : 0.5)),
  onset_density: 6,
  kick_pattern: { positions: [0, 0.43, 0.86, 1.29] },
  hat_pattern: { positions: [0.21, 0.64, 1.07, 1.50] },
  bass_profile: { centroid: 180, variance: 60, flux: 0.35, type: "rolling" },
  structure: {
    segments: [
      { start: 0, end: 8, label: "intro" },
      { start: 8, end: 24, label: "drop" },
      { start: 24, end: 32, label: "outro" },
    ],
  },
  spectral_centroid: { mean: 2300, max: 4000, min: 900 },
  pitch_contour: {
    tracker_used: "pyin",
    note_events: [
      { time: 8.0, freq: 110.0, duration: 0.3, velocity: 0.9, slide: false },
      { time: 8.5, freq: 130.81, duration: 0.2, velocity: 0.7, slide: true },
      { time: 9.0, freq: 261.63, duration: 0.18, velocity: 0.6, slide: false },
    ],
  },
  warnings: [],
  ...overrides,
});

const makeAudit = (fallback = false, withinBank = true) => ({
  version: 1,
  mode: "303_only",
  seed: 123,
  bank_manifest: "audio/samples/303/manifest.json",
  all_within_bank: withinBank,
  selected_source_count: 8,
  unique_source_count: 6,
  stems_mode: false,
  sources: [
    {
      role: "bass",
      time: 8,
      requested_articulation: "normal",
      selected_id: "A3_saw_normal_rr1",
      selected_file: "audio/samples/303/A3_saw_normal_rr1.wav",
      fallback: fallback ? "articulation:normal->accent" : null,
      note_midi: 57,
      selected_midi: 57,
      rate: 1,
      source_strategy: "pitch_contour",
    },
  ],
});

describe("303-evaluator", () => {
  it("scores a self-consistent abstraction/IR highly", () => {
    const { abstraction, ir } = buildReferenceAbstractionAndIR(
      makeAnalysis(),
      "fixtures/reference.wav",
      { seed: 123 },
    );
    const score = evaluate303Domain(abstraction, ir, makeAudit());
    expect(score.total_score).toBeGreaterThan(70);
    expect(score.breakdown.technical).toBe(100);
  });

  it("penalizes source purity failures", () => {
    const { abstraction, ir } = buildReferenceAbstractionAndIR(
      makeAnalysis(),
      "fixtures/reference.wav",
      { seed: 123 },
    );
    const clean = evaluate303Domain(abstraction, ir, makeAudit(false, true));
    const dirty = evaluate303Domain(abstraction, ir, makeAudit(false, false));
    expect(dirty.total_score).toBeLessThan(clean.total_score);
    expect(dirty.penalties.source_purity_penalty).toBeGreaterThan(0);
  });

  it("penalizes fallback-heavy selections", () => {
    const { abstraction, ir } = buildReferenceAbstractionAndIR(
      makeAnalysis(),
      "fixtures/reference.wav",
      { seed: 123 },
    );
    const clean = evaluate303Domain(abstraction, ir, makeAudit(false, true));
    const fallbackHeavy = evaluate303Domain(abstraction, ir, makeAudit(true, true));
    expect(fallbackHeavy.total_score).toBeLessThan(clean.total_score);
    expect(fallbackHeavy.penalties.fallback_penalty).toBeGreaterThan(0);
  });
});
