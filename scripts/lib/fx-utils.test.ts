import { describe, it, expect } from "vitest";
import {
  validateFxParams,
  FX_MODULE_ORDER,
  getFxBypassOrder,
  FX_MODULE_CONFIGS,
} from "./fx-utils";

describe("validateFxParams", () => {
  it("compressor valid range", () => {
    expect(validateFxParams("compressor", { compress: 0.5, threshold: -20 })).toBe(true);
    expect(validateFxParams("compressor", { compress: 0, threshold: -60 })).toBe(true);
    expect(validateFxParams("compressor", { compress: 1, threshold: 0 })).toBe(true);
  });

  it("compressor rejects out of range", () => {
    expect(validateFxParams("compressor", { compress: 1.5, threshold: -20 })).toBe(false);
    expect(validateFxParams("compressor", { compress: -0.1, threshold: -20 })).toBe(false);
    expect(validateFxParams("compressor", { compress: 0.5, threshold: 10 })).toBe(false);
    expect(validateFxParams("compressor", { compress: 0.5, threshold: -70 })).toBe(false);
  });

  it("saturator valid range", () => {
    expect(validateFxParams("saturator", { saturate: 0.5, drive: 0.3 })).toBe(true);
    expect(validateFxParams("saturator", { saturate: 0, drive: 0 })).toBe(true);
    expect(validateFxParams("saturator", { saturate: 1, drive: 1 })).toBe(true);
  });

  it("saturator rejects out of range", () => {
    expect(validateFxParams("saturator", { saturate: 1.5, drive: 0 })).toBe(false);
    expect(validateFxParams("saturator", { saturate: 0, drive: -0.1 })).toBe(false);
  });

  it("eq valid range", () => {
    expect(validateFxParams("eq", { loGain: 0, midGain: -12, hiGain: 24 })).toBe(true);
    expect(validateFxParams("eq", { loGain: -24, midGain: -24, hiGain: -24 })).toBe(true);
    expect(validateFxParams("eq", { loGain: 24, midGain: 24, hiGain: 24 })).toBe(true);
  });

  it("eq rejects out of range", () => {
    expect(validateFxParams("eq", { loGain: 25, midGain: 0, hiGain: 0 })).toBe(false);
    expect(validateFxParams("eq", { loGain: 0, midGain: -25, hiGain: 0 })).toBe(false);
  });

  it("unknown fx type returns false", () => {
    expect(validateFxParams("unknown", { foo: 1 })).toBe(false);
  });
});

describe("FX_MODULE_ORDER", () => {
  it("default order: sidechain -> comp -> sat -> eq -> reverb -> delay", () => {
    expect(FX_MODULE_ORDER).toEqual([
      "customSidechain",
      "customCompressor",
      "customSaturator",
      "customEQ",
      "superdirt_reverb",
      "superdirt_delay",
    ]);
  });
});

describe("FX_MODULE_CONFIGS", () => {
  it("includes all 4 custom modules", () => {
    const names = FX_MODULE_CONFIGS.map((c) => c.name);
    expect(names).toContain("customCompressor");
    expect(names).toContain("customSaturator");
    expect(names).toContain("customEQ");
    expect(names).toContain("customSidechain");
    expect(FX_MODULE_CONFIGS).toHaveLength(4);
  });
});

describe("getFxBypassOrder", () => {
  it("returns heaviest FX first for bypass", () => {
    const order = getFxBypassOrder();
    expect(order[0]).toBe("customSidechain");
    expect(order.length).toBeGreaterThanOrEqual(4);
  });

  it("includes all custom FX", () => {
    const order = getFxBypassOrder();
    expect(order).toContain("customCompressor");
    expect(order).toContain("customSaturator");
    expect(order).toContain("customEQ");
    expect(order).toContain("customSidechain");
  });
});
