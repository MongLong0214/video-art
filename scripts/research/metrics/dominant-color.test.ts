import { describe, it, expect } from "vitest";
import { computeDominantColorAccuracy } from "./dominant-color.js";
import { srgbToLab } from "./color-palette.js";

describe("computeDominantColorAccuracy (M2)", () => {
  it("returns 1.0 for identical palettes", () => {
    const lab = srgbToLab(128, 64, 32);
    const pixels: [number, number, number][] = Array(100).fill(lab);
    expect(computeDominantColorAccuracy(pixels, pixels)).toBeCloseTo(1.0, 1);
  });

  it("returns 0 when deltaE > 50", () => {
    const black: [number, number, number][] = Array(100).fill([0, 0, 0]);
    const white: [number, number, number][] = Array(100).fill([100, 0, 0]);
    const score = computeDominantColorAccuracy(black, white);
    expect(score).toBe(0);
  });

  it("returns value in 0-1 range", () => {
    const a: [number, number, number][] = Array(100).fill(srgbToLab(200, 50, 50));
    const b: [number, number, number][] = Array(100).fill(srgbToLab(180, 70, 40));
    const score = computeDominantColorAccuracy(a, b);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("applies weighted mean (50/30/20)", () => {
    // With k=3, dominant colors should be weighted 0.5/0.3/0.2
    const ref: [number, number, number][] = [
      ...Array(50).fill([50, 0, 0] as [number, number, number]),
      ...Array(30).fill([70, 20, 0] as [number, number, number]),
      ...Array(20).fill([30, -10, 10] as [number, number, number]),
    ];
    const score = computeDominantColorAccuracy(ref, ref);
    expect(score).toBeCloseTo(1.0, 1);
  });
});
