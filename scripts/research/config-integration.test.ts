import { describe, it, expect } from "vitest";
import { applyMultiplier, resolveParam } from "./config-integration.js";

describe("resolveParam", () => {
  it("returns config value when provided", () => {
    expect(resolveParam({ minCoverage: 0.01 }, "minCoverage", 0.005)).toBe(0.01);
  });

  it("returns default when config is undefined", () => {
    expect(resolveParam(undefined, "minCoverage", 0.005)).toBe(0.005);
  });

  it("returns default when key is missing from config", () => {
    expect(resolveParam({}, "minCoverage", 0.005)).toBe(0.005);
  });
});

describe("applyMultiplier", () => {
  it("multiplies base value by config multiplier", () => {
    expect(applyMultiplier(10, { colorCycleSpeedMul: 1.5 }, "colorCycleSpeedMul")).toBe(15);
  });

  it("returns base value when multiplier is 1.0 (default)", () => {
    expect(applyMultiplier(10, { colorCycleSpeedMul: 1.0 }, "colorCycleSpeedMul")).toBe(10);
  });

  it("returns base value when config is undefined", () => {
    expect(applyMultiplier(10, undefined, "colorCycleSpeedMul")).toBe(10);
  });

  it("returns 0 when multiplier is 0", () => {
    expect(applyMultiplier(10, { waveAmplitudeMul: 0 }, "waveAmplitudeMul")).toBe(0);
  });
});
