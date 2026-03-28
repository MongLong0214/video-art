import type { ManifestData } from "./decomposition-manifest.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ComparisonMetrics {
  meanUniqueCoverage: number;
  retainedLayerCount: number;
  duplicateHeavyCount: number;
  meanPairwiseOverlap: number;
  runtimeMs: number;
  externalDependencyCount: number;
}

export interface ComparisonReport {
  variantA: ComparisonMetrics;
  variantB: ComparisonMetrics;
  recommendation: "qwen-only" | "qwen-zoedepth";
  reason: string;
}

// ---------------------------------------------------------------------------
// Compute metrics from a single manifest
// ---------------------------------------------------------------------------

export const computeComparisonMetrics = (
  manifest: ManifestData,
): ComparisonMetrics => {
  const layers = manifest.finalLayers;
  const retainedLayerCount = layers.length;

  // Mean unique coverage across retained layers
  const meanUniqueCoverage =
    retainedLayerCount > 0
      ? layers.reduce((sum, l) => sum + (l.uniqueCoverage ?? l.coverage), 0) /
        retainedLayerCount
      : 0;

  // Count layers where coverage is very high (potential heavy duplicates)
  const duplicateHeavyCount = layers.filter(
    (l) => l.coverage > 0.8 && (l.uniqueCoverage ?? l.coverage) < 0.1,
  ).length;

  // Mean pairwise overlap approximation from coverage vs uniqueCoverage
  const totalCoverage = layers.reduce((s, l) => s + l.coverage, 0);
  const totalUnique = layers.reduce(
    (s, l) => s + (l.uniqueCoverage ?? l.coverage),
    0,
  );
  const meanPairwiseOverlap =
    totalCoverage > 0
      ? Math.max(0, (totalCoverage - totalUnique) / totalCoverage)
      : 0;

  // Runtime placeholder (not available from manifest alone)
  const runtimeMs = 0;

  // External dependency count based on pipeline variant models
  const models = manifest.models;
  let externalDependencyCount = 0;
  if (models.qwenImageLayered) externalDependencyCount += 1;
  if ((models as Record<string, unknown>).zoeDepth) externalDependencyCount += 1;

  return {
    meanUniqueCoverage,
    retainedLayerCount,
    duplicateHeavyCount,
    meanPairwiseOverlap,
    runtimeMs,
    externalDependencyCount,
  };
};

// ---------------------------------------------------------------------------
// Compare two variants and produce a recommendation
// ---------------------------------------------------------------------------

export const generateComparisonReport = (
  metricsA: ComparisonMetrics,
  metricsB: ComparisonMetrics,
): ComparisonReport => {
  // Score each variant: higher unique coverage and lower overlap is better
  const scoreA =
    metricsA.meanUniqueCoverage * 2 -
    metricsA.meanPairwiseOverlap -
    metricsA.duplicateHeavyCount * 0.1;
  const scoreB =
    metricsB.meanUniqueCoverage * 2 -
    metricsB.meanPairwiseOverlap -
    metricsB.duplicateHeavyCount * 0.1;

  const recommendation: "qwen-only" | "qwen-zoedepth" =
    scoreB > scoreA ? "qwen-zoedepth" : "qwen-only";

  const reason =
    recommendation === "qwen-zoedepth"
      ? `Variant B (qwen-zoedepth) scores higher: uniqueCoverage=${metricsB.meanUniqueCoverage.toFixed(3)}, overlap=${metricsB.meanPairwiseOverlap.toFixed(3)}`
      : `Variant A (qwen-only) scores higher or equal: uniqueCoverage=${metricsA.meanUniqueCoverage.toFixed(3)}, overlap=${metricsA.meanPairwiseOverlap.toFixed(3)}`;

  return {
    variantA: metricsA,
    variantB: metricsB,
    recommendation,
    reason,
  };
};
