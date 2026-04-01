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
    expect(config.maxLayers).toBe(12);
    expect(config.minRetainedLayers).toBe(6);
    expect(config.alphaThreshold).toBe(10);
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

  // ── T2: Shader Axes ──────────────────────────────────

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

  it("legacy config without shader fields parses with defaults", () => {
    const config = ResearchConfigSchema.parse({});
    expect(config.satBlendLow).toBe(0.1);
    expect(config.glowPulseFloor).toBe(0.0);
    expect(config.lumExponent).toBe(1.0);
  });

  // ── T4: SceneGen Axes ──────────────────────────────────

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

  // ── T5: BlendMode ──────────────────────────────────

  it("keeps blendMode at normal default", () => {
    const config = ResearchConfigSchema.parse({});
    expect(config.blendMode).toBe("normal");
  });

  it("rejects invalid blendMode", () => {
    expect(() => ResearchConfigSchema.parse({ blendMode: "overlay" })).toThrow();
  });

  it("allows partial override", () => {
    const config = ResearchConfigSchema.parse({ samMaskLimit: 8 });
    expect(config.samMaskLimit).toBe(8);
    expect(config.alphaThreshold).toBe(10);
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

  // ── Depth Axes ──────────────────────────────────

  it("keeps depth axes at correct defaults", () => {
    const config = ResearchConfigSchema.parse({});
    expect(config.depthRoleWeight).toBe(0.5);
    expect(config.depthForegroundThreshold).toBe(0.3);
    expect(config.depthBackgroundThreshold).toBe(0.7);
  });

  it("rejects depthRoleWeight out of range", () => {
    expect(() => ResearchConfigSchema.parse({ depthRoleWeight: -0.1 })).toThrow();
    expect(() => ResearchConfigSchema.parse({ depthRoleWeight: 1.1 })).toThrow();
  });

  it("rejects depthForegroundThreshold out of range", () => {
    expect(() => ResearchConfigSchema.parse({ depthForegroundThreshold: 0.05 })).toThrow();
    expect(() => ResearchConfigSchema.parse({ depthForegroundThreshold: 0.5 })).toThrow();
  });

  it("rejects depthBackgroundThreshold out of range", () => {
    expect(() => ResearchConfigSchema.parse({ depthBackgroundThreshold: 0.4 })).toThrow();
    expect(() => ResearchConfigSchema.parse({ depthBackgroundThreshold: 1.0 })).toThrow();
  });

  // ── Depth Cinematic Axes ──────────────────────────────────

  it("accepts 5 new depth cinematic axes with valid values", () => {
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

  it("defaults all 5 depth cinematic axes to null (auto)", () => {
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

  it("rejects depthSpeedInfluence > 2", () => {
    expect(() => ResearchConfigSchema.parse({ depthSpeedInfluence: 3 })).toThrow();
  });

  it("rejects depthSpeedInfluence < 0", () => {
    expect(() => ResearchConfigSchema.parse({ depthSpeedInfluence: -0.1 })).toThrow();
  });

  it("rejects depthGlowInfluence > 2", () => {
    expect(() => ResearchConfigSchema.parse({ depthGlowInfluence: 3 })).toThrow();
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

  // ── SAM3 / VLM Axes ──────────────────────────────────

  it("defaults SAM3 axes correctly", () => {
    const config = ResearchConfigSchema.parse({});
    expect(config.sam3Threshold).toBe(0.25);
    expect(config.secondPassEnabled).toBe(true);
    expect(config.secondPassThreshold).toBe(0.8);
    expect(config.useSam3).toBe(true);
  });

  it("accepts sam3Threshold valid range", () => {
    const config = ResearchConfigSchema.parse({ sam3Threshold: 0.5 });
    expect(config.sam3Threshold).toBe(0.5);
  });

  it("rejects sam3Threshold > 0.9", () => {
    expect(() => ResearchConfigSchema.parse({ sam3Threshold: 1.0 })).toThrow();
  });

  it("rejects sam3Threshold < 0.1", () => {
    expect(() => ResearchConfigSchema.parse({ sam3Threshold: 0.05 })).toThrow();
  });

  it("rejects secondPassThreshold > 0.95", () => {
    expect(() => ResearchConfigSchema.parse({ secondPassThreshold: 1.0 })).toThrow();
  });

  it("accepts useSam3=false", () => {
    const config = ResearchConfigSchema.parse({ useSam3: false });
    expect(config.useSam3).toBe(false);
  });
});

describe("getDefaultConfig", () => {
  it("returns schema-valid active defaults", () => {
    const config = getDefaultConfig();
    expect(() => ResearchConfigSchema.parse(config)).not.toThrow();
    expect(config.samMaskLimit === null || config.samMaskLimit >= 3).toBe(true);
    expect(config.minRetainedLayers).toBeGreaterThanOrEqual(1);
    expect(config.alphaThreshold).toBeGreaterThanOrEqual(1);
  });

  it("returns depth axis defaults", () => {
    const config = getDefaultConfig();
    expect(config.depthRoleWeight).toBe(0.5);
    expect(config.depthForegroundThreshold).toBe(0.3);
    expect(config.depthBackgroundThreshold).toBe(0.7);
  });

  it("includes 5 depth cinematic axes at null (auto)", () => {
    const config = getDefaultConfig();
    expect(config.depthSpeedInfluence).toBeNull();
    expect(config.depthGlowInfluence).toBeNull();
    expect(config.depthParallaxScale).toBeNull();
    expect(config.hazeIntensity).toBeNull();
    expect(config.featherRadius).toBeNull();
  });

  it("includes SAM3 axes with correct defaults", () => {
    const config = getDefaultConfig();
    expect(config.sam3Threshold).toBe(0.25);
    expect(config.secondPassEnabled).toBe(true);
    expect(config.secondPassThreshold).toBe(0.8);
    expect(config.useSam3).toBe(true);
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
export const config = ResearchConfigSchema.parse({ "samMaskLimit": 9, "maxLayers": 10 });
`,
    );
    const config = loadConfig(tsPath);
    expect(config.samMaskLimit).toBe(9);
    expect(config.maxLayers).toBe(10);
  });

  it("loads overrides from .ts file with unquoted keys (real TS literal)", () => {
    mkdirSync(testDir, { recursive: true });
    const tsPath = `${testDir}/unquoted-config.ts`;
    writeFileSync(
      tsPath,
      `
import { ResearchConfigSchema } from "./research-config";
export const config = ResearchConfigSchema.parse({
  samMaskLimit: 8,
  maxLayers: 10,
  colorCycleSpeedMul: 1.5,
  useSam3: true,
});
`,
    );
    const config = loadConfig(tsPath);
    expect(config.samMaskLimit).toBe(8);
    expect(config.maxLayers).toBe(10);
    expect(config.colorCycleSpeedMul).toBe(1.5);
    expect(config.useSam3).toBe(true);
  });
});

// ==========================================================================
// T2: Config schema ↔ getDefaultConfig full sync
// ==========================================================================

describe("Config schema sync (T2)", () => {
  it("getDefaultConfig round-trips through schema", () => {
    const config = getDefaultConfig();
    const reparsed = ResearchConfigSchema.parse(config);
    expect(reparsed).toEqual(config);
  });

  it("schema keys match getDefaultConfig keys", () => {
    const config = getDefaultConfig();
    const configKeys = new Set(Object.keys(config));

    // Unwrap ZodEffects layers (.refine() wrapping) to reach the inner ZodObject.shape
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let inner: any = ResearchConfigSchema;
    while (inner._def?.schema) {
      inner = inner._def.schema;
    }
    const schemaShape: Record<string, unknown> | undefined = inner.shape;

    // If we can't access shape, fail explicitly instead of silently skipping
    expect(schemaShape).toBeDefined();

    const schemaKeys = new Set(Object.keys(schemaShape!));
    const missingInConfig = [...schemaKeys].filter((k) => !configKeys.has(k));
    const extraInConfig = [...configKeys].filter((k) => !schemaKeys.has(k));

    expect(missingInConfig).toEqual([]);
    expect(extraInConfig).toEqual([]);
  });

  it("new fields have correct defaults", () => {
    const config = getDefaultConfig();

    // Mask post-processing
    expect(config.morphCloseEnabled).toBe(true);
    expect(config.morphCloseKernelScale).toBe(0.01);
    expect(config.alphaMatteEnabled).toBe(true);
    expect(config.alphaMatteRadiusScale).toBe(0.003);

    // SAM3
    expect(config.sam3Threshold).toBe(0.25);
    expect(config.useSam3).toBe(true);

    // Depth cinematic (null = auto)
    expect(config.depthSpeedInfluence).toBeNull();
    expect(config.depthParallaxScale).toBeNull();
    expect(config.hazeIntensity).toBeNull();
    expect(config.featherRadius).toBeNull();
  });
});
