export interface MaskStats {
  coverage: number;
  bbox: { x: number; y: number; w: number; h: number };
  centroid: { x: number; y: number };
  opaqueCount: number;
}

/**
 * Compute coverage, bbox, centroid, and opaque count from an RGBA buffer.
 * Used for SAM mask candidate conversion in pipeline-layers.ts Step 4.
 */
export function computeMaskStats(
  rgba: Uint8Array,
  width: number,
  height: number,
  alphaThreshold: number,
): MaskStats {
  const total = width * height;
  let opaqueCount = 0;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let sumX = 0;
  let sumY = 0;

  for (let i = 0; i < total; i++) {
    if (rgba[i * 4 + 3] > alphaThreshold) {
      opaqueCount++;
      const x = i % width;
      const y = Math.floor(i / width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      sumX += x;
      sumY += y;
    }
  }

  if (opaqueCount === 0) {
    return {
      coverage: 0,
      bbox: { x: 0, y: 0, w: 0, h: 0 },
      centroid: { x: width / 2, y: height / 2 },
      opaqueCount: 0,
    };
  }

  return {
    coverage: opaqueCount / total,
    bbox: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
    centroid: { x: sumX / opaqueCount, y: sumY / opaqueCount },
    opaqueCount,
  };
}
