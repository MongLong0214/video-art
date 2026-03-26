import { describe, it, expect } from "vitest";
import {
  computeComparisonMetrics,
  generateComparisonReport,
  recommendVariant,
  QUALITY_THRESHOLD_PCT,
} from "./variant-comparison.js";
import type {
  ComparisonMetrics,
  ComparisonReport,
} from "./variant-comparison.js";
import type { ManifestData } from "./decomposition-manifest.js";

// ---------- helpers ----------

const makeManifest = (
  overrides: Partial<ManifestData> = {},
): ManifestData => ({
  runId: "run-test-001",
  pipelineVariant: "qwen-only",
  createdAt: "2026-03-26T00:00:00.000Z",
  sourceImage: "/tmp/source.jpg",
  preparedImage: "/tmp/prepared.png",
  models: {
    qwenImageLayered: {
      model: "qwen/qwen-image-layered",
      version: "a1b2c3d4",
      numLayersBase: 4,
    },
  },
  passes: [{ type: "qwen-base", candidateCount: 4 }],
  finalLayers: [
    { id: "layer-0", coverage: 0.4, uniqueCoverage: 0.15 },
    { id: "layer-1", coverage: 0.3, uniqueCoverage: 0.10 },
    { id: "layer-2", coverage: 0.2, uniqueCoverage: 0.08 },
  ],
  droppedCandidates: [{ id: "cand-x", reason: "low-coverage" }],
  unsafeFlag: false,
  productionMode: false,
  layerCounts: { requested: 4, selected: 4, retained: 3, dropped: 1 },
  ...overrides,
});

describe("variant-comparison", () => {
  describe("computeComparisonMetrics", () => {
    it("should compute comparison metrics from two manifests", () => {
      const manifestA = makeManifest({
        pipelineVariant: "qwen-only",
        finalLayers: [
          { id: "a-0", coverage: 0.5, uniqueCoverage: 0.20 },
          { id: "a-1", coverage: 0.3, uniqueCoverage: 0.12 },
          { id: "a-2", coverage: 0.2, uniqueCoverage: 0.05 },
        ],
        layerCounts: { requested: 4, selected: 4, retained: 3, dropped: 1 },
      });

      const manifestB = makeManifest({
        pipelineVariant: "qwen-zoedepth",
        finalLayers: [
          { id: "b-0", coverage: 0.45, uniqueCoverage: 0.25 },
          { id: "b-1", coverage: 0.35, uniqueCoverage: 0.18 },
          { id: "b-2", coverage: 0.25, uniqueCoverage: 0.10 },
          { id: "b-3", coverage: 0.15, uniqueCoverage: 0.07 },
        ],
        layerCounts: { requested: 4, selected: 5, retained: 4, dropped: 1 },
      });

      const metricsA = computeComparisonMetrics(manifestA);
      const metricsB = computeComparisonMetrics(manifestB);

      // A: mean uniqueCoverage = (0.20 + 0.12 + 0.05) / 3 ~= 0.1233
      expect(metricsA.meanUniqueCoverage).toBeCloseTo(0.1233, 3);
      expect(metricsA.retainedLayerCount).toBe(3);

      // B: mean uniqueCoverage = (0.25 + 0.18 + 0.10 + 0.07) / 4 = 0.15
      expect(metricsB.meanUniqueCoverage).toBeCloseTo(0.15, 3);
      expect(metricsB.retainedLayerCount).toBe(4);

      // A has 1 layer with uniqueCoverage < 0.02 (none in this case)
      expect(metricsA.duplicateHeavyCount).toBe(0);
      // B also 0
      expect(metricsB.duplicateHeavyCount).toBe(0);
    });
  });

  describe("generateComparisonReport", () => {
    it("should generate comparison report JSON", () => {
      const metricsA: ComparisonMetrics = {
        meanUniqueCoverage: 0.12,
        retainedLayerCount: 3,
        duplicateHeavyCount: 0,
        meanPairwiseOverlap: 0.15,
        runtimeMs: 5000,
        externalDependencyCount: 1,
      };

      const metricsB: ComparisonMetrics = {
        meanUniqueCoverage: 0.18,
        retainedLayerCount: 4,
        duplicateHeavyCount: 0,
        meanPairwiseOverlap: 0.10,
        runtimeMs: 8000,
        externalDependencyCount: 2,
      };

      const report = generateComparisonReport(metricsA, metricsB);

      expect(report).toHaveProperty("variantA");
      expect(report).toHaveProperty("variantB");
      expect(report).toHaveProperty("recommendation");
      expect(report).toHaveProperty("reason");
      expect(report.variantA).toStrictEqual(metricsA);
      expect(report.variantB).toStrictEqual(metricsB);
      expect(typeof report.recommendation).toBe("string");
      expect(["qwen-only", "qwen-zoedepth"]).toContain(report.recommendation);
      expect(report.reason.length).toBeGreaterThan(0);
    });

    it("should include all PRD section 9.3 metrics", () => {
      const metrics: ComparisonMetrics = {
        meanUniqueCoverage: 0.10,
        retainedLayerCount: 3,
        duplicateHeavyCount: 1,
        meanPairwiseOverlap: 0.12,
        runtimeMs: 6000,
        externalDependencyCount: 1,
      };

      // All 6 fields from PRD section 9.3 must be present
      const keys: Array<keyof ComparisonMetrics> = [
        "meanUniqueCoverage",
        "retainedLayerCount",
        "duplicateHeavyCount",
        "meanPairwiseOverlap",
        "runtimeMs",
        "externalDependencyCount",
      ];

      for (const key of keys) {
        expect(metrics).toHaveProperty(key);
        expect(typeof metrics[key]).toBe("number");
      }

      const report = generateComparisonReport(metrics, metrics);
      // Report must carry all metrics for both variants
      for (const key of keys) {
        expect(report.variantA).toHaveProperty(key);
        expect(report.variantB).toHaveProperty(key);
      }
    });
  });

  describe("recommendVariant", () => {
    it("should recommend qwen-only when quality is similar", () => {
      // B is only 5% better -- below threshold
      const report: ComparisonReport = {
        variantA: {
          meanUniqueCoverage: 0.12,
          retainedLayerCount: 3,
          duplicateHeavyCount: 1,
          meanPairwiseOverlap: 0.15,
          runtimeMs: 5000,
          externalDependencyCount: 1,
        },
        variantB: {
          meanUniqueCoverage: 0.126, // 5% improvement (0.006 / 0.12 = 5%)
          retainedLayerCount: 4,
          duplicateHeavyCount: 1, // same -- no decrease
          meanPairwiseOverlap: 0.12,
          runtimeMs: 8000,
          externalDependencyCount: 2,
        },
        recommendation: "qwen-only", // placeholder, will be overwritten
        reason: "",
      };

      const result = recommendVariant(report);
      expect(result).toBe("qwen-only");
    });

    it("should recommend qwen-zoedepth only when significantly better", () => {
      // B is 50% better AND has fewer duplicates
      const report: ComparisonReport = {
        variantA: {
          meanUniqueCoverage: 0.10,
          retainedLayerCount: 3,
          duplicateHeavyCount: 2,
          meanPairwiseOverlap: 0.20,
          runtimeMs: 5000,
          externalDependencyCount: 1,
        },
        variantB: {
          meanUniqueCoverage: 0.15, // 50% improvement
          retainedLayerCount: 5,
          duplicateHeavyCount: 0, // decreased from 2 to 0
          meanPairwiseOverlap: 0.08,
          runtimeMs: 9000,
          externalDependencyCount: 2,
        },
        recommendation: "qwen-only", // placeholder
        reason: "",
      };

      const result = recommendVariant(report);
      expect(result).toBe("qwen-zoedepth");
    });
  });
});
