import { describe, it, expect, afterEach } from "vitest";
import {
  ResearchConfigSchema,
  getDefaultConfig,
  loadConfig,
  type ResearchConfig,
} from "./research-config.js";
import { mkdirSync, writeFileSync, rmSync } from "fs";

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

  it("has 28+ parameters", () => {
    const config = ResearchConfigSchema.parse({});
    expect(Object.keys(config).length).toBeGreaterThanOrEqual(28);
  });
});

describe("recursive decomposition parameters", () => {
  it("has default recurseCoverageThreshold of 0.30", () => {
    const config = ResearchConfigSchema.parse({});
    expect(config.recurseCoverageThreshold).toBe(0.30);
  });

  it("has default recurseComponentThreshold of 3", () => {
    const config = ResearchConfigSchema.parse({});
    expect(config.recurseComponentThreshold).toBe(3);
  });

  it("has default recurseEdgeDensityThreshold of 0.15", () => {
    const config = ResearchConfigSchema.parse({});
    expect(config.recurseEdgeDensityThreshold).toBe(0.15);
  });

  it("accepts valid recurseCoverageThreshold range", () => {
    expect(() => ResearchConfigSchema.parse({ recurseCoverageThreshold: 0.1 })).not.toThrow();
    expect(() => ResearchConfigSchema.parse({ recurseCoverageThreshold: 0.9 })).not.toThrow();
  });

  it("rejects recurseCoverageThreshold out of range", () => {
    expect(() => ResearchConfigSchema.parse({ recurseCoverageThreshold: 0.05 })).toThrow();
    expect(() => ResearchConfigSchema.parse({ recurseCoverageThreshold: 0.95 })).toThrow();
  });

  it("accepts valid recurseComponentThreshold range", () => {
    expect(() => ResearchConfigSchema.parse({ recurseComponentThreshold: 1 })).not.toThrow();
    expect(() => ResearchConfigSchema.parse({ recurseComponentThreshold: 20 })).not.toThrow();
  });

  it("rejects recurseComponentThreshold out of range", () => {
    expect(() => ResearchConfigSchema.parse({ recurseComponentThreshold: 0 })).toThrow();
    expect(() => ResearchConfigSchema.parse({ recurseComponentThreshold: 21 })).toThrow();
  });

  it("accepts valid recurseEdgeDensityThreshold range", () => {
    expect(() => ResearchConfigSchema.parse({ recurseEdgeDensityThreshold: 0.01 })).not.toThrow();
    expect(() => ResearchConfigSchema.parse({ recurseEdgeDensityThreshold: 0.5 })).not.toThrow();
  });

  it("rejects recurseEdgeDensityThreshold out of range", () => {
    expect(() => ResearchConfigSchema.parse({ recurseEdgeDensityThreshold: 0.005 })).toThrow();
    expect(() => ResearchConfigSchema.parse({ recurseEdgeDensityThreshold: 0.6 })).toThrow();
  });

  it("recurseComponentThreshold must be integer", () => {
    expect(() => ResearchConfigSchema.parse({ recurseComponentThreshold: 2.5 })).toThrow();
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

  it("includes recursive decomposition defaults", () => {
    const config = getDefaultConfig();
    expect(config.recurseCoverageThreshold).toBe(0.30);
    expect(config.recurseComponentThreshold).toBe(3);
    expect(config.recurseEdgeDensityThreshold).toBe(0.15);
  });
});

describe("loadConfig", () => {
  const testDir = "/tmp/test-config-" + Date.now();

  afterEach(() => {
    try { rmSync(testDir, { recursive: true, force: true }); } catch { /* noop */ }
  });

  it("returns defaults when file does not exist", () => {
    const config = loadConfig("/nonexistent/path/config.ts");
    expect(config.numLayers).toBe(4);
    expect(config.recurseCoverageThreshold).toBe(0.30);
  });

  it("loads config from JSON file", () => {
    mkdirSync(testDir, { recursive: true });
    const jsonPath = `${testDir}/config.json`;
    writeFileSync(jsonPath, JSON.stringify({ numLayers: 8, recurseCoverageThreshold: 0.5 }));
    const config = loadConfig(jsonPath);
    expect(config.numLayers).toBe(8);
    expect(config.recurseCoverageThreshold).toBe(0.5);
  });

  it("returns defaults for invalid JSON file", () => {
    mkdirSync(testDir, { recursive: true });
    const jsonPath = `${testDir}/bad.json`;
    writeFileSync(jsonPath, "not json");
    const config = loadConfig(jsonPath);
    expect(config.numLayers).toBe(4);
  });

  it("defaults to scripts/research/research-config.ts when no path given", () => {
    // This should work because the actual file exists
    const config = loadConfig();
    expect(config.numLayers).toBe(4);
  });

  it("loads from .ts file by extracting parse({}) pattern", () => {
    mkdirSync(testDir, { recursive: true });
    const tsPath = `${testDir}/test-config.ts`;
    writeFileSync(tsPath, `
import { z } from "zod";
export const schema = z.object({}).parse({});
`);
    const config = loadConfig(tsPath);
    expect(config.numLayers).toBe(4); // defaults
  });
});
