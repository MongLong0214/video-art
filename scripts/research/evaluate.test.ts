import { describe, it, expect } from "vitest";
import {
  clamp01,
  hardGate,
  compositeScore,
  type EvalResult,
  makeEvalResult,
} from "./evaluate.js";

describe("clamp01", () => {
  it("clamps negative to 0", () => expect(clamp01(-0.5)).toBe(0));
  it("clamps > 1 to 1", () => expect(clamp01(1.5)).toBe(1));
  it("preserves 0-1 value", () => expect(clamp01(0.7)).toBe(0.7));
  it("preserves 0", () => expect(clamp01(0)).toBe(0));
  it("preserves 1", () => expect(clamp01(1)).toBe(1));
});

describe("hardGate", () => {
  it("passes when all metrics >= threshold", () => {
    const metrics = { M1: 0.5, M2: 0.5, M3: 0.5, M4: 0.5, M5: 0.5, M6: 0.5, M7: 0.5, M8: 0.5, M9: 0.5, M10: 0.5 };
    expect(hardGate(metrics, 0.15)).toBe(true);
  });

  it("fails when one metric < threshold", () => {
    const metrics = { M1: 0.5, M2: 0.5, M3: 0.10, M4: 0.5, M5: 0.5, M6: 0.5, M7: 0.5, M8: 0.5, M9: 0.5, M10: 0.5 };
    expect(hardGate(metrics, 0.15)).toBe(false);
  });

  it("passes at exact threshold boundary", () => {
    const metrics = { M1: 0.15, M2: 0.15, M3: 0.15, M4: 0.15, M5: 0.15, M6: 0.15, M7: 0.15, M8: 0.15, M9: 0.15, M10: 0.15 };
    expect(hardGate(metrics, 0.15)).toBe(true);
  });
});

describe("compositeScore", () => {
  it("computes correct 4-tier weighted sum", () => {
    const metrics = { M1: 0.8, M2: 0.8, M3: 0.8, M4: 0.6, M5: 0.6, M6: 0.6, M7: 0.5, M8: 0.5, M9: 0.7, M10: 0.7 };
    // Tier1: mean(0.8,0.8,0.8)=0.8 × 0.35 = 0.28
    // Tier2: mean(0.6,0.6,0.6)=0.6 × 0.25 = 0.15
    // Tier3: mean(0.5,0.5)=0.5 × 0.20 = 0.10
    // Tier4: mean(0.7,0.7)=0.7 × 0.20 = 0.14
    // Total = 0.67
    expect(compositeScore(metrics)).toBeCloseTo(0.67, 2);
  });

  it("returns 0 for all-zero metrics", () => {
    const metrics = { M1: 0, M2: 0, M3: 0, M4: 0, M5: 0, M6: 0, M7: 0, M8: 0, M9: 0, M10: 0 };
    expect(compositeScore(metrics)).toBe(0);
  });

  it("returns 1.0 for all-perfect metrics", () => {
    const metrics = { M1: 1, M2: 1, M3: 1, M4: 1, M5: 1, M6: 1, M7: 1, M8: 1, M9: 1, M10: 1 };
    expect(compositeScore(metrics)).toBeCloseTo(1.0, 5);
  });
});

describe("makeEvalResult", () => {
  it("creates proper result when gate passes", () => {
    const metrics = { M1: 0.8, M2: 0.8, M3: 0.8, M4: 0.6, M5: 0.6, M6: 0.6, M7: 0.5, M8: 0.5, M9: 0.7, M10: 0.7 };
    const result = makeEvalResult(metrics);
    expect(result.gatePassed).toBe(true);
    expect(result.qualityScore).toBeGreaterThan(0);
    expect(result.metrics).toEqual(metrics);
  });

  it("creates result with score=0 when gate fails", () => {
    const metrics = { M1: 0.05, M2: 0.8, M3: 0.8, M4: 0.6, M5: 0.6, M6: 0.6, M7: 0.5, M8: 0.5, M9: 0.7, M10: 0.7 };
    const result = makeEvalResult(metrics);
    expect(result.gatePassed).toBe(false);
    expect(result.qualityScore).toBe(0);
  });

  it("clamps metrics to 0-1", () => {
    const metrics = { M1: 1.5, M2: -0.3, M3: 0.5, M4: 0.5, M5: 0.5, M6: 0.5, M7: 0.5, M8: 0.5, M9: 0.5, M10: 0.5 };
    const result = makeEvalResult(metrics);
    expect(result.metrics.M1).toBe(1.0);
    expect(result.metrics.M2).toBe(0.0);
  });
});
