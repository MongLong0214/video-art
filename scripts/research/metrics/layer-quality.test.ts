import { describe, it, expect } from "vitest";
import {
  computeLayerIndependence,
  computeRoleCoherence,
} from "./layer-quality";

describe("computeLayerIndependence (M9)", () => {
  it("returns high score for good independence (no duplicates)", () => {
    const manifest = {
      finalLayers: [
        { uniqueCoverage: 0.25, role: "background-plate" },
        { uniqueCoverage: 0.30, role: "subject" },
        { uniqueCoverage: 0.20, role: "midground" },
        { uniqueCoverage: 0.15, role: "detail" },
      ],
    };
    const score = computeLayerIndependence(manifest);
    // mean=0.225, duplicateRatio=0 → 0.225 × 1.0 = 0.225
    expect(score).toBeCloseTo(0.225, 2);
  });

  it("returns 0 when all layers are duplicate-heavy", () => {
    const manifest = {
      finalLayers: [
        { uniqueCoverage: 0.01 },
        { uniqueCoverage: 0.005 },
        { uniqueCoverage: 0.01 },
      ],
    };
    const score = computeLayerIndependence(manifest);
    expect(score).toBe(0);
  });

  it("returns ~0.25 for mixed independence", () => {
    const manifest = {
      finalLayers: [
        { uniqueCoverage: 0.10 },
        { uniqueCoverage: 0.01 },
        { uniqueCoverage: 0.10 },
        { uniqueCoverage: 0.01 },
      ],
    };
    const score = computeLayerIndependence(manifest);
    expect(score).toBeGreaterThan(0.01);
    expect(score).toBeLessThan(0.5);
  });

  it("returns 0 for empty finalLayers", () => {
    expect(computeLayerIndependence({ finalLayers: [] })).toBe(0);
  });

  it("returns 0 for missing manifest", () => {
    expect(computeLayerIndependence(null)).toBe(0);
  });

  it("treats missing uniqueCoverage as 0", () => {
    const manifest = { finalLayers: [{ role: "subject" }, {}] };
    const score = computeLayerIndependence(manifest);
    expect(score).toBe(0);
  });
});

describe("computeRoleCoherence (M10)", () => {
  it("returns 1.0 for full roles + bgplate + high diversity", () => {
    const manifest = {
      finalLayers: [
        { role: "background-plate" },
        { role: "background" },
        { role: "midground" },
        { role: "subject" },
        { role: "detail" },
        { role: "foreground-occluder" },
      ],
    };
    const score = computeRoleCoherence(manifest);
    expect(score).toBe(1.0);
  });

  it("returns 0 for no roles assigned", () => {
    const manifest = { finalLayers: [{}, {}, {}] };
    const score = computeRoleCoherence(manifest);
    expect(score).toBe(0);
  });

  it("returns partial score without bgplate", () => {
    const manifest = {
      finalLayers: [
        { role: "subject" },
        { role: "midground" },
        { role: "detail" },
        {},
        {},
      ],
    };
    const score = computeRoleCoherence(manifest);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(0.7);
  });

  it("returns 0 for null manifest", () => {
    expect(computeRoleCoherence(null)).toBe(0);
  });

  it("returns 0 for empty finalLayers", () => {
    expect(computeRoleCoherence({ finalLayers: [] })).toBe(0);
  });
});
