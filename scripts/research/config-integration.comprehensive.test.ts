import { describe, it, expect } from "vitest";

import {
  ResearchConfigSchema,
  getDefaultConfig,
} from "./research-config.js";

describe("getDefaultConfig", () => {
  it("returns a schema-valid active research baseline", () => {
    const config = getDefaultConfig();
    expect(() => ResearchConfigSchema.parse(config)).not.toThrow();
  });
});

describe("partial config overrides", () => {
  it("accepts multiplier overrides without losing defaults", () => {
    const result = ResearchConfigSchema.parse({ colorCycleSpeedMul: 2.0 });
    expect(result.colorCycleSpeedMul).toBe(2.0);
    expect(result.glowIntensityMul).toBe(1.0);
  });
});

describe("range boundaries", () => {
  it.each([
    ["colorCycleSpeedMul", 0.1, 3.0],
    ["glowIntensityMul", 0.0, 3.0],
    ["bloomStrengthMul", 0.0, 3.0],
    ["chromaticAberrationOffsetMul", 0.0, 3.0],
    ["satBlendLow", 0.01, 0.3],
    ["satBlendHigh", 0.2, 0.8],
    ["satInjectionMul", 0.1, 1.0],
    ["glowPulseFloor", 0.0, 0.9],
    ["lumExponent", 0.5, 3.0],
    ["tempoMul", 0.3, 3.0],
    ["phaseSpreadMul", 0.1, 3.0],
  ] as [string, number, number][])("%s accepts range [%d, %d]", (key, min, max) => {
    expect(() => ResearchConfigSchema.parse({ [key]: min })).not.toThrow();
    expect(() => ResearchConfigSchema.parse({ [key]: max })).not.toThrow();
  });
});

describe("invalid values", () => {
  it.each([
    ["colorCycleSpeedMul", 0],
    ["saturationBoostMul", 3.1],
    ["bloomStrengthMul", 3.1],
    ["chromaticAberrationOffsetMul", 3.1],
  ] as [string, number][])("%s rejects %d", (key, val) => {
    expect(() => ResearchConfigSchema.parse({ [key]: val })).toThrow();
  });
});

describe("constraint validation", () => {
  it("enforces satBlendLow < satBlendHigh", () => {
    expect(() =>
      ResearchConfigSchema.parse({ satBlendLow: 0.5, satBlendHigh: 0.3 }),
    ).toThrow();
  });

  it("enforces periodRangeLow < periodRangeHigh", () => {
    expect(() =>
      ResearchConfigSchema.parse({ periodRangeLow: 25, periodRangeHigh: 10 }),
    ).toThrow();
  });
});
