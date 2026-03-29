import { describe, it, expect } from "vitest";
import { computeMaskStats } from "./mask-stats.js";

function makeRgba(w: number, h: number, fill: (x: number, y: number) => number): Uint8Array {
  const buf = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      buf[i] = 255;     // R
      buf[i + 1] = 255; // G
      buf[i + 2] = 255; // B
      buf[i + 3] = fill(x, y); // A
    }
  }
  return buf;
}

describe("computeMaskStats", () => {
  it("returns coverage=1.0 for fully opaque 4x4", () => {
    const rgba = makeRgba(4, 4, () => 255);
    const stats = computeMaskStats(rgba, 4, 4, 10);
    expect(stats.coverage).toBe(1.0);
    expect(stats.opaqueCount).toBe(16);
  });

  it("returns coverage=0.5 for half opaque 4x4", () => {
    // Top 2 rows opaque, bottom 2 transparent
    const rgba = makeRgba(4, 4, (_x, y) => (y < 2 ? 255 : 0));
    const stats = computeMaskStats(rgba, 4, 4, 10);
    expect(stats.coverage).toBe(0.5);
    expect(stats.opaqueCount).toBe(8);
  });

  it("returns correct bbox", () => {
    // Opaque only at (1,1) and (2,2)
    const rgba = makeRgba(4, 4, (x, y) => ((x === 1 && y === 1) || (x === 2 && y === 2) ? 255 : 0));
    const stats = computeMaskStats(rgba, 4, 4, 10);
    expect(stats.bbox).toEqual({ x: 1, y: 1, w: 2, h: 2 });
  });

  it("returns correct centroid", () => {
    // Single opaque pixel at (2, 3)
    const rgba = makeRgba(5, 5, (x, y) => (x === 2 && y === 3 ? 255 : 0));
    const stats = computeMaskStats(rgba, 5, 5, 10);
    expect(stats.centroid.x).toBe(2);
    expect(stats.centroid.y).toBe(3);
  });

  it("respects alphaThreshold", () => {
    // All pixels at alpha=100, threshold=128 → all transparent
    const rgba = makeRgba(4, 4, () => 100);
    const stats = computeMaskStats(rgba, 4, 4, 128);
    expect(stats.coverage).toBe(0);
    expect(stats.opaqueCount).toBe(0);
  });

  it("returns zero for empty mask", () => {
    const rgba = makeRgba(4, 4, () => 0);
    const stats = computeMaskStats(rgba, 4, 4, 10);
    expect(stats.coverage).toBe(0);
    expect(stats.opaqueCount).toBe(0);
  });
});
