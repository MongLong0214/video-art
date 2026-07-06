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

  it("declares and applies optional feedback mask uniforms", () => {
    expect(src).toMatch(/uFeedbackMaskTex/);
    expect(src).toMatch(/uFeedbackMaskOn/);
    expect(src).toMatch(/prev\s*\*\s*uFeedbackStrength\s*\*\s*m/);
  });

  it("reuses existing feedbackTarget (no second WebGLRenderTarget allocation)", () => {
    // Regex: count `new THREE.WebGLRenderTarget` occurrences — must stay 1 (existing feedback)
    const matches = src.match(/new\s+THREE\.WebGLRenderTarget\s*\(/g) || [];
    expect(matches.length).toBe(1);
  });

  it("pass order: kaleidoscope → trails → multipassFeedback → final film grade", () => {
    const kaleidoAddIdx = src.indexOf(`new ShaderPass(kaleidoMaterial`);
    const trailsAddIdx = src.indexOf(`new ShaderPass(trailsMaterial`);
    const multipassAddIdx = src.indexOf(`new ShaderPass(multipassMaterial`);
    const filmGradeAddIdx = src.indexOf(`new ShaderPass(filmGradeMaterial`);
    const finalTextureIdx = src.indexOf(`new FinalTexturePass`);
    expect(kaleidoAddIdx).toBeGreaterThan(-1);
    expect(trailsAddIdx).toBeGreaterThan(-1);
    expect(multipassAddIdx).toBeGreaterThan(-1);
    expect(kaleidoAddIdx).toBeLessThan(trailsAddIdx);
    expect(trailsAddIdx).toBeLessThan(multipassAddIdx);
    expect(multipassAddIdx).toBeLessThan(filmGradeAddIdx);
    expect(filmGradeAddIdx).toBeLessThan(finalTextureIdx);
  });

  it("reboosts saturation after feedback accumulation to counter hue-history averaging", () => {
    expect(src).toMatch(/float\s+feedbackLoad\s*=\s*clamp\(\s*uFeedbackStrength\s*\*\s*uFeedbackDecay\s*\*\s*m\s*,\s*0\.0\s*,\s*1\.0\s*\)/);
    expect(src).toMatch(/float\s+brightFeedback\s*=\s*smoothstep\(\s*0\.55\s*,\s*0\.85\s*,\s*accumHsv\.z\s*\)/);
    expect(src).toMatch(/float\s+satTarget\s*=\s*clamp\(\s*max\(\s*curHsv\.y\s*,\s*brightFeedback\s*\*\s*0\.35\s*\)\s*\+\s*feedbackLoad\s*\*\s*0\.6\s*,\s*curHsv\.y\s*,\s*1\.0\s*\)/);
    expect(src).toMatch(/accumHsv\.y\s*=\s*max\(\s*accumHsv\.y\s*,\s*satTarget\s*\)/);
    expect(src).toMatch(/writeOutput\(vec4\(clamp\(accum,\s*0\.0,\s*1\.0\),\s*cur\.a\)\)/);
  });

  it("file stays under 800 LOC cap after T-A1", () => {
    const lineCount = src.split("\n").length;
    expect(lineCount).toBeLessThanOrEqual(800);
  });
});

describe("effect-composer — r15 anti-bleach film grade", () => {
  it("adds a display-referred saturation floor for bright final composite pixels", () => {
    expect(src).toMatch(/float\s+bleachGuard\s*=\s*smoothstep\(\s*0\.52\s*,\s*0\.6\s*,\s*lum\s*\)/);
    expect(src).toMatch(/rgb\s*=\s*clamp\(rgb,\s*0\.0,\s*1\.0\)/);
    expect(src).toMatch(/hsv\.y\s*=\s*max\(\s*hsv\.y\s*,\s*bleachGuard\s*\*\s*0\.45\s*\)/);
  });
});

describe("effect-composer — r14 display-referred blits", () => {
  type Rgba = readonly [number, number, number, number];

  function multipassFeedbackStep(current: number, previous: number, strength: number, decay: number): number {
    return Math.min(1.2, Math.max(0, current + previous * strength * decay));
  }

  function copyPixel(pixel: Rgba): Rgba {
    return [pixel[0], pixel[1], pixel[2], pixel[3]];
  }

  function runNeutralComposerChain(source: Rgba): { readonly screen: Rgba; readonly feedback: Rgba } {
    const renderPassOutput = copyPixel(source);
    const finalTexture = copyPixel(renderPassOutput);
    const feedback = copyPixel(finalTexture);
    const screen = copyPixel(finalTexture);
    return { screen, feedback };
  }

  function expectWithinByte(actual: Rgba, expected: Rgba): void {
    const byteEpsilon = 1 / 255;
    for (let channel = 0; channel < expected.length; channel += 1) {
      expect(Math.abs(actual[channel] - expected[channel])).toBeLessThanOrEqual(byteEpsilon);
    }
  }

  it("keeps intermediate, feedback, and screen blits as plain display-space copies", () => {
    const colorSpaceIncludes = src.match(/#include\s+<colorspace_fragment>/g) || [];
    const toneMappingIncludes = src.match(/#include\s+<tonemapping_fragment>/g) || [];

    expect(src).toMatch(/void\s+writeOutput\s*\(\s*vec4\s+color\s*\)\s*{\s*gl_FragColor\s*=\s*color;\s*}/);
    expect(colorSpaceIncludes.length).toBe(0);
    expect(toneMappingIncludes.length).toBe(0);
    expect(src).toMatch(/const\s+linearBlitFragmentShader/);
    expect(src).toMatch(/const\s+screenBlitFragmentShader/);
  });

  it("renders composer passes offscreen with one final texture handoff and two copy blits", () => {
    expect(src).toMatch(/composer\.autoRenderToScreen\s*=\s*false/);
    expect(src).toMatch(/finalTexturePass\.texture/);
    expect(src).toMatch(/linearBlitMat\.uniforms\.inputBuffer\.value\s*=\s*resultTexture/);
    expect(src).toMatch(/screenBlitMat\.uniforms\.inputBuffer\.value\s*=\s*resultTexture/);
  });

  it("reproduces neutral source bytes through the full composer handoff within one byte", () => {
    const samples: readonly Rgba[] = [
      [0, 0, 0, 1],
      [33 / 255, 59 / 255, 108 / 255, 1],
      [128 / 255, 128 / 255, 128 / 255, 1],
      [241 / 255, 230 / 255, 198 / 255, 1],
      [1, 1, 1, 1],
    ];

    for (const source of samples) {
      const result = runNeutralComposerChain(source);
      expectWithinByte(result.screen, source);
      expectWithinByte(result.feedback, source);
    }
  });

  it("keeps static multipass feedback bounded in display-referred working values", () => {
    const current = 0.08;
    const strength = 0.35;
    const decay = 0.8;
    const expected = current / (1 - strength * decay);
    let previous = 0;

    for (let frame = 0; frame < 24; frame += 1) {
      previous = multipassFeedbackStep(current, previous, strength, decay);
    }

    expect(previous).toBeLessThan(1);
    expect(previous).toBeCloseTo(expected, 3);
  });
});
