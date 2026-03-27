import { describe, it, expect } from "vitest";

import {
  clamp01,
  hardGate,
  compositeScore,
  makeEvalResult,
} from "./evaluate.js";
import type { MetricValues } from "./evaluate.js";

// ---------- helpers ----------

function makeMetrics(overrides?: Partial<MetricValues>): MetricValues {
  return {
    M1: 0.5,
    M2: 0.5,
    M3: 0.5,
    M4: 0.5,
    M5: 0.5,
    M6: 0.5,
    M7: 0.5,
    M8: 0.5,
    M9: 0.5,
    M10: 0.5,
    ...overrides,
  };
}

function allAtValue(value: number): MetricValues {
  return { M1: value, M2: value, M3: value, M4: value, M5: value, M6: value, M7: value, M8: value, M9: value, M10: value };
}

// ==========================================================================
// clamp01
// ==========================================================================

describe("clamp01", () => {
  it("should return 0 for negative values", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(-0.001)).toBe(0);
    expect(clamp01(-100)).toBe(0);
  });

  it("should return 1 for values > 1", () => {
    expect(clamp01(1.1)).toBe(1);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(100)).toBe(1);
  });

  it("should return same value for [0, 1]", () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1)).toBe(1);
    expect(clamp01(0.001)).toBeCloseTo(0.001);
    expect(clamp01(0.999)).toBeCloseTo(0.999);
  });

  it("should handle NaN → return NaN (Math.max/min behavior)", () => {
    const result = clamp01(NaN);
    expect(result).toBeNaN();
  });

  it("should handle Infinity → clamp to 1", () => {
    expect(clamp01(Infinity)).toBe(1);
  });

  it("should handle -Infinity → clamp to 0", () => {
    expect(clamp01(-Infinity)).toBe(0);
  });
});

// ==========================================================================
// hardGate
// ==========================================================================

describe("hardGate", () => {
  it("should pass when all metrics above threshold", () => {
    const metrics = allAtValue(0.2);
    expect(hardGate(metrics)).toBe(true);
  });

  it("should fail when one metric is below threshold", () => {
    const metrics = makeMetrics({ M1: 0.14 });
    expect(hardGate(metrics)).toBe(false);
  });

  it("should fail when all metrics below threshold", () => {
    const metrics = allAtValue(0.1);
    expect(hardGate(metrics)).toBe(false);
  });

  it("should pass when all metrics exactly at threshold (0.15)", () => {
    const metrics = allAtValue(0.15);
    expect(hardGate(metrics)).toBe(true);
  });

  it("should fail when one metric is 0.14999", () => {
    const metrics = makeMetrics({ M5: 0.14999 });
    expect(hardGate(metrics)).toBe(false);
  });

  it("should pass when one metric is 0.15001", () => {
    const metrics = allAtValue(0.15001);
    expect(hardGate(metrics)).toBe(true);
  });

  it("should pass with all metrics at 1.0", () => {
    expect(hardGate(allAtValue(1.0))).toBe(true);
  });

  it("should fail with all metrics at 0.0", () => {
    expect(hardGate(allAtValue(0.0))).toBe(false);
  });

  it("should respect custom threshold", () => {
    const metrics = allAtValue(0.3);
    expect(hardGate(metrics, 0.3)).toBe(true);
    expect(hardGate(metrics, 0.31)).toBe(false);
  });

  it("should check all 10 metrics", () => {
    for (let i = 1; i <= 10; i++) {
      const key = `M${i}` as keyof MetricValues;
      const metrics = makeMetrics({ [key]: 0.01 });
      expect(hardGate(metrics)).toBe(false);
    }
  });
});

// ==========================================================================
// compositeScore
// ==========================================================================

describe("compositeScore", () => {
  it("should compute correct weighted sum for uniform values", () => {
    const metrics = allAtValue(0.5);
    // colorMean=0.5, visualMean=0.5, temporalMean=0.5, layerMean=0.5
    // 0.35*0.5 + 0.25*0.5 + 0.20*0.5 + 0.20*0.5 = 0.5
    expect(compositeScore(metrics)).toBeCloseTo(0.5, 4);
  });

  it("should weight color tier at 0.35", () => {
    const metricsHigh = makeMetrics({ M1: 1.0, M2: 1.0, M3: 1.0 });
    const metricsLow = makeMetrics({ M1: 0.0, M2: 0.0, M3: 0.0 });
    const diff = compositeScore(metricsHigh) - compositeScore(metricsLow);
    expect(diff).toBeCloseTo(0.35, 2);
  });

  it("should weight visual tier at 0.25", () => {
    const metricsHigh = makeMetrics({ M4: 1.0, M5: 1.0, M6: 1.0 });
    const metricsLow = makeMetrics({ M4: 0.0, M5: 0.0, M6: 0.0 });
    const diff = compositeScore(metricsHigh) - compositeScore(metricsLow);
    expect(diff).toBeCloseTo(0.25, 2);
  });

  it("should weight temporal tier at 0.20", () => {
    const metricsHigh = makeMetrics({ M7: 1.0, M8: 1.0 });
    const metricsLow = makeMetrics({ M7: 0.0, M8: 0.0 });
    const diff = compositeScore(metricsHigh) - compositeScore(metricsLow);
    expect(diff).toBeCloseTo(0.20, 2);
  });

  it("should weight layer tier at 0.20", () => {
    const metricsHigh = makeMetrics({ M9: 1.0, M10: 1.0 });
    const metricsLow = makeMetrics({ M9: 0.0, M10: 0.0 });
    const diff = compositeScore(metricsHigh) - compositeScore(metricsLow);
    expect(diff).toBeCloseTo(0.20, 2);
  });

  it("should return 1.0 for all perfect scores", () => {
    expect(compositeScore(allAtValue(1.0))).toBeCloseTo(1.0, 4);
  });

  it("should return 0 for all zero scores", () => {
    expect(compositeScore(allAtValue(0))).toBeCloseTo(0, 4);
  });

  it("should return value in [0, 1]", () => {
    const metrics = makeMetrics({
      M1: 0.8, M2: 0.3, M3: 0.7,
      M4: 0.6, M5: 0.9, M6: 0.2,
      M7: 0.4, M8: 0.5,
      M9: 0.1, M10: 0.8,
    });
    const score = compositeScore(metrics);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("should verify tier weights sum to 1.0", () => {
    expect(0.35 + 0.25 + 0.20 + 0.20).toBeCloseTo(1.0, 6);
  });
});

// ==========================================================================
// makeEvalResult
// ==========================================================================

describe("makeEvalResult", () => {
  it("should clamp all metrics to [0, 1]", () => {
    const raw = makeMetrics({ M1: -0.5, M2: 1.5, M3: 0.5 });
    const result = makeEvalResult(raw);
    expect(result.metrics.M1).toBe(0);
    expect(result.metrics.M2).toBe(1);
    expect(result.metrics.M3).toBe(0.5);
  });

  it("should set gatePassed=true when all above threshold", () => {
    const raw = allAtValue(0.5);
    const result = makeEvalResult(raw);
    expect(result.gatePassed).toBe(true);
  });

  it("should set gatePassed=false when one below threshold", () => {
    const raw = makeMetrics({ M1: 0.1 });
    const result = makeEvalResult(raw);
    expect(result.gatePassed).toBe(false);
  });

  it("should set qualityScore=0 when gate fails", () => {
    const raw = makeMetrics({ M1: 0.01 });
    const result = makeEvalResult(raw);
    expect(result.qualityScore).toBe(0);
  });

  it("should compute qualityScore when gate passes", () => {
    const raw = allAtValue(0.5);
    const result = makeEvalResult(raw);
    expect(result.qualityScore).toBeGreaterThan(0);
  });

  it("should return all 10 metrics in result", () => {
    const raw = allAtValue(0.5);
    const result = makeEvalResult(raw);
    for (let i = 1; i <= 10; i++) {
      const key = `M${i}` as keyof MetricValues;
      expect(result.metrics[key]).toBeDefined();
    }
  });

  it("should handle all-zero metrics", () => {
    const raw = allAtValue(0);
    const result = makeEvalResult(raw);
    expect(result.gatePassed).toBe(false);
    expect(result.qualityScore).toBe(0);
  });

  it("should handle all-one metrics", () => {
    const raw = allAtValue(1.0);
    const result = makeEvalResult(raw);
    expect(result.gatePassed).toBe(true);
    expect(result.qualityScore).toBeCloseTo(1.0, 4);
  });

  it("should clamp negative values before gate check", () => {
    const raw = allAtValue(-0.5);
    const result = makeEvalResult(raw);
    expect(result.gatePassed).toBe(false);
    for (let i = 1; i <= 10; i++) {
      expect(result.metrics[`M${i}` as keyof MetricValues]).toBe(0);
    }
  });
});
