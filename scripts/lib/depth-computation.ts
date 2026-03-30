/**
 * Depth computation utilities for the layered pipeline.
 * Computes per-candidate meanDepth from a depth map + exclusive mask.
 */

export interface DepthStats {
  min: number;
  max: number;
  mean: number;
  stddev: number;
  count: number;
}

/**
 * Compute the mean depth value within a masked region.
 * @param depthMap Grayscale depth values (0=far, 255=near), Uint8Array[W*H]
 * @param mask Binary mask (0/1), Uint8Array[W*H]. Only pixels with mask[i]==1 are included.
 * @param width Image width
 * @param height Image height
 * @returns Mean depth (0-255). Returns 128 for empty masks (no masked pixels).
 */
export function computeMeanDepth(
  depthMap: Uint8Array,
  mask: Uint8Array,
  width: number,
  height: number,
): number {
  const total = width * height;
  let sum = 0;
  let count = 0;

  for (let i = 0; i < total; i++) {
    if (mask[i] === 1) {
      sum += depthMap[i];
      count++;
    }
  }

  if (count === 0) return 128;
  return sum / count;
}

/**
 * Compute summary statistics for an array of depth values.
 */
export function computeDepthStats(depths: number[]): DepthStats {
  if (depths.length === 0) {
    return { min: 0, max: 0, mean: 0, stddev: 0, count: 0 };
  }

  const count = depths.length;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;

  for (const d of depths) {
    if (d < min) min = d;
    if (d > max) max = d;
    sum += d;
  }

  const mean = sum / count;

  let varianceSum = 0;
  for (const d of depths) {
    varianceSum += (d - mean) ** 2;
  }
  const stddev = Math.sqrt(varianceSum / count);

  return { min, max, mean, stddev, count };
}
