// M2: Dominant Color Accuracy (CIEDE2000)
// Top-3 dominant colors, weighted 0.5/0.3/0.2

import { kmeanspp, ciede2000 } from "./color-palette";

const WEIGHTS = [0.5, 0.3, 0.2];
const MAX_DELTA_E = 50;
const TOP_K = 3;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function computeDominantColorAccuracy(
  refPixelsLab: [number, number, number][],
  genPixelsLab: [number, number, number][],
): number {
  if (refPixelsLab.length === 0 || genPixelsLab.length === 0) return 0;

  const refResult = kmeanspp(refPixelsLab, Math.max(TOP_K, 3), 42);
  const genResult = kmeanspp(genPixelsLab, Math.max(TOP_K, 3), 42);

  // Sort by weight (descending) to get dominant colors
  const refSorted = refResult.centroids
    .map((c, i) => ({ c, w: refResult.weights[i] }))
    .sort((a, b) => b.w - a.w);
  const genSorted = genResult.centroids
    .map((c, i) => ({ c, w: genResult.weights[i] }))
    .sort((a, b) => b.w - a.w);

  const k = Math.min(TOP_K, refSorted.length, genSorted.length);
  if (k === 0) return 0;

  // Match ref dominant colors to closest gen colors
  let weightedDeltaE = 0;
  const weights = WEIGHTS.slice(0, k);
  const wSum = weights.reduce((a, b) => a + b, 0);

  for (let i = 0; i < k; i++) {
    // Find closest gen color to ref[i]
    let minDE = Infinity;
    for (let j = 0; j < genSorted.length; j++) {
      const de = ciede2000(refSorted[i].c, genSorted[j].c);
      if (de < minDE) minDE = de;
    }
    weightedDeltaE += (weights[i] / wSum) * minDE;
  }

  return clamp01(1 - weightedDeltaE / MAX_DELTA_E);
}
