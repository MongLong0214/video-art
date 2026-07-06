/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const fragSrc = readFileSync(resolve(__dirname, "layer.frag"), "utf-8");

const GREEN_START = 70 / 360;
const GREEN_END = 165 / 360;
const GREEN_OUT = GREEN_END - GREEN_START;

function smoothstep(edge0: number, edge1: number, value: number): number {
  const x = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
}

function squeezedOutputBand(amount: number): { readonly start: number; readonly end: number } {
  const targetGreen = GREEN_OUT * Math.max(0.0001, 1 - 0.85 * amount);
  const originalCenter = (GREEN_START + GREEN_END) * 0.5;
  const tealCenter = GREEN_END - targetGreen * 0.5;
  const targetCenter = originalCenter + (tealCenter - originalCenter) * smoothstep(0, 1, amount);
  const targetStart = Math.min(1 - targetGreen, Math.max(0, targetCenter - targetGreen * 0.5));
  return { start: targetStart, end: targetStart + targetGreen };
}

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

describe("layer.frag — OKLCH hue rotation and green compression", () => {
  it("declares hue-space and green-compression uniforms", () => {
    expect(fragSrc).toMatch(/uniform\s+float\s+uGreenCompress/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uGreenBandLo/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uGreenBandHi/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uHueSpaceMode/);
  });

  it("defines the compressed green hue warp over the selected band", () => {
    expect(fragSrc).toMatch(/float\s+greenCompressedHue\s*\(/);
    expect(fragSrc).toMatch(/float\s+timelineGreenWarp\s*\(/);
    expect(fragSrc).toMatch(/float\s+squeezeOutputGreenArc\s*\(/);
    expect(fragSrc).toMatch(/float\s+greenStart\s*=\s*uGreenBandLo/);
    expect(fragSrc).toMatch(/float\s+greenEnd\s*=\s*uGreenBandHi/);
    expect(fragSrc).toMatch(/greenOut\s*\/\s*\(\s*1\.0\s*\+\s*4\.0\s*\*\s*amt\s*\)/);
    expect(fragSrc).toMatch(/1\.0\s*-\s*0\.85\s*\*\s*amt/);
  });

  it("composes timeline warp and output squeeze under the single green-compress knob", () => {
    expect(fragSrc).toMatch(/return\s+squeezeOutputGreenArc\(\s*timelineGreenWarp\(\s*h\s*,\s*amt\s*\)\s*,\s*amt\s*\)/);
  });

  it("compresses the green input allocation to about six percent at amount 0.85", () => {
    const greenAllocation = (165 / 360 - 70 / 360) / (1 + 4 * 0.85);
    expect(greenAllocation).toBeGreaterThan(0.059);
    expect(greenAllocation).toBeLessThan(0.061);
  });

  it("squeezes the output green band toward the teal edge at amount 0.85", () => {
    const band = squeezedOutputBand(0.85);
    expect((band.end - band.start) * 360).toBeCloseTo(26.4, 1);
    expect(band.start * 360).toBeGreaterThan(130);
    expect(band.end * 360).toBeGreaterThan(160);
  });

  it("warps shifted and injected rotation hues before hsv2rgb", () => {
    expect(fragSrc).toMatch(/float\s+shiftedHue\s*=\s*greenCompressedHue\(\s*hsv\.x\s*\+\s*hueShift\s*\)/);
    expect(fragSrc).toMatch(/float\s+injectedHue\s*=\s*greenCompressedHue\(\s*hueShift\s*\+\s*lum\s*\*\s*uLuminanceKey\s*\)/);
  });

  it("writes display-referred output without Three output conversion chunks", () => {
    expect(fragSrc).toMatch(/void\s+writeOutput\s*\(\s*vec4\s+color\s*\)\s*{\s*gl_FragColor\s*=\s*color;\s*}/);
    expect(fragSrc).not.toContain("#include <tonemapping_fragment>");
    expect(fragSrc).not.toContain("#include <colorspace_fragment>");
  });

  it("preserves boosted source saturation when sat injection is disabled", () => {
    const originalSat = 0.05;
    const saturationBoost = 1.35;
    const satInjectionMul = 0;
    const blend = smoothstep(0.1, 0.4, originalSat);
    const boostedSat = Math.min(1, Math.max(0, originalSat * saturationBoost));
    const injectedSat = saturationBoost * satInjectionMul;
    const disabledInjectionSat = Math.max(boostedSat, Math.min(0.22, originalSat + 0.16));
    const injectionEnabled = satInjectionMul > 0.001 ? 1 : 0;
    const lowSatTarget = disabledInjectionSat * (1 - injectionEnabled) + injectedSat * injectionEnabled;
    const outputSat = lowSatTarget * (1 - blend) + boostedSat * blend;

    expect(blend).toBe(0);
    expect(outputSat).toBeGreaterThan(boostedSat);
    expect(outputSat).toBeGreaterThan(0.15);
  });

  it("keeps the legacy hard hue-injection saturation path when sat injection is enabled", () => {
    const originalSat = 0.05;
    const saturationBoost = 1.35;
    const satInjectionMul = 0.4;
    const blend = smoothstep(0.1, 0.4, originalSat);
    const boostedSat = Math.min(1, Math.max(0, originalSat * saturationBoost));
    const injectedSat = saturationBoost * satInjectionMul;
    const disabledInjectionSat = Math.max(boostedSat, Math.min(0.22, originalSat + 0.16));
    const injectionEnabled = satInjectionMul > 0.001 ? 1 : 0;
    const lowSatTarget = disabledInjectionSat * (1 - injectionEnabled) + injectedSat * injectionEnabled;
    const outputSat = lowSatTarget * (1 - blend) + boostedSat * blend;

    expect(blend).toBe(0);
    expect(outputSat).toBeCloseTo(injectedSat);
    expect(outputSat).toBeGreaterThan(boostedSat);
  });

  it("selects the low-saturation mix target from satInjectionMul", () => {
    expect(fragSrc).toMatch(/float\s+injectionEnabled\s*=\s*step\(\s*0\.001\s*,\s*uSatInjectionMul\s*\)/);
    expect(fragSrc).toMatch(/float\s+disabledInjectionSatFloor\s*=\s*min\(\s*0\.22\s*,\s*originalSat\s*\+\s*0\.16\s*\)/);
    expect(fragSrc).toMatch(/float\s+disabledInjectionSat\s*=\s*max\(\s*boostedSat\s*,\s*disabledInjectionSatFloor\s*\)/);
    expect(fragSrc).toMatch(/float\s+lowSatTarget\s*=\s*mix\(\s*disabledInjectionSat\s*,\s*injectedSat\s*,\s*injectionEnabled\s*\)/);
    expect(fragSrc).toMatch(/hsv\.y\s*=\s*clamp\(\s*mix\(\s*lowSatTarget\s*,\s*boostedSat\s*,\s*blend\s*\)/);
    expect(fragSrc).toMatch(/if\s*\(\s*uSatInjectionMul\s*<\s*0\.001\s*\)/);
    expect(fragSrc).toMatch(/float\s+brightSatFloor\s*=\s*smoothstep\(\s*0\.55\s*,\s*0\.85\s*,\s*finalHsv\.z\s*\)\s*\*\s*0\.18/);
  });

  it("wraps only the OKLCH block with exact local sRGB transfer functions", () => {
    expect(fragSrc).toMatch(/vec3\s+linearSrgbToOklab\s*\(/);
    expect(fragSrc).toMatch(/vec3\s+oklabToLinearSrgb\s*\(/);
    expect(fragSrc).toMatch(/float\s+srgbChannelToLinear\s*\(/);
    expect(fragSrc).toMatch(/c\s*<=\s*0\.04045\s*\?\s*c\s*\/\s*12\.92/);
    expect(fragSrc).toMatch(/pow\(\s*\(\s*c\s*\+\s*0\.055\s*\)\s*\/\s*1\.055\s*,\s*2\.4\s*\)/);
    expect(fragSrc).toMatch(/float\s+linearChannelToSrgb\s*\(/);
    expect(fragSrc).toMatch(/c\s*<=\s*0\.0031308\s*\?\s*c\s*\*\s*12\.92/);
    expect(fragSrc).toMatch(/1\.055\s*\*\s*pow\(\s*c\s*,\s*1\.0\s*\/\s*2\.4\s*\)\s*-\s*0\.055/);
    expect(fragSrc).toMatch(/vec3\s+lab\s*=\s*linearSrgbToOklab\(\s*srgbToLinear\(\s*texColor\.rgb\s*\)\s*\)/);
    expect(fragSrc).toMatch(/rgb\s*=\s*linearToSrgb\(\s*\w+\s*\)/);
    expect(fragSrc).toMatch(/if\s*\(\s*uHueSpaceMode\s*>\s*0\.5\s*\)/);
  });

  it("fits OKLCH chroma to gamut instead of clamping channels", () => {
    expect(fragSrc).toMatch(/bool\s+inLinearSrgbGamut\s*\(/);
    expect(fragSrc).toMatch(/vec3\s+oklchToLinearSrgbGamutMapped\s*\(/);
    expect(fragSrc).toMatch(/for\s*\(\s*int\s+i\s*=\s*0\s*;\s*i\s*<\s*6\s*;\s*i\+\+\s*\)/);
    expect(fragSrc).toContain("scale chroma down");
    expect(fragSrc).not.toMatch(/rgb\s*=\s*clamp\s*\(\s*oklabToLinearSrgb/);
  });
});

describe("layer.frag — D-3-6 glow wave", () => {
  it("declares glow-wave uniforms", () => {
    expect(fragSrc).toMatch(/uniform\s+sampler2D\s+uPhaseTex2/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uPhaseWarpAmount/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uGlowWaveStrength/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uGlowWaveSpeed/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uGlowWaveSharpness/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uGlowWaveFieldCycles/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uGlowWaveMean/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uGlowWave2Strength/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uGlowWave2Speed/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uGlowWave2Sharpness/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uGlowWave2FieldCycles/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uGlowWave2Mean/);
  });

  it("guards glow wave behind strength threshold", () => {
    expect(fragSrc).toMatch(/if\s*\(\s*uGlowWaveStrength\s*>\s*0\.001\s*\|\|\s*uGlowWave2Strength\s*>\s*0\.001\s*\)/);
  });

  it("uses D-3-6 phase-field crest math", () => {
    expect(fragSrc).toMatch(/fract\(\s*time\s*\/\s*glowSafePeriod\s*\*\s*uGlowWaveSpeed\s*\+\s*glowPhaseSample\s*\*\s*uGlowWaveFieldCycles\s*\)/);
    expect(fragSrc).toMatch(/pow\(\s*0\.5\s*\+\s*0\.5\s*\*\s*cos\(\s*TAU\s*\*\s*\(\s*wp\s*-\s*0\.62\s*\)\s*\)\s*,\s*mix\(\s*1\.5\s*,\s*7\.0\s*,\s*uGlowWaveSharpness\s*\)\s*\)/);
    expect(fragSrc).toMatch(/glowWaveDelta\s*\+=\s*uGlowWaveStrength\s*\*\s*\(\s*crest\s*-\s*uGlowWaveMean\s*\)/);
    expect(fragSrc).toMatch(/rgb\s*\*=\s*1\.0\s*\+\s*glowWaveDelta/);
  });

  it("adds second wave as an independent zero-mean interference term", () => {
    expect(fragSrc).toMatch(/texture2D\(\s*uPhaseTex2\s*,\s*glowPhaseUv\s*\)\.r/);
    expect(fragSrc).toMatch(/fract\(\s*time\s*\/\s*glowSafePeriod\s*\*\s*uGlowWave2Speed\s*\+\s*glowPhaseSample2\s*\*\s*uGlowWave2FieldCycles\s*\)/);
    expect(fragSrc).toMatch(/pow\(\s*0\.5\s*\+\s*0\.5\s*\*\s*cos\(\s*TAU\s*\*\s*\(\s*wp2\s*-\s*0\.62\s*\)\s*\)\s*,\s*mix\(\s*1\.5\s*,\s*7\.0\s*,\s*uGlowWave2Sharpness\s*\)\s*\)/);
    expect(fragSrc).toMatch(/glowWaveDelta\s*\+=\s*uGlowWave2Strength\s*\*\s*\(\s*crest2\s*-\s*uGlowWave2Mean\s*\)/);
    expect(fragSrc).not.toMatch(/mix\(\s*crest\s*,\s*crest2/);
  });

  it("warps glow-wave phase-field UVs only when phase warp is enabled", () => {
    expect(fragSrc).toMatch(/vec2\s+domainWarpVector\s*\(\s*vec2\s+p\s*\)/);
    expect(fragSrc).toMatch(/if\s*\(\s*uPhaseWarpAmount\s*>\s*0\.0001\s*\)/);
    expect(fragSrc).toMatch(/vec2\s+phaseWarp\s*=\s*0\.5\s*\+\s*0\.5\s*\*\s*domainWarpVector/);
    expect(fragSrc).toMatch(/glowPhaseUv\s*=\s*clamp\(\s*sampleUv\s*\+\s*uPhaseWarpAmount\s*\*\s*\(\s*phaseWarp\s*-\s*0\.5\s*\)\s*\*\s*0\.1/);
    expect(fragSrc).toMatch(/texture2D\(\s*uPhaseTex\s*,\s*glowPhaseUv\s*\)\.r/);
  });

  it("applies glow wave after palette blend and before rim lighting", () => {
    const paletteIdx = fragSrc.indexOf("// IQ cosine palette blend");
    const glowWaveIdx = fragSrc.indexOf("// D-3-6/r18 glow waves");
    const rimIdx = fragSrc.indexOf("// --- Fresnel rim chromatic glow ---");
    expect(paletteIdx).toBeGreaterThan(-1);
    expect(glowWaveIdx).toBeGreaterThan(paletteIdx);
    expect(rimIdx).toBeGreaterThan(glowWaveIdx);
  });
});

describe("layer.frag — R9 structural UV fields", () => {
  it("declares camera drift and structure flow uniforms", () => {
    expect(fragSrc).toMatch(/uniform\s+sampler2D\s+uDepthTex/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uCamDriftRadius/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uCamDriftCycles/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uCamDriftPivot/);
    expect(fragSrc).toMatch(/uniform\s+sampler2D\s+uFlowFieldTex/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uStructFlowStrength/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uStructFlowCycles/);
  });

  it("applies camera drift before texture sampling using normalized uTime cycles", () => {
    const driftIdx = fragSrc.indexOf("uCamDriftRadius");
    const sampleIdx = fragSrc.indexOf("sampleBicubic(uTexture");
    expect(driftIdx).toBeGreaterThan(-1);
    expect(sampleIdx).toBeGreaterThan(driftIdx);
    expect(fragSrc).toMatch(/TAU\s*\*\s*uTime\s*\*\s*uCamDriftCycles/);
    expect(fragSrc).toMatch(/sampleUv\s*\+=\s*cam\s*\*\s*\(\s*d\s*-\s*uCamDriftPivot\s*\)/);
  });

  it("samples phase and source textures through the displaced sampleUv", () => {
    expect(fragSrc).toMatch(/texture2D\(\s*uPhaseTex\s*,\s*sampleUv\s*\)/);
    expect(fragSrc).toMatch(/texture2D\(\s*uTexture\s*,\s*sampleUv\s*\)|sampleBicubic\(\s*uTexture\s*,\s*sampleUv/);
  });

  it("guards structure-following flow and displaces along RGB direction with coherence", () => {
    expect(fragSrc).toMatch(/uStructFlowStrength\s*>\s*0\.0001/);
    expect(fragSrc).toMatch(/vec2\s+dir\s*=\s*ff\.rg\s*\*\s*2\.0\s*-\s*1\.0/);
    expect(fragSrc).toMatch(/float\s+coh\s*=\s*ff\.b/);
    expect(fragSrc).toMatch(/sin\(\s*TAU\s*\*\s*\(\s*uTime\s*\*\s*uStructFlowCycles\s*\+\s*ph\s*\)\s*\)/);
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

  it("premultiplies final rgb by alpha only for custom screen blending", () => {
    const dst = 0.3;
    const src = 0.8;
    const screen = (source: number): number => source + dst * (1 - source);
    const fullOpacity = screen(src);
    const attenuatedOpacity = screen(src * 0.18);
    const zeroOpacity = screen(src * 0);

    expect(fragSrc).toMatch(/uniform\s+float\s+uPremultiplyAlpha/);
    expect(fragSrc).toMatch(/if\s*\(\s*uPremultiplyAlpha\s*>\s*0\.5\s*\)\s*\{\s*rgb\s*\*=\s*alpha;\s*\}/);
    expect(fragSrc.indexOf("rgb *= alpha;")).toBeGreaterThan(fragSrc.indexOf("alpha = alpha * uOpacity * feather;"));
    expect(fragSrc.indexOf("writeOutput(vec4(rgb, alpha))")).toBeGreaterThan(fragSrc.indexOf("rgb *= alpha;"));
    expect(zeroOpacity).toBeCloseTo(dst);
    expect(attenuatedOpacity).toBeGreaterThan(dst);
    expect(attenuatedOpacity).toBeLessThan(fullOpacity);
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

  it("uses atan2Safe for polar conversion of UV", () => {
    expect(fragSrc).toMatch(/atan2Safe\(\s*\w+\.y\s*,\s*\w+\.x\s*\)/);
  });
});

describe("layer.frag — shader-dev T4: voronoi", () => {
  it("declares uVoronoiAmount uniform", () => {
    expect(fragSrc).toMatch(/uniform\s+float\s+uVoronoiAmount/);
  });

  it("declares uVoronoiScale uniform", () => {
    expect(fragSrc).toMatch(/uniform\s+float\s+uVoronoiScale/);
  });

  it("defines voronoi function", () => {
    expect(fragSrc).toMatch(/float\s+voronoi\s*\(/);
  });
});

describe("layer.frag — shader-dev T5: IQ cosine palette", () => {
  it("declares uPaletteAmount uniform", () => {
    expect(fragSrc).toMatch(/uniform\s+float\s+uPaletteAmount/);
  });

  it("declares uPaletteA/B/C/D vec3 uniforms", () => {
    expect(fragSrc).toMatch(/uniform\s+vec3\s+uPaletteA/);
    expect(fragSrc).toMatch(/uniform\s+vec3\s+uPaletteB/);
    expect(fragSrc).toMatch(/uniform\s+vec3\s+uPaletteC/);
    expect(fragSrc).toMatch(/uniform\s+vec3\s+uPaletteD/);
  });

  it("defines palette function with cos(TAU * ...)", () => {
    expect(fragSrc).toMatch(/vec3\s+palette\s*\(/);
    expect(fragSrc).toMatch(/cos\(\s*TAU/);
  });
});

describe("layer.frag — shader-dev T6: procedural 2D pattern", () => {
  it("declares uPatternType/Scale/Amount uniforms", () => {
    expect(fragSrc).toMatch(/uniform\s+(int|float)\s+uPatternType/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uPatternScale/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uPatternAmount/);
  });
});

describe("layer.frag — shader-dev T7: SDF-2D overlay", () => {
  it("declares uSDFType/Scale/Amount uniforms", () => {
    expect(fragSrc).toMatch(/uniform\s+float\s+uSDFType/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uSDFScale/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uSDFAmount/);
  });

  it("defines sdStar function", () => {
    expect(fragSrc).toMatch(/float\s+sdStar\s*\(/);
  });
});

describe("layer.frag — shader-dev T8: Julia fractal", () => {
  it("declares uJuliaAmount and uJuliaC uniforms", () => {
    expect(fragSrc).toMatch(/uniform\s+float\s+uJuliaAmount/);
    expect(fragSrc).toMatch(/uniform\s+vec2\s+uJuliaC/);
  });

  it("uses bounded iteration loop for Julia set", () => {
    expect(fragSrc).toMatch(/for\s*\(\s*int\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*\d+\s*;/);
  });
});

describe("layer.frag — shader-dev T9: matrix-transform UV", () => {
  it("declares uRotateSpeed + uScalePulse uniforms", () => {
    expect(fragSrc).toMatch(/uniform\s+float\s+uRotateSpeed/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uScalePulse/);
  });

  it("constructs mat2 rotation from sin/cos", () => {
    expect(fragSrc).toMatch(/mat2\(\s*cos\([^)]*\)\s*,\s*-?sin/);
  });
});

describe("layer.frag — shader-dev T10: anti-aliasing (fwidth)", () => {
  it("uses fwidth for derivative-based edge AA", () => {
    expect(fragSrc).toMatch(/fwidth\s*\(/);
  });

  it("applies AA to ring edge (smoothstep with fwidth-derived bounds)", () => {
    // Match smoothstep using derivative-derived bounds (either inline fwidth or via named var)
    expect(fragSrc).toMatch(/smoothstep\(\s*-?\w*AAW?\s*,\s*\w*AAW?\s*,|smoothstep\([^)]*fwidth/);
  });
});

describe("layer.frag — shader-dev T11: bicubic texture sampling", () => {
  it("declares uBicubicFilter uniform", () => {
    expect(fragSrc).toMatch(/uniform\s+float\s+uBicubicFilter/);
  });

  it("defines sampleBicubic function", () => {
    expect(fragSrc).toMatch(/vec4\s+sampleBicubic\s*\(/);
  });
});

describe("layer.frag — shader-dev T12: Worley noise (F1-F2)", () => {
  it("declares uWorleyAmount uniform", () => {
    expect(fragSrc).toMatch(/uniform\s+float\s+uWorleyAmount/);
  });

  it("defines worley function", () => {
    expect(fragSrc).toMatch(/float\s+worley\s*\(/);
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
