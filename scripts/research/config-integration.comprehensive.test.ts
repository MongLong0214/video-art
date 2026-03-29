import { describe, it, expect } from "vitest";

import {
  ResearchConfigSchema,
  getDefaultConfig,
} from "./research-config.js";

describe("getDefaultConfig", () => {
  it("returns the current SAM2 research defaults", () => {
    const config = getDefaultConfig();
    expect(config.samMaskLimit).toBe(3);
    expect(config.maxLayers).toBe(12);
    expect(config.minRetainedLayers).toBe(1);
    expect(config.alphaThreshold).toBe(96);
    expect(config.minCoverage).toBe(0.005);
    expect(config.simpleEdgeMax).toBe(0.1);
    expect(config.simpleEntropyMax).toBe(5.5);
    expect(config.complexEdgeMin).toBe(0.2);
    expect(config.complexEntropyMin).toBe(7.0);
    expect(config.edgePixelThreshold).toBe(30);
    expect(config.iouDedupeThreshold).toBe(0.92);
    expect(config.uniqueCoverageThreshold).toBe(0.02);
    expect(config.centralityThreshold).toBe(0.25);
    expect(config.bgPlateMinBboxRatio).toBe(0.3);
    expect(config.edgeTolerancePx).toBe(2);
    expect(config.colorCycleSpeedMul).toBe(1.0);
    expect(config.glowIntensityMul).toBe(1.0);
    expect(config.saturationBoostMul).toBe(1.0);
    expect(config.luminanceKeyMul).toBe(1.0);
    expect(config.bloomStrengthMul).toBe(1.0);
    expect(config.chromaticAberrationOffsetMul).toBe(1.0);
  });
});

describe("partial config overrides", () => {
  it("accepts a SAM mask override without losing defaults", () => {
    const result = ResearchConfigSchema.parse({ samMaskLimit: 6 });
    expect(result.samMaskLimit).toBe(6);
    expect(result.alphaThreshold).toBe(128);
    expect(result.maxLayers).toBe(12);
  });

  it("accepts multiple live pipeline overrides together", () => {
    const result = ResearchConfigSchema.parse({
      minCoverage: 0.01,
      maxLayers: 10,
      centralityThreshold: 0.2,
    });
    expect(result.minCoverage).toBe(0.01);
    expect(result.maxLayers).toBe(10);
    expect(result.centralityThreshold).toBe(0.2);
  });
});

describe("range boundaries", () => {
  it.each([
    ["samMaskLimit", 3, 12],
    ["alphaThreshold", 1, 254],
    ["minCoverage", 0.001, 0.05],
    ["maxLayers", 3, 16],
    ["minRetainedLayers", 1, 12],
    ["iouDedupeThreshold", 0.3, 0.98],
    ["uniqueCoverageThreshold", 0.001, 0.1],
    ["edgeTolerancePx", 1, 10],
    ["colorCycleSpeedMul", 0.1, 3.0],
    ["glowIntensityMul", 0.0, 3.0],
    ["bloomStrengthMul", 0.0, 3.0],
    ["chromaticAberrationOffsetMul", 0.0, 3.0],
  ] as [string, number, number][])("%s accepts range [%d, %d]", (key, min, max) => {
    expect(() => ResearchConfigSchema.parse({ [key]: min })).not.toThrow();
    expect(() => ResearchConfigSchema.parse({ [key]: max })).not.toThrow();
  });

  it("accepts null samMaskLimit to defer to complexity scoring", () => {
    expect(ResearchConfigSchema.parse({ samMaskLimit: null }).samMaskLimit).toBeNull();
  });
});

describe("invalid values", () => {
  it.each([
    ["samMaskLimit", 2],
    ["samMaskLimit", 13],
    ["alphaThreshold", 0],
    ["alphaThreshold", 255],
    ["minCoverage", 0.0001],
    ["minCoverage", 0.1],
    ["maxLayers", 2],
    ["maxLayers", 17],
    ["minRetainedLayers", 0],
    ["minRetainedLayers", 13],
    ["colorCycleSpeedMul", 0],
    ["saturationBoostMul", 3.1],
    ["bloomStrengthMul", 3.1],
    ["chromaticAberrationOffsetMul", 3.1],
  ] as [string, number][])("%s rejects %d", (key, val) => {
    expect(() => ResearchConfigSchema.parse({ [key]: val })).toThrow();
  });
});

describe("constraint validation", () => {
  it("accepts simpleEdgeMax < complexEdgeMin", () => {
    const result = ResearchConfigSchema.parse({
      simpleEdgeMax: 0.1,
      complexEdgeMin: 0.2,
    });
    expect(result.simpleEdgeMax).toBe(0.1);
  });

  it("rejects simpleEdgeMax >= complexEdgeMin", () => {
    expect(() =>
      ResearchConfigSchema.parse({
        simpleEdgeMax: 0.2,
        complexEdgeMin: 0.2,
      }),
    ).toThrow();
    expect(() =>
      ResearchConfigSchema.parse({
        simpleEdgeMax: 0.25,
        complexEdgeMin: 0.2,
      }),
    ).toThrow();
  });
});
