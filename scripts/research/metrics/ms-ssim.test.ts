import { describe, it, expect } from "vitest";
import {
  rgbToYCbCr,
  gaussianKernel,
  ssimSingleScale,
  msssim,
  computeMsssimYCbCr,
} from "./ms-ssim.js";

function solidChannel(w: number, h: number, val: number): Float64Array {
  return new Float64Array(w * h).fill(val);
}

function noisyChannel(w: number, h: number, base: number, seed: number): Float64Array {
  const arr = new Float64Array(w * h);
  let s = seed;
  for (let i = 0; i < arr.length; i++) {
    s = (s * 16807 + 0) % 2147483647;
    arr[i] = base + (s / 2147483647) * 20 - 10;
  }
  return arr;
}

describe("rgbToYCbCr", () => {
  it("converts white correctly", () => {
    const [y, cb, cr] = rgbToYCbCr(255, 255, 255);
    expect(y).toBeCloseTo(255, 0);
    expect(cb).toBeCloseTo(128, 1);
    expect(cr).toBeCloseTo(128, 1);
  });

  it("converts black correctly", () => {
    const [y, cb, cr] = rgbToYCbCr(0, 0, 0);
    expect(y).toBeCloseTo(0, 0);
    expect(cb).toBeCloseTo(128, 1);
    expect(cr).toBeCloseTo(128, 1);
  });
});

describe("gaussianKernel", () => {
  it("generates 11x11 kernel that sums to ~1", () => {
    const k = gaussianKernel(11, 1.5);
    expect(k.length).toBe(11);
    expect(k[0].length).toBe(11);
    const sum = k.flat().reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 3);
  });
});

describe("ssimSingleScale", () => {
  it("returns 1.0 for identical channels", () => {
    const ch = solidChannel(64, 64, 128);
    expect(ssimSingleScale(ch, ch, 64, 64)).toBeCloseTo(1.0, 3);
  });

  it("returns < 1.0 for different channels", () => {
    const a = solidChannel(64, 64, 100);
    const b = solidChannel(64, 64, 200);
    expect(ssimSingleScale(a, b, 64, 64)).toBeLessThan(1.0);
  });

  it("returns higher for similar vs dissimilar", () => {
    const base = noisyChannel(64, 64, 128, 1);
    const similar = noisyChannel(64, 64, 130, 1);
    const different = noisyChannel(64, 64, 200, 99);
    const s1 = ssimSingleScale(base, similar, 64, 64);
    const s2 = ssimSingleScale(base, different, 64, 64);
    expect(s1).toBeGreaterThan(s2);
  });
});

describe("msssim", () => {
  it("returns ~1.0 for identical channels", () => {
    const ch = noisyChannel(128, 128, 128, 42);
    const score = msssim(ch, ch, 128, 128);
    expect(score).toBeGreaterThan(0.99);
  });
});

describe("computeMsssimYCbCr (M4)", () => {
  it("returns ~1.0 for identical RGB buffers", () => {
    const w = 64, h = 64;
    const buf = Buffer.alloc(w * h * 3, 128);
    const score = computeMsssimYCbCr(buf, buf, w, h);
    expect(score).toBeGreaterThan(0.99);
  });

  it("returns 0-1 range for different images", () => {
    const w = 64, h = 64;
    const a = Buffer.alloc(w * h * 3, 100);
    const b = Buffer.alloc(w * h * 3, 200);
    const score = computeMsssimYCbCr(a, b, w, h);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
