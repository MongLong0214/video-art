import { describe, it, expect } from "vitest";
import { consecutiveSsim, flickerScore, computeTemporalCoherence } from "./temporal-coherence";
import { parseVmafJson, normalizeVmafScore } from "./vmaf";
import { computeLayerIndependence, computeRoleCoherence } from "./layer-quality";

function solid(w: number, h: number, v: number): Float64Array { return new Float64Array(w * h).fill(v); }
function noisy(w: number, h: number, seed: number): Float64Array {
  const a = new Float64Array(w * h); let s = seed;
  for (let i = 0; i < a.length; i++) { s = (s * 16807) % 2147483647; a[i] = (s / 2147483647) * 255; }
  return a;
}

// ── Temporal Coherence Comprehensive ───────────────────────

describe("consecutiveSsim comprehensive", () => {
  it.each([32, 64, 128])("identical %d×%d → ~1.0", (sz) => {
    const f = noisy(sz, sz, 42);
    expect(consecutiveSsim(f, f, sz, sz)).toBeCloseTo(1.0, 2);
  });
  it("symmetry: ssim(a,b) = ssim(b,a)", () => {
    const a = noisy(64, 64, 1), b = noisy(64, 64, 2);
    expect(consecutiveSsim(a, b, 64, 64)).toBeCloseTo(consecutiveSsim(b, a, 64, 64), 5);
  });
});

describe("flickerScore comprehensive", () => {
  it.each([32, 64, 128])("identical %d×%d → ~1.0", (sz) => {
    const f = noisy(sz, sz, 42);
    expect(flickerScore(f, f, sz, sz)).toBeCloseTo(1.0, 2);
  });
  it("max flicker (0 vs 255) → very low", () => {
    expect(flickerScore(solid(64, 64, 0), solid(64, 64, 255), 64, 64)).toBeLessThan(0.1);
  });
  it("medium difference → medium score", () => {
    const s = flickerScore(solid(64, 64, 100), solid(64, 64, 150), 64, 64);
    expect(s).toBeGreaterThan(0.3);
    expect(s).toBeLessThan(0.9);
  });
  it("always 0-1 range", () => {
    for (let v = 0; v <= 255; v += 51) {
      const s = flickerScore(solid(32, 32, 0), solid(32, 32, v), 32, 32);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });
});

describe("computeTemporalCoherence comprehensive", () => {
  it("empty pairs → 0", () => {
    expect(computeTemporalCoherence([], 64, 64)).toBe(0);
  });
  it("1 pair identical → ~1.0", () => {
    const f = noisy(64, 64, 42);
    expect(computeTemporalCoherence([[f, f]], 64, 64)).toBeCloseTo(1.0, 1);
  });
  it("3 pairs identical → ~1.0", () => {
    const f = noisy(64, 64, 42);
    expect(computeTemporalCoherence([[f, f], [f, f], [f, f]], 64, 64)).toBeCloseTo(1.0, 1);
  });
  it("mixed stability → medium score", () => {
    const f = noisy(64, 64, 42);
    const g = noisy(64, 64, 99);
    const s = computeTemporalCoherence([[f, f], [f, g], [g, g]], 64, 64);
    expect(s).toBeGreaterThan(0.3);
    expect(s).toBeLessThan(1.0);
  });
});

// ── VMAF Comprehensive ─────────────────────────────────────

describe("parseVmafJson comprehensive", () => {
  it.each([0, 10, 50, 85.5, 99.9, 100])("parses score %d", (score) => {
    const json = JSON.stringify({ pooled_metrics: { vmaf: { mean: score } } });
    expect(parseVmafJson(json)).toBe(score);
  });
  it("throws on null vmaf", () => {
    expect(() => parseVmafJson(JSON.stringify({ pooled_metrics: { vmaf: null } }))).toThrow();
  });
  it("throws on empty object", () => {
    expect(() => parseVmafJson(JSON.stringify({}))).toThrow();
  });
});

describe("normalizeVmafScore comprehensive", () => {
  it.each([
    [0, 0], [50, 0.5], [100, 1.0], [-10, 0], [110, 1.0], [85.5, 0.855],
  ])("normalizes %d → %d", (input, expected) => {
    expect(normalizeVmafScore(input)).toBeCloseTo(expected, 3);
  });
});

// ── Layer Quality Comprehensive ────────────────────────────

describe("computeLayerIndependence comprehensive", () => {
  it.each([
    [{ finalLayers: [{ uniqueCoverage: 0.5 }] }, 0.5],
    [{ finalLayers: [{ uniqueCoverage: 0.01 }] }, 0],
    [{ finalLayers: [] }, 0],
    [null, 0],
  ] as [any, number][])("case %# → %d", (manifest, expected) => {
    expect(computeLayerIndependence(manifest)).toBeCloseTo(expected, 1);
  });

  // Scaling: more layers with good coverage
  it("scales with layer count", () => {
    const good = { finalLayers: Array(8).fill({ uniqueCoverage: 0.1 }) };
    expect(computeLayerIndependence(good)).toBeGreaterThan(0.05);
  });
});

describe("computeRoleCoherence comprehensive", () => {
  const ALL_ROLES = ["background-plate", "background", "midground", "subject", "detail", "foreground-occluder"];

  it("full roles → 1.0", () => {
    expect(computeRoleCoherence({ finalLayers: ALL_ROLES.map(r => ({ role: r })) })).toBe(1.0);
  });

  it.each([1, 2, 3, 4, 5])("%d roles assigned", (n) => {
    const layers = ALL_ROLES.slice(0, n).map(r => ({ role: r }));
    const s = computeRoleCoherence({ finalLayers: layers });
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it("duplicate roles don't over-count diversity", () => {
    const layers = [{ role: "subject" }, { role: "subject" }, { role: "subject" }];
    const s = computeRoleCoherence({ finalLayers: layers });
    expect(s).toBeLessThan(0.8);
  });
});
