import { describe, it, expect } from "vitest";
import {
  rgbToCCT,
  cctToMireds,
  computeColorTemperatureSimilarity,
} from "./color-temperature.js";

describe("rgbToCCT", () => {
  it("estimates D65 white correctly (~6500K)", () => {
    const { cct } = rgbToCCT(255, 255, 255);
    expect(cct).toBeGreaterThan(5500);
    expect(cct).toBeLessThan(7500);
  });

  it("estimates warm light (reddish) as low CCT", () => {
    const { cct } = rgbToCCT(255, 180, 100);
    expect(cct).toBeLessThan(4500);
  });

  it("returns duv value", () => {
    const { duv } = rgbToCCT(255, 255, 255);
    expect(typeof duv).toBe("number");
    expect(Math.abs(duv)).toBeLessThan(0.05);
  });
});

describe("cctToMireds", () => {
  it("converts 5000K to 200 MRD", () => {
    expect(cctToMireds(5000)).toBe(200);
  });

  it("converts 6500K to ~153.8 MRD", () => {
    expect(cctToMireds(6500)).toBeCloseTo(153.85, 1);
  });
});

describe("computeColorTemperatureSimilarity (M3)", () => {
  it("returns 1.0 for identical temperatures", () => {
    const white = [255, 255, 255] as [number, number, number];
    const score = computeColorTemperatureSimilarity(white, white);
    expect(score).toBeCloseTo(1.0, 1);
  });

  it("returns lower score for different temperatures", () => {
    const cool = [200, 200, 255] as [number, number, number];
    const warm = [255, 200, 150] as [number, number, number];
    const score = computeColorTemperatureSimilarity(cool, warm);
    expect(score).toBeLessThan(0.9);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("clamps to 0 for extreme differences", () => {
    const extreme1 = [255, 100, 50] as [number, number, number];
    const extreme2 = [50, 100, 255] as [number, number, number];
    const score = computeColorTemperatureSimilarity(extreme1, extreme2);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
