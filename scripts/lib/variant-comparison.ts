/**
 * Variant A/B comparison module.
 *
 * Computes metrics from two pipeline manifests and recommends
 * a production default variant per PRD section 9.3 / 9.4.
 */

import type { ManifestData } from "./decomposition-manifest.js";

// ---------- constants ----------

/** Minimum relative improvement in meanUniqueCoverage for qwen-zoedepth to win (PRD section 9.4) */
export const QUALITY_THRESHOLD_PCT = 10;

// ---------- types ----------

export interface ComparisonMetrics {
  meanUniqueCoverage: number;
  retainedLayerCount: number;
  /** Number of layers with uniqueCoverage < 2% */
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

// ---------- implementation ----------

/**
 * Computes comparison metrics from a single manifest.
 *
 * meanPairwiseOverlap is approximated as the average (coverage - uniqueCoverage)
 * across layers that have both values. This captures the "overlapping portion"
 * of each layer without requiring raw pixel data.
 */
export const computeComparisonMetrics = (
  manifest: ManifestData,
): ComparisonMetrics => {
  const layers = manifest.finalLayers;
  const retainedLayerCount = layers.length;

  // uniqueCoverage: treat missing as 0
  const uniqueCoverages = layers.map((l) => l.uniqueCoverage ?? 0);

  const meanUniqueCoverage =
    retainedLayerCount > 0
      ? uniqueCoverages.reduce((sum, v) => sum + v, 0) / retainedLayerCount
      : 0;

  const duplicateHeavyCount = uniqueCoverages.filter((uc) => uc < 0.02).length;

  // Approximate pairwise overlap per layer as coverage - uniqueCoverage
  const overlapValues = layers
    .filter((l) => l.uniqueCoverage !== undefined)
    .map((l) => Math.max(0, l.coverage - (l.uniqueCoverage ?? 0)));

  const meanPairwiseOverlap =
    overlapValues.length > 0
      ? overlapValues.reduce((sum, v) => sum + v, 0) / overlapValues.length
      : 0;

  // External dependency count: 1 for qwen, +1 for zoedepth
  const externalDependencyCount = manifest.models.zoeDepth ? 2 : 1;

  return {
    meanUniqueCoverage,
    retainedLayerCount,
    duplicateHeavyCount,
    meanPairwiseOverlap,
    runtimeMs: 0, // filled by caller with actual timing data
    externalDependencyCount,
  };
};

/**
 * Generates a comparison report from two sets of metrics.
 * Applies the production selection rule (PRD section 9.4).
 */
export const generateComparisonReport = (
  metricsA: ComparisonMetrics,
  metricsB: ComparisonMetrics,
): ComparisonReport => {
  const recommendation = selectVariant(metricsA, metricsB);
  const reason = buildReason(metricsA, metricsB, recommendation);

  return {
    variantA: metricsA,
    variantB: metricsB,
    recommendation,
    reason,
  };
};

/**
 * Recommends a variant from a report.
 * Re-evaluates using the raw metrics in the report, ignoring the
 * pre-filled recommendation field (which may be a placeholder).
 *
 * Production Selection Rule (PRD section 9.4):
 *   Default: qwen-only
 *   Switch to qwen-zoedepth ONLY when:
 *     1. meanUniqueCoverage improves by >= QUALITY_THRESHOLD_PCT (10%)
 *     2. AND duplicateHeavyCount decreases
 */
export const recommendVariant = (
  report: ComparisonReport,
): "qwen-only" | "qwen-zoedepth" => {
  return selectVariant(report.variantA, report.variantB);
};

// ---------- internal helpers ----------

const selectVariant = (
  a: ComparisonMetrics,
  b: ComparisonMetrics,
): "qwen-only" | "qwen-zoedepth" => {
  // Guard: if A has 0 coverage, avoid division by zero
  if (a.meanUniqueCoverage <= 0) {
    return b.meanUniqueCoverage > 0 ? "qwen-zoedepth" : "qwen-only";
  }

  const improvementPct =
    ((b.meanUniqueCoverage - a.meanUniqueCoverage) / a.meanUniqueCoverage) *
    100;

  const duplicatesDecreased = b.duplicateHeavyCount < a.duplicateHeavyCount;

  if (improvementPct >= QUALITY_THRESHOLD_PCT && duplicatesDecreased) {
    return "qwen-zoedepth";
  }

  return "qwen-only";
};

const buildReason = (
  a: ComparisonMetrics,
  b: ComparisonMetrics,
  recommendation: "qwen-only" | "qwen-zoedepth",
): string => {
  if (a.meanUniqueCoverage <= 0) {
    return recommendation === "qwen-zoedepth"
      ? "Variant A has zero uniqueCoverage; Variant B is strictly better."
      : "Both variants have zero or negative uniqueCoverage; defaulting to qwen-only.";
  }

  const improvementPct =
    ((b.meanUniqueCoverage - a.meanUniqueCoverage) / a.meanUniqueCoverage) *
    100;

  const parts: string[] = [
    `meanUniqueCoverage delta: ${improvementPct.toFixed(1)}% (A=${a.meanUniqueCoverage.toFixed(4)}, B=${b.meanUniqueCoverage.toFixed(4)})`,
    `duplicateHeavy: A=${a.duplicateHeavyCount}, B=${b.duplicateHeavyCount}`,
    `retained: A=${a.retainedLayerCount}, B=${b.retainedLayerCount}`,
  ];

  if (recommendation === "qwen-zoedepth") {
    parts.push(
      `Selected qwen-zoedepth: improvement >= ${QUALITY_THRESHOLD_PCT}% AND duplicates decreased.`,
    );
  } else {
    parts.push(
      `Selected qwen-only (default): improvement < ${QUALITY_THRESHOLD_PCT}% or duplicates did not decrease.`,
    );
  }

  return parts.join("; ");
};
