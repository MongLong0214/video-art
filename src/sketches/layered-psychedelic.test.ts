/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const rendererSrc = readFileSync(resolve(__dirname, "layered-psychedelic.ts"), "utf-8");

describe("layered-psychedelic.ts — parallax uniform bindings", () => {
  it("binds uDepthNorm per-layer", () => {
    expect(rendererSrc).toMatch(/uDepthNorm:\s*\{\s*value:/);
  });

  it("binds uParallaxScale", () => {
    expect(rendererSrc).toMatch(/uParallaxScale:\s*\{\s*value:/);
  });

  it("uDepthNorm fallback is 128/255", () => {
    expect(rendererSrc).toMatch(/meanDepth\s*\?\?\s*128\)\s*\/\s*255/);
  });

  it("sets ClampToEdgeWrapping", () => {
    expect(rendererSrc).toMatch(/ClampToEdgeWrapping/);
  });

  it("binds uHazeIntensity", () => {
    expect(rendererSrc).toMatch(/uHazeIntensity:\s*\{\s*value:/);
  });

  it("binds uFeatherRadius", () => {
    expect(rendererSrc).toMatch(/uFeatherRadius:\s*\{\s*value:/);
  });

  it("uDepthNorm uniform key appears exactly once", () => {
    const matches = rendererSrc.match(/uDepthNorm:\s*\{/g);
    expect(matches).toHaveLength(1);
  });
});

describe("layered-psychedelic.ts — glow-wave and green-band uniform bindings", () => {
  it("binds the glow-wave mean from each layer sharpness", () => {
    expect(rendererSrc).toMatch(/uGlowWaveMean:\s*\{\s*value:\s*glowWaveMean\(anim\.glowWave\.sharpness\)\s*\}/);
  });

  it("binds second glow-wave uniforms from independent animation fields", () => {
    expect(rendererSrc).toMatch(/l\.animation\.phaseField2/);
    expect(rendererSrc).toMatch(/uPhaseTex2:\s*\{\s*value:\s*phaseTexture2\s*\}/);
    expect(rendererSrc).toMatch(/uPhaseWarpAmount:\s*\{\s*value:\s*anim\.phaseWarpAmount\s*\?\?\s*0\s*\}/);
    expect(rendererSrc).toMatch(/uGlowWavePhaseSource:\s*\{\s*value:\s*anim\.glowWavePhaseSource\s*===\s*"flowField"\s*\?\s*1\s*:\s*0\s*\}/);
    expect(rendererSrc).toMatch(/uColorCycleDesyncAmount:\s*\{\s*value:\s*anim\.colorCycleDesync\.amount\s*\}/);
    expect(rendererSrc).toMatch(/uColorCycleDesyncCycles:\s*\{\s*value:\s*anim\.colorCycleDesync\.cycles\s*\}/);
    expect(rendererSrc).toMatch(/uGlowWave2Strength:\s*\{\s*value:\s*anim\.glowWave2\.strength\s*\}/);
    expect(rendererSrc).toMatch(/uGlowWave2Mean:\s*\{\s*value:\s*glowWaveMean\(anim\.glowWave2\.sharpness\)\s*\}/);
  });

  it("computes glow-wave mean with the requested 64-sample crest average", () => {
    expect(rendererSrc).toMatch(/const\s+GLOW_WAVE_MEAN_SAMPLES\s*=\s*64/);
    expect(rendererSrc).toMatch(/1\.5\s*\+\s*\(7\.0\s*-\s*1\.5\)\s*\*\s*sharpness/);
    expect(rendererSrc).toMatch(/Math\.pow\(\s*0\.5\s*\+\s*0\.5\s*\*\s*Math\.cos\(TAU\s*\*\s*x\)\s*,\s*exponent\s*\)/);
    expect(rendererSrc).toMatch(/return\s+sum\s*\/\s*GLOW_WAVE_MEAN_SAMPLES/);
  });

  it("binds green-compression bands per hue space", () => {
    expect(rendererSrc).toMatch(/const\s+greenBand\s*=\s*GREEN_BANDS_BY_HUE_SPACE\[anim\.hueSpace\]/);
    expect(rendererSrc).toMatch(/uGreenBandLo:\s*\{\s*value:\s*greenBand\.lo\s*\}/);
    expect(rendererSrc).toMatch(/uGreenBandHi:\s*\{\s*value:\s*greenBand\.hi\s*\}/);
  });

  it("keeps HSV and derived OKLCH green-band constants in renderer code", () => {
    expect(rendererSrc).toMatch(/hsv:\s*\{\s*lo:\s*70\s*\/\s*360,\s*hi:\s*165\s*\/\s*360\s*\}/);
    expect(rendererSrc).toContain("0.27769994490592986");
    expect(rendererSrc).toContain("0.49983187802797546");
    expect(rendererSrc).toContain("pure green maps to 142.4953388878deg");
  });

  it("keeps layer source textures untagged so source bytes stay display-referred", () => {
    expect(rendererSrc).toMatch(/texture\.colorSpace\s*=\s*THREE\.NoColorSpace/);
    expect(rendererSrc).not.toMatch(/texture\.colorSpace\s*=\s*THREE\.SRGBColorSpace/);
  });
});

describe("layered-psychedelic.ts — screen blend opacity wiring", () => {
  it("passes a premultiply-alpha flag only for screen layers", () => {
    expect(rendererSrc).toMatch(/const\s+blending\s*=\s*layerConfig\.blending\s*\?\?\s*"normal"/);
    expect(rendererSrc).toMatch(/uPremultiplyAlpha:\s*\{\s*value:\s*blending\s*===\s*"screen"\s*\?\s*1\s*:\s*0\s*\}/);
  });
});

describe("layered-psychedelic.ts — source-adaptive in-place flow", () => {
  it("binds adaptiveFlow uniforms from layer animation", () => {
    expect(rendererSrc).toMatch(/uAdaptiveFlowStrength:\s*\{\s*value:\s*anim\.adaptiveFlow\.strength\s*\}/);
    expect(rendererSrc).toMatch(/uAdaptiveFlowScale:\s*\{\s*value:\s*anim\.adaptiveFlow\.scale\s*\}/);
    expect(rendererSrc).toMatch(/uAdaptiveFlowCycles:\s*\{\s*value:\s*anim\.adaptiveFlow\.cycles\s*\}/);
    expect(rendererSrc).toMatch(/uAdaptiveFlowLumWeight:\s*\{\s*value:\s*anim\.adaptiveFlow\.luminanceWeight\s*\}/);
    expect(rendererSrc).toMatch(/uAdaptiveFlowSatWeight:\s*\{\s*value:\s*anim\.adaptiveFlow\.saturationWeight\s*\}/);
    expect(rendererSrc).toMatch(/uAdaptiveFlowEdgeWeight:\s*\{\s*value:\s*anim\.adaptiveFlow\.edgeWeight\s*\}/);
    expect(rendererSrc).toMatch(/uAdaptiveFlowMaxDisplacementPx:\s*\{\s*value:\s*anim\.adaptiveFlow\.maxDisplacementPx\s*\}/);
    expect(rendererSrc).toMatch(/uAdaptiveFlowEdgePreserve:\s*\{\s*value:\s*anim\.adaptiveFlow\.edgePreserve\s*\}/);
  });
});

describe("layered-psychedelic.ts — source color preservation", () => {
  it("binds sourceColorClamp uniforms from layer animation", () => {
    expect(rendererSrc).toMatch(/uSourceColorMaxDrift:\s*\{\s*value:\s*anim\.sourceColorClamp\.maxDrift\s*\}/);
  });
});

describe("layered-psychedelic.ts — source-derived color motion mask", () => {
  it("binds every colorMotionMask field to a shader uniform", () => {
    expect(rendererSrc).toMatch(/uColorMotionFloor:\s*\{\s*value:\s*anim\.colorMotionMask\.floor\s*\}/);
    expect(rendererSrc).toMatch(/uColorMotionLumWeight:\s*\{\s*value:\s*anim\.colorMotionMask\.luminanceWeight\s*\}/);
    expect(rendererSrc).toMatch(/uColorMotionSatWeight:\s*\{\s*value:\s*anim\.colorMotionMask\.saturationWeight\s*\}/);
    expect(rendererSrc).toMatch(/uColorMotionEdgeWeight:\s*\{\s*value:\s*anim\.colorMotionMask\.edgeWeight\s*\}/);
    expect(rendererSrc).toMatch(/uColorMotionPower:\s*\{\s*value:\s*anim\.colorMotionMask\.power\s*\}/);
  });
});

describe("layered-psychedelic.ts — loop-safe source chroma orbit", () => {
  it("binds the chromaOrbit controls to shader uniforms", () => {
    expect(rendererSrc).toMatch(/uChromaOrbitRadius:\s*\{\s*value:\s*anim\.chromaOrbit\.radius\s*\}/);
    expect(rendererSrc).toMatch(/uChromaOrbitSpeed:\s*\{\s*value:\s*anim\.chromaOrbit\.speed\s*\}/);
    expect(rendererSrc).toMatch(/uChromaOrbitPhaseScale:\s*\{\s*value:\s*anim\.chromaOrbit\.phaseScale\s*\}/);
  });
});

describe("layered-psychedelic.ts — source-derived tangent microflow", () => {
  it("binds every tangentMicroflow control to a shader uniform", () => {
    expect(rendererSrc).toMatch(/uTangentMicroflowAmount:\s*\{\s*value:\s*anim\.tangentMicroflow\.amount\s*\}/);
    expect(rendererSrc).toMatch(/uTangentMicroflowMaxDisplacementPx:\s*\{\s*value:\s*anim\.tangentMicroflow\.maxDisplacementPx\s*\}/);
    expect(rendererSrc).toMatch(/uTangentMicroflowCycles:\s*\{\s*value:\s*anim\.tangentMicroflow\.cycles\s*\}/);
    expect(rendererSrc).toMatch(/uTangentMicroflowPhaseScale:\s*\{\s*value:\s*anim\.tangentMicroflow\.phaseScale\s*\}/);
  });
});

describe("layered-psychedelic.ts — iterative source-flow advection", () => {
  it("binds every sourceFlowAdvection control to a shader uniform", () => {
    expect(rendererSrc).toMatch(/uSourceFlowAdvectionAmount:\s*\{\s*value:\s*anim\.sourceFlowAdvection\.amount\s*\}/);
    expect(rendererSrc).toMatch(/uSourceFlowAdvectionMaxDisplacementPx:\s*\{\s*value:\s*anim\.sourceFlowAdvection\.maxDisplacementPx\s*\}/);
    expect(rendererSrc).toMatch(/uSourceFlowAdvectionCycles:\s*\{\s*value:\s*anim\.sourceFlowAdvection\.cycles\s*\}/);
    expect(rendererSrc).toMatch(/uSourceFlowAdvectionPhaseScale:\s*\{\s*value:\s*anim\.sourceFlowAdvection\.phaseScale\s*\}/);
    expect(rendererSrc).toMatch(/uSourceFlowAdvectionNormalMix:\s*\{\s*value:\s*anim\.sourceFlowAdvection\.normalMix\s*\}/);
    expect(rendererSrc).toMatch(/uSourceFlowAdvectionEdgePreserve:\s*\{\s*value:\s*anim\.sourceFlowAdvection\.edgePreserve\s*\}/);
    expect(rendererSrc).toMatch(/uSourceFlowAdvectionDetailGain:\s*\{\s*value:\s*anim\.sourceFlowAdvection\.detailGain\s*\}/);
  });
});

describe("layered-psychedelic.ts — dual-band source-flow transport", () => {
  it("binds every sourceFlowTransport control to a shader uniform", () => {
    expect(rendererSrc).toMatch(/uSourceFlowTransportAmount:\s*\{\s*value:\s*anim\.flowField\s*===\s*undefined\s*\?\s*0\s*:\s*anim\.sourceFlowTransport\.amount\s*\}/);
    expect(rendererSrc).toMatch(/uSourceFlowTransportMacroDisplacementPx:\s*\{\s*value:\s*anim\.sourceFlowTransport\.macroDisplacementPx\s*\}/);
    expect(rendererSrc).toMatch(/uSourceFlowTransportMacroCycles:\s*\{\s*value:\s*anim\.sourceFlowTransport\.macroCycles\s*\}/);
    expect(rendererSrc).toMatch(/uSourceFlowTransportMicroDisplacementPx:\s*\{\s*value:\s*anim\.sourceFlowTransport\.microDisplacementPx\s*\}/);
    expect(rendererSrc).toMatch(/uSourceFlowTransportMicroCycles:\s*\{\s*value:\s*anim\.sourceFlowTransport\.microCycles\s*\}/);
    expect(rendererSrc).toMatch(/uSourceFlowTransportPhaseScale:\s*\{\s*value:\s*anim\.sourceFlowTransport\.phaseScale\s*\}/);
    expect(rendererSrc).toMatch(/uSourceFlowTransportNormalMix:\s*\{\s*value:\s*anim\.sourceFlowTransport\.normalMix\s*\}/);
    expect(rendererSrc).toMatch(/uSourceFlowTransportEdgePreserve:\s*\{\s*value:\s*anim\.sourceFlowTransport\.edgePreserve\s*\}/);
    expect(rendererSrc).toMatch(/uSourceFlowTransportColorAmount:\s*\{\s*value:\s*anim\.sourceFlowTransport\.colorAmount\s*\}/);
  });
});

describe("layered-psychedelic.ts — source-aligned stream flow", () => {
  it("binds every sourceStreamFlow control and disables it without a source field", () => {
    expect(rendererSrc).toMatch(/uSourceStreamFlowAmount:\s*\{\s*value:\s*anim\.flowField\s*===\s*undefined\s*\?\s*0\s*:\s*anim\.sourceStreamFlow\.amount\s*\}/);
    expect(rendererSrc).toMatch(/uSourceStreamFlowMaxDisplacementPx:\s*\{\s*value:\s*anim\.sourceStreamFlow\.maxDisplacementPx\s*\}/);
    expect(rendererSrc).toMatch(/uSourceStreamFlowCycles:\s*\{\s*value:\s*anim\.sourceStreamFlow\.cycles\s*\}/);
    expect(rendererSrc).toMatch(/uSourceStreamFlowWavelengthPx:\s*\{\s*value:\s*anim\.sourceStreamFlow\.wavelengthPx\s*\}/);
    expect(rendererSrc).toMatch(/uSourceStreamFlowEdgePreserve:\s*\{\s*value:\s*anim\.sourceStreamFlow\.edgePreserve\s*\}/);
    expect(rendererSrc).toMatch(/uSourceStreamFlowNormalMix:\s*\{\s*value:\s*anim\.sourceStreamFlow\.normalMix\s*\}/);
    expect(rendererSrc).toMatch(/uSourceStreamFlowMaterialMaskMix:\s*\{\s*value:\s*anim\.sourceStreamFlow\.materialMaskMix\s*\}/);
    expect(rendererSrc).toContain("uSourceStreamFlowStreamTex: { value: streamTexture }");
    expect(rendererSrc).toMatch(/uSourceStreamFlowStreamPhase:\s*\{\s*value:\s*anim\.sourceStreamFlow\.streamPhase\s*&&\s*anim\.streamField\s*!==\s*undefined\s*\?\s*1\s*:\s*0\s*\}/);
  });

  it("loads source vector fields without mipmaps so opposite axes cannot average into a new direction", () => {
    expect(rendererSrc).toMatch(/texture\.generateMipmaps\s*=\s*false/);
    expect(rendererSrc).toMatch(/texture\.minFilter\s*=\s*THREE\.LinearFilter/);
    expect(rendererSrc).toMatch(/texture\.magFilter\s*=\s*THREE\.LinearFilter/);
  });
});

describe("layered-psychedelic.ts — source-only material dissolve", () => {
  it("binds every sourceMaterialDissolve control and disables it without a source field", () => {
    expect(rendererSrc).toMatch(/uSourceMaterialDissolveAmount:\s*\{\s*value:\s*anim\.flowField\s*===\s*undefined\s*\?\s*0\s*:\s*anim\.sourceMaterialDissolve\.amount\s*\}/);
    expect(rendererSrc).toMatch(/uSourceMaterialDissolveMaxDisplacementPx:\s*\{\s*value:\s*anim\.sourceMaterialDissolve\.maxDisplacementPx\s*\}/);
    expect(rendererSrc).toMatch(/uSourceMaterialDissolveCycles:\s*\{\s*value:\s*anim\.sourceMaterialDissolve\.cycles\s*\}/);
    expect(rendererSrc).toMatch(/uSourceMaterialDissolveWavelengthPx:\s*\{\s*value:\s*anim\.sourceMaterialDissolve\.wavelengthPx\s*\}/);
    expect(rendererSrc).toMatch(/uSourceMaterialDissolveEdgePreserve:\s*\{\s*value:\s*anim\.sourceMaterialDissolve\.edgePreserve\s*\}/);
    expect(rendererSrc).toContain("uSourceMaterialDissolveStreamTex: { value: streamTexture }");
    expect(rendererSrc).toMatch(/uSourceMaterialDissolveStreamPhase:\s*\{\s*value:\s*anim\.sourceMaterialDissolve\.streamPhase\s*&&\s*anim\.streamField\s*!==\s*undefined\s*\?\s*1\s*:\s*0\s*\}/);
  });
});

describe("layered-psychedelic.ts — source detail residual flow", () => {
  it("binds source detail residual-flow controls and disables it without its source-derived flow field", () => {
    expect(rendererSrc).toMatch(/uSourceDetailResidualFlowAmount:\s*\{\s*value:\s*anim\.flowField\s*===\s*undefined\s*\?\s*0\s*:\s*anim\.sourceDetailResidualFlow\.amount\s*\}/);
    expect(rendererSrc).toMatch(/uSourceDetailResidualFlowMaxDisplacementPx:\s*\{\s*value:\s*anim\.sourceDetailResidualFlow\.maxDisplacementPx\s*\}/);
    expect(rendererSrc).toMatch(/uSourceDetailResidualFlowCycles:\s*\{\s*value:\s*anim\.sourceDetailResidualFlow\.cycles\s*\}/);
    expect(rendererSrc).toMatch(/uSourceDetailResidualFlowBandLimitPx:\s*\{\s*value:\s*anim\.sourceDetailResidualFlow\.bandLimitPx\s*\}/);
    expect(rendererSrc).toMatch(/uSourceDetailResidualFlowEdgePreserve:\s*\{\s*value:\s*anim\.sourceDetailResidualFlow\.edgePreserve\s*\}/);
    expect(rendererSrc).toMatch(/uSourceDetailResidualFlowChromaOnly:\s*\{\s*value:\s*anim\.sourceDetailResidualFlow\.chromaOnly\s*\?\s*1\s*:\s*0\s*\}/);
    expect(rendererSrc).toMatch(/uSourceDetailResidualFlowStreamPhase:\s*\{\s*value:\s*anim\.sourceDetailResidualFlow\.streamPhase\s*&&\s*anim\.streamField\s*!==\s*undefined\s*\?\s*1\s*:\s*0\s*\}/);
  });
});

describe("layered-psychedelic.ts — source-derived chroma flow", () => {
  it("binds every sourceChromaFlow control to a shader uniform", () => {
    expect(rendererSrc).toMatch(/uSourceChromaFlowAmount:\s*\{\s*value:\s*anim\.sourceChromaFlow\.amount\s*\}/);
    expect(rendererSrc).toMatch(/uSourceChromaFlowMaxDisplacementPx:\s*\{\s*value:\s*anim\.sourceChromaFlow\.maxDisplacementPx\s*\}/);
    expect(rendererSrc).toMatch(/uSourceChromaFlowCycles:\s*\{\s*value:\s*anim\.sourceChromaFlow\.cycles\s*\}/);
    expect(rendererSrc).toMatch(/uSourceChromaFlowPhaseScale:\s*\{\s*value:\s*anim\.sourceChromaFlow\.phaseScale\s*\}/);
    expect(rendererSrc).toMatch(/uSourceChromaFlowNormalMix:\s*\{\s*value:\s*anim\.sourceChromaFlow\.normalMix\s*\}/);
    expect(rendererSrc).toMatch(/uSourceChromaFlowDetailGain:\s*\{\s*value:\s*anim\.sourceChromaFlow\.detailGain\s*\}/);
  });
});

describe("layered-psychedelic.ts — source-derived spectral flow", () => {
  it("binds every sourceSpectralFlow control to a shader uniform", () => {
    expect(rendererSrc).toMatch(/uSourceSpectralFlowAmount:\s*\{\s*value:\s*anim\.sourceSpectralFlow\.amount\s*\}/);
    expect(rendererSrc).toMatch(/uSourceSpectralFlowRadiusPx:\s*\{\s*value:\s*anim\.sourceSpectralFlow\.radiusPx\s*\}/);
    expect(rendererSrc).toMatch(/uSourceSpectralFlowCycles:\s*\{\s*value:\s*anim\.sourceSpectralFlow\.cycles\s*\}/);
    expect(rendererSrc).toMatch(/uSourceSpectralFlowPhaseScale:\s*\{\s*value:\s*anim\.sourceSpectralFlow\.phaseScale\s*\}/);
    expect(rendererSrc).toMatch(/uSourceSpectralFlowNormalMix:\s*\{\s*value:\s*anim\.sourceSpectralFlow\.normalMix\s*\}/);
  });
});

describe("layered-psychedelic.ts — in-place source prism", () => {
  it("binds every sourcePrism control to a shader uniform", () => {
    expect(rendererSrc).toMatch(/uSourcePrismAmount:\s*\{\s*value:\s*anim\.sourcePrism\.amount\s*\}/);
    expect(rendererSrc).toMatch(/uSourcePrismRadiusPx:\s*\{\s*value:\s*anim\.sourcePrism\.radiusPx\s*\}/);
    expect(rendererSrc).toMatch(/uSourcePrismDirectionCycles:\s*\{\s*value:\s*anim\.sourcePrism\.directionCycles\s*\}/);
    expect(rendererSrc).toMatch(/uSourcePrismChromaCycles:\s*\{\s*value:\s*anim\.sourcePrism\.chromaCycles\s*\}/);
    expect(rendererSrc).toMatch(/uSourcePrismSurfaceCycles:\s*\{\s*value:\s*anim\.sourcePrism\.surfaceCycles\s*\}/);
    expect(rendererSrc).toMatch(/uSourcePrismPhaseFlowPx:\s*\{\s*value:\s*anim\.sourcePrism\.phaseFlowPx\s*\}/);
    expect(rendererSrc).toMatch(/uSourcePrismPhaseFlowCycles:\s*\{\s*value:\s*anim\.sourcePrism\.phaseFlowCycles\s*\}/);
    expect(rendererSrc).toMatch(/uSourcePrismPhaseMix:\s*\{\s*value:\s*anim\.sourcePrism\.phaseMix\s*\}/);
    expect(rendererSrc).toMatch(/uSourcePrismDetailBoost:\s*\{\s*value:\s*anim\.sourcePrism\.detailBoost\s*\}/);
    expect(rendererSrc).toMatch(/uSourcePrismPhaseScale:\s*\{\s*value:\s*anim\.sourcePrism\.phaseScale\s*\}/);
  });
});

describe("layered-psychedelic.ts — source-region-affinity transport", () => {
  it("loads the source-derived region field and binds the coordinate-transport controls", () => {
    expect(rendererSrc).toMatch(/l\.animation\.regionField/);
    expect(rendererSrc).toContain("uSourceRegionAffinityTex: { value: regionTexture }");
    expect(rendererSrc).toMatch(/uSourceRegionAffinityAmount:\s*\{\s*value:/);
    expect(rendererSrc).toMatch(/anim\.sourceRegionAffinity\.maxDisplacementPx/);
    expect(rendererSrc).toMatch(/anim\.sourceRegionAffinity\.cycles/);
    expect(rendererSrc).toMatch(/anim\.sourceRegionAffinity\.edgePreserve/);
    expect(rendererSrc).toMatch(/anim\.sourceRegionAffinity\.normalMix/);
    expect(rendererSrc).toMatch(/anim\.sourceRegionAffinity\.streamPhase/);
  });
});
