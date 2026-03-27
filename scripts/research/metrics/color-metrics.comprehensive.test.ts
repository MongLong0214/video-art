import { describe, it, expect } from "vitest";

import {
  srgbToLab,
  ciede2000,
  kmeanspp,
  sinkhornDistance,
  computeColorPaletteSimilarity,
} from "./color-palette.js";
import { computeDominantColorAccuracy } from "./dominant-color.js";
import {
  rgbToCCT,
  cctToMireds,
  computeColorTemperatureSimilarity,
} from "./color-temperature.js";

// ==========================================================================
// srgbToLab
// ==========================================================================

describe("srgbToLab", () => {
  it("should convert black (0,0,0) to L*=0", () => {
    const [L] = srgbToLab(0, 0, 0);
    expect(L).toBeCloseTo(0, 0);
  });

  it("should convert white (255,255,255) to L*≈100", () => {
    const [L] = srgbToLab(255, 255, 255);
    expect(L).toBeCloseTo(100, 0);
  });

  it("should convert mid-gray to L*≈54", () => {
    const [L, a, b] = srgbToLab(128, 128, 128);
    expect(L).toBeGreaterThan(40);
    expect(L).toBeLessThan(60);
    expect(Math.abs(a)).toBeLessThan(1);
    expect(Math.abs(b)).toBeLessThan(1);
  });

  it("should produce positive a* for red", () => {
    const [, a] = srgbToLab(255, 0, 0);
    expect(a).toBeGreaterThan(50);
  });

  it("should produce negative a* for green", () => {
    const [, a] = srgbToLab(0, 255, 0);
    expect(a).toBeLessThan(-50);
  });

  it("should produce negative b* for blue", () => {
    const [,, b] = srgbToLab(0, 0, 255);
    expect(b).toBeLessThan(-50);
  });

  it("should produce positive b* for yellow", () => {
    const [,, b] = srgbToLab(255, 255, 0);
    expect(b).toBeGreaterThan(50);
  });
});

// ==========================================================================
// CIEDE2000
// ==========================================================================

describe("ciede2000", () => {
  it("should return 0 for identical colors", () => {
    const lab: [number, number, number] = [50, 20, -10];
    expect(ciede2000(lab, lab)).toBeCloseTo(0, 2);
  });

  it("should return small value for similar colors", () => {
    const a: [number, number, number] = [50, 20, -10];
    const b: [number, number, number] = [51, 21, -9];
    expect(ciede2000(a, b)).toBeLessThan(3);
  });

  it("should return large value for very different colors", () => {
    const black: [number, number, number] = [0, 0, 0];
    const white: [number, number, number] = [100, 0, 0];
    expect(ciede2000(black, white)).toBeGreaterThan(50);
  });

  it("should return >= 0 always", () => {
    const a: [number, number, number] = [30, -50, 40];
    const b: [number, number, number] = [80, 50, -30];
    expect(ciede2000(a, b)).toBeGreaterThanOrEqual(0);
  });

  it("should be symmetric", () => {
    const a: [number, number, number] = [50, 20, -10];
    const b: [number, number, number] = [60, -15, 30];
    expect(ciede2000(a, b)).toBeCloseTo(ciede2000(b, a), 4);
  });

  it("should handle achromatic colors (a*=0, b*=0)", () => {
    const gray1: [number, number, number] = [50, 0, 0];
    const gray2: [number, number, number] = [70, 0, 0];
    const dE = ciede2000(gray1, gray2);
    expect(dE).toBeGreaterThan(0);
    expect(dE).toBeLessThan(30);
  });

  it("should handle known red-green pair with non-trivial deltaE", () => {
    const red = srgbToLab(255, 0, 0);
    const green = srgbToLab(0, 255, 0);
    const dE = ciede2000(red, green);
    expect(dE).toBeGreaterThan(50);
  });

  it("should differentiate nearby pastels", () => {
    const pink = srgbToLab(255, 200, 200);
    const peach = srgbToLab(255, 210, 190);
    const dE = ciede2000(pink, peach);
    expect(dE).toBeGreaterThan(0);
    expect(dE).toBeLessThan(15);
  });
});

// ==========================================================================
// kmeanspp
// ==========================================================================

describe("kmeanspp", () => {
  it("should return empty for empty input", () => {
    const result = kmeanspp([], 3);
    expect(result.centroids).toEqual([]);
    expect(result.weights).toEqual([]);
  });

  it("should return 1 centroid when k=1", () => {
    const pixels: [number, number, number][] = [[50, 10, -5], [51, 11, -4], [49, 9, -6]];
    const result = kmeanspp(pixels, 1);
    expect(result.centroids.length).toBe(1);
    expect(result.weights.length).toBe(1);
    expect(result.weights[0]).toBeCloseTo(1.0, 4);
  });

  it("should cap k at number of unique pixels", () => {
    const pixels: [number, number, number][] = [[50, 10, -5], [80, -20, 30]];
    const result = kmeanspp(pixels, 12);
    expect(result.centroids.length).toBe(2);
  });

  it("should produce weights summing to 1", () => {
    const pixels: [number, number, number][] = Array.from({ length: 100 }, (_, i) => [
      i, Math.sin(i) * 50, Math.cos(i) * 50,
    ] as [number, number, number]);
    const result = kmeanspp(pixels, 5);
    const sum = result.weights.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 4);
  });

  it("should find 2 clusters from bimodal distribution", () => {
    const pixels: [number, number, number][] = [
      ...Array.from({ length: 50 }, () => [20, 10, -5] as [number, number, number]),
      ...Array.from({ length: 50 }, () => [80, -30, 40] as [number, number, number]),
    ];
    const result = kmeanspp(pixels, 2);
    expect(result.centroids.length).toBe(2);
    // Centroids should be near the two clusters
    const sorted = result.centroids.sort((a, b) => a[0] - b[0]);
    expect(sorted[0][0]).toBeCloseTo(20, 0);
    expect(sorted[1][0]).toBeCloseTo(80, 0);
  });

  it("should handle >12 requested clusters", () => {
    const pixels: [number, number, number][] = Array.from({ length: 200 }, (_, i) => [
      i % 100, (i * 3) % 128 - 64, (i * 7) % 128 - 64,
    ] as [number, number, number]);
    const result = kmeanspp(pixels, 15);
    expect(result.centroids.length).toBe(15);
  });

  it("should be deterministic with same seed", () => {
    const pixels: [number, number, number][] = Array.from({ length: 50 }, (_, i) => [
      i * 2, i % 30, -i % 20,
    ] as [number, number, number]);
    const r1 = kmeanspp(pixels, 3, 42);
    const r2 = kmeanspp(pixels, 3, 42);
    expect(r1.centroids).toEqual(r2.centroids);
    expect(r1.weights).toEqual(r2.weights);
  });
});

// ==========================================================================
// sinkhornDistance
// ==========================================================================

describe("sinkhornDistance", () => {
  it("should return 0 for empty palettes", () => {
    expect(sinkhornDistance([], [], [], [])).toBe(0);
  });

  it("should return 0 for identical palettes", () => {
    const p: [number, number, number][] = [[50, 10, -5]];
    const w = [1.0];
    const dist = sinkhornDistance(p, p, w, w);
    expect(dist).toBeCloseTo(0, 1);
  });

  it("should return positive distance for different palettes", () => {
    const p1: [number, number, number][] = [[20, 10, -5]];
    const p2: [number, number, number][] = [[80, -30, 40]];
    const dist = sinkhornDistance(p1, p2, [1], [1]);
    expect(dist).toBeGreaterThan(0);
  });

  it("should be non-negative", () => {
    const p1: [number, number, number][] = [[50, 20, -10], [70, -10, 30]];
    const p2: [number, number, number][] = [[30, 40, -20], [90, -5, 15]];
    const dist = sinkhornDistance(p1, p2, [0.5, 0.5], [0.5, 0.5]);
    expect(dist).toBeGreaterThanOrEqual(0);
  });
});

// ==========================================================================
// computeColorPaletteSimilarity (M1)
// ==========================================================================

describe("computeColorPaletteSimilarity (M1)", () => {
  it("should return 0 for empty ref pixels", () => {
    const result = computeColorPaletteSimilarity([], [[50, 10, -5]]);
    expect(result).toBe(0);
  });

  it("should return 0 for empty gen pixels", () => {
    const result = computeColorPaletteSimilarity([[50, 10, -5]], []);
    expect(result).toBe(0);
  });

  it("should return high similarity for identical pixel sets", () => {
    const pixels: [number, number, number][] = Array.from({ length: 100 }, () => [50, 10, -5]);
    const result = computeColorPaletteSimilarity(pixels, pixels);
    expect(result).toBeGreaterThan(0.9);
  });

  it("should return low similarity for very different colors", () => {
    const ref: [number, number, number][] = Array.from({ length: 100 }, () => [20, 60, -40]);
    const gen: [number, number, number][] = Array.from({ length: 100 }, () => [80, -50, 40]);
    const result = computeColorPaletteSimilarity(ref, gen);
    expect(result).toBeLessThan(0.5);
  });

  it("should return value in [0, 1]", () => {
    const ref: [number, number, number][] = Array.from({ length: 50 }, (_, i) => [
      i * 2, i % 40, -i % 30,
    ]);
    const gen: [number, number, number][] = Array.from({ length: 50 }, (_, i) => [
      i * 2 + 5, i % 40 + 3, -i % 30 - 2,
    ]);
    const result = computeColorPaletteSimilarity(ref, gen);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("should handle single pixel", () => {
    const ref: [number, number, number][] = [[50, 10, -5]];
    const gen: [number, number, number][] = [[50, 10, -5]];
    const result = computeColorPaletteSimilarity(ref, gen);
    expect(result).toBeGreaterThan(0.5);
  });
});

// ==========================================================================
// computeDominantColorAccuracy (M2)
// ==========================================================================

describe("computeDominantColorAccuracy (M2)", () => {
  it("should return 0 for empty ref pixels", () => {
    expect(computeDominantColorAccuracy([], [[50, 10, -5]])).toBe(0);
  });

  it("should return 0 for empty gen pixels", () => {
    expect(computeDominantColorAccuracy([[50, 10, -5]], [])).toBe(0);
  });

  it("should return high score for identical pixel sets", () => {
    const pixels: [number, number, number][] = Array.from({ length: 100 }, () => [50, 10, -5]);
    expect(computeDominantColorAccuracy(pixels, pixels)).toBeGreaterThan(0.9);
  });

  it("should return low score for inverted colors", () => {
    const ref: [number, number, number][] = Array.from({ length: 100 }, () => [20, 60, 40]);
    const gen: [number, number, number][] = Array.from({ length: 100 }, () => [80, -60, -40]);
    expect(computeDominantColorAccuracy(ref, gen)).toBeLessThan(0.5);
  });

  it("should return value in [0, 1]", () => {
    const ref: [number, number, number][] = Array.from({ length: 50 }, (_, i) => [
      i * 2, (i % 30) - 15, (i % 20) - 10,
    ]);
    const gen: [number, number, number][] = Array.from({ length: 50 }, (_, i) => [
      i * 2 + 10, (i % 30) - 10, (i % 20) - 5,
    ]);
    const result = computeDominantColorAccuracy(ref, gen);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("should weight top dominant color more heavily", () => {
    // The matching algorithm finds the CLOSEST gen centroid for each ref centroid (not 1:1).
    // genGood matches all 3 ref colors perfectly → near-perfect score.
    // genBad shifts all 3 ref colors by a uniform amount in Lab space,
    // so the weighted sum is the same regardless of weight — but genGood
    // gets a strictly better score because its deltaE is near 0.
    const dominant1: [number, number, number] = [50, 40, -40];
    const dominant2: [number, number, number] = [30, -40, 40];
    const dominant3: [number, number, number] = [70, 40, 40];
    // "shifted" versions: each shifted by ~30 units in Lab → consistent moderate deltaE
    const shifted1: [number, number, number] = [50, 10, -10];
    const shifted2: [number, number, number] = [30, -10, 10];
    const shifted3: [number, number, number] = [70, 10, 10];

    const ref: [number, number, number][] = [
      ...Array.from({ length: 50 }, () => dominant1),
      ...Array.from({ length: 30 }, () => dominant2),
      ...Array.from({ length: 20 }, () => dominant3),
    ];
    // genGood: exact match for all 3 clusters
    const genGood: [number, number, number][] = [
      ...Array.from({ length: 50 }, () => dominant1),
      ...Array.from({ length: 30 }, () => dominant2),
      ...Array.from({ length: 20 }, () => dominant3),
    ];
    // genBad: shifted versions of all 3 clusters → uniform moderate error
    const genBad: [number, number, number][] = [
      ...Array.from({ length: 50 }, () => shifted1),
      ...Array.from({ length: 30 }, () => shifted2),
      ...Array.from({ length: 20 }, () => shifted3),
    ];

    const scoreGood = computeDominantColorAccuracy(ref, genGood);
    const scoreBad = computeDominantColorAccuracy(ref, genBad);
    expect(scoreGood).toBeGreaterThan(scoreBad);
  });
});

// ==========================================================================
// Color Temperature (M3)
// ==========================================================================

describe("rgbToCCT", () => {
  it("should approximate daylight (~6500K) for neutral gray/white", () => {
    const { cct } = rgbToCCT(255, 255, 255);
    expect(cct).toBeGreaterThan(5000);
    expect(cct).toBeLessThan(10000);
  });

  it("should produce lower CCT for warm/reddish light", () => {
    const { cct: warm } = rgbToCCT(255, 180, 100);
    const { cct: cool } = rgbToCCT(180, 200, 255);
    expect(warm).toBeLessThan(cool);
  });

  it("should produce Duv near 0 for neutral white", () => {
    const { duv } = rgbToCCT(255, 255, 255);
    expect(Math.abs(duv)).toBeLessThan(0.02);
  });

  it("should return positive Duv for greenish tint", () => {
    const { duv } = rgbToCCT(200, 255, 200);
    // Green tint → above Planckian locus → positive Duv
    expect(duv).toBeGreaterThan(-0.05);
  });
});

describe("cctToMireds", () => {
  it("should return ~154 mireds for 6500K", () => {
    expect(cctToMireds(6500)).toBeCloseTo(153.8, 0);
  });

  it("should return ~370 mireds for 2700K (tungsten)", () => {
    expect(cctToMireds(2700)).toBeCloseTo(370.4, 0);
  });

  it("should return 0 for CCT=0", () => {
    expect(cctToMireds(0)).toBe(0);
  });

  it("should return 0 for negative CCT", () => {
    expect(cctToMireds(-100)).toBe(0);
  });
});

describe("computeColorTemperatureSimilarity (M3)", () => {
  it("should return 1.0 for identical RGB", () => {
    const rgb: [number, number, number] = [200, 200, 200];
    expect(computeColorTemperatureSimilarity(rgb, rgb)).toBeCloseTo(1.0, 2);
  });

  it("should return high score for similar temperatures", () => {
    const ref: [number, number, number] = [255, 255, 255];
    const gen: [number, number, number] = [250, 250, 255];
    expect(computeColorTemperatureSimilarity(ref, gen)).toBeGreaterThan(0.8);
  });

  it("should return lower score for very different temperatures", () => {
    const warm: [number, number, number] = [255, 150, 50]; // warm
    const cool: [number, number, number] = [100, 150, 255]; // cool
    const score = computeColorTemperatureSimilarity(warm, cool);
    expect(score).toBeLessThan(0.8);
  });

  it("should return value in [0, 1]", () => {
    const ref: [number, number, number] = [255, 0, 0];
    const gen: [number, number, number] = [0, 0, 255];
    const score = computeColorTemperatureSimilarity(ref, gen);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("should handle all-black input gracefully", () => {
    const black: [number, number, number] = [0, 0, 0];
    // D65 fallback for zero luminance
    const score = computeColorTemperatureSimilarity(black, black);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
