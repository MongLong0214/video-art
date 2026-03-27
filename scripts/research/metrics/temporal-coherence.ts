// M8: Temporal Coherence
// 0.5 x mean(consecutive SSIM) + 0.5 x mean(flicker score)
// Flicker: isolate low-motion regions, compute pixel variance only there
// Uses single-scale SSIM from ms-ssim module

import { ssimSingleScale } from "./ms-ssim.js";

const LOW_MOTION_THRESHOLD = 0.05; // pixels where |diff| < 5% of range are "low-motion"

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function consecutiveSsim(
  frameA: Float64Array,
  frameB: Float64Array,
  w: number,
  h: number,
): number {
  return ssimSingleScale(frameA, frameB, w, h);
}

export function flickerScore(
  frameA: Float64Array,
  frameB: Float64Array,
  _w: number,
  _h: number,
): number {
  // Isolate LOW-MOTION regions: pixels where |frameA - frameB| < threshold
  // Then compute pixel variance ONLY in those regions
  // Flicker = unwanted variation in regions that should be stable
  const n = frameA.length;
  const lowMotionDiffs: number[] = [];

  for (let i = 0; i < n; i++) {
    const diff = Math.abs(frameA[i] - frameB[i]);
    if (diff < LOW_MOTION_THRESHOLD) {
      lowMotionDiffs.push(diff);
    }
  }

  // If no low-motion regions exist, the entire frame is in motion -> no flicker measurable
  // Return 1.0 (no flicker detected in stable regions, because there are none)
  if (lowMotionDiffs.length === 0) {
    return 1.0;
  }

  // Compute variance of pixel differences in low-motion regions
  let sum = 0;
  for (let i = 0; i < lowMotionDiffs.length; i++) {
    sum += lowMotionDiffs[i];
  }
  const mean = sum / lowMotionDiffs.length;

  let varianceSum = 0;
  for (let i = 0; i < lowMotionDiffs.length; i++) {
    const d = lowMotionDiffs[i] - mean;
    varianceSum += d * d;
  }
  const variance = varianceSum / lowMotionDiffs.length;

  // Score = 1 - variance, clamped 0-1
  // variance is already small (differences < 0.05), so variance < 0.0025
  // Normalize: max possible variance in low-motion region ~ 0.05^2/4 ~ 0.000625
  // Use raw variance as penalty since it's already in [0, ~0.0006] range
  return clamp01(1 - variance);
}

export function computeTemporalCoherence(
  framePairs: [Float64Array, Float64Array][],
  w: number,
  h: number,
): number {
  if (framePairs.length === 0) return 0;

  let ssimSum = 0;
  let flickerSum = 0;

  for (const [a, b] of framePairs) {
    ssimSum += consecutiveSsim(a, b, w, h);
    flickerSum += flickerScore(a, b, w, h);
  }

  const meanSsim = ssimSum / framePairs.length;
  const meanFlicker = flickerSum / framePairs.length;

  return clamp01(0.5 * meanSsim + 0.5 * meanFlicker);
}
