/// <reference types="node" />
import { describe, it, expect } from "vitest";
import {
  expectedVec4,
  validateSpikeResult,
  type SpikeResult,
} from "./fbo-float-spike.js";

describe("fbo-float-spike: result validation", () => {
  it("SpikeResult has floatSupported/halfFloatSupported/precisionError keys", () => {
    const r: SpikeResult = {
      floatSupported: true,
      halfFloatSupported: true,
      precisionError: 0.0001,
      readback: [1, 2, 3, 4],
    };
    expect(Object.keys(r)).toEqual(
      expect.arrayContaining([
        "floatSupported",
        "halfFloatSupported",
        "precisionError",
      ]),
    );
  });

  it("validateSpikeResult passes if precisionError ≤ 1e-4 and float supported", () => {
    const r: SpikeResult = {
      floatSupported: true,
      halfFloatSupported: true,
      precisionError: 5e-5,
      readback: expectedVec4.slice(),
    };
    expect(validateSpikeResult(r)).toBe(true);
  });

  it("validateSpikeResult fails if precisionError > 1e-4", () => {
    const r: SpikeResult = {
      floatSupported: true,
      halfFloatSupported: true,
      precisionError: 0.01,
      readback: [0, 0, 0, 0],
    };
    expect(validateSpikeResult(r)).toBe(false);
  });

  it("validateSpikeResult fails if floatSupported is false", () => {
    const r: SpikeResult = {
      floatSupported: false,
      halfFloatSupported: true,
      precisionError: 0,
      readback: [0, 0, 0, 0],
    };
    expect(validateSpikeResult(r)).toBe(false);
  });

  it("expectedVec4 is defined and 4 components", () => {
    expect(expectedVec4.length).toBe(4);
  });
});
