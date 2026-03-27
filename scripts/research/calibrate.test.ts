import { describe, it, expect } from "vitest";
import {
  computeStats,
  computeDeltaMin,
  type CalibrationResult,
  buildCalibrationResult,
} from "./calibrate";

describe("computeStats", () => {
  it("computes mean and std correctly", () => {
    const stats = computeStats([0.8, 0.85, 0.82]);
    expect(stats.mean).toBeCloseTo(0.823, 2);
    expect(stats.std).toBeGreaterThan(0.02);
    expect(stats.min).toBe(0.8);
    expect(stats.max).toBe(0.85);
  });

  it("returns 0 std for identical values", () => {
    const stats = computeStats([0.5, 0.5, 0.5]);
    expect(stats.mean).toBe(0.5);
    expect(stats.std).toBe(0);
  });

  it("handles single value", () => {
    const stats = computeStats([0.7]);
    expect(stats.mean).toBe(0.7);
    expect(stats.std).toBe(0);
  });

  it("handles empty array", () => {
    const stats = computeStats([]);
    expect(stats.mean).toBe(0);
    expect(stats.std).toBe(0);
  });
});

describe("computeDeltaMin", () => {
  it("returns 2σ for normal case", () => {
    expect(computeDeltaMin(0.01)).toBeCloseTo(0.02, 4);
  });

  it("enforces minimum floor of 0.01", () => {
    expect(computeDeltaMin(0.001)).toBe(0.01);
  });

  it("enforces floor for zero sigma", () => {
    expect(computeDeltaMin(0)).toBe(0.01);
  });
});

describe("buildCalibrationResult", () => {
  it("builds result from score arrays", () => {
    const scores = [0.65, 0.67, 0.66, 0.68, 0.64];
    const result = buildCalibrationResult(scores, "abc123");
    expect(result.baselineScore).toBeCloseTo(0.66, 2);
    expect(result.deltaMin).toBeGreaterThanOrEqual(0.01);
    expect(result.modelVersion).toBe("abc123");
    expect(result.runCount).toBe(5);
    expect(result.compositeStats.mean).toBeCloseTo(0.66, 2);
  });

  it("enforces minimum deltaMin", () => {
    const scores = [0.7, 0.7, 0.7]; // std=0
    const result = buildCalibrationResult(scores, "v1");
    expect(result.deltaMin).toBe(0.01);
  });
});
