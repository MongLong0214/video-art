import { describe, it, expect } from "vitest";

import {
  computeComparisonMetrics,
  generateComparisonReport,
  recommendVariant,
  QUALITY_THRESHOLD_PCT,
} from "./variant-comparison.js";
import type { ComparisonMetrics, ComparisonReport } from "./variant-comparison.js";
import type { ManifestData } from "./decomposition-manifest.js";

// ---------- helpers ----------

function makeManifest(overrides?: Partial<ManifestData>): ManifestData {
  return {
    runId: "test",
    pipelineVariant: "qwen-only",
    createdAt: new Date().toISOString(),
    sourceImage: "/test/src.jpg",
    preparedImage: "/test/prep.png",
    models: {
      qwenImageLayered: { model: "qwen-vl", version: "v1.0.0", numLayersBase: 4 },
    },
    passes: [{ type: "qwen-base", candidateCount: 4 }],
    finalLayers: [
      { id: "l1", role: "background-plate", coverage: 0.8, uniqueCoverage: 0.5 },
      { id: "l2", role: "subject", coverage: 0.4, uniqueCoverage: 0.3 },
      { id: "l3", role: "detail", coverage: 0.1, uniqueCoverage: 0.08 },
    ],
    droppedCandidates: [],
    unsafeFlag: false,
    productionMode: false,
    layerCounts: { requested: null, selected: 4, retained: 3, dropped: 0 },
    ...overrides,
  };
}

function makeMetrics(overrides?: Partial<ComparisonMetrics>): ComparisonMetrics {
  return {
    meanUniqueCoverage: 0.3,
    retainedLayerCount: 4,
    duplicateHeavyCount: 1,
    meanPairwiseOverlap: 0.05,
    runtimeMs: 1000,
    externalDependencyCount: 1,
    ...overrides,
  };
}

// ==========================================================================
// computeComparisonMetrics
// ==========================================================================

describe("computeComparisonMetrics", () => {
  it("should compute meanUniqueCoverage correctly", () => {
    const manifest = makeManifest();
    const metrics = computeComparisonMetrics(manifest);
    // (0.5 + 0.3 + 0.08) / 3 = 0.2933
    expect(metrics.meanUniqueCoverage).toBeCloseTo(0.293, 2);
  });

  it("should count retained layers", () => {
    const metrics = computeComparisonMetrics(makeManifest());
    expect(metrics.retainedLayerCount).toBe(3);
  });

  it("should count duplicate-heavy layers (uniqueCoverage < 2%)", () => {
    const manifest = makeManifest({
      finalLayers: [
        { id: "l1", coverage: 0.5, uniqueCoverage: 0.3 },
        { id: "l2", coverage: 0.3, uniqueCoverage: 0.01 },
        { id: "l3", coverage: 0.1, uniqueCoverage: 0.005 },
      ],
    });
    const metrics = computeComparisonMetrics(manifest);
    expect(metrics.duplicateHeavyCount).toBe(2);
  });

  it("should treat missing uniqueCoverage as 0 (duplicate-heavy)", () => {
    const manifest = makeManifest({
      finalLayers: [
        { id: "l1", coverage: 0.5 },
        { id: "l2", coverage: 0.3, uniqueCoverage: 0.1 },
      ],
    });
    const metrics = computeComparisonMetrics(manifest);
    expect(metrics.duplicateHeavyCount).toBe(1);
  });

  it("should compute meanPairwiseOverlap as coverage - uniqueCoverage", () => {
    const manifest = makeManifest({
      finalLayers: [
        { id: "l1", coverage: 0.8, uniqueCoverage: 0.5 },
        { id: "l2", coverage: 0.4, uniqueCoverage: 0.3 },
      ],
    });
    const metrics = computeComparisonMetrics(manifest);
    // overlap per layer: (0.8-0.5)=0.3, (0.4-0.3)=0.1 => mean=0.2
    expect(metrics.meanPairwiseOverlap).toBeCloseTo(0.2, 2);
  });

  it("should set externalDependencyCount=1 for qwen-only", () => {
    const manifest = makeManifest();
    const metrics = computeComparisonMetrics(manifest);
    expect(metrics.externalDependencyCount).toBe(1);
  });

  it("should set externalDependencyCount=2 for qwen-zoedepth", () => {
    const manifest = makeManifest({
      pipelineVariant: "qwen-zoedepth",
      models: {
        qwenImageLayered: { model: "qwen-vl", version: "v1.0.0", numLayersBase: 4 },
        zoeDepth: { model: "zoe-depth", version: "v2.0.0" },
      },
    });
    const metrics = computeComparisonMetrics(manifest);
    expect(metrics.externalDependencyCount).toBe(2);
  });

  it("should handle 0 layers", () => {
    const manifest = makeManifest({ finalLayers: [] });
    const metrics = computeComparisonMetrics(manifest);
    expect(metrics.meanUniqueCoverage).toBe(0);
    expect(metrics.retainedLayerCount).toBe(0);
    expect(metrics.duplicateHeavyCount).toBe(0);
  });

  it("should handle all layers with high uniqueCoverage", () => {
    const manifest = makeManifest({
      finalLayers: Array.from({ length: 5 }, (_, i) => ({
        id: `l${i}`,
        coverage: 0.2,
        uniqueCoverage: 0.15,
      })),
    });
    const metrics = computeComparisonMetrics(manifest);
    expect(metrics.duplicateHeavyCount).toBe(0);
  });

  it("should handle all layers with low uniqueCoverage", () => {
    const manifest = makeManifest({
      finalLayers: Array.from({ length: 4 }, (_, i) => ({
        id: `l${i}`,
        coverage: 0.3,
        uniqueCoverage: 0.01,
      })),
    });
    const metrics = computeComparisonMetrics(manifest);
    expect(metrics.duplicateHeavyCount).toBe(4);
  });

  it("should clamp overlap to >= 0", () => {
    // If uniqueCoverage > coverage (unusual), overlap should be 0
    const manifest = makeManifest({
      finalLayers: [
        { id: "l1", coverage: 0.3, uniqueCoverage: 0.5 },
      ],
    });
    const metrics = computeComparisonMetrics(manifest);
    expect(metrics.meanPairwiseOverlap).toBeGreaterThanOrEqual(0);
  });

  it("should set runtimeMs to 0 by default", () => {
    const metrics = computeComparisonMetrics(makeManifest());
    expect(metrics.runtimeMs).toBe(0);
  });
});

// ==========================================================================
// generateComparisonReport
// ==========================================================================

describe("generateComparisonReport", () => {
  it("should return qwen-only when improvement < 10%", () => {
    const a = makeMetrics({ meanUniqueCoverage: 0.30, duplicateHeavyCount: 3 });
    const b = makeMetrics({ meanUniqueCoverage: 0.32, duplicateHeavyCount: 2 });
    const report = generateComparisonReport(a, b);
    expect(report.recommendation).toBe("qwen-only");
  });

  it("should return qwen-zoedepth when improvement >= 10% AND duplicates decrease", () => {
    const a = makeMetrics({ meanUniqueCoverage: 0.30, duplicateHeavyCount: 3 });
    const b = makeMetrics({ meanUniqueCoverage: 0.40, duplicateHeavyCount: 1 });
    const report = generateComparisonReport(a, b);
    expect(report.recommendation).toBe("qwen-zoedepth");
  });

  it("should return qwen-only when improvement >= 10% but duplicates did NOT decrease", () => {
    const a = makeMetrics({ meanUniqueCoverage: 0.30, duplicateHeavyCount: 2 });
    const b = makeMetrics({ meanUniqueCoverage: 0.40, duplicateHeavyCount: 2 });
    const report = generateComparisonReport(a, b);
    expect(report.recommendation).toBe("qwen-only");
  });

  it("should return qwen-only when duplicates decrease but improvement < 10%", () => {
    const a = makeMetrics({ meanUniqueCoverage: 0.30, duplicateHeavyCount: 3 });
    const b = makeMetrics({ meanUniqueCoverage: 0.31, duplicateHeavyCount: 1 });
    const report = generateComparisonReport(a, b);
    expect(report.recommendation).toBe("qwen-only");
  });

  it("should include reason string", () => {
    const a = makeMetrics();
    const b = makeMetrics();
    const report = generateComparisonReport(a, b);
    expect(report.reason).toBeDefined();
    expect(report.reason.length).toBeGreaterThan(0);
  });

  it("should include both variants metrics in report", () => {
    const a = makeMetrics({ meanUniqueCoverage: 0.3 });
    const b = makeMetrics({ meanUniqueCoverage: 0.5 });
    const report = generateComparisonReport(a, b);
    expect(report.variantA.meanUniqueCoverage).toBeCloseTo(0.3);
    expect(report.variantB.meanUniqueCoverage).toBeCloseTo(0.5);
  });

  it("should handle A with zero coverage → prefer B if positive", () => {
    const a = makeMetrics({ meanUniqueCoverage: 0 });
    const b = makeMetrics({ meanUniqueCoverage: 0.3 });
    const report = generateComparisonReport(a, b);
    expect(report.recommendation).toBe("qwen-zoedepth");
  });

  it("should default to qwen-only when both have zero coverage", () => {
    const a = makeMetrics({ meanUniqueCoverage: 0 });
    const b = makeMetrics({ meanUniqueCoverage: 0 });
    const report = generateComparisonReport(a, b);
    expect(report.recommendation).toBe("qwen-only");
  });

  it("should handle exactly 10% improvement", () => {
    const a = makeMetrics({ meanUniqueCoverage: 0.30, duplicateHeavyCount: 3 });
    const b = makeMetrics({ meanUniqueCoverage: 0.33, duplicateHeavyCount: 1 });
    const report = generateComparisonReport(a, b);
    expect(report.recommendation).toBe("qwen-zoedepth");
  });

  it("should handle B worse than A (negative improvement)", () => {
    const a = makeMetrics({ meanUniqueCoverage: 0.5, duplicateHeavyCount: 1 });
    const b = makeMetrics({ meanUniqueCoverage: 0.3, duplicateHeavyCount: 2 });
    const report = generateComparisonReport(a, b);
    expect(report.recommendation).toBe("qwen-only");
  });

  it("should include delta percentage in reason", () => {
    const a = makeMetrics({ meanUniqueCoverage: 0.3 });
    const b = makeMetrics({ meanUniqueCoverage: 0.4 });
    const report = generateComparisonReport(a, b);
    expect(report.reason).toContain("%");
  });
});

// ==========================================================================
// recommendVariant
// ==========================================================================

describe("recommendVariant", () => {
  it("should re-evaluate from report metrics", () => {
    const a = makeMetrics({ meanUniqueCoverage: 0.30, duplicateHeavyCount: 3 });
    const b = makeMetrics({ meanUniqueCoverage: 0.40, duplicateHeavyCount: 1 });
    const report: ComparisonReport = {
      variantA: a,
      variantB: b,
      recommendation: "qwen-only", // intentionally wrong
      reason: "test",
    };
    const result = recommendVariant(report);
    expect(result).toBe("qwen-zoedepth");
  });

  it("should ignore pre-filled recommendation", () => {
    const a = makeMetrics({ meanUniqueCoverage: 0.30, duplicateHeavyCount: 1 });
    const b = makeMetrics({ meanUniqueCoverage: 0.31, duplicateHeavyCount: 1 });
    const report: ComparisonReport = {
      variantA: a,
      variantB: b,
      recommendation: "qwen-zoedepth", // intentionally wrong
      reason: "test",
    };
    const result = recommendVariant(report);
    expect(result).toBe("qwen-only");
  });
});

// ==========================================================================
// QUALITY_THRESHOLD_PCT
// ==========================================================================

describe("QUALITY_THRESHOLD_PCT", () => {
  it("should be 10", () => {
    expect(QUALITY_THRESHOLD_PCT).toBe(10);
  });
});
