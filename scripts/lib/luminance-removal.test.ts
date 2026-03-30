import { describe, it, expect } from "vitest";
import { ResearchConfigSchema, getDefaultConfig } from "../research/research-config.js";

/**
 * T2: Luminance Fallback Removal — Red Phase tests.
 * These tests verify that luminance-related code has been completely removed.
 * They should FAIL on the current codebase and PASS after removal.
 */
describe("T2: Luminance Fallback Removal", () => {
  describe("ResearchConfigSchema — luminance fields removed", () => {
    it("should not have luminanceFallbackEnabled in parsed output", () => {
      const config = ResearchConfigSchema.parse({});
      expect(
        (config as Record<string, unknown>).luminanceFallbackEnabled,
      ).toBeUndefined();
    });

    it("should not have luminanceFallbackMinSamLayers in parsed output", () => {
      const config = ResearchConfigSchema.parse({});
      expect(
        (config as Record<string, unknown>).luminanceFallbackMinSamLayers,
      ).toBeUndefined();
    });

    it("should not have luminanceFallbackZoneCount in parsed output", () => {
      const config = ResearchConfigSchema.parse({});
      expect(
        (config as Record<string, unknown>).luminanceFallbackZoneCount,
      ).toBeUndefined();
    });

    it("should not have luminanceFallbackResidualOnly in parsed output", () => {
      const config = ResearchConfigSchema.parse({});
      expect(
        (config as Record<string, unknown>).luminanceFallbackResidualOnly,
      ).toBeUndefined();
    });

    it("should not have luminanceFallbackResidualCoverageMin in parsed output", () => {
      const config = ResearchConfigSchema.parse({});
      expect(
        (config as Record<string, unknown>).luminanceFallbackResidualCoverageMin,
      ).toBeUndefined();
    });
  });

  describe("getDefaultConfig — no luminance defaults", () => {
    it("should not contain any luminance keys", () => {
      const config = getDefaultConfig();
      const keys = Object.keys(config);
      const luminanceKeys = keys.filter((k) => k.startsWith("luminanceFallback"));
      expect(luminanceKeys).toEqual([]);
    });
  });

  describe("FileSourceMeta — sam2-segment only", () => {
    it("should not export luminance-split as a valid source", async () => {
      const mod = await import("./image-decompose.js");
      const exports = Object.keys(mod);
      expect(exports).not.toContain("splitByLuminanceZones");
      expect(exports).not.toContain("shouldRunLuminanceFallback");
      expect(exports).not.toContain("buildResidualMask");
    });
  });

  describe("DecompositionManifest — no luminance-fallback pass type", () => {
    it("should not accept luminance-fallback in passes type", async () => {
      const { generateManifest } = await import("./decomposition-manifest.js");
      const input = {
        runId: "test",
        pipelineVariant: "sam2" as const,
        sourceImage: "test.png",
        preparedImage: "test.png",
        models: {},
        passes: [{ type: "sam2-segment" as const, candidateCount: 3 }],
        retainedLayers: [],
        droppedCandidates: [],
        unsafeFlag: false,
        productionMode: false,
        selectedLayerCount: 3,
      };
      const manifest = generateManifest(input);
      const passTypes = manifest.passes.map((p) => p.type);
      expect(passTypes).not.toContain("luminance-fallback");
    });
  });
});
