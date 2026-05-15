/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const src = readFileSync(resolve(__dirname, "volumetric.frag"), "utf-8");

describe("volumetric.frag — Tier B T-B2", () => {
  it("uses raymarch loop with MAX_STEPS cap", () => {
    expect(src).toMatch(/for\s*\(\s*int\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*MAX_STEPS/);
  });

  it("declares 3D fbm function (fbm3)", () => {
    expect(src).toMatch(/float\s+fbm3?\s*\(\s*vec3/);
  });

  it("density-based front-to-back accumulation", () => {
    // col += ... * density * (1.0 - alpha) pattern
    expect(src).toMatch(/col\s*\+=.*density.*1\.0\s*-\s*alpha/);
  });

  it("uses uTime for animation", () => {
    expect(src).toMatch(/uTime/);
  });

  it("has early termination when alpha saturates", () => {
    expect(src).toMatch(/if\s*\(\s*alpha\s*>/);
  });

  it("MAX_STEPS defined as 64 (performance budget)", () => {
    expect(src).toMatch(/#define\s+MAX_STEPS\s+64/);
  });
});
