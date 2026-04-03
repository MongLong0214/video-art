import { describe, expect, it } from "vitest";
import {
  buildReferenceAbstraction,
  referenceAbstractionSchema,
} from "./reference-abstraction.js";
import {
  buildReferenceAbstractionAndIR,
  compile303CompositionIR,
  compositionIrSchema,
} from "./303-compiler.js";

const makeAnalysis = (overrides: Record<string, unknown> = {}) => ({
  bpm: { value: 142, confidence: 0.92 },
  key: "Am",
  energy_curve: Array.from({ length: 100 }, (_, i) => (i < 20 ? 0.2 : i < 70 ? 0.8 : 0.5)),
  onset_density: 6,
  kick_pattern: { positions: [0, 0.422, 0.845, 1.268] },
  hat_pattern: { positions: [0.211, 0.422, 0.633, 0.845] },
  bass_profile: { centroid: 180, variance: 60, flux: 0.35, type: "rolling" },
  structure: {
    segments: [
      { start: 0, end: 16, label: "intro" },
      { start: 16, end: 48, label: "drop" },
      { start: 48, end: 64, label: "break" },
      { start: 64, end: 96, label: "build" },
      { start: 96, end: 128, label: "drop" },
      { start: 128, end: 144, label: "outro" },
    ],
  },
  spectral_centroid: { mean: 2600, max: 5000, min: 800 },
  pitch_contour: {
    tracker_used: "pyin",
    note_events: [
      { time: 16.0, freq: 110.0, duration: 0.3, velocity: 0.9, slide: false },
      { time: 16.5, freq: 130.81, duration: 0.25, velocity: 0.7, slide: true },
      { time: 17.0, freq: 261.63, duration: 0.18, velocity: 0.6, slide: false },
      { time: 18.0, freq: 293.66, duration: 0.2, velocity: 0.8, slide: false },
    ],
  },
  warnings: [],
  ...overrides,
});

describe("reference-abstraction", () => {
  it("produces schema-valid abstraction", () => {
    const abstraction = buildReferenceAbstraction(makeAnalysis(), "fixtures/reference.wav");
    expect(() => referenceAbstractionSchema.parse(abstraction)).not.toThrow();
    expect(abstraction.sections.length).toBeGreaterThanOrEqual(4);
    expect(abstraction.roles.bass.note_events.length).toBeGreaterThan(0);
    expect(abstraction.roles.riff.note_events.length).toBeGreaterThan(0);
    expect(abstraction.roles.top.positions.length).toBeGreaterThan(0);
    expect(abstraction.roles.fx.transition_times.length).toBeGreaterThan(0);
  });

  it("records explicit fallbacks when pitch/key are missing", () => {
    const abstraction = buildReferenceAbstraction(
      makeAnalysis({
        key: null,
        pitch_contour: null,
        hat_pattern: null,
      }),
      "fixtures/fallback.wav",
    );
    expect(abstraction.fallbacks.root).toBeTruthy();
    expect(abstraction.fallbacks.bass).toBeTruthy();
    expect(abstraction.fallbacks.riff).toBeTruthy();
    expect(abstraction.fallbacks.top).toBeTruthy();
    expect(abstraction.roles.bass.note_events.length).toBeGreaterThan(0);
  });
});

describe("303-compiler", () => {
  it("produces schema-valid deterministic IR with 4 voices", () => {
    const abstraction = buildReferenceAbstraction(makeAnalysis(), "fixtures/reference.wav");
    const ir = compile303CompositionIR(abstraction, { seed: 12345 });

    expect(() => compositionIrSchema.parse(ir)).not.toThrow();
    expect(ir.voices).toHaveLength(4);
    expect(ir.voices.map((voice) => voice.role)).toEqual(["bass", "riff", "pseudo_hat", "fx"]);
  });

  it("is deterministic for the same seed", () => {
    const abstraction = buildReferenceAbstraction(makeAnalysis(), "fixtures/reference.wav");
    const a = compile303CompositionIR(abstraction, { seed: 777 });
    const b = compile303CompositionIR(abstraction, { seed: 777 });
    expect(a).toEqual(b);
  });

  it("keeps fallback path explicit in IR", () => {
    const { ir } = buildReferenceAbstractionAndIR(
      makeAnalysis({
        key: null,
        pitch_contour: null,
        hat_pattern: null,
      }),
      "fixtures/fallback.wav",
      { seed: 42 },
    );

    expect(ir.fallbacks.root).toBeTruthy();
    expect(ir.fallbacks.bass).toBeTruthy();
    expect(ir.voices.find((voice) => voice.role === "bass")?.events.length).toBeGreaterThan(0);
  });
});
