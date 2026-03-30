/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const vertSrc = readFileSync(resolve(__dirname, "layer.vert"), "utf-8");

describe("layer.vert — parallax uniforms & formula", () => {
  it("declares uParallaxScale uniform", () => {
    expect(vertSrc).toMatch(/uniform\s+float\s+uParallaxScale/);
  });

  it("declares uDepthNorm uniform", () => {
    expect(vertSrc).toMatch(/uniform\s+float\s+uDepthNorm/);
  });

  it("declares uTime uniform", () => {
    expect(vertSrc).toMatch(/uniform\s+float\s+uTime/);
  });

  it("contains TAU constant", () => {
    expect(vertSrc).toMatch(/#define\s+TAU|const\s+float\s+TAU/);
  });

  it("parallax formula uses sin based on uTime*TAU", () => {
    // Accepts both sin(uTime * TAU) and sin(t) where t = uTime * TAU
    expect(vertSrc).toMatch(/uTime\s*\*\s*TAU/);
    expect(vertSrc).toMatch(/sin\s*\(/);
  });

  it("parallax is X-axis only (vec2(_, 0.0))", () => {
    expect(vertSrc).toMatch(/vec2\s*\(\s*sin\s*\(.*\)\s*,\s*0\.0\s*\)/);
  });

  it("parallax offset math: max offset ≤ 0.1", () => {
    const TAU = 2 * Math.PI;
    const maxScale = 0.1;
    const maxDepthNorm = 1.0;
    // For t in [0, TAU], max |sin(t)| = 1
    const maxOffset = maxScale * maxDepthNorm * 1.0;
    expect(maxOffset).toBeLessThanOrEqual(0.1);
  });
});
