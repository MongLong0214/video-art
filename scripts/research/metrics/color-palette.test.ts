import { describe, it, expect } from "vitest";
import {
  srgbToLab,
  ciede2000,
  kmeanspp,
  sinkhornDistance,
  computeColorPaletteSimilarity,
} from "./color-palette.js";

describe("srgbToLab", () => {
  it("converts pure white correctly", () => {
    const lab = srgbToLab(255, 255, 255);
    expect(lab[0]).toBeCloseTo(100, 0); // L*
    expect(Math.abs(lab[1])).toBeLessThan(1); // a*
    expect(Math.abs(lab[2])).toBeLessThan(1); // b*
  });

  it("converts pure black correctly", () => {
    const lab = srgbToLab(0, 0, 0);
    expect(lab[0]).toBeCloseTo(0, 0);
  });

  it("converts pure red to positive a*", () => {
    const lab = srgbToLab(255, 0, 0);
    expect(lab[0]).toBeCloseTo(53.23, 0);
    expect(lab[1]).toBeGreaterThan(60); // positive a* = red
  });
});

describe("ciede2000", () => {
  it("returns 0 for identical colors", () => {
    const lab = srgbToLab(128, 64, 200);
    expect(ciede2000(lab, lab)).toBeCloseTo(0, 5);
  });

  it("returns known distance for reference pair", () => {
    const lab1: [number, number, number] = [50, 0, 0];
    const lab2: [number, number, number] = [50, 25, 0];
    const de = ciede2000(lab1, lab2);
    expect(de).toBeGreaterThan(10);
    expect(de).toBeLessThan(25);
  });

  it("black vs white is large distance", () => {
    const black = srgbToLab(0, 0, 0);
    const white = srgbToLab(255, 255, 255);
    expect(ciede2000(black, white)).toBeGreaterThan(90);
  });
});

describe("kmeanspp", () => {
  it("extracts k clusters from uniform data", () => {
    const pixels: [number, number, number][] = [];
    for (let i = 0; i < 100; i++) pixels.push([50, 0, 0]);
    for (let i = 0; i < 100; i++) pixels.push([80, 30, -20]);
    const { centroids, weights } = kmeanspp(pixels, 2, 42);
    expect(centroids).toHaveLength(2);
    expect(weights).toHaveLength(2);
    expect(weights.reduce((a, b) => a + b)).toBeCloseTo(1.0, 2);
  });

  it("handles k=1", () => {
    const pixels: [number, number, number][] = Array(50).fill([50, 10, 10]);
    const { centroids } = kmeanspp(pixels, 1, 42);
    expect(centroids).toHaveLength(1);
  });
});

describe("sinkhornDistance", () => {
  it("returns ~0 for identical palettes", () => {
    const palette: [number, number, number][] = [
      [50, 0, 0],
      [80, 20, -10],
    ];
    const weights = [0.5, 0.5];
    const dist = sinkhornDistance(palette, palette, weights, weights);
    expect(dist).toBeLessThan(1);
  });

  it("returns positive distance for different palettes", () => {
    const p1: [number, number, number][] = [[0, 0, 0]];
    const p2: [number, number, number][] = [[100, 0, 0]];
    const dist = sinkhornDistance(p1, p2, [1], [1]);
    // Sinkhorn with 1-element palettes = CIEDE2000(black_lab, white_lab)
    expect(dist).toBeGreaterThan(0);
  });
});

describe("computeColorPaletteSimilarity (M1)", () => {
  it("returns 1.0 for identical solid-color images", () => {
    const pixels: [number, number, number][] = Array(100).fill([128, 64, 32]);
    const score = computeColorPaletteSimilarity(pixels, pixels);
    expect(score).toBeCloseTo(1.0, 1);
  });

  it("returns low score for very different palettes", () => {
    // Pass raw Lab values directly
    const redLab: [number, number, number] = [53.23, 80.11, 67.22];
    const blueLab: [number, number, number] = [32.30, 79.20, -107.86];
    const refPixels: [number, number, number][] = Array(100).fill(redLab);
    const genPixels: [number, number, number][] = Array(100).fill(blueLab);
    const score = computeColorPaletteSimilarity(refPixels, genPixels);
    expect(score).toBeLessThan(0.7);
  });

  it("always returns 0-1 range", () => {
    const a: [number, number, number][] = Array(50).fill([0, 0, 0]);
    const b: [number, number, number][] = Array(50).fill([100, 80, 80]);
    const score = computeColorPaletteSimilarity(a, b);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
