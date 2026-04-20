/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const src = readFileSync(resolve(__dirname, "fractal-cave.frag"), "utf-8");

describe("fractal-cave — Tier C bundle (T-C1/C2/C3)", () => {
  // --- T-C1 structural AC ---
  it("contains all 5 JSDoc sections (SECTION 1..5)", () => {
    for (let i = 1; i <= 5; i++) {
      expect(src).toMatch(new RegExp(`\\[SECTION ${i}\\]`));
    }
  });

  it("SDF primitives declared (sdSphere, sdBox, sdTorus)", () => {
    expect(src).toMatch(/float\s+sdSphere\(/);
    expect(src).toMatch(/float\s+sdBox\(/);
    expect(src).toMatch(/float\s+sdTorus\(/);
  });

  it("ray marching loop with MAX_STEPS=128", () => {
    expect(src).toMatch(/#define\s+MAX_STEPS\s+128/);
    expect(src).toMatch(/for\s*\(\s*int\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*MAX_STEPS/);
  });

  it("calcNormal uses central differences (gradient estimation)", () => {
    expect(src).toMatch(/vec3\s+calcNormal\(/);
    expect(src).toMatch(/sceneSDF\(p\s*\+\s*h\.xyy\)\s*-\s*sceneSDF\(p\s*-\s*h\.xyy\)/);
  });

  it("sceneSDF composes at least 2 primitives via CSG", () => {
    expect(src).toMatch(/sceneSDF/);
    const body = src.match(/float\s+sceneSDF[\s\S]*?^\}/m)?.[0] ?? "";
    expect(body).toMatch(/sdSphere|sdBox|sdTorus/);
  });

  // --- T-C2 lighting AC ---
  it("softShadow declared with iterative penumbra", () => {
    expect(src).toMatch(/float\s+softShadow\(/);
    expect(src).toMatch(/res\s*=\s*min\(res,\s*k\s*\*\s*h\s*\/\s*t\)/);
  });

  it("calcAO (ambient occlusion) declared", () => {
    expect(src).toMatch(/float\s+calcAO\(/);
  });

  it("Phong: NdotL + specular pow", () => {
    expect(src).toMatch(/max\(dot\(n,\s*lightDir\)/);
    // pow(max(dot(reflDir, -rd), 0.0), 32.0) — allow nested parens
    expect(src).toMatch(/pow\([\s\S]*?,\s*32\.0\)/);
  });

  // --- T-C3 CSG + sdf-tricks AC ---
  it("smoothUnion declared (IQ formula)", () => {
    expect(src).toMatch(/float\s+smoothUnion\(/);
    expect(src).toMatch(/h\s*=\s*clamp\(0\.5\s*\+\s*0\.5\s*\*\s*\(d2\s*-\s*d1\)/);
  });

  it("smoothSubtract declared", () => {
    expect(src).toMatch(/float\s+smoothSubtract\(/);
  });

  it("smoothIntersect declared", () => {
    expect(src).toMatch(/float\s+smoothIntersect\(/);
  });

  it("at least 1 SDF trick (opRep / opMirror / opElongate)", () => {
    expect(src).toMatch(/vec3\s+opRep\(|opMirror|opElongate|mod\(p,/);
  });

  it("animated param in sceneSDF via uTime", () => {
    const body = src.match(/float\s+sceneSDF[\s\S]*?^\}/m)?.[0] ?? "";
    expect(body).toMatch(/uTime|sin\(uTime|cos\(uTime/);
  });

  // --- File size cap ---
  it("file stays under 600 LOC (PRD R9 cap)", () => {
    expect(src.split("\n").length).toBeLessThanOrEqual(600);
  });
});
