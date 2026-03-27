// Evaluate Harness — Hard Gate + Secondary Ranking
// 10 metrics (M1-M10), 4-tier weighted composite

const GATE_THRESHOLD = 0.15;

const TIER_WEIGHTS = {
  color: 0.35,    // M1, M2, M3
  visual: 0.25,   // M4, M5, M6
  temporal: 0.20,  // M7, M8
  layer: 0.20,    // M9, M10
};

export interface MetricValues {
  M1: number;  // Color Palette Sinkhorn
  M2: number;  // Dominant Color CIEDE2000
  M3: number;  // Color Temperature Ohno+Duv
  M4: number;  // MS-SSIM YCbCr
  M5: number;  // Canny Edge Preservation
  M6: number;  // Bidirectional Texture
  M7: number;  // VMAF
  M8: number;  // Temporal Coherence
  M9: number;  // Layer Independence
  M10: number; // Role Coherence
}

export interface EvalResult {
  metrics: MetricValues;
  gatePassed: boolean;
  qualityScore: number;
}

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function hardGate(
  metrics: MetricValues,
  threshold: number = GATE_THRESHOLD,
): boolean {
  return Object.values(metrics).every((v) => v >= threshold);
}

export function compositeScore(metrics: MetricValues): number {
  const colorMean = (metrics.M1 + metrics.M2 + metrics.M3) / 3;
  const visualMean = (metrics.M4 + metrics.M5 + metrics.M6) / 3;
  const temporalMean = (metrics.M7 + metrics.M8) / 2;
  const layerMean = (metrics.M9 + metrics.M10) / 2;

  return clamp01(
    TIER_WEIGHTS.color * colorMean +
    TIER_WEIGHTS.visual * visualMean +
    TIER_WEIGHTS.temporal * temporalMean +
    TIER_WEIGHTS.layer * layerMean,
  );
}

export function makeEvalResult(rawMetrics: MetricValues): EvalResult {
  // Clamp all metrics to 0-1
  const metrics: MetricValues = {
    M1: clamp01(rawMetrics.M1),
    M2: clamp01(rawMetrics.M2),
    M3: clamp01(rawMetrics.M3),
    M4: clamp01(rawMetrics.M4),
    M5: clamp01(rawMetrics.M5),
    M6: clamp01(rawMetrics.M6),
    M7: clamp01(rawMetrics.M7),
    M8: clamp01(rawMetrics.M8),
    M9: clamp01(rawMetrics.M9),
    M10: clamp01(rawMetrics.M10),
  };

  const gatePassed = hardGate(metrics);
  const qualityScore = gatePassed ? compositeScore(metrics) : 0;

  return { metrics, gatePassed, qualityScore };
}
