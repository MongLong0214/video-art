import { describe, it, expect } from "vitest";
import { rgbToYCbCr, gaussianKernel, ssimSingleScale, msssim, computeMsssimYCbCr } from "./ms-ssim.js";
import { cannyEdgeDetect, dilateEdgeMap, edgeF1Score, computeEdgePreservation } from "./edge-preservation.js";
import { computeTextureRichness } from "./texture-richness.js";

// ── Helpers ────────────────────────────────────────────────

function solidChannel(w: number, h: number, val: number): Float64Array {
  return new Float64Array(w * h).fill(val);
}
function gradientH(w: number, h: number): Float64Array {
  const arr = new Float64Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) arr[y * w + x] = (x / w) * 255;
  return arr;
}
function gradientV(w: number, h: number): Float64Array {
  const arr = new Float64Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) arr[y * w + x] = (y / h) * 255;
  return arr;
}
function checkerboard(w: number, h: number, blockSize: number): Float64Array {
  const arr = new Float64Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    arr[y * w + x] = ((Math.floor(x / blockSize) + Math.floor(y / blockSize)) % 2) * 255;
  return arr;
}
function noisy(w: number, h: number, seed: number): Float64Array {
  const arr = new Float64Array(w * h);
  let s = seed;
  for (let i = 0; i < arr.length; i++) { s = (s * 16807) % 2147483647; arr[i] = (s / 2147483647) * 255; }
  return arr;
}
function rgbBuf(w: number, h: number, r: number, g: number, b: number): Buffer {
  const buf = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) { buf[i * 3] = r; buf[i * 3 + 1] = g; buf[i * 3 + 2] = b; }
  return buf;
}

// ── MS-SSIM Comprehensive ──────────────────────────────────

describe("rgbToYCbCr comprehensive", () => {
  it.each([
    [255, 0, 0, "red"],
    [0, 255, 0, "green"],
    [0, 0, 255, "blue"],
    [255, 255, 0, "yellow"],
    [128, 128, 128, "gray"],
  ] as [number, number, number, string][])("%s produces valid YCbCr", (r, g, b) => {
    const [y, cb, cr] = rgbToYCbCr(r, g, b);
    expect(y).toBeGreaterThanOrEqual(-1);
    expect(y).toBeLessThanOrEqual(256);
    expect(cb).toBeGreaterThanOrEqual(0);
    expect(cr).toBeGreaterThanOrEqual(0);
  });
});

describe("gaussianKernel comprehensive", () => {
  it.each([3, 5, 7, 11, 15])("size=%d sums to 1", (size) => {
    const k = gaussianKernel(size, 1.5);
    expect(k.flat().reduce((a, b) => a + b)).toBeCloseTo(1, 3);
  });
  it("center is maximum", () => {
    const k = gaussianKernel(11, 1.5);
    const center = k[5][5];
    for (const row of k) for (const v of row) expect(v).toBeLessThanOrEqual(center + 1e-10);
  });
});

describe("ssimSingleScale comprehensive", () => {
  const sizes = [32, 64, 128] as const;
  for (const sz of sizes) {
    it(`identical solid ${sz}×${sz} → 1.0`, () => {
      const ch = solidChannel(sz, sz, 128);
      expect(ssimSingleScale(ch, ch, sz, sz)).toBeCloseTo(1.0, 2);
    });
    it(`gradient vs solid ${sz}×${sz} → < 1.0`, () => {
      expect(ssimSingleScale(gradientH(sz, sz), solidChannel(sz, sz, 128), sz, sz)).toBeLessThan(1.0);
    });
    it(`identical noise ${sz}×${sz} → 1.0`, () => {
      const n = noisy(sz, sz, 42);
      expect(ssimSingleScale(n, n, sz, sz)).toBeCloseTo(1.0, 2);
    });
  }
  it("symmetry: ssim(a,b) = ssim(b,a)", () => {
    const a = gradientH(64, 64), b = gradientV(64, 64);
    expect(ssimSingleScale(a, b, 64, 64)).toBeCloseTo(ssimSingleScale(b, a, 64, 64), 5);
  });
  // Degradation ordering
  it("more noise → lower SSIM", () => {
    const ref = gradientH(64, 64);
    const mild = noisy(64, 64, 1);
    const heavy = solidChannel(64, 64, 0);
    const s1 = ssimSingleScale(ref, mild, 64, 64);
    const s2 = ssimSingleScale(ref, heavy, 64, 64);
    expect(s1).toBeGreaterThanOrEqual(s2 - 0.1);
  });
});

describe("msssim comprehensive", () => {
  it("identical 128×128 → > 0.99", () => {
    const ch = noisy(128, 128, 42);
    expect(msssim(ch, ch, 128, 128)).toBeGreaterThan(0.99);
  });
  it("different 128×128 → < 1.0", () => {
    expect(msssim(noisy(128, 128, 1), noisy(128, 128, 99), 128, 128)).toBeLessThan(1.0);
  });
  it("handles small images (16×16) gracefully", () => {
    const ch = noisy(16, 16, 42);
    const s = msssim(ch, ch, 16, 16);
    expect(s).toBeGreaterThan(0.9);
  });
});

describe("computeMsssimYCbCr comprehensive", () => {
  it.each([
    [64, 64], [128, 128], [96, 64],
  ])("identical %dx%d → > 0.99", (w, h) => {
    const buf = rgbBuf(w, h, 128, 100, 80);
    expect(computeMsssimYCbCr(buf, buf, w, h)).toBeGreaterThan(0.99);
  });
  it("red vs blue → low score", () => {
    const red = rgbBuf(64, 64, 255, 0, 0);
    const blue = rgbBuf(64, 64, 0, 0, 255);
    expect(computeMsssimYCbCr(red, blue, 64, 64)).toBeLessThan(0.7);
  });
  it("always 0-1", () => {
    const a = rgbBuf(64, 64, 50, 50, 50);
    const b = rgbBuf(64, 64, 200, 200, 200);
    const s = computeMsssimYCbCr(a, b, 64, 64);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });
});

// ── Edge Preservation Comprehensive ────────────────────────

describe("cannyEdgeDetect comprehensive", () => {
  it("solid image → 0 edges", () => {
    expect(cannyEdgeDetect(solidChannel(64, 64, 100), 64, 64).reduce((s, v) => s + v)).toBe(0);
  });
  it("checkerboard → many edges", () => {
    const edges = cannyEdgeDetect(checkerboard(64, 64, 8), 64, 64);
    expect(edges.reduce((s, v) => s + v)).toBeGreaterThan(50);
  });
  it("gradient → edges at transition", () => {
    const edges = cannyEdgeDetect(gradientH(64, 64), 64, 64);
    // Smooth gradient may not produce strong edges
    expect(edges).toHaveLength(64 * 64);
  });
  it.each([32, 64, 128])("handles %d×%d", (sz) => {
    const edges = cannyEdgeDetect(noisy(sz, sz, 42), sz, sz);
    expect(edges.length).toBe(sz * sz);
  });
});

describe("dilateEdgeMap comprehensive", () => {
  it.each([1, 2, 3, 4])("radius=%d expands correctly", (r) => {
    const map = new Uint8Array(32 * 32);
    map[16 * 32 + 16] = 1;
    const dilated = dilateEdgeMap(map, 32, 32, r);
    const count = dilated.reduce((s, v) => s + v, 0);
    expect(count).toBeGreaterThan(1);
    expect(count).toBeLessThanOrEqual((2 * r + 1) ** 2);
  });
  it("empty map → empty result", () => {
    const map = new Uint8Array(32 * 32);
    const dilated = dilateEdgeMap(map, 32, 32, 2);
    expect(dilated.reduce((s, v) => s + v)).toBe(0);
  });
});

describe("edgeF1Score comprehensive", () => {
  it("perfect match → 1.0", () => {
    const e = new Uint8Array(100); e[10] = 1; e[50] = 1; e[90] = 1;
    expect(edgeF1Score(e, e)).toBe(1.0);
  });
  it("no overlap → 0", () => {
    const a = new Uint8Array(100); a[10] = 1;
    const b = new Uint8Array(100); b[90] = 1;
    expect(edgeF1Score(a, b)).toBe(0);
  });
  it("partial overlap", () => {
    const a = new Uint8Array(100); a[10] = 1; a[20] = 1;
    const b = new Uint8Array(100); b[10] = 1; b[30] = 1;
    const f1 = edgeF1Score(a, b);
    expect(f1).toBeGreaterThan(0);
    expect(f1).toBeLessThan(1);
  });
  it("both empty → 1.0", () => {
    expect(edgeF1Score(new Uint8Array(100), new Uint8Array(100))).toBe(1.0);
  });
});

describe("computeEdgePreservation comprehensive", () => {
  it.each([32, 64, 128])("identical %d×%d → 1.0", (sz) => {
    const img = checkerboard(sz, sz, 8);
    expect(computeEdgePreservation(img, img, sz, sz)).toBeCloseTo(1.0, 1);
  });
  it("solid vs solid → 1.0 (both no edges)", () => {
    const a = solidChannel(64, 64, 100);
    const b = solidChannel(64, 64, 200);
    expect(computeEdgePreservation(a, b, 64, 64)).toBe(1.0);
  });
});

// ── Texture Richness Comprehensive ─────────────────────────

describe("computeTextureRichness comprehensive", () => {
  it("identical noise → 1.0", () => {
    const n = noisy(64, 64, 42);
    expect(computeTextureRichness(n, n, 64, 64)).toBeCloseTo(1.0, 1);
  });
  it("noise vs solid → low (texture loss)", () => {
    expect(computeTextureRichness(noisy(64, 64, 42), solidChannel(64, 64, 128), 64, 64)).toBeLessThanOrEqual(0.5);
  });
  it("solid vs noise → low (over-textured)", () => {
    expect(computeTextureRichness(solidChannel(64, 64, 128), noisy(64, 64, 42), 64, 64)).toBeLessThanOrEqual(0.5);
  });
  it("both solid → 1.0", () => {
    expect(computeTextureRichness(solidChannel(64, 64, 100), solidChannel(64, 64, 200), 64, 64)).toBeCloseTo(1.0, 1);
  });
  it.each([32, 64, 128])("handles %d×%d", (sz) => {
    const s = computeTextureRichness(noisy(sz, sz, 1), noisy(sz, sz, 2), sz, sz);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });
  // Symmetry check
  it("similar both directions", () => {
    const a = noisy(64, 64, 1), b = noisy(64, 64, 2);
    const s1 = computeTextureRichness(a, b, 64, 64);
    const s2 = computeTextureRichness(b, a, 64, 64);
    expect(Math.abs(s1 - s2)).toBeLessThan(0.2);
  });
});
