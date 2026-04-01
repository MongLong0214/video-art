import { describe, it, expect, afterEach } from "vitest";
import {
  ResearchConfigSchema,
  getDefaultConfig,
  loadConfig,
} from "./research-config.js";
import { mkdirSync, writeFileSync, rmSync } from "fs";

describe("ResearchConfigSchema", () => {
  it("keeps animation multipliers at neutral defaults", () => {
    const config = ResearchConfigSchema.parse({});
    expect(config.colorCycleSpeedMul).toBe(1.0);
    expect(config.glowIntensityMul).toBe(1.0);
    expect(config.saturationBoostMul).toBe(1.0);
    expect(config.luminanceKeyMul).toBe(1.0);
    expect(config.bloomStrengthMul).toBe(1.0);
    expect(config.chromaticAberrationOffsetMul).toBe(1.0);
  });

  it("keeps effect axes at neutral defaults", () => {
    const config = ResearchConfigSchema.parse({});
    expect(config.bloomRadiusMul).toBe(1.0);
    expect(config.bloomThresholdMul).toBe(1.0);
    expect(config.caModulationOffsetMul).toBe(1.0);
  });

  it("rejects bloomRadiusMul out of range", () => {
    expect(() => ResearchConfigSchema.parse({ bloomRadiusMul: 0.0 })).toThrow();
    expect(() => ResearchConfigSchema.parse({ bloomRadiusMul: 4.0 })).toThrow();
  });

  it("rejects caModulationOffsetMul out of range", () => {
    expect(() => ResearchConfigSchema.parse({ caModulationOffsetMul: 0.0 })).toThrow();
    expect(() => ResearchConfigSchema.parse({ caModulationOffsetMul: 4.0 })).toThrow();
  });

  it("keeps shader axes at correct defaults", () => {
    const config = ResearchConfigSchema.parse({});
    expect(config.satBlendLow).toBe(0.1);
    expect(config.satBlendHigh).toBe(0.4);
    expect(config.satInjectionMul).toBe(0.35);
    expect(config.glowPulseFloor).toBe(0.0);
    expect(config.lumExponent).toBe(1.0);
  });

  it("enforces satBlendLow < satBlendHigh", () => {
    expect(() => ResearchConfigSchema.parse({ satBlendLow: 0.5, satBlendHigh: 0.3 })).toThrow();
  });

  it("rejects satBlendLow = satBlendHigh", () => {
    expect(() => ResearchConfigSchema.parse({ satBlendLow: 0.3, satBlendHigh: 0.3 })).toThrow();
  });

  it("keeps scenegen axes at correct defaults", () => {
    const config = ResearchConfigSchema.parse({});
    expect(config.tempoMul).toBe(1.0);
    expect(config.phaseSpreadMul).toBe(1.0);
    expect(config.periodRangeLow).toBe(1.0);
    expect(config.periodRangeHigh).toBe(20.0);
    expect(config.glowPeriodMul).toBe(1.0);
  });

  it("enforces periodRangeLow < periodRangeHigh", () => {
    expect(() => ResearchConfigSchema.parse({ periodRangeLow: 10.0, periodRangeHigh: 5.0 })).toThrow();
  });

  it("keeps blendMode at normal default", () => {
    const config = ResearchConfigSchema.parse({});
    expect(config.blendMode).toBe("normal");
  });

  it("rejects invalid blendMode", () => {
    expect(() => ResearchConfigSchema.parse({ blendMode: "overlay" })).toThrow();
  });

  // ── Depth Cinematic Axes ──────────────────────────────────

  it("accepts depth cinematic axes with valid values", () => {
    const config = ResearchConfigSchema.parse({
      depthSpeedInfluence: 1.0,
      depthGlowInfluence: 0.5,
      depthParallaxScale: 0.05,
      hazeIntensity: 0.3,
      featherRadius: 0.1,
    });
    expect(config.depthSpeedInfluence).toBe(1.0);
    expect(config.depthGlowInfluence).toBe(0.5);
    expect(config.depthParallaxScale).toBe(0.05);
    expect(config.hazeIntensity).toBe(0.3);
    expect(config.featherRadius).toBe(0.1);
  });

  it("defaults all depth cinematic axes to null (auto)", () => {
    const config = ResearchConfigSchema.parse({});
    expect(config.depthSpeedInfluence).toBeNull();
    expect(config.depthGlowInfluence).toBeNull();
    expect(config.depthParallaxScale).toBeNull();
    expect(config.hazeIntensity).toBeNull();
    expect(config.featherRadius).toBeNull();
  });

  it("accepts explicit 0 (off) for depth cinematic axes", () => {
    const config = ResearchConfigSchema.parse({
      depthSpeedInfluence: 0,
      depthGlowInfluence: 0,
      depthParallaxScale: 0,
      hazeIntensity: 0,
      featherRadius: 0,
    });
    expect(config.depthSpeedInfluence).toBe(0);
    expect(config.depthParallaxScale).toBe(0);
    expect(config.hazeIntensity).toBe(0);
  });

  it("rejects depthSpeedInfluence out of range", () => {
    expect(() => ResearchConfigSchema.parse({ depthSpeedInfluence: 3 })).toThrow();
    expect(() => ResearchConfigSchema.parse({ depthSpeedInfluence: -0.1 })).toThrow();
  });

  it("rejects depthParallaxScale > 0.1", () => {
    expect(() => ResearchConfigSchema.parse({ depthParallaxScale: 0.2 })).toThrow();
  });

  it("rejects hazeIntensity > 1", () => {
    expect(() => ResearchConfigSchema.parse({ hazeIntensity: 1.5 })).toThrow();
  });

  it("rejects featherRadius > 0.2", () => {
    expect(() => ResearchConfigSchema.parse({ featherRadius: 0.3 })).toThrow();
  });
});

describe("getDefaultConfig", () => {
  it("returns schema-valid active defaults", () => {
    const config = getDefaultConfig();
    expect(() => ResearchConfigSchema.parse(config)).not.toThrow();
  });

  it("includes depth cinematic axes at null (auto)", () => {
    const config = getDefaultConfig();
    expect(config.depthSpeedInfluence).toBeNull();
    expect(config.depthGlowInfluence).toBeNull();
    expect(config.depthParallaxScale).toBeNull();
    expect(config.hazeIntensity).toBeNull();
    expect(config.featherRadius).toBeNull();
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
    expect(config).toEqual(getDefaultConfig());
  });

  it("loads config from JSON file", () => {
    mkdirSync(testDir, { recursive: true });
    const jsonPath = `${testDir}/config.json`;
    writeFileSync(
      jsonPath,
      JSON.stringify({ colorCycleSpeedMul: 2.0 }),
    );
    const config = loadConfig(jsonPath);
    expect(config.colorCycleSpeedMul).toBe(2.0);
  });

  it("returns defaults for invalid JSON file", () => {
    mkdirSync(testDir, { recursive: true });
    const jsonPath = `${testDir}/bad.json`;
    writeFileSync(jsonPath, "not json");
    const config = loadConfig(jsonPath);
    expect(config).toEqual(getDefaultConfig());
  });

  it("defaults to scripts/research/research-config.ts when no path is given", () => {
    const config = loadConfig();
    expect(config).toEqual(getDefaultConfig());
  });

  it("loads overrides from a .ts file by extracting parse({...})", () => {
    mkdirSync(testDir, { recursive: true });
    const tsPath = `${testDir}/test-config.ts`;
    writeFileSync(
      tsPath,
      `
import { ResearchConfigSchema } from "./research-config";
export const config = ResearchConfigSchema.parse({ "colorCycleSpeedMul": 2.5 });
`,
    );
    const config = loadConfig(tsPath);
    expect(config.colorCycleSpeedMul).toBe(2.5);
  });
});

describe("Config schema sync", () => {
  it("getDefaultConfig round-trips through schema", () => {
    const config = getDefaultConfig();
    const reparsed = ResearchConfigSchema.parse(config);
    expect(reparsed).toEqual(config);
  });

  it("schema keys match getDefaultConfig keys", () => {
    const config = getDefaultConfig();
    const configKeys = new Set(Object.keys(config));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let inner: any = ResearchConfigSchema;
    while (inner._def?.schema) {
      inner = inner._def.schema;
    }
    const schemaShape: Record<string, unknown> | undefined = inner.shape;
    expect(schemaShape).toBeDefined();

    const schemaKeys = new Set(Object.keys(schemaShape!));
    const missingInConfig = [...schemaKeys].filter((k) => !configKeys.has(k));
    const extraInConfig = [...configKeys].filter((k) => !schemaKeys.has(k));

    expect(missingInConfig).toEqual([]);
    expect(extraInConfig).toEqual([]);
  });
});
