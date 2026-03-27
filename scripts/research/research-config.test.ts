import { describe, it, expect } from "vitest";
import {
  ResearchConfigSchema,
  getDefaultConfig,
  type ResearchConfig,
} from "./research-config";

describe("ResearchConfigSchema", () => {
  it("parses default config from empty object", () => {
    const config = ResearchConfigSchema.parse({});
    expect(config.numLayers).toBe(4);
    expect(config.method).toBe("qwen-only");
    expect(config.alphaThreshold).toBe(128);
  });

  it("all multiplier defaults are 1.0", () => {
    const config = ResearchConfigSchema.parse({});
    expect(config.colorCycleSpeedMul).toBe(1.0);
    expect(config.parallaxDepthMul).toBe(1.0);
    expect(config.waveAmplitudeMul).toBe(1.0);
    expect(config.glowIntensityMul).toBe(1.0);
    expect(config.saturationBoostMul).toBe(1.0);
    expect(config.luminanceKeyMul).toBe(1.0);
  });

  it("allows partial override", () => {
    const config = ResearchConfigSchema.parse({ numLayers: 6 });
    expect(config.numLayers).toBe(6);
    expect(config.method).toBe("qwen-only"); // default kept
  });

  it("rejects numLayers out of range", () => {
    expect(() => ResearchConfigSchema.parse({ numLayers: 99 })).toThrow();
  });

  it("rejects negative minCoverage", () => {
    expect(() =>
      ResearchConfigSchema.parse({ minCoverage: -0.1 }),
    ).toThrow();
  });

  it("rejects invalid method", () => {
    expect(() =>
      ResearchConfigSchema.parse({ method: "invalid" }),
    ).toThrow();
  });

  it("enforces simpleEdgeMax < complexEdgeMin constraint", () => {
    expect(() =>
      ResearchConfigSchema.parse({
        simpleEdgeMax: 0.25,
        complexEdgeMin: 0.10,
      }),
    ).toThrow();
  });

  it("passes when simpleEdgeMax < complexEdgeMin", () => {
    const config = ResearchConfigSchema.parse({
      simpleEdgeMax: 0.05,
      complexEdgeMin: 0.20,
    });
    expect(config.simpleEdgeMax).toBe(0.05);
  });
});

describe("getDefaultConfig", () => {
  it("returns a valid config with all defaults", () => {
    const config = getDefaultConfig();
    expect(config.numLayers).toBe(4);
    expect(config.maxLayers).toBe(8);
    expect(config.iouDedupeThreshold).toBe(0.85);
    expect(config.uniqueCoverageThreshold).toBe(0.02);
  });

  it("passes schema validation", () => {
    const config = getDefaultConfig();
    expect(() => ResearchConfigSchema.parse(config)).not.toThrow();
  });
});
