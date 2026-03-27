import { describe, it, expect, vi } from "vitest";
import { parseVmafJson, normalizeVmafScore, checkVmafAvailable } from "./vmaf.js";

describe("parseVmafJson", () => {
  it("extracts mean VMAF score from ffmpeg JSON output", () => {
    const json = JSON.stringify({
      pooled_metrics: { vmaf: { mean: 85.432 } },
    });
    expect(parseVmafJson(json)).toBeCloseTo(85.432, 2);
  });

  it("handles nested log format", () => {
    const json = JSON.stringify({
      pooled_metrics: { vmaf: { mean: 92.1 } },
      frames: [],
    });
    expect(parseVmafJson(json)).toBeCloseTo(92.1, 1);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseVmafJson("not json")).toThrow();
  });

  it("throws on missing vmaf key", () => {
    expect(() => parseVmafJson(JSON.stringify({ pooled_metrics: {} }))).toThrow();
  });
});

describe("normalizeVmafScore", () => {
  it("normalizes 85 to 0.85", () => {
    expect(normalizeVmafScore(85)).toBeCloseTo(0.85, 2);
  });

  it("clamps 105 to 1.0", () => {
    expect(normalizeVmafScore(105)).toBe(1.0);
  });

  it("clamps -5 to 0.0", () => {
    expect(normalizeVmafScore(-5)).toBe(0.0);
  });

  it("normalizes 0 to 0.0", () => {
    expect(normalizeVmafScore(0)).toBe(0.0);
  });
});

describe("checkVmafAvailable", () => {
  it("returns boolean", () => {
    const result = checkVmafAvailable();
    expect(typeof result).toBe("boolean");
  });
});
