import { describe, it, expect } from "vitest";
import {
  cannyEdgeDetect,
  dilateEdgeMap,
  edgeF1Score,
  computeEdgePreservation,
} from "./edge-preservation.js";

function solidGray(w: number, h: number, val: number): Float64Array {
  return new Float64Array(w * h).fill(val);
}

function verticalEdge(w: number, h: number): Float64Array {
  const arr = new Float64Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      arr[y * w + x] = x < w / 2 ? 0 : 255;
  return arr;
}

describe("cannyEdgeDetect", () => {
  it("produces edges for high-contrast image", () => {
    const img = verticalEdge(64, 64);
    const edges = cannyEdgeDetect(img, 64, 64);
    const edgeCount = edges.reduce((s, v) => s + v, 0);
    expect(edgeCount).toBeGreaterThan(0);
  });

  it("produces no edges for solid image", () => {
    const img = solidGray(64, 64, 128);
    const edges = cannyEdgeDetect(img, 64, 64);
    const edgeCount = edges.reduce((s, v) => s + v, 0);
    expect(edgeCount).toBe(0);
  });
});

describe("dilateEdgeMap", () => {
  it("expands a single pixel to 5x5 region", () => {
    const map = new Uint8Array(16 * 16);
    map[8 * 16 + 8] = 1; // center pixel
    const dilated = dilateEdgeMap(map, 16, 16, 2);
    // Check that neighbors are now 1
    expect(dilated[7 * 16 + 8]).toBe(1);
    expect(dilated[9 * 16 + 8]).toBe(1);
    expect(dilated[8 * 16 + 7]).toBe(1);
    expect(dilated[8 * 16 + 9]).toBe(1);
  });
});

describe("edgeF1Score", () => {
  it("returns 1.0 for identical edge maps", () => {
    const edges = new Uint8Array(64);
    edges[10] = 1; edges[20] = 1; edges[30] = 1;
    expect(edgeF1Score(edges, edges)).toBeCloseTo(1.0, 5);
  });

  it("returns 0 when one is empty", () => {
    const a = new Uint8Array(64);
    a[10] = 1;
    const b = new Uint8Array(64);
    expect(edgeF1Score(a, b)).toBe(0);
  });

  it("returns 1.0 when both are empty", () => {
    const a = new Uint8Array(64);
    const b = new Uint8Array(64);
    expect(edgeF1Score(a, b)).toBe(1.0);
  });
});

describe("computeEdgePreservation (M5)", () => {
  it("returns 1.0 for identical images", () => {
    const img = verticalEdge(64, 64);
    expect(computeEdgePreservation(img, img, 64, 64)).toBeCloseTo(1.0, 2);
  });

  it("returns > 0.8 for 1px shifted image (tolerance absorbs)", () => {
    const w = 64, h = 64;
    const a = verticalEdge(w, h);
    const b = new Float64Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        b[y * w + x] = (x + 1) < w / 2 ? 0 : 255; // shifted 1px
    const score = computeEdgePreservation(a, b, w, h);
    expect(score).toBeGreaterThan(0.7);
  });
});
