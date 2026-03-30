import { describe, it, expect } from "vitest";
import { ResearchConfigSchema, getDefaultConfig } from "../research/research-config.js";
import { computeDepthStats } from "./depth-computation.js";

/**
 * T5: Autoresearch Axes + Validation Data
 * T6: Final Verification (grep + schema)
 */
describe("T5: Depth Autoresearch Axes", () => {
  it("should have depthRoleWeight with default 0.5", () => {
    const config = getDefaultConfig();
    expect(config.depthRoleWeight).toBe(0.5);
  });

  it("should have depthForegroundThreshold with default 0.3", () => {
    const config = getDefaultConfig();
    expect(config.depthForegroundThreshold).toBe(0.3);
  });

  it("should have depthBackgroundThreshold with default 0.7", () => {
    const config = getDefaultConfig();
    expect(config.depthBackgroundThreshold).toBe(0.7);
  });

  it("should reject depthRoleWeight out of range", () => {
    expect(() => ResearchConfigSchema.parse({ depthRoleWeight: -0.1 })).toThrow();
    expect(() => ResearchConfigSchema.parse({ depthRoleWeight: 1.1 })).toThrow();
  });

  it("should reject depthForegroundThreshold out of range", () => {
    expect(() => ResearchConfigSchema.parse({ depthForegroundThreshold: 0.05 })).toThrow();
    expect(() => ResearchConfigSchema.parse({ depthForegroundThreshold: 0.5 })).toThrow();
  });

  it("should reject depthBackgroundThreshold out of range", () => {
    expect(() => ResearchConfigSchema.parse({ depthBackgroundThreshold: 0.4 })).toThrow();
    expect(() => ResearchConfigSchema.parse({ depthBackgroundThreshold: 1.0 })).toThrow();
  });

  it("should accept boundary values", () => {
    expect(() => ResearchConfigSchema.parse({ depthRoleWeight: 0.0 })).not.toThrow();
    expect(() => ResearchConfigSchema.parse({ depthRoleWeight: 1.0 })).not.toThrow();
    expect(() => ResearchConfigSchema.parse({ depthForegroundThreshold: 0.1 })).not.toThrow();
    expect(() => ResearchConfigSchema.parse({ depthForegroundThreshold: 0.4 })).not.toThrow();
    expect(() => ResearchConfigSchema.parse({ depthBackgroundThreshold: 0.5 })).not.toThrow();
    expect(() => ResearchConfigSchema.parse({ depthBackgroundThreshold: 0.9 })).not.toThrow();
  });
});

describe("T5: depthStats computation", () => {
  it("should compute correct stats for [50, 100, 150, 200]", () => {
    const stats = computeDepthStats([50, 100, 150, 200]);
    expect(stats.min).toBe(50);
    expect(stats.max).toBe(200);
    expect(stats.mean).toBe(125);
    expect(stats.stddev).toBeCloseTo(55.9, 0);
    expect(stats.count).toBe(4);
  });

  it("should handle empty array", () => {
    const stats = computeDepthStats([]);
    expect(stats.count).toBe(0);
    expect(stats.stddev).toBe(0);
  });

  it("should handle single value (stddev=0)", () => {
    const stats = computeDepthStats([128]);
    expect(stats.count).toBe(1);
    expect(stats.stddev).toBe(0);
  });

  it("should handle all identical values", () => {
    const stats = computeDepthStats([128, 128, 128]);
    expect(stats.stddev).toBe(0);
  });
});

describe("T6: Luminance residual grep verification", () => {
  it("should not have luminanceFallback in config schema", () => {
    const config = ResearchConfigSchema.parse({});
    const keys = Object.keys(config);
    expect(keys.filter(k => k.startsWith("luminanceFallback"))).toEqual([]);
  });

  it("should have all 3 depth axes in schema", () => {
    const config = ResearchConfigSchema.parse({});
    expect(config.depthRoleWeight).toBeDefined();
    expect(config.depthForegroundThreshold).toBeDefined();
    expect(config.depthBackgroundThreshold).toBeDefined();
  });
});
