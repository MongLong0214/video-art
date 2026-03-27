import { describe, it, expect } from "vitest";

import {
  ResearchConfigSchema,
  getDefaultConfig,
} from "./research-config.js";
import type { ResearchConfig } from "./research-config.js";

// ==========================================================================
// Default config
// ==========================================================================

describe("getDefaultConfig", () => {
  it("should return valid config", () => {
    const config = getDefaultConfig();
    expect(config).toBeDefined();
  });

  it("should match all expected default values", () => {
    const config = getDefaultConfig();
    expect(config.numLayers).toBe(4);
    expect(config.method).toBe("qwen-only");
    expect(config.alphaThreshold).toBe(128);
    expect(config.minCoverage).toBe(0.005);
    expect(config.simpleEdgeMax).toBe(0.1);
    expect(config.simpleEntropyMax).toBe(5.5);
    expect(config.complexEdgeMin).toBe(0.2);
    expect(config.complexEntropyMin).toBe(7.0);
    expect(config.edgePixelThreshold).toBe(30);
    expect(config.iouDedupeThreshold).toBe(0.7);
    expect(config.uniqueCoverageThreshold).toBe(0.02);
    expect(config.centralityThreshold).toBe(0.25);
    expect(config.bgPlateMinBboxRatio).toBe(0.3);
    expect(config.edgeTolerancePx).toBe(2);
    expect(config.maxLayers).toBe(8);
    expect(config.minRetainedLayers).toBe(3);
    expect(config.depthZones).toBe(4);
    expect(config.depthSplitThreshold).toBe(0.15);
    expect(config.qualityThresholdPct).toBe(10);
  });

  it("should match multiplier defaults (all 1.0 except wave/glow)", () => {
    const config = getDefaultConfig();
    expect(config.colorCycleSpeedMul).toBe(1.0);
    expect(config.parallaxDepthMul).toBe(1.0);
    expect(config.waveAmplitudeMul).toBe(1.0);
    expect(config.glowIntensityMul).toBe(1.0);
    expect(config.saturationBoostMul).toBe(1.0);
    expect(config.luminanceKeyMul).toBe(1.0);
  });
});

// ==========================================================================
// Partial overrides
// ==========================================================================

describe("partial config overrides", () => {
  it("should accept partial override of 1 param", () => {
    const result = ResearchConfigSchema.parse({ numLayers: 6 });
    expect(result.numLayers).toBe(6);
    expect(result.method).toBe("qwen-only"); // default preserved
  });

  it("should accept override of only alphaThreshold", () => {
    const result = ResearchConfigSchema.parse({ alphaThreshold: 200 });
    expect(result.alphaThreshold).toBe(200);
    expect(result.numLayers).toBe(4);
  });

  it("should accept override of method to qwen-zoedepth", () => {
    const result = ResearchConfigSchema.parse({ method: "qwen-zoedepth" });
    expect(result.method).toBe("qwen-zoedepth");
  });

  it("should accept multiple overrides", () => {
    const result = ResearchConfigSchema.parse({
      numLayers: 8,
      minCoverage: 0.01,
      maxLayers: 12,
    });
    expect(result.numLayers).toBe(8);
    expect(result.minCoverage).toBe(0.01);
    expect(result.maxLayers).toBe(12);
  });
});

// ==========================================================================
// Min boundary values
// ==========================================================================

describe("min boundary values", () => {
  it("should accept numLayers=2 (min)", () => {
    const result = ResearchConfigSchema.parse({ numLayers: 2 });
    expect(result.numLayers).toBe(2);
  });

  it("should accept alphaThreshold=1 (min)", () => {
    const result = ResearchConfigSchema.parse({ alphaThreshold: 1 });
    expect(result.alphaThreshold).toBe(1);
  });

  it("should accept minCoverage=0.001 (min)", () => {
    const result = ResearchConfigSchema.parse({ minCoverage: 0.001 });
    expect(result.minCoverage).toBe(0.001);
  });

  it("should accept maxLayers=3 (min)", () => {
    const result = ResearchConfigSchema.parse({ maxLayers: 3 });
    expect(result.maxLayers).toBe(3);
  });

  it("should accept colorCycleSpeedMul=0.1 (min)", () => {
    const result = ResearchConfigSchema.parse({ colorCycleSpeedMul: 0.1 });
    expect(result.colorCycleSpeedMul).toBe(0.1);
  });

  it("should accept waveAmplitudeMul=0.0 (min)", () => {
    const result = ResearchConfigSchema.parse({ waveAmplitudeMul: 0.0 });
    expect(result.waveAmplitudeMul).toBe(0.0);
  });
});

// ==========================================================================
// Max boundary values
// ==========================================================================

describe("max boundary values", () => {
  it("should accept numLayers=12 (max)", () => {
    const result = ResearchConfigSchema.parse({ numLayers: 12 });
    expect(result.numLayers).toBe(12);
  });

  it("should accept alphaThreshold=254 (max)", () => {
    const result = ResearchConfigSchema.parse({ alphaThreshold: 254 });
    expect(result.alphaThreshold).toBe(254);
  });

  it("should accept minCoverage=0.05 (max)", () => {
    const result = ResearchConfigSchema.parse({ minCoverage: 0.05 });
    expect(result.minCoverage).toBe(0.05);
  });

  it("should accept maxLayers=16 (max)", () => {
    const result = ResearchConfigSchema.parse({ maxLayers: 16 });
    expect(result.maxLayers).toBe(16);
  });

  it("should accept colorCycleSpeedMul=3.0 (max)", () => {
    const result = ResearchConfigSchema.parse({ colorCycleSpeedMul: 3.0 });
    expect(result.colorCycleSpeedMul).toBe(3.0);
  });
});

// ==========================================================================
// Invalid values (out of range)
// ==========================================================================

describe("invalid out-of-range values", () => {
  it("should reject numLayers=1 (below min)", () => {
    expect(() => ResearchConfigSchema.parse({ numLayers: 1 })).toThrow();
  });

  it("should reject numLayers=13 (above max)", () => {
    expect(() => ResearchConfigSchema.parse({ numLayers: 13 })).toThrow();
  });

  it("should reject alphaThreshold=0 (below min)", () => {
    expect(() => ResearchConfigSchema.parse({ alphaThreshold: 0 })).toThrow();
  });

  it("should reject alphaThreshold=255 (above max)", () => {
    expect(() => ResearchConfigSchema.parse({ alphaThreshold: 255 })).toThrow();
  });

  it("should reject minCoverage=0.0001 (below min)", () => {
    expect(() => ResearchConfigSchema.parse({ minCoverage: 0.0001 })).toThrow();
  });

  it("should reject minCoverage=0.1 (above max)", () => {
    expect(() => ResearchConfigSchema.parse({ minCoverage: 0.1 })).toThrow();
  });

  it("should reject maxLayers=2 (below min)", () => {
    expect(() => ResearchConfigSchema.parse({ maxLayers: 2 })).toThrow();
  });

  it("should reject maxLayers=17 (above max)", () => {
    expect(() => ResearchConfigSchema.parse({ maxLayers: 17 })).toThrow();
  });

  it("should reject non-integer numLayers", () => {
    expect(() => ResearchConfigSchema.parse({ numLayers: 4.5 })).toThrow();
  });

  it("should reject non-integer alphaThreshold", () => {
    expect(() => ResearchConfigSchema.parse({ alphaThreshold: 128.5 })).toThrow();
  });

  it("should reject invalid method", () => {
    expect(() => ResearchConfigSchema.parse({ method: "invalid" })).toThrow();
  });

  it("should reject colorCycleSpeedMul=0 (below min)", () => {
    expect(() => ResearchConfigSchema.parse({ colorCycleSpeedMul: 0 })).toThrow();
  });

  it("should reject colorCycleSpeedMul=4 (above max)", () => {
    expect(() => ResearchConfigSchema.parse({ colorCycleSpeedMul: 4 })).toThrow();
  });
});

// ==========================================================================
// Constraint validation: simpleEdgeMax < complexEdgeMin
// ==========================================================================

describe("constraint validation", () => {
  it("should accept simpleEdgeMax < complexEdgeMin", () => {
    const result = ResearchConfigSchema.parse({
      simpleEdgeMax: 0.1,
      complexEdgeMin: 0.2,
    });
    expect(result.simpleEdgeMax).toBe(0.1);
  });

  it("should reject simpleEdgeMax == complexEdgeMin", () => {
    expect(() =>
      ResearchConfigSchema.parse({
        simpleEdgeMax: 0.15,
        complexEdgeMin: 0.15,
      }),
    ).toThrow();
  });

  it("should reject simpleEdgeMax > complexEdgeMin", () => {
    expect(() =>
      ResearchConfigSchema.parse({
        simpleEdgeMax: 0.25,
        complexEdgeMin: 0.15,
      }),
    ).toThrow();
  });
});

// ==========================================================================
// Multiplier application
// ==========================================================================

describe("multiplier values", () => {
  it("should accept multiplier at 0.1x", () => {
    const result = ResearchConfigSchema.parse({
      parallaxDepthMul: 0.1,
      saturationBoostMul: 0.1,
      luminanceKeyMul: 0.1,
    });
    expect(result.parallaxDepthMul).toBe(0.1);
    expect(result.saturationBoostMul).toBe(0.1);
    expect(result.luminanceKeyMul).toBe(0.1);
  });

  it("should accept multiplier at 1.0x", () => {
    const result = ResearchConfigSchema.parse({ parallaxDepthMul: 1.0 });
    expect(result.parallaxDepthMul).toBe(1.0);
  });

  it("should accept multiplier at 3.0x", () => {
    const result = ResearchConfigSchema.parse({ parallaxDepthMul: 3.0 });
    expect(result.parallaxDepthMul).toBe(3.0);
  });

  it("should reject negative multiplier for parallaxDepthMul", () => {
    expect(() => ResearchConfigSchema.parse({ parallaxDepthMul: -0.1 })).toThrow();
  });

  it("should reject multiplier > 3.0 for parallaxDepthMul", () => {
    expect(() => ResearchConfigSchema.parse({ parallaxDepthMul: 3.1 })).toThrow();
  });
});

// ==========================================================================
// Additional param ranges
// ==========================================================================

describe("additional parameter ranges", () => {
  it("should accept iouDedupeThreshold at bounds", () => {
    expect(ResearchConfigSchema.parse({ iouDedupeThreshold: 0.3 }).iouDedupeThreshold).toBe(0.3);
    expect(ResearchConfigSchema.parse({ iouDedupeThreshold: 0.95 }).iouDedupeThreshold).toBe(0.95);
  });

  it("should reject iouDedupeThreshold out of bounds", () => {
    expect(() => ResearchConfigSchema.parse({ iouDedupeThreshold: 0.2 })).toThrow();
    expect(() => ResearchConfigSchema.parse({ iouDedupeThreshold: 0.96 })).toThrow();
  });

  it("should accept edgeTolerancePx at bounds", () => {
    expect(ResearchConfigSchema.parse({ edgeTolerancePx: 1 }).edgeTolerancePx).toBe(1);
    expect(ResearchConfigSchema.parse({ edgeTolerancePx: 10 }).edgeTolerancePx).toBe(10);
  });

  it("should accept depthZones at bounds", () => {
    expect(ResearchConfigSchema.parse({ depthZones: 2 }).depthZones).toBe(2);
    expect(ResearchConfigSchema.parse({ depthZones: 8 }).depthZones).toBe(8);
  });

  it("should accept qualityThresholdPct at bounds", () => {
    expect(ResearchConfigSchema.parse({ qualityThresholdPct: 1 }).qualityThresholdPct).toBe(1);
    expect(ResearchConfigSchema.parse({ qualityThresholdPct: 30 }).qualityThresholdPct).toBe(30);
  });
});
