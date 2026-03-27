import { describe, it, expect } from "vitest";
import { computeTextureRichness } from "./texture-richness";

function solidGray(w: number, h: number): Float64Array {
  return new Float64Array(w * h).fill(128);
}

function noisyGray(w: number, h: number, seed: number): Float64Array {
  const arr = new Float64Array(w * h);
  let s = seed;
  for (let i = 0; i < arr.length; i++) {
    s = (s * 16807 + 0) % 2147483647;
    arr[i] = (s / 2147483647) * 255;
  }
  return arr;
}

describe("computeTextureRichness (M6)", () => {
  it("returns 1.0 for identical images", () => {
    const img = noisyGray(64, 64, 42);
    expect(computeTextureRichness(img, img, 64, 64)).toBeCloseTo(1.0, 2);
  });

  it("penalizes texture loss (blurry gen)", () => {
    const ref = noisyGray(64, 64, 42);
    const gen = solidGray(64, 64); // flat = no texture
    const score = computeTextureRichness(ref, gen, 64, 64);
    expect(score).toBeLessThanOrEqual(0.5);
  });

  it("penalizes over-texturing (bidirectional)", () => {
    const ref = solidGray(64, 64); // flat
    const gen = noisyGray(64, 64, 42); // noisy
    const score = computeTextureRichness(ref, gen, 64, 64);
    expect(score).toBeLessThanOrEqual(0.5);
  });

  it("returns 1.0 when both are flat", () => {
    const a = solidGray(64, 64);
    const b = solidGray(64, 64);
    expect(computeTextureRichness(a, b, 64, 64)).toBeCloseTo(1.0, 1);
  });

  it("always returns 0-1", () => {
    const a = noisyGray(64, 64, 1);
    const b = noisyGray(64, 64, 99);
    const score = computeTextureRichness(a, b, 64, 64);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
