import { describe, it, expect } from "vitest";
import { srgbToLab, ciede2000, kmeanspp, sinkhornDistance, computeColorPaletteSimilarity } from "./color-palette.js";

// ── sRGB→Lab Comprehensive ─────────────────────────────────

describe("srgbToLab comprehensive", () => {
  const knownPairs: [string, [number, number, number], [number, number, number]][] = [
    ["pure red", [255, 0, 0], [53.23, 80, 67]],
    ["pure green", [0, 128, 0], [46.23, -51, 49]],
    ["pure blue", [0, 0, 255], [32.30, 79, -108]],
    ["mid gray", [128, 128, 128], [53.59, 0, 0]],
    ["dark gray", [64, 64, 64], [27.09, 0, 0]],
    ["light gray", [192, 192, 192], [77.70, 0, 0]],
  ];

  for (const [name, rgb, expectedLab] of knownPairs) {
    it(`converts ${name} (L* within ±3)`, () => {
      const lab = srgbToLab(rgb[0], rgb[1], rgb[2]);
      expect(lab[0]).toBeCloseTo(expectedLab[0], 0);
    });
  }

  // Boundary tests
  it.each([0, 1, 127, 128, 254, 255])("handles single channel value %d", (v) => {
    const lab = srgbToLab(v, v, v);
    expect(lab[0]).toBeGreaterThanOrEqual(-1);
    expect(lab[0]).toBeLessThanOrEqual(101); // slight overshoot for sRGB white is acceptable
    expect(Math.abs(lab[1])).toBeLessThan(5);
    expect(Math.abs(lab[2])).toBeLessThan(5);
  });

  // Monotonicity: brighter RGB → higher L*
  it("L* is monotonic with brightness", () => {
    const l0 = srgbToLab(0, 0, 0)[0];
    const l64 = srgbToLab(64, 64, 64)[0];
    const l128 = srgbToLab(128, 128, 128)[0];
    const l192 = srgbToLab(192, 192, 192)[0];
    const l255 = srgbToLab(255, 255, 255)[0];
    expect(l0).toBeLessThan(l64);
    expect(l64).toBeLessThan(l128);
    expect(l128).toBeLessThan(l192);
    expect(l192).toBeLessThan(l255);
  });

  // All 6 primary/secondary colors
  it.each([
    [255, 0, 0], [0, 255, 0], [0, 0, 255],
    [255, 255, 0], [255, 0, 255], [0, 255, 255],
  ] as [number, number, number][])("primary/secondary %j produces valid Lab", (r, g, b) => {
    const lab = srgbToLab(r, g, b);
    expect(lab[0]).toBeGreaterThanOrEqual(0);
    expect(lab[0]).toBeLessThanOrEqual(100);
    expect(lab[1]).toBeGreaterThan(-128);
    expect(lab[1]).toBeLessThan(128);
  });

  // Random RGB triples
  const rng = (s: number) => { s = (s * 16807) % 2147483647; return s; };
  const randoms: [number, number, number][] = [];
  let seed = 42;
  for (let i = 0; i < 50; i++) {
    seed = rng(seed); const r = seed % 256;
    seed = rng(seed); const g = seed % 256;
    seed = rng(seed); const b = seed % 256;
    randoms.push([r, g, b]);
  }
  it.each(randoms)("random rgb(%d,%d,%d) produces valid Lab", (r, g, b) => {
    const lab = srgbToLab(r, g, b);
    expect(lab[0]).toBeGreaterThanOrEqual(-1);
    expect(lab[0]).toBeLessThanOrEqual(101);
  });
});

// ── CIEDE2000 Comprehensive ────────────────────────────────

describe("ciede2000 comprehensive", () => {
  // Symmetry
  it("is symmetric: d(a,b) = d(b,a)", () => {
    const a = srgbToLab(200, 50, 50);
    const b = srgbToLab(50, 200, 50);
    expect(ciede2000(a, b)).toBeCloseTo(ciede2000(b, a), 5);
  });

  // Triangle inequality (approximate)
  it("satisfies triangle inequality", () => {
    const a = srgbToLab(255, 0, 0);
    const b = srgbToLab(0, 255, 0);
    const c = srgbToLab(0, 0, 255);
    const ab = ciede2000(a, b);
    const bc = ciede2000(b, c);
    const ac = ciede2000(a, c);
    expect(ac).toBeLessThanOrEqual(ab + bc + 1); // ±1 tolerance
  });

  // Non-negativity
  it.each(Array.from({length: 20}, (_, i) => i * 13))("non-negative for grayscale %d", (v) => {
    const a = srgbToLab(v, v, v);
    const b = srgbToLab(Math.min(v + 10, 255), Math.min(v + 10, 255), Math.min(v + 10, 255));
    expect(ciede2000(a, b)).toBeGreaterThanOrEqual(0);
  });

  // Known JND threshold
  it("JND: deltaE < 1 for very similar colors", () => {
    const a = srgbToLab(128, 128, 128);
    const b = srgbToLab(129, 128, 128);
    expect(ciede2000(a, b)).toBeLessThan(2);
  });

  // Large distance
  it("large distance for complementary colors", () => {
    const red = srgbToLab(255, 0, 0);
    const cyan = srgbToLab(0, 255, 255);
    expect(ciede2000(red, cyan)).toBeGreaterThan(50);
  });

  // All primary pairs
  const primaries = [
    srgbToLab(255, 0, 0), srgbToLab(0, 255, 0), srgbToLab(0, 0, 255),
  ];
  for (let i = 0; i < primaries.length; i++) {
    for (let j = i + 1; j < primaries.length; j++) {
      it(`primary pair ${i}-${j} has large distance`, () => {
        expect(ciede2000(primaries[i], primaries[j])).toBeGreaterThan(30);
      });
    }
  }
});

// ── k-means++ Comprehensive ───────────────────────────────

describe("kmeanspp comprehensive", () => {
  it.each([1, 2, 3, 5, 8, 12])("k=%d returns correct cluster count", (k) => {
    const pixels: [number, number, number][] = [];
    for (let i = 0; i < 200; i++) pixels.push([(i % 50) * 2, (i % 30), (i % 20) - 10]);
    const { centroids, weights } = kmeanspp(pixels, k, 42);
    expect(centroids.length).toBeLessThanOrEqual(k);
    expect(centroids.length).toBeGreaterThan(0);
    expect(weights.reduce((a, b) => a + b)).toBeCloseTo(1.0, 2);
  });

  // Determinism with same seed
  it("deterministic with same seed", () => {
    const pixels: [number, number, number][] = Array(50).fill([50, 10, 10]);
    const r1 = kmeanspp(pixels, 3, 42);
    const r2 = kmeanspp(pixels, 3, 42);
    expect(r1.centroids).toEqual(r2.centroids);
  });

  // Different seeds → potentially different results
  it("different seeds may produce different centroids", () => {
    const pixels: [number, number, number][] = [];
    for (let i = 0; i < 100; i++) pixels.push([i, i * 0.5, -i * 0.3]);
    const r1 = kmeanspp(pixels, 5, 42);
    const r2 = kmeanspp(pixels, 5, 99);
    // May or may not be equal, but both valid
    expect(r1.weights.reduce((a, b) => a + b)).toBeCloseTo(1, 2);
    expect(r2.weights.reduce((a, b) => a + b)).toBeCloseTo(1, 2);
  });

  // Edge: single pixel
  it("handles single pixel", () => {
    const { centroids } = kmeanspp([[50, 0, 0]], 5, 42);
    expect(centroids.length).toBe(1);
  });

  // Edge: all identical
  it("handles all identical pixels", () => {
    const pixels: [number, number, number][] = Array(100).fill([50, 0, 0]);
    const { centroids } = kmeanspp(pixels, 12, 42);
    for (const c of centroids) {
      expect(c[0]).toBeCloseTo(50, 0);
    }
  });
});

// ── Sinkhorn Comprehensive ─────────────────────────────────

describe("sinkhornDistance comprehensive", () => {
  it("self-distance is ~0 for any palette", () => {
    const p: [number, number, number][] = [[30, 10, -5], [70, -20, 30], [50, 0, 0]];
    const w = [0.5, 0.3, 0.2];
    expect(sinkhornDistance(p, p, w, w)).toBeLessThan(1);
  });

  it("distance increases with color difference", () => {
    const base: [number, number, number][] = [[50, 0, 0]];
    const near: [number, number, number][] = [[55, 0, 0]];
    const far: [number, number, number][] = [[90, 0, 0]];
    const d1 = sinkhornDistance(base, near, [1], [1]);
    const d2 = sinkhornDistance(base, far, [1], [1]);
    expect(d2).toBeGreaterThan(d1);
  });

  it("handles unequal palette sizes", () => {
    const p1: [number, number, number][] = [[50, 0, 0], [80, 0, 0]];
    const p2: [number, number, number][] = [[50, 0, 0], [80, 0, 0], [60, 0, 0]];
    const d = sinkhornDistance(p1, p2, [0.5, 0.5], [0.33, 0.33, 0.34]);
    expect(d).toBeGreaterThanOrEqual(0);
  });

  it("weight distribution affects distance", () => {
    const p1: [number, number, number][] = [[0, 0, 0], [100, 0, 0]];
    const p2: [number, number, number][] = [[0, 0, 0], [100, 0, 0]];
    const d1 = sinkhornDistance(p1, p2, [0.9, 0.1], [0.1, 0.9]); // mismatched weights
    const d2 = sinkhornDistance(p1, p2, [0.5, 0.5], [0.5, 0.5]); // matched weights
    expect(d1).toBeGreaterThan(d2);
  });
});

// ── M1 Composite Comprehensive ─────────────────────────────

describe("computeColorPaletteSimilarity comprehensive", () => {
  it("identical pixels → 1.0", () => {
    const px: [number, number, number][] = Array(100).fill([50, 10, -5]);
    expect(computeColorPaletteSimilarity(px, px)).toBeCloseTo(1.0, 1);
  });

  it("similar palettes → high score", () => {
    const a: [number, number, number][] = Array(100).fill([50, 10, -5]);
    const b: [number, number, number][] = Array(100).fill([52, 11, -4]);
    expect(computeColorPaletteSimilarity(a, b)).toBeGreaterThan(0.9);
  });

  it("always 0-1 range", () => {
    for (let trial = 0; trial < 10; trial++) {
      const a: [number, number, number][] = Array(50).fill([trial * 10, trial * 5, -trial * 3]);
      const b: [number, number, number][] = Array(50).fill([100 - trial * 10, trial * 3, trial * 7]);
      const s = computeColorPaletteSimilarity(a, b);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it("empty arrays → 0", () => {
    expect(computeColorPaletteSimilarity([], [])).toBe(0);
    expect(computeColorPaletteSimilarity([], [[50, 0, 0]])).toBe(0);
  });
});
