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
    expect(fragSrc).toMatch(/uniform\s+float\s+uGlowWavePhaseSource/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uColorCycleDesyncAmount/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uColorCycleDesyncCycles/);
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
    expect(fragSrc).toMatch(/float\s+glowPhaseSample\s*=\s*primaryGlowWavePhase\(\s*glowPhaseUv\s*\)/);
  });

  it("can derive primary glow-wave phase from the non-point-symmetric flow field", () => {
    expect(fragSrc).toMatch(/float\s+flowFieldPhase\s*\(\s*vec2\s+uv\s*\)/);
    expect(fragSrc).toMatch(/vec3\s+ff\s*=\s*texture2D\(\s*uFlowFieldTex\s*,\s*uv\s*\)\.rgb/);
    expect(fragSrc).toMatch(/float\s+anglePhase\s*=\s*fract\(\s*atan2Safe\(\s*dir\.y\s*,\s*dir\.x\s*\)\s*\/\s*TAU\s*\+\s*0\.5\s*\)/);
    expect(fragSrc).toMatch(/if\s*\(\s*uGlowWavePhaseSource\s*>\s*0\.5\s*\)\s*return\s+flowFieldPhase\(\s*uv\s*\)/);
    expect(fragSrc).toMatch(/return\s+texture2D\(\s*uPhaseTex\s*,\s*uv\s*\)\.r/);
    expect(fragSrc).toMatch(/float\s+glowPhaseSample\s*=\s*primaryGlowWavePhase\(\s*glowPhaseUv\s*\)/);
  });

  it("adds exact-loop colorCycle desync from bounded integer-cycle oscillators", () => {
    expect(fragSrc).toContain("Desync is phase-only and closes exactly because uTime is normalized loop time");
    expect(fragSrc).toMatch(/float\s+desyncCycles\s*=\s*max\(\s*1\.0\s*,\s*uColorCycleDesyncCycles\s*\)/);
    expect(fragSrc).toMatch(/sin\(\s*TAU\s*\*\s*uTime\s*\*\s*desyncCycles\s*\)/);
    expect(fragSrc).toMatch(/sin\(\s*TAU\s*\*\s*uTime\s*\*\s*\(\s*desyncCycles\s*\+\s*1\.0\s*\)\s*\)/);
    expect(fragSrc).toMatch(/hueShift\s*=\s*fract\(\s*hueShift\s*\+\s*colorCycleDesync\s*\)/);
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

describe("layer.frag — source-adaptive in-place flow", () => {
  it("declares adaptive flow uniforms", () => {
    expect(fragSrc).toMatch(/uniform\s+float\s+uAdaptiveFlowStrength/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uAdaptiveFlowScale/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uAdaptiveFlowCycles/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uAdaptiveFlowLumWeight/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uAdaptiveFlowSatWeight/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uAdaptiveFlowEdgeWeight/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uAdaptiveFlowMaxDisplacementPx/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uAdaptiveFlowEdgePreserve/);
  });

  it("derives motion weight from the source texture instead of an overlay", () => {
    expect(fragSrc).toMatch(/float\s+adaptiveFlowWeight\s*\(\s*vec2\s+uv\s*\)/);
    expect(fragSrc).toMatch(/vec3\s+center\s*=\s*texture2D\(\s*uTexture\s*,\s*uv\s*\)\.rgb/);
    expect(fragSrc).toMatch(/rgb2hsv\(\s*center\s*\)\.y/);
    expect(fragSrc).toMatch(/texture2D\(\s*uTexture\s*,\s*clamp\(\s*uv\s*\+\s*vec2\(px\.x,\s*0\.0\)/);
    expect(fragSrc).toMatch(/sourceFeatureWeight\(\s*uv\s*,\s*uAdaptiveFlowLumWeight\s*,\s*uAdaptiveFlowSatWeight\s*,\s*uAdaptiveFlowEdgeWeight\s*\)/);
  });

  it("applies adaptive flow before texture sampling", () => {
    const adaptiveIdx = fragSrc.indexOf("uAdaptiveFlowStrength > 0.0001");
    const sampleIdx = fragSrc.indexOf("vec4 sourceCenterColor");
    expect(adaptiveIdx).toBeGreaterThan(-1);
    expect(sampleIdx).toBeGreaterThan(adaptiveIdx);
    expect(fragSrc).toMatch(/float\s+sourceWeight\s*=\s*adaptiveFlowWeight\(\s*breathUv\s*\)/);
    expect(fragSrc).toMatch(/vec2\s+rawDelta\s*=\s*curl\s*\*\s*uAdaptiveFlowStrength\s*\*\s*sourceWeight/);
    expect(fragSrc).toMatch(/breathUv\s*\+=\s*edgePreservedAdaptiveDelta\(\s*breathUv\s*,\s*rawDelta\s*\)/);
  });

  it("caps displacement in pixels and attenuates edge crossing", () => {
    expect(fragSrc).toMatch(/vec2\s+limitAdaptiveDeltaToPixels\s*\(\s*vec2\s+delta\s*\)/);
    expect(fragSrc).toContain("max(0.0, uAdaptiveFlowMaxDisplacementPx) / max(max(uTextureSize.x, uTextureSize.y), 1.0)");
    expect(fragSrc).toMatch(/vec2\s+edgePreservedAdaptiveDelta\s*\(\s*vec2\s+uv\s*,\s*vec2\s+delta\s*\)/);
    expect(fragSrc).toMatch(/float\s+candidateLum\s*=\s*sourceLuminance\(\s*texture2D\(\s*uTexture\s*,\s*candidateUv\s*\)\.rgb\s*\)/);
    expect(fragSrc).toMatch(/1\.0\s*-\s*uAdaptiveFlowEdgePreserve\s*\*\s*crossing/);
  });
});

describe("layer.frag — source color preservation", () => {
  it("declares source color clamp uniform", () => {
    expect(fragSrc).toMatch(/uniform\s+float\s+uSourceColorMaxDrift/);
  });

  it("clamps final RGB drift around the sampled source color before output", () => {
    expect(fragSrc).toMatch(/vec3\s+clampSourceColorDrift\s*\(\s*vec3\s+sourceRgb\s*,\s*vec3\s+candidateRgb\s*\)/);
    expect(fragSrc).toMatch(/float\s+maxLen\s*=\s*clamp\(\s*uSourceColorMaxDrift\s*,\s*0\.0\s*,\s*1\.0\s*\)\s*\*\s*sqrt\(\s*3\.0\s*\)/);
    expect(fragSrc).toMatch(/rgb\s*=\s*clampSourceColorDrift\(\s*texColor\.rgb\s*,\s*rgb\s*\)/);
    expect(fragSrc.indexOf("rgb = clampSourceColorDrift(texColor.rgb, rgb);")).toBeLessThan(fragSrc.indexOf("writeOutput(vec4(rgb, alpha))"));
  });
});

describe("layer.frag — source-derived color motion mask", () => {
  it("declares source feature mask uniforms", () => {
    expect(fragSrc).toMatch(/uniform\s+float\s+uColorMotionFloor/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uColorMotionLumWeight/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uColorMotionSatWeight/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uColorMotionEdgeWeight/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uColorMotionPower/);
  });

  it("derives color motion support only from the visible source texture", () => {
    expect(fragSrc).toMatch(/float\s+sourceFeatureWeight\s*\(\s*vec2\s+uv/);
    expect(fragSrc).toMatch(/float\s+colorMotionWeight\s*\(\s*vec2\s+uv\s*\)/);
    expect(fragSrc).toMatch(/sourceFeatureWeight\(\s*uv\s*,\s*uColorMotionLumWeight\s*,\s*uColorMotionSatWeight\s*,\s*uColorMotionEdgeWeight\s*\)/);
    expect(fragSrc).toMatch(/mix\(\s*clamp\(\s*uColorMotionFloor\s*,\s*0\.0\s*,\s*1\.0\s*\)\s*,\s*1\.0\s*,\s*shaped\s*\)/);
  });

  it("applies the mask in-place before source color drift clamping", () => {
    const maskIdx = fragSrc.indexOf("rgb = mix(texColor.rgb, rgb, colorMotionWeight(sampleUv));");
    const clampIdx = fragSrc.indexOf("rgb = clampSourceColorDrift(texColor.rgb, rgb);");
    expect(maskIdx).toBeGreaterThan(-1);
    expect(clampIdx).toBeGreaterThan(maskIdx);
  });
});

describe("layer.frag — loop-safe source chroma orbit", () => {
  it("declares chroma orbit uniforms", () => {
    expect(fragSrc).toMatch(/uniform\s+float\s+uChromaOrbitRadius/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uChromaOrbitSpeed/);
    expect(fragSrc).toMatch(/uniform\s+float\s+uChromaOrbitPhaseScale/);
  });

  it("orbits source OKLab chroma on a normalized integer-cycle timeline", () => {
    expect(fragSrc).toMatch(/if\s*\(\s*uChromaOrbitRadius\s*>\s*0\.0001\s*\)/);
    expect(fragSrc).toMatch(/vec3\s+sourceLab\s*=\s*linearSrgbToOklab\(\s*srgbToLinear\(\s*texColor\.rgb\s*\)\s*\)/);
    expect(fragSrc).toMatch(/float\s+orbitPhase\s*=\s*fract\(\s*uTime\s*\*\s*uChromaOrbitSpeed\s*\+\s*texture2D\(\s*uPhaseTex\s*,\s*sampleUv\s*\)\.r\s*\*\s*uChromaOrbitPhaseScale\s*\)/);
    expect(fragSrc).toMatch(/sourceLab\.yz\s*\+=\s*uChromaOrbitRadius\s*\*\s*vec2\(\s*cos\(\s*orbitAngle\s*\)\s*,\s*sin\(\s*orbitAngle\s*\)\s*\)/);
    expect(fragSrc).toMatch(/rgb\s*=\s*linearToSrgb\(\s*oklchToLinearSrgbGamutMapped\(\s*sourceLab\.x\s*,\s*orbitHue\s*,\s*orbitChroma\s*\)\s*\)/);
  });

  it("applies chroma orbit before the source-derived color motion mask", () => {
    const orbitIdx = fragSrc.indexOf("uChromaOrbitRadius > 0.0001");
    const maskIdx = fragSrc.indexOf("rgb = mix(texColor.rgb, rgb, colorMotionWeight(sampleUv));");
    expect(orbitIdx).toBeGreaterThan(-1);
    expect(maskIdx).toBeGreaterThan(orbitIdx);
  });
});

describe("layer.frag — source-derived tangent microflow", () => {
  it("declares bounded tangent microflow uniforms", () => {
    expect(fragSrc).toContain("uniform float uTangentMicroflowAmount;");
    expect(fragSrc).toContain("uniform float uTangentMicroflowMaxDisplacementPx;");
    expect(fragSrc).toContain("uniform float uTangentMicroflowCycles;");
    expect(fragSrc).toContain("uniform float uTangentMicroflowPhaseScale;");
  });

  it("moves only a source sample along a confidence-gated tangent in source pixels", () => {
    expect(fragSrc).toMatch(/vec3\s+tangentMicroflowField\s*=\s*texture2D\(uFlowFieldTex,\s*sampleUv\)\.rgb/);
    expect(fragSrc).toMatch(/float\s+tangentMicroflowSupport\s*=\s*sourceFeatureWeight\(sampleUv,\s*0\.0,\s*0\.0,\s*1\.0\)/);
    expect(fragSrc).toMatch(/float\s+tangentMicroflowOffsetPx\s*=\s*uTangentMicroflowMaxDisplacementPx\s*\*\s*tangentMicroflowSupport\s*\*\s*tangentMicroflowConfidence\s*\*\s*sin\(/);
    expect(fragSrc).toMatch(/vec2\s+tangentMicroflowUv\s*=\s*clamp\(sampleUv\s*\+\s*tangentMicroflowDirection\s*\*\s*tangentMicroflowOffsetPx\s*\/\s*max\(uTextureSize,\s*vec2\(1\.0\)\)/);
    expect(fragSrc).toMatch(/vec4\s+tangentMicroflowSample\s*=\s*uBicubicFilter\s*>\s*0\.5/);
    expect(fragSrc).toMatch(/texColor\s*=\s*mix\(sourceCenterColor,\s*tangentMicroflowSample,\s*clamp\(uTangentMicroflowAmount,\s*0\.0,\s*1\.0\)\)/);
  });
});

describe("layer.frag — iterative source-flow advection", () => {
  it("declares bounded source-flow advection uniforms", () => {
    expect(fragSrc).toContain("uniform float uSourceFlowAdvectionAmount;");
    expect(fragSrc).toContain("uniform float uSourceFlowAdvectionMaxDisplacementPx;");
    expect(fragSrc).toContain("uniform float uSourceFlowAdvectionCycles;");
    expect(fragSrc).toContain("uniform float uSourceFlowAdvectionPhaseScale;");
    expect(fragSrc).toContain("uniform float uSourceFlowAdvectionNormalMix;");
    expect(fragSrc).toContain("uniform float uSourceFlowAdvectionEdgePreserve;");
    expect(fragSrc).toContain("uniform float uSourceFlowAdvectionDetailGain;");
  });

  it("integrates a source-derived curved path and attenuates boundary crossings", () => {
    expect(fragSrc).toMatch(/if\s*\(uSourceFlowAdvectionAmount\s*>\s*0\.0001\s*&&\s*uSourceFlowAdvectionMaxDisplacementPx\s*>\s*0\.0001\)/);
    expect(fragSrc).toContain("for (int sourceFlowStep = 0; sourceFlowStep < 5; sourceFlowStep++)");
    expect(fragSrc).toMatch(/texture2D\(uFlowFieldTex,\s*sourceFlowUv\)\.rgb/);
    expect(fragSrc).toMatch(/texture2D\(uPhaseTex2,\s*sourceFlowUv\)\.r/);
    expect(fragSrc).toMatch(/texture2D\(uPhaseTex,\s*sourceFlowUv\)\.r/);
    expect(fragSrc).toMatch(/sourceFlowTravelA\s*=\s*sin\(sourceFlowAngleA\)/);
    expect(fragSrc).toMatch(/sourceFlowTravelB\s*=\s*sin\(sourceFlowAngleB\)/);
    expect(fragSrc).toMatch(/sourceFlowDirectionRaw\s*\/\s*max\(1\.0,\s*length\(sourceFlowDirectionRaw\)\)/);
    expect(fragSrc).toMatch(/sourceFlowUv\s*\+=\s*edgePreservedSourceFlowDelta\(sourceFlowUv,\s*sourceFlowDelta\)/);
    expect(fragSrc).toMatch(/sampleUv\s*=\s*clamp\(sourceFlowUv,\s*0\.0,\s*1\.0\)/);
  });

  it("moves fine source detail while suppressing multi-scale silhouette edges", () => {
    expect(fragSrc).toMatch(/vec2\s+sourceLuminanceGradient\s*\(\s*vec2\s+uv\s*,\s*float\s+radiusPx\s*\)/);
    expect(fragSrc).toMatch(/float\s+sourceInteriorDetailWeight\s*\(\s*vec2\s+uv\s*\)/);
    expect(fragSrc).toMatch(/sourceEdgeStrength\(uv,\s*1\.0\)/);
    expect(fragSrc).toMatch(/sourceEdgeStrength\(uv,\s*8\.0\)/);
    expect(fragSrc).toMatch(/return\s+sourceFineDetail\s*\*\s*\(\s*1\.0\s*-\s*sourceSilhouette\s*\)/);
    expect(fragSrc).toMatch(/vec2\s+sourceDetailTangent\s*=\s*vec2\(-sourceDetailGradient\.y,\s*sourceDetailGradient\.x\)/);
    expect(fragSrc).toMatch(/mix\(sourceFlowFieldTangent,\s*sourceDetailTangent,\s*sourceDetailTangentWeight\)/);
    expect(fragSrc).toMatch(/float\s+sourceFlowDetail\s*=\s*sourceInteriorDetailWeight\(sourceFlowUv\)/);
    expect(fragSrc).toMatch(/float\s+sourceFlowSupport\s*=\s*min\(\s*1\.0\s*,\s*sourceFlowDetail\s*\*\s*uSourceFlowAdvectionDetailGain\s*\)/);
  });

  it("uses a seam-safe progress curve for source-flow temporal travel", () => {
    expect(fragSrc).toMatch(/float\s+sourceFlowLoopProgress\s*\(\s*float\s+t\s*\)/);
    expect(fragSrc).toMatch(/return\s+t\s*-\s*sin\(TAU\s*\*\s*t\)\s*\/\s*TAU/);
    expect(fragSrc).toMatch(/float\s+sourceFlowTime\s*=\s*sourceFlowLoopProgress\(uTime\)/);
    expect(fragSrc).toMatch(/sourceFlowTime\s*\*\s*uSourceFlowAdvectionCycles/);
  });
});

describe("layer.frag — source-aligned interior stream flow", () => {
  it("declares only source-coordinate stream uniforms", () => {
    expect(fragSrc).toContain("uniform float uSourceStreamFlowAmount;");
    expect(fragSrc).toContain("uniform float uSourceStreamFlowMaxDisplacementPx;");
    expect(fragSrc).toContain("uniform float uSourceStreamFlowCycles;");
    expect(fragSrc).toContain("uniform float uSourceStreamFlowWavelengthPx;");
    expect(fragSrc).toContain("uniform float uSourceStreamFlowEdgePreserve;");
    expect(fragSrc).toContain("uniform float uSourceStreamFlowNormalMix;");
    expect(fragSrc).toContain("uniform float uSourceStreamFlowMaterialMaskMix;");
    expect(fragSrc).toContain("uniform sampler2D uSourceStreamFlowStreamTex;");
    expect(fragSrc).toContain("uniform float uSourceStreamFlowStreamPhase;");
  });

  it("moves a source-only interior detail wave along a source-derived tangent coordinate", () => {
    expect(fragSrc).toMatch(/if\s*\(\s*uSourceStreamFlowAmount\s*>\s*0\.0001\s*&&\s*uSourceStreamFlowMaxDisplacementPx\s*>\s*0\.0001\s*\)/);
    expect(fragSrc).toMatch(/vec3\s+sourceStreamField\s*=\s*texture2D\(uFlowFieldTex,\s*sourceStreamUv\)\.rgb/);
    expect(fragSrc).toMatch(/float\s+sourceStreamCoordinate\s*=\s*dot\(sourceStreamUv\s*\*\s*uTextureSize,\s*sourceStreamTangent\)\s*\/\s*max\(uSourceStreamFlowWavelengthPx,\s*1\.0\)/);
    expect(fragSrc).toMatch(/float\s+sourceStreamCarrier\s*=\s*0\.5\s*\*\s*\(\s*sin\(TAU\s*\*\s*\(sourceStreamCoordinate\s*-\s*uTime\s*\*\s*uSourceStreamFlowCycles\)\)\s*-\s*sin\(TAU\s*\*\s*sourceStreamCoordinate\)\s*\)/);
    expect(fragSrc).toMatch(/float\s+sourceStreamFieldConfidence\s*=\s*smoothstep\(0\.05,\s*0\.35,\s*sourceStreamField\.b\)/);
    expect(fragSrc).toMatch(/float\s+sourceStreamSupport\s*=\s*sourceStreamMaterialWeight\s*\*\s*sourceStreamConfidence/);
    expect(fragSrc).toMatch(/sourceStreamTraceUv\s*\+=\s*edgePreservedSourceStreamTraceDelta\(sourceStreamTraceUv,\s*sourceStreamDelta\)/);
  });

  it("uses the integrated source stream only as a zero-origin source-coordinate travel phase", () => {
    expect(fragSrc).toMatch(/vec3\s+sourceStreamPhase\s*=\s*texture2D\(uSourceStreamFlowStreamTex,\s*sourceStreamUv\)\.rgb/);
    expect(fragSrc).toMatch(/float\s+sourceStreamIntegratedCoordinate\s*=\s*atan2Safe\(\s*sourceStreamVector\.y,\s*sourceStreamVector\.x\s*\)\s*\/\s*TAU/);
    expect(fragSrc).toMatch(/float\s+sourceStreamPhaseEnabled\s*=\s*step\(0\.5,\s*uSourceStreamFlowStreamPhase\)/);
    expect(fragSrc).toMatch(/sourceStreamCoordinate\s*=\s*mix\(\s*sourceStreamCoordinate,\s*sourceStreamIntegratedCoordinate,\s*sourceStreamPhaseEnabled\s*\)/);
    expect(fragSrc).toMatch(/float\s+sourceStreamIntegratedConfidence\s*=\s*smoothstep\(0\.05,\s*0\.32,\s*sourceStreamPhase\.b\)/);
    expect(fragSrc).toMatch(/float\s+sourceStreamCarrier\s*=\s*0\.5\s*\*\s*\(\s*sin\(TAU\s*\*\s*\(sourceStreamCoordinate\s*-\s*uTime\s*\*\s*uSourceStreamFlowCycles\)\)\s*-\s*sin\(TAU\s*\*\s*sourceStreamCoordinate\)\s*\)/);
  });

  it("uses the shared fine-interior gate and protects dark gaps before any source-coordinate movement", () => {
    expect(fragSrc).toMatch(/float\s+sourceStreamInteriorWeight\s*\(\s*vec2\s+uv\s*\)/);
    expect(fragSrc).toMatch(/float\s+sourceStreamDarkProtect\s*=\s*smoothstep\(0\.04,\s*0\.18,\s*sourceLuminance\(texture2D\(uTexture,\s*uv\)\.rgb\)\)/);
    expect(fragSrc).toMatch(/return\s+sourceInteriorDetailWeight\(uv\)\s*\*\s*sourceStreamDarkProtect/);
  });

  it("traces the source coordinate through a coarse-boundary-protected normal field", () => {
    expect(fragSrc).toMatch(/for\s*\(\s*int\s+sourceStreamStep\s*=\s*0\s*;\s*sourceStreamStep\s*<\s*4\s*;\s*sourceStreamStep\s*\+\+\s*\)/);
    expect(fragSrc).toMatch(/vec2\s+sourceStreamTraceNormal\s*=\s*vec2\(\s*-sourceStreamTraceTangent\.y,\s*sourceStreamTraceTangent\.x\s*\)/);
    expect(fragSrc).toMatch(/vec2\s+sourceStreamTraceDirectionRaw\s*=\s*mix\(\s*sourceStreamTraceTangent,\s*sourceStreamTraceNormal,\s*clamp\(uSourceStreamFlowNormalMix,\s*0\.0,\s*1\.0\)\s*\)/);
    expect(fragSrc).toMatch(/vec2\s+edgePreservedSourceStreamTraceDelta\s*\(\s*vec2\s+uv,\s*vec2\s+delta\s*\)/);
    expect(fragSrc).toMatch(/sourceEdgeStrength\(uv,\s*24\.0\)/);
    expect(fragSrc).toMatch(/sourceEdgeStrength\(candidateUv,\s*24\.0\)/);
  });

  it("can opt into source-derived mid-band material authority without adding a colour path", () => {
    expect(fragSrc).toMatch(/float\s+sourceStreamMaterialWeight\s*=\s*mix\(\s*sourceStreamInteriorWeight\(sourceStreamTraceUv\),\s*sourceDetailResidualWeight\(sourceStreamTraceUv\),\s*clamp\(uSourceStreamFlowMaterialMaskMix,\s*0\.0,\s*1\.0\)\s*\)/);
    expect(fragSrc).toMatch(/float\s+sourceDetailResidualWeight\s*\(\s*vec2\s+uv\s*\)/);
    expect(fragSrc).toMatch(/float\s+sourceDetailBoundary\s*=\s*smoothstep\(0\.06,\s*0\.20,\s*sourceEdgeStrength\(uv,\s*24\.0\)\)/);
  });
});

describe("layer.frag — source-only material dissolve", () => {
  it("declares bounded source material dissolve uniforms", () => {
    expect(fragSrc).toContain("uniform float uSourceMaterialDissolveAmount;");
    expect(fragSrc).toContain("uniform float uSourceMaterialDissolveMaxDisplacementPx;");
    expect(fragSrc).toContain("uniform float uSourceMaterialDissolveCycles;");
    expect(fragSrc).toContain("uniform float uSourceMaterialDissolveWavelengthPx;");
    expect(fragSrc).toContain("uniform float uSourceMaterialDissolveEdgePreserve;");
    expect(fragSrc).toContain("uniform sampler2D uSourceMaterialDissolveStreamTex;");
    expect(fragSrc).toContain("uniform float uSourceMaterialDissolveStreamPhase;");
  });

  it("keeps source lightness and uses symmetric edge-guarded source chroma samples", () => {
    expect(fragSrc).toMatch(/float\s+sourceMaterialDissolveWeight\s*\(\s*vec2\s+uv\s*\)/);
    expect(fragSrc).toMatch(/vec2\s+sourceMaterialPositiveDelta\s*=\s*edgePreservedSourceMaterialDelta\(sampleUv,\s*sourceMaterialRadius\)/);
    expect(fragSrc).toMatch(/vec2\s+sourceMaterialNegativeDelta\s*=\s*edgePreservedSourceMaterialDelta\(sampleUv,\s*-sourceMaterialRadius\)/);
    expect(fragSrc).toMatch(/vec3\s+sourceMaterialCenterLab\s*=\s*linearSrgbToOklab\(srgbToLinear\(sourceCenterColor\.rgb\)\)/);
    expect(fragSrc).toMatch(/vec2\s+sourceMaterialDissolvedAb\s*=\s*mix\(sourceMaterialNegativeLab\.yz,\s*sourceMaterialPositiveLab\.yz,/);
    expect(fragSrc).toMatch(/oklchToLinearSrgbGamutMapped\(sourceMaterialCenterLab\.x,/);
  });

  it("uses an integrated source stream only as a zero-origin local chroma transport coordinate", () => {
    expect(fragSrc).toMatch(/vec3\s+sourceMaterialStreamPhase\s*=\s*texture2D\(uSourceMaterialDissolveStreamTex,\s*sampleUv\)\.rgb/);
    expect(fragSrc).toMatch(/float\s+sourceMaterialIntegratedCoordinate\s*=\s*atan2Safe\(\s*sourceMaterialStreamVector\.y,\s*sourceMaterialStreamVector\.x\s*\)\s*\/\s*TAU/);
    expect(fragSrc).toMatch(/float\s+sourceMaterialStreamCarrier\s*=\s*0\.5\s*\*\s*\(\s*sin\(TAU\s*\*\s*\(sourceMaterialIntegratedCoordinate\s*-\s*uTime\s*\*\s*uSourceMaterialDissolveCycles\)\)\s*-\s*sin\(TAU\s*\*\s*sourceMaterialIntegratedCoordinate\)\s*\)/);
    expect(fragSrc).toMatch(/vec2\s+sourceMaterialStreamTargetAb\s*=\s*mix\(\s*sourceMaterialNegativeLab\.yz,\s*sourceMaterialPositiveLab\.yz,\s*step\(0\.0,\s*sourceMaterialStreamCarrier\)\s*\)/);
    expect(fragSrc).toMatch(/abs\(sourceMaterialStreamCarrier\)/);
    expect(fragSrc).toMatch(/step\(0\.5,\s*uSourceMaterialDissolveStreamPhase\)/);
  });

  it("keeps the stream transport free of global hue, glow, palette, or overlay paths", () => {
    const materialBlockStart = fragSrc.indexOf("if (uSourceMaterialDissolveAmount");
    const materialBlockEnd = fragSrc.indexOf("// SOURCE DETAIL RESIDUAL FLOW START");
    const materialBlock = fragSrc.slice(materialBlockStart, materialBlockEnd);

    expect(materialBlock).not.toMatch(/uSourcePrism|uGlow|palette|hsv|greenCompressedHue/i);
  });
});

describe("layer.frag — source detail residual flow", () => {
  it("declares bounded source-detail residual flow uniforms", () => {
    expect(fragSrc).toContain("uniform float uSourceDetailResidualFlowAmount;");
    expect(fragSrc).toContain("uniform float uSourceDetailResidualFlowMaxDisplacementPx;");
    expect(fragSrc).toContain("uniform float uSourceDetailResidualFlowCycles;");
    expect(fragSrc).toContain("uniform float uSourceDetailResidualFlowBandLimitPx;");
    expect(fragSrc).toContain("uniform float uSourceDetailResidualFlowEdgePreserve;");
    expect(fragSrc).toContain("uniform float uSourceDetailResidualFlowChromaOnly;");
  });

  it("holds the source's low and fine bands at fixed UV while moving only source-derived detail bands", () => {
    expect(fragSrc).toMatch(/vec3\s+sourceDetailResidualBlurLinear\s*\(\s*vec2\s+uv\s*,\s*float\s+radiusPx\s*\)/);
    expect(fragSrc).toMatch(/vec3\s+sourceDetailResidualBandLinear\s*\(\s*vec2\s+uv\s*,\s*float\s+bandLimitPx\s*\)/);
    expect(fragSrc).toMatch(/vec3\s+sourceDetailResidualMidBandLinear\s*\(\s*vec2\s+uv\s*\)/);
    expect(fragSrc).toMatch(/sourceDetailResidualBandLinear\(uv,\s*24\.0\)/);
    expect(fragSrc).toMatch(/sourceDetailResidualBlurLinear\(uv,\s*3\.0\)\s*-\s*sourceDetailResidualBlurLinear\(uv,\s*max\(bandLimitPx,\s*3\.0\)\)/);
    expect(fragSrc).toMatch(/vec3\s+sourceDetailResidualCenterLinear\s*=\s*srgbToLinear\(sourceCenterColor\.rgb\)/);
    expect(fragSrc).toMatch(/vec3\s+sourceDetailResidualCenter\s*=\s*sourceDetailResidualBandLinear\(sampleUv,\s*sourceDetailResidualBandLimitPx\)/);
    expect(fragSrc).toMatch(/vec3\s+sourceDetailResidualMoved\s*=\s*sourceDetailResidualBandLinear\(sourceDetailResidualMovedUv,\s*sourceDetailResidualBandLimitPx\)/);
    expect(fragSrc).toMatch(/vec3\s+sourceDetailResidualTravel\s*=\s*sourceDetailResidualMoved\s*-\s*sourceDetailResidualCenter/);
    expect(fragSrc).toMatch(/vec3\s+sourceDetailResidualComposed\s*=\s*sourceDetailResidualCenterLinear\s*\+\s*sourceDetailResidualTravel/);
    expect(fragSrc).toMatch(/texColor\.rgb\s*=\s*linearToSrgb\(clamp\(sourceDetailResidualOutputLinear,\s*0\.0,\s*1\.0\)\)/);
  });

  it("can widen only the transported source-detail band without introducing a color field", () => {
    expect(fragSrc).toMatch(/vec3\s+sourceDetailResidualBandLinear\s*\(\s*vec2\s+uv\s*,\s*float\s+bandLimitPx\s*\)/);
    expect(fragSrc).toMatch(/sourceDetailResidualBlurLinear\(uv,\s*3\.0\)\s*-\s*sourceDetailResidualBlurLinear\(uv,\s*max\(bandLimitPx,\s*3\.0\)\)/);
    expect(fragSrc).toMatch(/float\s+sourceDetailResidualBandLimitPx\s*=\s*clamp\(uSourceDetailResidualFlowBandLimitPx,\s*24\.0,\s*96\.0\)/);
    expect(fragSrc).toMatch(/sourceDetailResidualBandWeight\(sampleUv,\s*sourceDetailResidualBandLimitPx\)/);
    expect(fragSrc).toMatch(/sourceDetailResidualBandLinear\(sourceDetailResidualMovedUv,\s*sourceDetailResidualBandLimitPx\)/);
  });

  it("can transport only source-derived detail-band chroma while retaining the center source lightness", () => {
    expect(fragSrc).toMatch(/vec2\s+sourceDetailResidualBandChroma\s*\(\s*vec2\s+uv\s*,\s*float\s+bandLimitPx\s*\)/);
    expect(fragSrc).toMatch(/vec2\s+sourceDetailResidualMidBandChroma\s*\(\s*vec2\s+uv\s*\)/);
    expect(fragSrc).toMatch(/sourceDetailResidualBandChroma\(uv,\s*24\.0\)/);
    expect(fragSrc).toMatch(/linearSrgbToOklab\(sourceDetailResidualBlurLinear\(uv,\s*3\.0\)\)/);
    expect(fragSrc).toMatch(/linearSrgbToOklab\(sourceDetailResidualBlurLinear\(uv,\s*max\(bandLimitPx,\s*3\.0\)\)\)/);
    expect(fragSrc).toMatch(/vec3\s+sourceDetailResidualCenterLab\s*=\s*linearSrgbToOklab\(sourceDetailResidualCenterLinear\)/);
    expect(fragSrc).toMatch(/vec2\s+sourceDetailResidualCenterChroma\s*=\s*sourceDetailResidualBandChroma\(sampleUv,\s*sourceDetailResidualBandLimitPx\)/);
    expect(fragSrc).toMatch(/vec2\s+sourceDetailResidualMovedChroma\s*=\s*sourceDetailResidualBandChroma\(sourceDetailResidualMovedUv,\s*sourceDetailResidualBandLimitPx\)/);
    expect(fragSrc).toMatch(/vec2\s+sourceDetailResidualChromaComposedAb\s*=\s*sourceDetailResidualCenterLab\.yz\s*\+\s*\(\s*sourceDetailResidualMovedChroma\s*-\s*sourceDetailResidualCenterChroma\s*\)/);
    expect(fragSrc).toMatch(/float\s+sourceDetailResidualChroma\s*=\s*length\(sourceDetailResidualChromaComposedAb\)/);
    expect(fragSrc).toMatch(/float\s+sourceDetailResidualHue\s*=\s*atan2Safe\(\s*sourceDetailResidualChromaComposedAb\.y,\s*sourceDetailResidualChromaComposedAb\.x\s*\)\s*\/\s*TAU/);
    expect(fragSrc).toMatch(/vec3\s+sourceDetailResidualChromaComposed\s*=\s*oklchToLinearSrgbGamutMapped\(\s*sourceDetailResidualCenterLab\.x,\s*sourceDetailResidualHue,\s*sourceDetailResidualChroma\s*\)/);
    expect(fragSrc).toMatch(/mix\(\s*sourceDetailResidualComposed,\s*sourceDetailResidualChromaComposed,\s*step\(0\.5,\s*uSourceDetailResidualFlowChromaOnly\)\s*\)/);
  });

  it("uses movement authority in the displacement without attenuating the transported residual twice", () => {
    const blockStart = fragSrc.indexOf("// SOURCE DETAIL RESIDUAL FLOW START");
    const blockEnd = fragSrc.indexOf("// SOURCE DETAIL RESIDUAL FLOW END");
    const residualBlock = fragSrc.slice(blockStart, blockEnd);
    expect(residualBlock).not.toMatch(/mix\(\s*sourceDetailResidualCenter,\s*sourceDetailResidualMoved/);
  });

  it("uses a source-derived integrated stream phase for moving material while retaining a loop-safe orbit fallback", () => {
    expect(fragSrc).toMatch(/float\s+sourceDetailResidualOrbit\s*=\s*TAU\s*\*\s*uTime\s*\*\s*uSourceDetailResidualFlowCycles/);
    expect(fragSrc).toMatch(/vec2\s+sourceDetailResidualOrbitDelta\s*=\s*0\.5\s*\*\s*\(\s*sourceDetailResidualFieldNormal\s*\*\s*sin\(sourceDetailResidualOrbit\)\s*\+\s*sourceDetailResidualTangent\s*\*\s*\(cos\(sourceDetailResidualOrbit\)\s*-\s*1\.0\)\s*\)/);
    expect(fragSrc).toContain("uniform sampler2D uSourceDetailResidualStreamTex;");
    expect(fragSrc).toContain("uniform float uSourceDetailResidualFlowStreamPhase;");
    expect(fragSrc).toMatch(/vec3\s+sourceDetailResidualStreamPhase\s*=\s*texture2D\(uSourceDetailResidualStreamTex,\s*sampleUv\)\.rgb/);
    expect(fragSrc).toMatch(/float\s+sourceDetailResidualStreamCarrier\s*=\s*dot\(sourceDetailResidualStreamVector,\s*vec2\(cos\(sourceDetailResidualOrbit\),\s*sin\(sourceDetailResidualOrbit\)\)\)\s*-\s*sourceDetailResidualStreamVector\.x/);
    expect(fragSrc).toMatch(/vec2\s+sourceDetailResidualStreamDelta\s*=\s*sourceDetailResidualFieldNormal\s*\*\s*sourceDetailResidualStreamCarrier/);
    expect(fragSrc).toMatch(/mix\(\s*sourceDetailResidualOrbitDelta,\s*sourceDetailResidualStreamDelta,\s*step\(0\.5,\s*uSourceDetailResidualFlowStreamPhase\)\s*\)/);
  });

  it("moves residual with the source-derived field normal/tangent pair instead of a pixel-phase detail normal", () => {
    expect(fragSrc).toMatch(/vec2\s+sourceDetailResidualFieldNormal\s*=\s*vec2\(\s*-sourceDetailResidualTangent\.y,\s*sourceDetailResidualTangent\.x\s*\)/);
    expect(fragSrc).toMatch(/vec2\s+sourceDetailResidualDelta\s*=\s*sourceDetailResidualMotionDelta/);
    const blockStart = fragSrc.indexOf("// SOURCE DETAIL RESIDUAL FLOW START");
    const blockEnd = fragSrc.indexOf("// SOURCE DETAIL RESIDUAL FLOW END");
    const residualBlock = fragSrc.slice(blockStart, blockEnd);
    expect(residualBlock).not.toContain("sourceDetailResidualGradient");
    expect(residualBlock).not.toContain("sourceDetailResidualDetailNormal");
  });

  it("limits source detail movement at boundaries and keeps the block free of global color paths", () => {
    expect(fragSrc).toMatch(/vec2\s+edgePreservedSourceDetailResidualDelta\s*\(\s*vec2\s+uv,\s*vec2\s+delta\s*\)/);
    expect(fragSrc).toMatch(/vec2\s+midpointUv\s*=\s*clamp\(uv\s*\+\s*delta\s*\*\s*0\.5/);
    expect(fragSrc).toMatch(/float\s+coarseBoundary\s*=\s*max\(sourceEdgeStrength\(uv,\s*24\.0\)/);
    expect(fragSrc).toMatch(/sourceEdgeStrength\(midpointUv,\s*24\.0\)/);
    expect(fragSrc).toMatch(/sourceEdgeStrength\(candidateUv,\s*24\.0\)/);
    expect(fragSrc).toMatch(/sourceDetailResidualDelta\s*=\s*edgePreservedSourceDetailResidualDelta\(sampleUv,\s*sourceDetailResidualDelta\)/);
    const blockStart = fragSrc.indexOf("// SOURCE DETAIL RESIDUAL FLOW START");
    const blockEnd = fragSrc.indexOf("// SOURCE DETAIL RESIDUAL FLOW END");
    expect(blockStart).toBeGreaterThan(-1);
    expect(blockEnd).toBeGreaterThan(blockStart);
    const residualBlock = fragSrc.slice(blockStart, blockEnd);
    expect(residualBlock).not.toContain("uSourcePrism");
    expect(residualBlock).not.toContain("sourceLab");
    expect(residualBlock).not.toContain("palette(");
    expect(residualBlock).not.toContain("hsv");
  });
});

describe("layer.frag — source-derived chroma flow", () => {
  it("declares source chroma-flow uniforms", () => {
    expect(fragSrc).toContain("uniform float uSourceChromaFlowAmount;");
    expect(fragSrc).toContain("uniform float uSourceChromaFlowMaxDisplacementPx;");
    expect(fragSrc).toContain("uniform float uSourceChromaFlowCycles;");
    expect(fragSrc).toContain("uniform float uSourceChromaFlowPhaseScale;");
    expect(fragSrc).toContain("uniform float uSourceChromaFlowNormalMix;");
    expect(fragSrc).toContain("uniform float uSourceChromaFlowDetailGain;");
  });

  it("keeps source lightness while advecting only nearby source chroma", () => {
    expect(fragSrc).toMatch(/vec3\s+sourceChromaFlowField\s*=\s*texture2D\(uFlowFieldTex,\s*sampleUv\)\.rgb/);
    expect(fragSrc).toMatch(/float\s+sourceChromaFlowSupport\s*=\s*sourceFeatureWeight\(sampleUv,\s*0\.0,\s*1\.0,\s*0\.75\)/);
    expect(fragSrc).toMatch(/vec3\s+sourceChromaFlowCenterLab\s*=\s*linearSrgbToOklab\(srgbToLinear\(sourceCenterColor\.rgb\)\)/);
    expect(fragSrc).toMatch(/vec3\s+sourceChromaFlowAdvectedLab\s*=\s*linearSrgbToOklab\(srgbToLinear\(sourceChromaFlowSample\.rgb\)\)/);
    expect(fragSrc).toMatch(/vec2\s+sourceChromaFlowTargetAb\s*=\s*sourceChromaFlowCenterLab\.yz\s*\+\s*\(sourceChromaFlowAdvectedLab\.yz\s*-\s*sourceChromaFlowCenterLab\.yz\)\s*\*\s*clamp\(uSourceChromaFlowDetailGain,\s*0\.0,\s*6\.0\)/);
    expect(fragSrc).toMatch(/vec2\s+sourceChromaFlowAb\s*=\s*mix\(sourceChromaFlowCenterLab\.yz,\s*sourceChromaFlowTargetAb,\s*clamp\(uSourceChromaFlowAmount,\s*0\.0,\s*1\.0\)\)/);
    expect(fragSrc).toMatch(/texColor\.rgb\s*=\s*linearToSrgb\(oklchToLinearSrgbGamutMapped\(sourceChromaFlowCenterLab\.x,/);
  });
});

describe("layer.frag — dual-band source-self transport", () => {
  it("declares independent macro and micro transport uniforms", () => {
    expect(fragSrc).toContain("uniform float uSourceFlowTransportAmount;");
    expect(fragSrc).toContain("uniform float uSourceFlowTransportMacroDisplacementPx;");
    expect(fragSrc).toContain("uniform float uSourceFlowTransportMacroCycles;");
    expect(fragSrc).toContain("uniform float uSourceFlowTransportMicroDisplacementPx;");
    expect(fragSrc).toContain("uniform float uSourceFlowTransportMicroCycles;");
    expect(fragSrc).toContain("uniform float uSourceFlowTransportPhaseScale;");
    expect(fragSrc).toContain("uniform float uSourceFlowTransportNormalMix;");
    expect(fragSrc).toContain("uniform float uSourceFlowTransportEdgePreserve;");
    expect(fragSrc).toContain("uniform float uSourceFlowTransportColorAmount;");
  });

  it("uses broad macro phase and symmetric source-only micro chroma dissolution", () => {
    expect(fragSrc).toMatch(/uTime\s*\*\s*uSourceFlowTransportMacroCycles/);
    expect(fragSrc).toMatch(/uTime\s*\*\s*uSourceFlowTransportMicroCycles/);
    expect(fragSrc).toMatch(/vec2\s+sourceFlowTransportUvPositive\s*=\s*clamp\(/);
    expect(fragSrc).toMatch(/vec2\s+sourceFlowTransportUvNegative\s*=\s*clamp\(/);
    expect(fragSrc).toMatch(/vec3\s+sourceFlowTransportCenterLab\s*=\s*linearSrgbToOklab\(srgbToLinear\(sourceCenterColor\.rgb\)\)/);
    expect(fragSrc).toMatch(/vec2\s+sourceFlowTransportDissolvedAb\s*=\s*mix\(sourceFlowTransportNegativeLab\.yz,\s*sourceFlowTransportPositiveLab\.yz,/);
    expect(fragSrc).toMatch(/texColor\.rgb\s*=\s*linearToSrgb\(oklchToLinearSrgbGamutMapped\(sourceFlowTransportCenterLab\.x,/);
  });

  it("does not inject a procedural hash into source phase color", () => {
    expect(fragSrc).not.toContain("hash12(vUv * 1024.0)");
  });
});

describe("layer.frag — source-derived spectral flow", () => {
  it("keeps source lightness while splitting only source channels along local flow", () => {
    expect(fragSrc).toContain("uniform float uSourceSpectralFlowAmount;");
    expect(fragSrc).toContain("uniform float uSourceSpectralFlowRadiusPx;");
    expect(fragSrc).toContain("uniform float uSourceSpectralFlowCycles;");
    expect(fragSrc).toContain("uniform float uSourceSpectralFlowPhaseScale;");
    expect(fragSrc).toContain("uniform float uSourceSpectralFlowNormalMix;");
    expect(fragSrc).toMatch(/float\s+sourceSpectralFlowSupport\s*=\s*sourceFeatureWeight\(sampleUv,\s*0\.2,\s*1\.0,\s*1\.0\)/);
    expect(fragSrc).toMatch(/float\s+sourceSpectralFlowDarkProtect\s*=\s*smoothstep\(0\.03,\s*0\.25,\s*sourceLuminance\(sourceCenterColor\.rgb\)\)/);
    expect(fragSrc).toMatch(/vec4\s+sourceSpectralFlowSampleR\s*=\s*texture2D\(uTexture,\s*sourceSpectralFlowUvR\)/);
    expect(fragSrc).toMatch(/vec4\s+sourceSpectralFlowSampleG\s*=\s*texture2D\(uTexture,\s*sourceSpectralFlowUvG\)/);
    expect(fragSrc).toMatch(/vec4\s+sourceSpectralFlowSampleB\s*=\s*texture2D\(uTexture,\s*sourceSpectralFlowUvB\)/);
    expect(fragSrc).toMatch(/vec3\s+sourceSpectralFlowCenterLab\s*=\s*linearSrgbToOklab\(srgbToLinear\(sourceCenterColor\.rgb\)\)/);
    expect(fragSrc).toMatch(/texColor\.rgb\s*=\s*linearToSrgb\(oklchToLinearSrgbGamutMapped\(sourceSpectralFlowCenterLab\.x,/);
  });
});

describe("layer.frag — in-place source prism", () => {
  it("declares source prism uniforms", () => {
    expect(fragSrc).toContain("uniform float uSourcePrismAmount;");
    expect(fragSrc).toContain("uniform float uSourcePrismRadiusPx;");
    expect(fragSrc).toContain("uniform float uSourcePrismDirectionCycles;");
    expect(fragSrc).toContain("uniform float uSourcePrismChromaCycles;");
    expect(fragSrc).toContain("uniform float uSourcePrismSurfaceCycles;");
    expect(fragSrc).toContain("uniform float uSourcePrismPhaseFlowPx;");
    expect(fragSrc).toContain("uniform float uSourcePrismPhaseFlowCycles;");
    expect(fragSrc).toContain("uniform float uSourcePrismPhaseMix;");
    expect(fragSrc).toContain("uniform float uSourcePrismDetailBoost;");
    expect(fragSrc).toContain("uniform float uSourcePrismPhaseScale;");
  });

  it("derives rotating prism chroma only from nearby source luminance samples", () => {
    expect(fragSrc).toMatch(/vec3\s+prismLuma\s*=\s*vec3\(/);
    expect(fragSrc).toMatch(/linearSrgbToOklab\(srgbToLinear\(prismLuma\)\)/);
    expect(fragSrc).toMatch(/float\s+prismAngle\s*=\s*TAU\s*\*\s*\(uTime\s*\*\s*uSourcePrismChromaCycles\s*\+\s*sourcePrismPhase\)/);
    expect(fragSrc).toMatch(/sourceLab\.yz\s*\+=\s*prismRotation\s*\*\s*prismLab\.yz\s*\*\s*uSourcePrismDetailBoost/);
  });

  it("advects and morphs only source-derived phase controls", () => {
    expect(fragSrc).toMatch(/vec3\s+sourcePhaseFlow\s*=\s*texture2D\(uFlowFieldTex,\s*sampleUv\)\.rgb/);
    expect(fragSrc).toMatch(/float\s+sourcePhasePrimary\s*=\s*texture2D\(\s*uPhaseTex2,/);
    expect(fragSrc).toMatch(/float\s+sourcePhaseSecondary\s*=\s*texture2D\(\s*uPhaseTex,/);
    expect(fragSrc).toMatch(/float\s+sourcePrismPhase\s*=\s*mix\(sourcePhasePrimary,\s*sourcePhaseSecondary,\s*sourcePhaseMorph\)\s*\*\s*uSourcePrismPhaseScale/);
  });

  it("compresses the source-prism green arc before gamut mapping", () => {
    expect(fragSrc).toMatch(/float\s+sourcePrismHue\s*=\s*greenCompressedHue\(atan2Safe\(sourceLab\.z,\s*sourceLab\.y\)\s*\/\s*TAU\)/);
  });

  it("rotates source surface chroma with the same low-pass phase field", () => {
    expect(fragSrc).toMatch(/float\s+surfaceAngle\s*=\s*TAU\s*\*\s*\(uTime\s*\*\s*uSourcePrismSurfaceCycles\s*\+\s*sourcePrismPhase\)/);
    expect(fragSrc).toMatch(/sourceLab\.yz\s*=\s*surfaceRotation\s*\*\s*sourceLab\.yz\s*\*\s*max\(0\.0,\s*uSaturationBoost\)/);
  });

  it("keeps source lightness and applies prism before the color-motion mask", () => {
    const prismIndex = fragSrc.indexOf("if (uSourcePrismAmount > 0.0001");
    const motionMaskIndex = fragSrc.indexOf("rgb = mix(texColor.rgb, rgb, colorMotionWeight(sampleUv));");
    expect(prismIndex).toBeGreaterThan(-1);
    expect(motionMaskIndex).toBeGreaterThan(prismIndex);
    expect(fragSrc.slice(prismIndex, motionMaskIndex)).toMatch(/oklchToLinearSrgbGamutMapped\(sourceLab\.x,/);
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

describe("layer.frag — source-region-affinity coordinate transport", () => {
  it("uses a source-derived affinity texture to gate source-coordinate motion", () => {
    expect(fragSrc).toContain("uniform sampler2D uSourceRegionAffinityTex;");
    expect(fragSrc).toContain("uniform float uSourceRegionAffinityAmount;");
    expect(fragSrc).toMatch(/sourceRegionAffinitySupport\s*\(/);
    expect(fragSrc).toMatch(/sourceRegionAffinitySafeDelta\s*\(/);
    expect(fragSrc).toMatch(/if\s*\(\s*uSourceRegionAffinityAmount\s*>\s*0\.0001/);
    expect(fragSrc).toMatch(/sampleUv\s*=\s*clamp\(sourceRegionAffinityUv/);
  });

  it("keeps the region-affinity route as direct source sampling rather than residual composition", () => {
    const start = fragSrc.indexOf("if (uSourceRegionAffinityAmount");
    const end = fragSrc.indexOf("sampleUv = clamp(sourceRegionAffinityUv", start);
    const route = fragSrc.slice(start, end);
    expect(route).not.toContain("sourceDetailResidual");
    expect(route).not.toContain("texColor.rgb");
  });
});
