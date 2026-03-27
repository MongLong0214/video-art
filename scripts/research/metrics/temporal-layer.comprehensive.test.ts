import { describe, it, expect, vi } from "vitest";

import {
  consecutiveSsim,
  flickerScore,
  computeTemporalCoherence,
} from "./temporal-coherence.js";
import {
  checkVmafAvailable,
  parseVmafJson,
  normalizeVmafScore,
} from "./vmaf.js";
import {
  computeLayerIndependence,
  computeRoleCoherence,
} from "./layer-quality.js";

// ---------- helpers ----------

function createFlatArray(w: number, h: number, value: number): Float64Array {
  return new Float64Array(w * h).fill(value);
}

function createNoisyArray(w: number, h: number, seed: number = 42): Float64Array {
  const arr = new Float64Array(w * h);
  let s = seed;
  for (let i = 0; i < arr.length; i++) {
    s = (s * 16807 + 0) % 2147483647;
    arr[i] = (s / 2147483647) * 255;
  }
  return arr;
}

// ==========================================================================
// Temporal Coherence (M8)
// ==========================================================================

describe("consecutiveSsim", () => {
  it("should return ~1.0 for identical frames", () => {
    const W = 32, H = 32;
    const frame = createFlatArray(W, H, 128);
    expect(consecutiveSsim(frame, frame, W, H)).toBeGreaterThan(0.99);
  });

  it("should return low value for completely different frames", () => {
    const W = 32, H = 32;
    const a = createFlatArray(W, H, 0);
    const b = createFlatArray(W, H, 255);
    expect(consecutiveSsim(a, b, W, H)).toBeLessThan(0.1);
  });

  it("should return value in [0, 1]", () => {
    const W = 32, H = 32;
    const a = createNoisyArray(W, H, 1);
    const b = createNoisyArray(W, H, 2);
    const ssim = consecutiveSsim(a, b, W, H);
    expect(ssim).toBeGreaterThanOrEqual(0);
    expect(ssim).toBeLessThanOrEqual(1);
  });
});

describe("flickerScore", () => {
  it("should return 1.0 for identical frames", () => {
    const W = 10, H = 10;
    const frame = createFlatArray(W, H, 128);
    expect(flickerScore(frame, frame, W, H)).toBeCloseTo(1.0, 4);
  });

  it("should return 0 for maximally different frames", () => {
    const W = 10, H = 10;
    const a = createFlatArray(W, H, 0);
    const b = createFlatArray(W, H, 128);
    // mean diff = 128 = MAX_MEAN_DIFF => 1 - 128/128 = 0
    expect(flickerScore(a, b, W, H)).toBeCloseTo(0.0, 4);
  });

  it("should return ~0.5 for half-difference", () => {
    const W = 10, H = 10;
    const a = createFlatArray(W, H, 100);
    const b = createFlatArray(W, H, 164); // diff = 64
    expect(flickerScore(a, b, W, H)).toBeCloseTo(0.5, 1);
  });

  it("should return value in [0, 1]", () => {
    const W = 10, H = 10;
    const a = createNoisyArray(W, H, 1);
    const b = createNoisyArray(W, H, 2);
    const score = flickerScore(a, b, W, H);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe("computeTemporalCoherence (M8)", () => {
  it("should return 0 for empty frame pairs", () => {
    expect(computeTemporalCoherence([], 10, 10)).toBe(0);
  });

  it("should return ~1.0 for identical consecutive frames", () => {
    const W = 32, H = 32;
    const frame = createFlatArray(W, H, 128);
    const pairs: [Float64Array, Float64Array][] = [
      [frame, frame],
      [frame, frame],
      [frame, frame],
    ];
    expect(computeTemporalCoherence(pairs, W, H)).toBeGreaterThan(0.95);
  });

  it("should return low value for completely different pairs", () => {
    const W = 32, H = 32;
    const a = createFlatArray(W, H, 0);
    const b = createFlatArray(W, H, 128);
    const pairs: [Float64Array, Float64Array][] = [[a, b]];
    expect(computeTemporalCoherence(pairs, W, H)).toBeLessThan(0.1);
  });

  it("should average across multiple pairs", () => {
    const W = 32, H = 32;
    const same = createFlatArray(W, H, 128);
    const different = createFlatArray(W, H, 0);
    const pairs: [Float64Array, Float64Array][] = [
      [same, same], // high score
      [same, different], // low score
    ];
    const score = computeTemporalCoherence(pairs, W, H);
    expect(score).toBeGreaterThan(0.1);
    expect(score).toBeLessThan(0.9);
  });

  it("should return value in [0, 1]", () => {
    const W = 32, H = 32;
    const a = createNoisyArray(W, H, 1);
    const b = createNoisyArray(W, H, 2);
    const score = computeTemporalCoherence([[a, b]], W, H);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

// ==========================================================================
// VMAF (M7)
// ==========================================================================

describe("parseVmafJson", () => {
  it("should extract VMAF mean score from valid JSON", () => {
    const json = JSON.stringify({
      pooled_metrics: {
        vmaf: { mean: 85.5 },
      },
    });
    expect(parseVmafJson(json)).toBe(85.5);
  });

  it("should throw for missing vmaf key", () => {
    const json = JSON.stringify({ pooled_metrics: {} });
    expect(() => parseVmafJson(json)).toThrow();
  });

  it("should throw for null vmaf mean", () => {
    const json = JSON.stringify({
      pooled_metrics: { vmaf: { mean: null } },
    });
    expect(() => parseVmafJson(json)).toThrow();
  });

  it("should throw for invalid JSON", () => {
    expect(() => parseVmafJson("not-json")).toThrow();
  });

  it("should handle score of 0", () => {
    const json = JSON.stringify({
      pooled_metrics: { vmaf: { mean: 0 } },
    });
    expect(parseVmafJson(json)).toBe(0);
  });

  it("should handle score of 100", () => {
    const json = JSON.stringify({
      pooled_metrics: { vmaf: { mean: 100 } },
    });
    expect(parseVmafJson(json)).toBe(100);
  });
});

describe("normalizeVmafScore", () => {
  it("should normalize 100 → 1.0", () => {
    expect(normalizeVmafScore(100)).toBe(1.0);
  });

  it("should normalize 0 → 0", () => {
    expect(normalizeVmafScore(0)).toBe(0);
  });

  it("should normalize 50 → 0.5", () => {
    expect(normalizeVmafScore(50)).toBe(0.5);
  });

  it("should clamp >100 to 1.0", () => {
    expect(normalizeVmafScore(120)).toBe(1.0);
  });

  it("should clamp negative to 0", () => {
    expect(normalizeVmafScore(-10)).toBe(0);
  });

  it("should handle fractional scores", () => {
    expect(normalizeVmafScore(72.5)).toBeCloseTo(0.725, 4);
  });
});

describe("checkVmafAvailable", () => {
  it("should return boolean", () => {
    const result = checkVmafAvailable();
    expect(typeof result).toBe("boolean");
  });
});

// ==========================================================================
// Layer Independence (M9)
// ==========================================================================

describe("computeLayerIndependence (M9)", () => {
  it("should return 0 for null manifest", () => {
    expect(computeLayerIndependence(null)).toBe(0);
  });

  it("should return 0 for undefined manifest", () => {
    expect(computeLayerIndependence(undefined)).toBe(0);
  });

  it("should return 0 for empty finalLayers", () => {
    expect(computeLayerIndependence({ finalLayers: [] })).toBe(0);
  });

  it("should return 0 for 0 layers", () => {
    expect(computeLayerIndependence({ finalLayers: [] })).toBe(0);
  });

  it("should return high score for all high uniqueCoverage", () => {
    const manifest = {
      finalLayers: [
        { uniqueCoverage: 0.3 },
        { uniqueCoverage: 0.25 },
        { uniqueCoverage: 0.2 },
        { uniqueCoverage: 0.15 },
      ],
    };
    expect(computeLayerIndependence(manifest)).toBeGreaterThan(0.15);
  });

  it("should return low score for all low uniqueCoverage", () => {
    const manifest = {
      finalLayers: [
        { uniqueCoverage: 0.005 },
        { uniqueCoverage: 0.003 },
        { uniqueCoverage: 0.001 },
      ],
    };
    expect(computeLayerIndependence(manifest)).toBeLessThan(0.01);
  });

  it("should penalize duplicate-heavy layers", () => {
    const high = {
      finalLayers: [
        { uniqueCoverage: 0.2 },
        { uniqueCoverage: 0.15 },
      ],
    };
    const mixed = {
      finalLayers: [
        { uniqueCoverage: 0.2 },
        { uniqueCoverage: 0.01 },
      ],
    };
    expect(computeLayerIndependence(high)).toBeGreaterThan(
      computeLayerIndependence(mixed),
    );
  });

  it("should handle 1 layer", () => {
    const manifest = { finalLayers: [{ uniqueCoverage: 0.5 }] };
    const score = computeLayerIndependence(manifest);
    expect(score).toBeGreaterThan(0);
  });

  it("should treat missing uniqueCoverage as 0", () => {
    const manifest = { finalLayers: [{ role: "subject" }, { uniqueCoverage: 0.1 }] };
    const score = computeLayerIndependence(manifest);
    expect(score).toBeGreaterThan(0);
  });

  it("should return value in [0, 1]", () => {
    const manifest = {
      finalLayers: [
        { uniqueCoverage: 0.5 },
        { uniqueCoverage: 0.3 },
      ],
    };
    const score = computeLayerIndependence(manifest);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

// ==========================================================================
// Role Coherence (M10)
// ==========================================================================

describe("computeRoleCoherence (M10)", () => {
  it("should return 0 for null manifest", () => {
    expect(computeRoleCoherence(null)).toBe(0);
  });

  it("should return 0 for undefined manifest", () => {
    expect(computeRoleCoherence(undefined)).toBe(0);
  });

  it("should return 0 for empty finalLayers", () => {
    expect(computeRoleCoherence({ finalLayers: [] })).toBe(0);
  });

  it("should give bonus for having background-plate", () => {
    const withBg = {
      finalLayers: [
        { role: "background-plate" },
        { role: "subject" },
      ],
    };
    const withoutBg = {
      finalLayers: [
        { role: "midground" },
        { role: "subject" },
      ],
    };
    expect(computeRoleCoherence(withBg)).toBeGreaterThan(
      computeRoleCoherence(withoutBg),
    );
  });

  it("should score higher with more diverse roles", () => {
    const diverse = {
      finalLayers: [
        { role: "background-plate" },
        { role: "subject" },
        { role: "midground" },
        { role: "detail" },
        { role: "foreground-occluder" },
        { role: "background" },
      ],
    };
    const uniform = {
      finalLayers: [
        { role: "midground" },
        { role: "midground" },
        { role: "midground" },
      ],
    };
    expect(computeRoleCoherence(diverse)).toBeGreaterThan(
      computeRoleCoherence(uniform),
    );
  });

  it("should penalize layers without roles", () => {
    const allRoles = {
      finalLayers: [
        { role: "background-plate" },
        { role: "subject" },
      ],
    };
    const noRoles = {
      finalLayers: [
        { uniqueCoverage: 0.3 },
        { uniqueCoverage: 0.2 },
      ],
    };
    expect(computeRoleCoherence(allRoles)).toBeGreaterThan(
      computeRoleCoherence(noRoles),
    );
  });

  it("should handle all same role", () => {
    const manifest = {
      finalLayers: Array.from({ length: 5 }, () => ({ role: "midground" })),
    };
    const score = computeRoleCoherence(manifest);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it("should handle missing bg-plate", () => {
    const manifest = {
      finalLayers: [
        { role: "subject" },
        { role: "midground" },
        { role: "detail" },
      ],
    };
    const score = computeRoleCoherence(manifest);
    expect(score).toBeGreaterThan(0);
  });

  it("should return value in [0, 1]", () => {
    const manifest = {
      finalLayers: [
        { role: "background-plate" },
        { role: "subject" },
        { role: "midground" },
      ],
    };
    const score = computeRoleCoherence(manifest);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
