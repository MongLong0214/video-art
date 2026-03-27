import { describe, it, expect } from "vitest";
import { clamp01, hardGate, compositeScore, makeEvalResult, type MetricValues } from "./evaluate";

function makeMetrics(base: number, overrides?: Partial<MetricValues>): MetricValues {
  return { M1: base, M2: base, M3: base, M4: base, M5: base, M6: base, M7: base, M8: base, M9: base, M10: base, ...overrides };
}

// ── clamp01 parametric ─────────────────────────────────────

describe("clamp01 parametric", () => {
  it.each([
    [-100, 0], [-1, 0], [-0.001, 0], [0, 0],
    [0.001, 0.001], [0.5, 0.5], [0.999, 0.999], [1, 1],
    [1.001, 1], [2, 1], [100, 1], [Infinity, 1],
  ] as [number, number][])("clamp01(%d) → %d", (input, expected) => {
    expect(clamp01(input)).toBe(expected);
  });

  it("NaN → NaN (not clamped)", () => {
    expect(clamp01(NaN)).toBeNaN();
  });
});

// ── hardGate parametric ────────────────────────────────────

describe("hardGate parametric", () => {
  it.each([
    [0.0, false], [0.05, false], [0.10, false], [0.14, false],
    [0.15, true], [0.16, true], [0.5, true], [1.0, true],
  ] as [number, boolean][])("uniform value %d → %s", (v, expected) => {
    expect(hardGate(makeMetrics(v))).toBe(expected);
  });

  // Single metric failing
  const metricKeys: (keyof MetricValues)[] = ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10"];
  for (const key of metricKeys) {
    it(`fails when only ${key} < threshold`, () => {
      expect(hardGate(makeMetrics(0.5, { [key]: 0.10 }))).toBe(false);
    });
  }

  it("custom threshold 0.3", () => {
    expect(hardGate(makeMetrics(0.25), 0.3)).toBe(false);
    expect(hardGate(makeMetrics(0.35), 0.3)).toBe(true);
  });
});

// ── compositeScore parametric ──────────────────────────────

describe("compositeScore parametric", () => {
  it("all zeros → 0", () => expect(compositeScore(makeMetrics(0))).toBe(0));
  it("all ones → 1", () => expect(compositeScore(makeMetrics(1))).toBeCloseTo(1, 5));
  it("all 0.5 → 0.5", () => expect(compositeScore(makeMetrics(0.5))).toBeCloseTo(0.5, 5));

  it("color-only → 0.35", () => {
    const m = makeMetrics(0, { M1: 1, M2: 1, M3: 1 });
    expect(compositeScore(m)).toBeCloseTo(0.35, 2);
  });
  it("visual-only → 0.25", () => {
    const m = makeMetrics(0, { M4: 1, M5: 1, M6: 1 });
    expect(compositeScore(m)).toBeCloseTo(0.25, 2);
  });
  it("temporal-only → 0.20", () => {
    const m = makeMetrics(0, { M7: 1, M8: 1 });
    expect(compositeScore(m)).toBeCloseTo(0.20, 2);
  });
  it("layer-only → 0.20", () => {
    const m = makeMetrics(0, { M9: 1, M10: 1 });
    expect(compositeScore(m)).toBeCloseTo(0.20, 2);
  });

  // Weights sum to 1
  it("tier weights sum to 1.0", () => {
    expect(0.35 + 0.25 + 0.20 + 0.20).toBeCloseTo(1.0, 10);
  });

  // Monotonicity
  it("increasing all metrics → increasing score", () => {
    const scores = [0.1, 0.3, 0.5, 0.7, 0.9].map(v => compositeScore(makeMetrics(v)));
    for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeGreaterThan(scores[i - 1]);
  });
});

// ── makeEvalResult comprehensive ───────────────────────────

describe("makeEvalResult comprehensive", () => {
  it("gate pass + positive score", () => {
    const r = makeEvalResult(makeMetrics(0.7));
    expect(r.gatePassed).toBe(true);
    expect(r.qualityScore).toBeCloseTo(0.7, 2);
  });

  it("gate fail → score 0", () => {
    const r = makeEvalResult(makeMetrics(0.7, { M5: 0.05 }));
    expect(r.gatePassed).toBe(false);
    expect(r.qualityScore).toBe(0);
  });

  it("clamps all metrics", () => {
    const r = makeEvalResult(makeMetrics(0.5, { M1: -1, M10: 2.5 }));
    expect(r.metrics.M1).toBe(0);
    expect(r.metrics.M10).toBe(1);
  });

  // All metric keys preserved
  it("preserves all 10 metric keys", () => {
    const r = makeEvalResult(makeMetrics(0.5));
    const keys = Object.keys(r.metrics);
    expect(keys).toHaveLength(10);
    expect(keys).toContain("M1");
    expect(keys).toContain("M10");
  });
});
