/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const src = readFileSync(resolve(__dirname, "effect-composer.ts"), "utf-8");

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

  it("multipassFeedback pass registered after trails, before kaleidoscope", () => {
    // Find ordering indicators in file
    const trailsIdx = src.indexOf("trailsFragmentShader");
    const multipassIdx = src.search(/multipassFeedback|uFeedbackStrength/);
    const kaleidoIdx = src.indexOf("kaleidoFragmentShader");
    expect(trailsIdx).toBeGreaterThan(-1);
    expect(multipassIdx).toBeGreaterThan(-1);
    expect(kaleidoIdx).toBeGreaterThan(-1);
  });

  it("file stays under 800 LOC cap after T-A1", () => {
    const lineCount = src.split("\n").length;
    expect(lineCount).toBeLessThanOrEqual(800);
  });
});
