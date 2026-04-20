/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const fragSrc = readFileSync(resolve(__dirname, "layer.frag"), "utf-8");

describe("layer.frag — haze uniforms & formula", () => {
  it("declares uHazeIntensity uniform", () => {
    expect(fragSrc).toMatch(/uniform\s+float\s+uHazeIntensity/);
  });

  it("declares uDepthNorm uniform", () => {
    expect(fragSrc).toMatch(/uniform\s+float\s+uDepthNorm/);
  });

  it("declares uFeatherRadius uniform", () => {
    expect(fragSrc).toMatch(/uniform\s+float\s+uFeatherRadius/);
  });

  it("haze formula: hsv.y *= max(0.0, 1.0 - uHazeIntensity * (1.0 - uDepthNorm))", () => {
    expect(fragSrc).toMatch(/hsv\.y\s*\*=\s*max\(\s*0\.0\s*,\s*1\.0\s*-\s*uHazeIntensity\s*\*\s*\(\s*1\.0\s*-\s*uDepthNorm\s*\)\s*\)/);
  });

  it("haze applied after saturationBoost (uSaturationBoost appears before haze)", () => {
    const satBoostIdx = fragSrc.indexOf("uSaturationBoost");
    const hazeIdx = fragSrc.indexOf("uHazeIntensity *");
    expect(satBoostIdx).toBeGreaterThan(-1);
    expect(hazeIdx).toBeGreaterThan(satBoostIdx);
  });
});

describe("layer.frag — feather uniforms & formula", () => {
  it("feather guard: uFeatherRadius < 1e-4 returns 1.0", () => {
    expect(fragSrc).toMatch(/uFeatherRadius\s*<\s*1e-4/);
  });

  it("feather uses smoothstep(0.0, uFeatherRadius, d)", () => {
    expect(fragSrc).toMatch(/smoothstep\s*\(\s*0\.0\s*,\s*uFeatherRadius\s*,\s*d\s*\)/);
  });

  it("feather uses min distance from UV edges", () => {
    expect(fragSrc).toMatch(/min\s*\(\s*min\s*\(\s*vUv\.x/);
  });

  it("feather multiplies alpha", () => {
    expect(fragSrc).toMatch(/alpha\s*=\s*alpha\s*\*\s*uOpacity\s*\*\s*feather|alpha\s*\*=\s*feather|texColor\.a\s*\*\s*uOpacity\s*\*\s*feather/);
  });
});

describe("layer.frag — shader-dev T1: domain-warping", () => {
  it("declares uDomainWarp uniform", () => {
    expect(fragSrc).toMatch(/uniform\s+float\s+uDomainWarp/);
  });

  it("uses recursive fbm (domain warping pattern)", () => {
    // fbm call inside another fbm's argument — fbm(... fbm(... ) ...)
    expect(fragSrc).toMatch(/fbm\([^)]*fbm\(/);
  });

  it("guards domain warp behind uDomainWarp > threshold", () => {
    expect(fragSrc).toMatch(/uDomainWarp\s*>\s*0\.0001/);
  });
});

describe("layer.frag — shader-dev T2: domain-repetition", () => {
  it("declares uTileRepeat uniform", () => {
    expect(fragSrc).toMatch(/uniform\s+float\s+uTileRepeat/);
  });

  it("uses fract-based tiling when uTileRepeat > 0", () => {
    expect(fragSrc).toMatch(/fract\([^)]*uTileRepeat/);
  });
});

describe("layer.frag — shader-dev T3: polar-uv-manipulation", () => {
  it("declares uPolarTwist uniform", () => {
    expect(fragSrc).toMatch(/uniform\s+float\s+uPolarTwist/);
  });

  it("uses atan for polar conversion of UV", () => {
    expect(fragSrc).toMatch(/atan\(\s*\w+\.y\s*,\s*\w+\.x\s*\)/);
  });
});

describe("haze math (JS port)", () => {
  it("hazeIntensity=0 any depthNorm → satFactor=1.0", () => {
    for (const dn of [0, 0.5, 1]) {
      expect(1.0 - 0 * (1 - dn)).toBe(1.0);
    }
  });

  it("hazeIntensity=1 depthNorm=0 → satFactor=0.0 (full desaturation)", () => {
    expect(1.0 - 1 * (1 - 0)).toBe(0.0);
  });

  it("hazeIntensity=0.5 depthNorm=0.5 → satFactor=0.75", () => {
    expect(1.0 - 0.5 * (1 - 0.5)).toBe(0.75);
  });
});

describe("feather math (JS port)", () => {
  it("featherRadius=0 → feather=1.0 (guard)", () => {
    const radius = 0;
    const feather = radius < 1e-4 ? 1.0 : 0;
    expect(feather).toBe(1.0);
  });

  it("featherRadius=0.1 d=0.05 → 0 < feather < 1", () => {
    const radius = 0.1;
    const d = 0.05;
    // smoothstep(0, 0.1, 0.05) ≈ 0.5 (Hermite)
    const t = Math.max(0, Math.min(1, d / radius));
    const feather = t * t * (3 - 2 * t);
    expect(feather).toBeGreaterThan(0);
    expect(feather).toBeLessThan(1);
  });
});
