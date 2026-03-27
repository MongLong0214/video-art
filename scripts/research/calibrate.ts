// Calibrate: measure noise floor by running same config N times
// Outputs: per-metric stats, composite stats, δ_min = max(2σ, 0.01)

const DELTA_MIN_FLOOR = 0.01;

export interface Stats {
  mean: number;
  std: number;
  min: number;
  max: number;
}

export interface CalibrationResult {
  baselineScore: number;
  deltaMin: number;
  compositeStats: Stats;
  modelVersion: string;
  runCount: number;
  timestamp: string;
}

export function computeStats(values: number[]): Stats {
  if (values.length === 0) return { mean: 0, std: 0, min: 0, max: 0 };

  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;

  let sumSqDiff = 0;
  for (const v of values) sumSqDiff += (v - mean) ** 2;
  const std = n > 1 ? Math.sqrt(sumSqDiff / (n - 1)) : 0;

  return {
    mean,
    std,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function computeDeltaMin(compositeSigma: number): number {
  return Math.max(2 * compositeSigma, DELTA_MIN_FLOOR);
}

export function buildCalibrationResult(
  compositeScores: number[],
  modelVersion: string,
): CalibrationResult {
  const stats = computeStats(compositeScores);
  const deltaMin = computeDeltaMin(stats.std);

  return {
    baselineScore: stats.mean,
    deltaMin,
    compositeStats: stats,
    modelVersion,
    runCount: compositeScores.length,
    timestamp: new Date().toISOString(),
  };
}
