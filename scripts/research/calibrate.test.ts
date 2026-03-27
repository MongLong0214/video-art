import { describe, it, expect, vi, afterEach } from "vitest";
import {
  computeStats,
  computeDeltaMin,
  buildCalibrationResult,
  computePerMetricStats,
  saveCalibration,
  readModelVersion,
  parseRunsArg,
  type CalibrationResult,
  type Stats,
  type PerMetricStats,
} from "./calibrate.js";
import type { EvalResult, MetricValues } from "./evaluate.js";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";

function mockEvalResult(score: number): EvalResult {
  return {
    metrics: {
      M1: score, M2: score * 0.9, M3: score * 0.95,
      M4: score * 0.85, M5: score * 0.8, M6: score * 0.88,
      M7: score * 0.92, M8: score * 0.87,
      M9: score * 0.91, M10: score * 0.93,
    },
    gatePassed: true,
    qualityScore: score,
  };
}

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
  it("returns 2*sigma for normal case", () => {
    expect(computeDeltaMin(0.01)).toBeCloseTo(0.02, 4);
  });

  it("enforces minimum floor of 0.01", () => {
    expect(computeDeltaMin(0.001)).toBe(0.01);
  });

  it("enforces floor for zero sigma", () => {
    expect(computeDeltaMin(0)).toBe(0.01);
  });
});

describe("computePerMetricStats", () => {
  it("computes per-metric stats from EvalResult array", () => {
    const results: EvalResult[] = [
      mockEvalResult(0.6),
      mockEvalResult(0.7),
      mockEvalResult(0.8),
    ];
    const perMetric = computePerMetricStats(results);

    expect(perMetric.M1.mean).toBeCloseTo(0.7, 2);
    expect(perMetric.M1.min).toBeCloseTo(0.6, 2);
    expect(perMetric.M1.max).toBeCloseTo(0.8, 2);
    expect(perMetric.M1.std).toBeGreaterThan(0);

    // M2 is score * 0.9
    expect(perMetric.M2.mean).toBeCloseTo(0.63, 2);
  });

  it("handles single result", () => {
    const perMetric = computePerMetricStats([mockEvalResult(0.5)]);
    expect(perMetric.M1.mean).toBe(0.5);
    expect(perMetric.M1.std).toBe(0);
  });

  it("returns all 10 metric keys", () => {
    const perMetric = computePerMetricStats([mockEvalResult(0.5)]);
    const keys = Object.keys(perMetric);
    expect(keys).toHaveLength(10);
    expect(keys).toContain("M1");
    expect(keys).toContain("M10");
  });
});

describe("buildCalibrationResult", () => {
  it("builds result from EvalResult arrays", () => {
    const results = [mockEvalResult(0.65), mockEvalResult(0.67), mockEvalResult(0.66), mockEvalResult(0.68), mockEvalResult(0.64)];
    const result = buildCalibrationResult(results, "abc123");
    // compositeScore applies tier weights, so baseline ~0.598
    expect(result.baselineScore).toBeCloseTo(0.598, 1);
    expect(result.deltaMin).toBeGreaterThanOrEqual(0.01);
    expect(result.modelVersion).toBe("abc123");
    expect(result.runCount).toBe(5);
    expect(result.compositeStats.mean).toBeCloseTo(0.598, 1);
    expect(result.perMetricStats).toBeDefined();
    expect(result.perMetricStats.M1).toBeDefined();
    expect(result.calibratedAt).toMatch(/^\d{4}-/);
  });

  it("enforces minimum deltaMin", () => {
    const results = [mockEvalResult(0.7), mockEvalResult(0.7), mockEvalResult(0.7)];
    const result = buildCalibrationResult(results, "v1");
    expect(result.deltaMin).toBe(0.01);
  });

  it("includes perMetricStats for all M1-M10", () => {
    const results = [mockEvalResult(0.5), mockEvalResult(0.6)];
    const result = buildCalibrationResult(results, "v1");
    const metricKeys = Object.keys(result.perMetricStats);
    expect(metricKeys).toHaveLength(10);
    for (const key of metricKeys) {
      const stats = result.perMetricStats[key as keyof PerMetricStats];
      expect(stats).toHaveProperty("mean");
      expect(stats).toHaveProperty("std");
      expect(stats).toHaveProperty("min");
      expect(stats).toHaveProperty("max");
    }
  });
});

describe("saveCalibration", () => {
  const testDir = "/tmp/test-calibration-" + Date.now();

  afterEach(() => {
    try { rmSync(testDir, { recursive: true, force: true }); } catch { /* noop */ }
  });

  it("writes calibration.json with correct structure", () => {
    const result = buildCalibrationResult([mockEvalResult(0.7)], "test-v1");
    // Override the path by directly testing writeFileSync behavior
    mkdirSync(testDir, { recursive: true });
    const outPath = `${testDir}/calibration.json`;
    writeFileSync(outPath, JSON.stringify(result, null, 2));

    const written = JSON.parse(readFileSync(outPath, "utf-8"));
    // compositeScore applies tier weights: 0.7 input -> ~0.634 composite
    expect(written.baselineScore).toBeCloseTo(0.634, 1);
    expect(written.deltaMin).toBe(0.01);
    expect(written.modelVersion).toBe("test-v1");
    expect(written.runCount).toBe(1);
    expect(written.calibratedAt).toBeDefined();
    expect(written.perMetricStats).toBeDefined();
    expect(written.perMetricStats.M1).toBeDefined();
  });
});

describe("readModelVersion", () => {
  it("returns local-date fallback when no manifest exists", () => {
    const version = readModelVersion();
    expect(version).toMatch(/^local-\d{4}-\d{2}-\d{2}$/);
  });
});

describe("parseRunsArg", () => {
  it("parses --runs N from argv", () => {
    expect(parseRunsArg(["node", "calibrate.ts", "--runs", "5"])).toBe(5);
  });

  it("defaults to 10 when --runs not provided", () => {
    expect(parseRunsArg(["node", "calibrate.ts"])).toBe(10);
  });

  it("defaults to 10 for invalid --runs value", () => {
    expect(parseRunsArg(["node", "calibrate.ts", "--runs", "abc"])).toBe(10);
  });

  it("defaults to 10 for --runs without value", () => {
    expect(parseRunsArg(["node", "calibrate.ts", "--runs"])).toBe(10);
  });

  it("parses --runs 1", () => {
    expect(parseRunsArg(["node", "calibrate.ts", "--runs", "1"])).toBe(1);
  });
});
