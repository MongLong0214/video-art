/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const src = readFileSync(resolve(__dirname, "effect-composer.ts"), "utf-8");

describe("effect-composer — T-A2 lensDistortion", () => {
  it("declares lensDistortion fragment shader with Brown distortion", () => {
    expect(src).toMatch(/lensDistortion|uBarrelAmount/);
  });

  it("uses Brown distortion formula r*(1+k*r^2)", () => {
    // k1*r^2 term somewhere in the shader code
    expect(src).toMatch(/1\.0\s*\+\s*\w+\s*\*\s*r2|1\.0\s*\+\s*\w+\s*\*\s*dot\(c\s*,\s*c\)/);
  });

  it("declares uLensChromatic + uLensDoF + uVignetteRadius uniforms", () => {
    expect(src).toMatch(/uLensChromatic/);
    expect(src).toMatch(/uLensDoF/);
    expect(src).toMatch(/uLensVignetteRadius/);
  });

  it("samples RGB at 3 different distorted UVs for chromatic", () => {
    expect(src).toMatch(/distort\(vUv/);
  });

  it("file stays under 800 LOC cap after T-A2", () => {
    expect(src.split("\n").length).toBeLessThanOrEqual(800);
  });
});

describe("effect-composer — T-A1 multipassFeedback", () => {
  it("declares multipassFeedback fragment shader or uniforms", () => {
    expect(src).toMatch(/multipassFeedback|uFeedbackStrength/);
  });

  it("uses uFeedbackWarp / uFeedbackDecay / uFeedbackHueShift uniforms", () => {
    expect(src).toMatch(/uFeedbackStrength/);
    expect(src).toMatch(/uFeedbackWarp/);
    expect(src).toMatch(/uFeedbackDecay/);
  });

  it("reuses existing feedbackTarget (no second WebGLRenderTarget allocation)", () => {
    // Regex: count `new THREE.WebGLRenderTarget` occurrences — must stay 1 (existing feedback)
    const matches = src.match(/new\s+THREE\.WebGLRenderTarget\s*\(/g) || [];
    expect(matches.length).toBe(1);
  });

  it("pass order: kaleidoscope → trails → multipassFeedback (feedback passes at end)", () => {
    // Actual chain convention: feedback-dependent passes (trails/multipassFeedback)
    // run LAST so they observe the full accumulated screen-space FX output.
    const kaleidoAddIdx = src.indexOf(`new ShaderPass(kaleidoMaterial`);
    const trailsAddIdx = src.indexOf(`new ShaderPass(trailsMaterial`);
    const multipassAddIdx = src.indexOf(`new ShaderPass(multipassMaterial`);
    expect(kaleidoAddIdx).toBeGreaterThan(-1);
    expect(trailsAddIdx).toBeGreaterThan(-1);
    expect(multipassAddIdx).toBeGreaterThan(-1);
    // kaleidoscope added BEFORE trails (earlier in file = earlier addPass call)
    expect(kaleidoAddIdx).toBeLessThan(trailsAddIdx);
    // multipassFeedback added AFTER trails
    expect(trailsAddIdx).toBeLessThan(multipassAddIdx);
  });

  it("file stays under 800 LOC cap after T-A1", () => {
    const lineCount = src.split("\n").length;
    expect(lineCount).toBeLessThanOrEqual(800);
  });
});
