// M8: Temporal Coherence
// 0.5 × mean(consecutive SSIM) + 0.5 × mean(flicker score)
// Uses single-scale SSIM from ms-ssim module

import { ssimSingleScale } from "./ms-ssim";

const MAX_MEAN_DIFF = 128; // max mean absolute pixel difference (half of 255)

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
  w: number,
  h: number,
): number {
  // Mean absolute pixel difference — high = flicker/instability
  const n = w * h;
  let sumDiff = 0;

  for (let i = 0; i < n; i++) {
    sumDiff += Math.abs(frameA[i] - frameB[i]);
  }

  const meanDiff = sumDiff / n;
  return clamp01(1 - meanDiff / MAX_MEAN_DIFF);
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
