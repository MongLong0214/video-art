import { describe, it, expect, afterEach } from "vitest";
import {
  ResearchConfigSchema,
  getDefaultConfig,
  loadConfig,
} from "./research-config.js";
import { mkdirSync, writeFileSync, rmSync } from "fs";

describe("ResearchConfigSchema", () => {
  it("parses SAM2 defaults from an empty object", () => {
    const config = ResearchConfigSchema.parse({});
    expect(config.samMaskLimit).toBeNull();
    expect(config.samPointsPerSide).toBe(64);
    expect(config.samPredIouThresh).toBe(0.7);
    expect(config.samStabilityScoreThresh).toBe(0.92);
    expect(config.luminanceFallbackEnabled).toBe(true);
    expect(config.luminanceFallbackMinSamLayers).toBe(3);
    expect(config.luminanceFallbackZoneCount).toBe(6);
    expect(config.luminanceFallbackResidualOnly).toBe(false);
    expect(config.luminanceFallbackResidualCoverageMin).toBe(0);
    expect(config.maxLayers).toBe(12);
    expect(config.minRetainedLayers).toBe(6);
    expect(config.alphaThreshold).toBe(128);
    expect(config.minCoverage).toBe(0.005);
  });

  it("keeps animation multipliers at neutral defaults", () => {
    const config = ResearchConfigSchema.parse({});
    expect(config.colorCycleSpeedMul).toBe(1.0);
    expect(config.glowIntensityMul).toBe(1.0);
    expect(config.saturationBoostMul).toBe(1.0);
    expect(config.luminanceKeyMul).toBe(1.0);
    expect(config.bloomStrengthMul).toBe(1.0);
    expect(config.chromaticAberrationOffsetMul).toBe(1.0);
  });

  it("allows partial override", () => {
    const config = ResearchConfigSchema.parse({ samMaskLimit: 8 });
    expect(config.samMaskLimit).toBe(8);
    expect(config.alphaThreshold).toBe(128);
  });

  it("maps legacy numLayers input to samMaskLimit when loading config files", () => {
    const config = ResearchConfigSchema.parse({ numLayers: 7 });
    expect(config.samMaskLimit).toBeNull();
    expect((config as Record<string, unknown>).numLayers).toBeUndefined();
  });

  it("rejects invalid SAM mask limits", () => {
    expect(() => ResearchConfigSchema.parse({ samMaskLimit: 2 })).toThrow();
    expect(() => ResearchConfigSchema.parse({ samMaskLimit: 13 })).toThrow();
  });

  it("rejects negative minCoverage", () => {
    expect(() => ResearchConfigSchema.parse({ minCoverage: -0.1 })).toThrow();
  });

  it("enforces simpleEdgeMax < complexEdgeMin", () => {
    expect(() =>
      ResearchConfigSchema.parse({
        simpleEdgeMax: 0.25,
        complexEdgeMin: 0.1,
      }),
    ).toThrow();
  });
});

describe("getDefaultConfig", () => {
  it("returns schema-valid defaults", () => {
    const config = getDefaultConfig();
    expect(() => ResearchConfigSchema.parse(config)).not.toThrow();
    expect(config.samMaskLimit).toBe(3);
    expect(config.samPointsPerSide).toBe(64);
    expect(config.samPredIouThresh).toBe(0.7);
    expect(config.samStabilityScoreThresh).toBe(0.92);
    expect(config.luminanceFallbackEnabled).toBe(true);
    expect(config.luminanceFallbackMinSamLayers).toBe(3);
    expect(config.luminanceFallbackZoneCount).toBe(6);
    expect(config.luminanceFallbackResidualOnly).toBe(false);
    expect(config.luminanceFallbackResidualCoverageMin).toBe(0);
    expect(config.maxLayers).toBe(12);
    expect(config.iouDedupeThreshold).toBe(0.92);
    expect(config.uniqueCoverageThreshold).toBe(0.02);
    expect(config.minRetainedLayers).toBe(1);
    expect(config.alphaThreshold).toBe(96);
    expect(config.bloomStrengthMul).toBe(1.0);
    expect(config.chromaticAberrationOffsetMul).toBe(1.0);
  });
});

describe("loadConfig", () => {
  const testDir = "/tmp/test-config-" + Date.now();

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // noop
    }
  });

  it("returns defaults when file does not exist", () => {
    const config = loadConfig("/nonexistent/path/config.ts");
    expect(config.samMaskLimit).toBe(3);
    expect(config.maxLayers).toBe(12);
  });

  it("loads config from JSON file", () => {
    mkdirSync(testDir, { recursive: true });
    const jsonPath = `${testDir}/config.json`;
    writeFileSync(
      jsonPath,
      JSON.stringify({ samMaskLimit: 8, uniqueCoverageThreshold: 0.02 }),
    );
    const config = loadConfig(jsonPath);
    expect(config.samMaskLimit).toBe(8);
    expect(config.uniqueCoverageThreshold).toBe(0.02);
  });

  it("normalizes legacy numLayers from JSON files", () => {
    mkdirSync(testDir, { recursive: true });
    const jsonPath = `${testDir}/legacy.json`;
    writeFileSync(jsonPath, JSON.stringify({ numLayers: 6 }));
    const config = loadConfig(jsonPath);
    expect(config.samMaskLimit).toBe(6);
  });

  it("returns defaults for invalid JSON file", () => {
    mkdirSync(testDir, { recursive: true });
    const jsonPath = `${testDir}/bad.json`;
    writeFileSync(jsonPath, "not json");
    const config = loadConfig(jsonPath);
    expect(config.samMaskLimit).toBe(3);
    expect(config.maxLayers).toBe(12);
  });

  it("defaults to scripts/research/research-config.ts when no path is given", () => {
    const config = loadConfig();
    expect(config.samMaskLimit).toBe(3);
    expect(config.maxLayers).toBe(12);
  });

  it("loads overrides from a .ts file by extracting parse({...})", () => {
    mkdirSync(testDir, { recursive: true });
    const tsPath = `${testDir}/test-config.ts`;
    writeFileSync(
      tsPath,
      `
import { ResearchConfigSchema } from "./research-config";
export const config = ResearchConfigSchema.parse({ "samMaskLimit": 9, "maxLayers": 10 });
`,
    );
    const config = loadConfig(tsPath);
    expect(config.samMaskLimit).toBe(9);
    expect(config.maxLayers).toBe(10);
  });
});
