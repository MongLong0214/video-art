import { describe, it, expect } from "vitest";
import { sceneSchema, getValidPeriods, layerRoleSchema } from "./scene-schema";
import type { LayerRole } from "./scene-schema";

const validScene = {
  version: 1,
  source: "test.png",
  resolution: [1080, 1080] as [number, number],
  duration: 10,
  fps: 30,
  layers: [
    {
      id: "bg",
      file: "layers/layer-0.png",
      zIndex: 0,
      animation: {
        colorCycle: { speed: 1.0, period: 10 },
      },
    },
  ],
};

describe("getValidPeriods", () => {
  it("getValidPeriods(10) returns [1,2,5,10]", () => {
    expect(getValidPeriods(10)).toEqual([1, 2, 5, 10]);
  });

  it("getValidPeriods(20) returns [1,2,4,5,10,20]", () => {
    expect(getValidPeriods(20)).toEqual([1, 2, 4, 5, 10, 20]);
  });

  it("getValidPeriods(1) returns [1]", () => {
    expect(getValidPeriods(1)).toEqual([1]);
  });

  it("getValidPeriods(60) returns 12 divisors", () => {
    expect(getValidPeriods(60)).toHaveLength(12);
  });
});

describe("sceneSchema", () => {
  it("should accept a valid scene config", () => {
    const result = sceneSchema.safeParse(validScene);
    expect(result.success).toBe(true);
  });

  it("should reject invalid version", () => {
    const result = sceneSchema.safeParse({ ...validScene, version: 2 });
    expect(result.success).toBe(false);
  });

  it("should have default duration of 20", () => {
    const { duration: _, ...rest } = validScene;
    const result = sceneSchema.parse(rest);
    expect(result.duration).toBe(20);
  });

  it("should reject duration > 300", () => {
    const result = sceneSchema.safeParse({ ...validScene, duration: 301 });
    expect(result.success).toBe(false);
  });

  it("should accept duration 300", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      duration: 300,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            colorCycle: { speed: 1.0, period: 300 },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should accept duration 0.5 (min boundary)", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      duration: 1,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            colorCycle: { speed: 1.0, period: 1 },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should reject non-integer duration", () => {
    const result = sceneSchema.safeParse({ ...validScene, duration: 7.5 });
    expect(result.success).toBe(false);
  });

  it("should accept valid periods for duration=10: 1,2,5,10", () => {
    for (const period of [1, 2, 5, 10]) {
      const result = sceneSchema.safeParse({
        ...validScene,
        layers: [
          {
            ...validScene.layers[0],
            animation: {
              colorCycle: { speed: 1.0, period },
            },
          },
        ],
      });
      expect(result.success).toBe(true);
    }
  });

  it("should reject period=4 for duration=10", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            colorCycle: { speed: 1.0, period: 4 },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should reject period=20 for duration=10", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            colorCycle: { speed: 1.0, period: 20 },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should accept period=4 for duration=20", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      duration: 20,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            colorCycle: { speed: 1.0, period: 4 },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should have default saturationBoost of 2.5", () => {
    const result = sceneSchema.parse(validScene);
    expect(result.layers[0].animation.saturationBoost).toBe(2.5);
  });

  it("should have default luminanceKey of 0.6", () => {
    const result = sceneSchema.parse(validScene);
    expect(result.layers[0].animation.luminanceKey).toBe(0.6);
  });

  it("defaults hue rotation safety fields to legacy HSV behavior", () => {
    const result = sceneSchema.parse(validScene);
    expect(result.layers[0].animation.hueSpace).toBe("hsv");
    expect(result.layers[0].animation.greenCompress).toBe(0);
  });

  it("defaults glowWave to an inert legacy-compatible object", () => {
    const result = sceneSchema.parse(validScene);
    expect(result.layers[0].animation.glowWave).toEqual({
      strength: 0,
      speed: 0,
      sharpness: 0.5,
      fieldCycles: 1,
    });
    expect(result.layers[0].animation.glowWave2).toEqual({
      strength: 0,
      speed: 0,
      sharpness: 0.5,
      fieldCycles: 1,
    });
    expect(result.layers[0].animation.phaseWarpAmount).toBe(0);
    expect(result.layers[0].animation.glowWavePhaseSource).toBe("phaseField");
    expect(result.layers[0].animation.colorCycleDesync).toEqual({
      amount: 0,
      cycles: 1,
    });
    expect(result.layers[0].animation.adaptiveFlow).toEqual({
      strength: 0,
      scale: 3,
      cycles: 1,
      luminanceWeight: 0,
      saturationWeight: 0,
      edgeWeight: 0,
      maxDisplacementPx: 4,
      edgePreserve: 1,
    });
    expect(result.layers[0].animation.sourceColorClamp).toEqual({
      maxDrift: 1,
    });
    expect(result.layers[0].animation.colorMotionMask).toEqual({
      floor: 1,
      luminanceWeight: 0,
      saturationWeight: 0,
      edgeWeight: 0,
      power: 1,
    });
    expect(result.layers[0].animation.chromaOrbit).toEqual({
      radius: 0,
      speed: 0,
      phaseScale: 1,
    });
    expect(result.layers[0].animation.sourcePrism).toEqual({
      amount: 0,
      radiusPx: 0,
      directionCycles: 0,
      chromaCycles: 0,
      surfaceCycles: 0,
      phaseFlowPx: 0,
      phaseFlowCycles: 0,
      phaseMix: 0,
      detailBoost: 1,
      phaseScale: 0,
    });
    expect(result.layers[0].animation.tangentMicroflow).toEqual({
      amount: 0,
      maxDisplacementPx: 0,
      cycles: 1,
      phaseScale: 1,
    });
    expect(result.layers[0].animation.sourceFlowAdvection).toEqual({
      amount: 0,
      maxDisplacementPx: 0,
      cycles: 1,
      phaseScale: 1,
      normalMix: 0.35,
      edgePreserve: 1,
      detailGain: 1,
    });
    expect(result.layers[0].animation.sourceFlowTransport).toEqual({
      amount: 0,
      macroDisplacementPx: 0,
      macroCycles: 1,
      microDisplacementPx: 0,
      microCycles: 1,
      phaseScale: 1,
      normalMix: 0.35,
      edgePreserve: 1,
      colorAmount: 0,
    });
    expect(result.layers[0].animation.sourceStreamFlow).toEqual({
      amount: 0,
      maxDisplacementPx: 0,
      cycles: 1,
      wavelengthPx: 64,
      edgePreserve: 1,
      streamPhase: false,
      normalMix: 0,
      materialMaskMix: 0,
    });
    expect(result.layers[0].animation.sourceMaterialDissolve).toEqual({
      amount: 0,
      maxDisplacementPx: 0,
      cycles: 1,
      wavelengthPx: 64,
      edgePreserve: 1,
      streamPhase: false,
    });
    expect(result.layers[0].animation.sourceDetailResidualFlow).toEqual({
      amount: 0,
      maxDisplacementPx: 0,
      cycles: 1,
      bandLimitPx: 24,
      edgePreserve: 1,
      chromaOnly: false,
      streamPhase: false,
    });
    expect(result.layers[0].animation.sourceRegionAffinity).toEqual({
      amount: 0,
      maxDisplacementPx: 0,
      cycles: 1,
      edgePreserve: 1,
      normalMix: 0.5,
      streamPhase: false,
    });
    expect(result.layers[0].animation.sourceChromaFlow).toEqual({
      amount: 0,
      maxDisplacementPx: 0,
      cycles: 1,
      phaseScale: 1,
      normalMix: 0,
      detailGain: 1,
    });
    expect(result.layers[0].animation.sourceSpectralFlow).toEqual({
      amount: 0,
      radiusPx: 0,
      cycles: 1,
      phaseScale: 1,
      normalMix: 0,
    });
  });

  it("accepts D-3-6 glowWave bounds", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            glowWave: { strength: 0.45, speed: 8, sharpness: 0.6, fieldCycles: 1.25 },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts source-adaptive in-place flow bounds", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            adaptiveFlow: {
              strength: 0.95,
              scale: 12,
              cycles: 6,
              luminanceWeight: 0.2,
              saturationWeight: 0.45,
              edgeWeight: 0.35,
              maxDisplacementPx: 8,
              edgePreserve: 0.85,
            },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts source-derived tangent microflow bounds", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            tangentMicroflow: {
              amount: 0.88,
              maxDisplacementPx: 0.95,
              cycles: 24,
              phaseScale: 3.2,
            },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts bounded source-flow advection controls", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            sourceFlowAdvection: {
              amount: 0.92,
              maxDisplacementPx: 48,
              cycles: 12,
              phaseScale: 3.2,
              normalMix: 0.4,
              edgePreserve: 1,
              detailGain: 4,
            },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.layers[0].animation.sourceFlowAdvection).toMatchObject({ detailGain: 4 });
    }
  });

  it("accepts source-aligned stream-flow controls", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            flowField: "layers/flow-field.png",
            sourceStreamFlow: {
              amount: 0.9,
              maxDisplacementPx: 24,
              cycles: 12,
              wavelengthPx: 72,
              edgePreserve: 1,
              streamPhase: true,
              normalMix: 1,
              materialMaskMix: 1,
            },
            streamField: "layers/stream-field.png",
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts source-only material dissolve controls", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            flowField: "layers/flow-field.png",
            sourceMaterialDissolve: {
              amount: 1,
              maxDisplacementPx: 20,
              cycles: 16,
              wavelengthPx: 80,
              edgePreserve: 1,
            },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts source-only detail residual-flow controls", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            phaseField: "layers/phase-luminance.png",
            flowField: "layers/flow-field.png",
            sourceDetailResidualFlow: {
              amount: 1,
              maxDisplacementPx: 20,
              cycles: 18,
              bandLimitPx: 64,
              edgePreserve: 1,
              chromaOnly: true,
            },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts region-affinity transport only with source-derived region, flow, and stream fields", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            flowField: "layers/flow-field.png",
            streamField: "layers/stream-field.png",
            regionField: "layers/region-affinity-field.png",
            sourceRegionAffinity: {
              amount: 1,
              maxDisplacementPx: 20,
              cycles: 14,
              edgePreserve: 1,
              normalMix: 0.5,
              streamPhase: true,
            },
          },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("accepts source-derived chroma-flow bounds", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            sourceChromaFlow: {
              amount: 0.82,
              maxDisplacementPx: 6.5,
              cycles: 12,
              phaseScale: 1.8,
              normalMix: 0.4,
              detailGain: 4.2,
            },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts source-derived spectral-flow bounds", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            sourceSpectralFlow: {
              amount: 0.9,
              radiusPx: 9.5,
              cycles: 22,
              phaseScale: 2.4,
              normalMix: 0.3,
            },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts bounded source color clamp values", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            sourceColorClamp: {
              maxDrift: 0.16,
            },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a source-derived color motion mask", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            colorMotionMask: {
              floor: 0.04,
              luminanceWeight: 0.1,
              saturationWeight: 0.25,
              edgeWeight: 1,
              power: 0.8,
            },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a loop-safe source chroma orbit", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            chromaOrbit: {
              radius: 0.09,
              speed: 53,
              phaseScale: 2.4,
            },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts loop-safe in-place source prism controls", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            sourcePrism: {
              amount: 0.85,
              radiusPx: 2.4,
              directionCycles: 7,
              chromaCycles: 47,
              surfaceCycles: 31,
              phaseFlowPx: 18,
              phaseFlowCycles: 7,
              phaseMix: 0.3,
              detailBoost: 2.2,
              phaseScale: 5.5,
            },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects source-adaptive flow values outside bounded in-place ranges", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            adaptiveFlow: {
              strength: 1.2,
              scale: 24,
              cycles: 1.5,
              luminanceWeight: 1.2,
              saturationWeight: -0.1,
              edgeWeight: 0.5,
              maxDisplacementPx: 24,
              edgePreserve: 1.2,
            },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects tangent microflow values outside bounded in-place ranges", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            tangentMicroflow: {
              amount: 1.1,
              maxDisplacementPx: 5.1,
              cycles: 49,
              phaseScale: 8.1,
            },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it.each([
    ["amount", { amount: 1.1, maxDisplacementPx: 64, cycles: 24, phaseScale: 8, normalMix: 1, edgePreserve: 1 }],
    ["maxDisplacementPx", { amount: 1, maxDisplacementPx: 64.1, cycles: 24, phaseScale: 8, normalMix: 1, edgePreserve: 1 }],
    ["cycles", { amount: 1, maxDisplacementPx: 64, cycles: 25, phaseScale: 8, normalMix: 1, edgePreserve: 1 }],
    ["phaseScale", { amount: 1, maxDisplacementPx: 64, cycles: 24, phaseScale: 8.1, normalMix: 1, edgePreserve: 1 }],
    ["normalMix", { amount: 1, maxDisplacementPx: 64, cycles: 24, phaseScale: 8, normalMix: 1.1, edgePreserve: 1 }],
    ["edgePreserve", { amount: 1, maxDisplacementPx: 64, cycles: 24, phaseScale: 8, normalMix: 1, edgePreserve: 1.1 }],
    ["detailGain", { amount: 1, maxDisplacementPx: 64, cycles: 24, phaseScale: 8, normalMix: 1, edgePreserve: 1, detailGain: 6.1 }],
  ])("rejects an out-of-range source-flow advection %s", (_field, sourceFlowAdvection) => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            sourceFlowAdvection,
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it.each([
    ["amount", { amount: 1.1, macroDisplacementPx: 96, macroCycles: 8, microDisplacementPx: 24, microCycles: 48, phaseScale: 8, normalMix: 1, edgePreserve: 1, colorAmount: 1 }],
    ["macroDisplacementPx", { amount: 1, macroDisplacementPx: 96.1, macroCycles: 8, microDisplacementPx: 24, microCycles: 48, phaseScale: 8, normalMix: 1, edgePreserve: 1, colorAmount: 1 }],
    ["macroCycles", { amount: 1, macroDisplacementPx: 96, macroCycles: 9, microDisplacementPx: 24, microCycles: 48, phaseScale: 8, normalMix: 1, edgePreserve: 1, colorAmount: 1 }],
    ["microDisplacementPx", { amount: 1, macroDisplacementPx: 96, macroCycles: 8, microDisplacementPx: 24.1, microCycles: 48, phaseScale: 8, normalMix: 1, edgePreserve: 1, colorAmount: 1 }],
    ["microCycles", { amount: 1, macroDisplacementPx: 96, macroCycles: 8, microDisplacementPx: 24, microCycles: 49, phaseScale: 8, normalMix: 1, edgePreserve: 1, colorAmount: 1 }],
    ["phaseScale", { amount: 1, macroDisplacementPx: 96, macroCycles: 8, microDisplacementPx: 24, microCycles: 48, phaseScale: 8.1, normalMix: 1, edgePreserve: 1, colorAmount: 1 }],
    ["normalMix", { amount: 1, macroDisplacementPx: 96, macroCycles: 8, microDisplacementPx: 24, microCycles: 48, phaseScale: 8, normalMix: 1.1, edgePreserve: 1, colorAmount: 1 }],
    ["edgePreserve", { amount: 1, macroDisplacementPx: 96, macroCycles: 8, microDisplacementPx: 24, microCycles: 48, phaseScale: 8, normalMix: 1, edgePreserve: 1.1, colorAmount: 1 }],
    ["colorAmount", { amount: 1, macroDisplacementPx: 96, macroCycles: 8, microDisplacementPx: 24, microCycles: 48, phaseScale: 8, normalMix: 1, edgePreserve: 1, colorAmount: 1.1 }],
  ])("rejects an out-of-range source-flow transport %s", (_field, sourceFlowTransport) => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            flowField: "layers/flow-field.png",
            sourceFlowTransport,
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects active source-flow transport without a source-derived flow field", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            sourceFlowTransport: {
              amount: 1,
              macroDisplacementPx: 32,
              macroCycles: 3,
              microDisplacementPx: 0,
              microCycles: 1,
              phaseScale: 1,
              normalMix: 0.5,
              edgePreserve: 1,
              colorAmount: 0,
            },
          },
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(expect.objectContaining({
        path: ["layers", 0, "animation", "flowField"],
      }));
    }
  });

  it.each([
    ["amount", { amount: 1.1, maxDisplacementPx: 48, cycles: 24, wavelengthPx: 64, edgePreserve: 1 }],
    ["maxDisplacementPx", { amount: 1, maxDisplacementPx: 48.1, cycles: 24, wavelengthPx: 64, edgePreserve: 1 }],
    ["cycles", { amount: 1, maxDisplacementPx: 48, cycles: 25, wavelengthPx: 64, edgePreserve: 1 }],
    ["wavelengthPx", { amount: 1, maxDisplacementPx: 48, cycles: 24, wavelengthPx: 7.9, edgePreserve: 1 }],
    ["edgePreserve", { amount: 1, maxDisplacementPx: 48, cycles: 24, wavelengthPx: 64, edgePreserve: 1.1 }],
    ["normalMix", { amount: 1, maxDisplacementPx: 48, cycles: 24, wavelengthPx: 64, edgePreserve: 1, normalMix: 1.1 }],
    ["materialMaskMix", { amount: 1, maxDisplacementPx: 48, cycles: 24, wavelengthPx: 64, edgePreserve: 1, materialMaskMix: 1.1 }],
  ])("rejects an out-of-range source stream-flow %s", (_field, sourceStreamFlow) => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            flowField: "layers/flow-field.png",
            sourceStreamFlow,
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects active source stream-flow without a source-derived flow field", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            sourceStreamFlow: {
              amount: 1,
              maxDisplacementPx: 24,
              cycles: 12,
              wavelengthPx: 72,
              edgePreserve: 1,
            },
          },
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(expect.objectContaining({
        path: ["layers", 0, "animation", "flowField"],
      }));
    }
  });

  it("rejects an integrated source stream-flow without a source-derived stream field", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            flowField: "layers/flow-field.png",
            sourceStreamFlow: {
              amount: 1,
              maxDisplacementPx: 24,
              cycles: 12,
              wavelengthPx: 72,
              edgePreserve: 1,
              streamPhase: true,
            },
          },
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(expect.objectContaining({
        path: ["layers", 0, "animation", "streamField"],
      }));
    }
  });

  it.each([
    ["amount", { amount: 1.1, maxDisplacementPx: 24, cycles: 16, wavelengthPx: 80, edgePreserve: 1 }],
    ["maxDisplacementPx", { amount: 1, maxDisplacementPx: 32.1, cycles: 16, wavelengthPx: 80, edgePreserve: 1 }],
    ["cycles", { amount: 1, maxDisplacementPx: 24, cycles: 25, wavelengthPx: 80, edgePreserve: 1 }],
    ["wavelengthPx", { amount: 1, maxDisplacementPx: 24, cycles: 16, wavelengthPx: 7.9, edgePreserve: 1 }],
    ["edgePreserve", { amount: 1, maxDisplacementPx: 24, cycles: 16, wavelengthPx: 80, edgePreserve: 1.1 }],
  ])("rejects an out-of-range source material dissolve %s", (_field, sourceMaterialDissolve) => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            flowField: "layers/flow-field.png",
            sourceMaterialDissolve,
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects active source material dissolve without a source-derived flow field", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            sourceMaterialDissolve: {
              amount: 1,
              maxDisplacementPx: 20,
              cycles: 16,
              wavelengthPx: 80,
              edgePreserve: 1,
            },
          },
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(expect.objectContaining({
        path: ["layers", 0, "animation", "flowField"],
      }));
    }
  });

  it("requires a source-derived stream phase only when source material dissolve enables it", () => {
    const missingStreamPhase = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            flowField: "layers/flow-field.png",
            sourceMaterialDissolve: {
              amount: 1,
              maxDisplacementPx: 24,
              cycles: 18,
              wavelengthPx: 96,
              edgePreserve: 1,
              streamPhase: true,
            },
          },
        },
      ],
    });

    expect(missingStreamPhase.success).toBe(false);
    if (!missingStreamPhase.success) {
      expect(missingStreamPhase.error.issues).toContainEqual(expect.objectContaining({
        path: ["layers", 0, "animation", "streamField"],
      }));
    }

    const withStreamPhase = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            flowField: "layers/flow-field.png",
            streamField: "layers/stream-field.png",
            sourceMaterialDissolve: {
              amount: 1,
              maxDisplacementPx: 24,
              cycles: 18,
              wavelengthPx: 96,
              edgePreserve: 1,
              streamPhase: true,
            },
          },
        },
      ],
    });

    expect(withStreamPhase.success).toBe(true);
  });

  it.each([
    ["amount", { amount: 1.1, maxDisplacementPx: 20, cycles: 18, edgePreserve: 1 }],
    ["maxDisplacementPx", { amount: 1, maxDisplacementPx: 32.1, cycles: 18, edgePreserve: 1 }],
    ["cycles", { amount: 1, maxDisplacementPx: 20, cycles: 25, edgePreserve: 1 }],
    ["bandLimitPx", { amount: 1, maxDisplacementPx: 20, cycles: 18, bandLimitPx: 96.1, edgePreserve: 1 }],
    ["edgePreserve", { amount: 1, maxDisplacementPx: 20, cycles: 18, edgePreserve: 1.1 }],
  ])("rejects an out-of-range source detail residual-flow %s", (_field, sourceDetailResidualFlow) => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            phaseField: "layers/phase-luminance.png",
            flowField: "layers/flow-field.png",
            sourceDetailResidualFlow,
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts active source detail residual-flow with only its source-derived flow field", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            flowField: "layers/flow-field.png",
            sourceDetailResidualFlow: {
              amount: 1,
              maxDisplacementPx: 20,
              cycles: 18,
              edgePreserve: 1,
            },
          },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("requires a source-derived stream phase only when source detail residual-flow enables it", () => {
    const missingStreamPhase = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            flowField: "layers/flow-field.png",
            sourceDetailResidualFlow: {
              amount: 1,
              maxDisplacementPx: 20,
              cycles: 18,
              edgePreserve: 1,
              streamPhase: true,
            },
          },
        },
      ],
    });

    expect(missingStreamPhase.success).toBe(false);
    if (!missingStreamPhase.success) {
      expect(missingStreamPhase.error.issues).toContainEqual(expect.objectContaining({
        path: ["layers", 0, "animation", "streamField"],
      }));
    }

    const withStreamPhase = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            flowField: "layers/flow-field.png",
            streamField: "layers/stream-field.png",
            sourceDetailResidualFlow: {
              amount: 1,
              maxDisplacementPx: 20,
              cycles: 18,
              edgePreserve: 1,
              streamPhase: true,
            },
          },
        },
      ],
    });

    expect(withStreamPhase.success).toBe(true);
  });

  it("rejects active source detail residual-flow without a source-derived flow field", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            sourceDetailResidualFlow: {
              amount: 1,
              maxDisplacementPx: 20,
              cycles: 18,
              edgePreserve: 1,
            },
          },
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(expect.objectContaining({
        path: ["layers", 0, "animation", "flowField"],
      }));
    }
  });

  it("rejects source chroma-flow values outside bounded source ranges", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            sourceChromaFlow: {
              amount: 1.1,
              maxDisplacementPx: 8.1,
              cycles: 49,
              phaseScale: 8.1,
              normalMix: 1.1,
              detailGain: 6.1,
            },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects source spectral-flow values outside bounded source ranges", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            sourceSpectralFlow: {
              amount: 1.1,
              radiusPx: 24.1,
              cycles: 49,
              phaseScale: 8.1,
              normalMix: 1.1,
            },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects source color clamp values outside RGB drift range", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            sourceColorClamp: {
              maxDrift: 1.2,
            },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects color motion mask values outside bounded source feature ranges", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            colorMotionMask: {
              floor: -0.1,
              luminanceWeight: 1.1,
              saturationWeight: 0.2,
              edgeWeight: 0.8,
              power: 5,
            },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-looping or excessive source chroma orbit values", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            chromaOrbit: {
              radius: 0.3,
              speed: 20.5,
              phaseScale: 10,
            },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-looping or excessive source prism values", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            sourcePrism: {
              amount: 1.1,
              radiusPx: 7,
              directionCycles: 4.5,
              chromaCycles: 121,
              surfaceCycles: 20.5,
              phaseFlowPx: 65,
              phaseFlowCycles: 4.5,
              phaseMix: 1.1,
              detailBoost: 5,
              phaseScale: 13,
            },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts r18 second glow wave and warped phase-field sampling fields", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            phaseField2: "layers/phase-angular.png",
            phaseWarpAmount: 0.8,
            glowWave2: { strength: 0.55, speed: -5, sharpness: 0.7, fieldCycles: 3.25 },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts r21 flow-field glow phase and color-cycle desync fields", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            flowField: "layers/flow-field.png",
            glowWavePhaseSource: "flowField",
            colorCycleDesync: { amount: 0.08, cycles: 2 },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects glowWave values outside D-3-6 ranges", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            glowWave: { strength: 1.2, speed: 8, sharpness: 0.6, fieldCycles: 2.5 },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects r21 desync values that cannot stay bounded and integer-periodic", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            glowWavePhaseSource: "flowField",
            colorCycleDesync: { amount: 0.4, cycles: 1.5 },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects r18 experimental wave values outside safe ranges", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            phaseField2: "layers/phase-angular.jpg",
            phaseWarpAmount: 2.5,
            glowWave2: { strength: 1.2, speed: 4, sharpness: 0.5, fieldCycles: 4.5 },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });


  it("accepts OKLCH hue rotation with green compression", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            hueSpace: "oklch",
            greenCompress: 0.7,
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should have default phaseOffset of 0", () => {
    const result = sceneSchema.parse(validScene);
    expect(result.layers[0].animation.colorCycle?.phaseOffset).toBe(0);
  });

  it("should accept saturationBoost range 0-10", () => {
    for (const val of [0, 5, 10]) {
      const result = sceneSchema.safeParse({
        ...validScene,
        layers: [
          {
            ...validScene.layers[0],
            animation: {
              ...validScene.layers[0].animation,
              saturationBoost: val,
            },
          },
        ],
      });
      expect(result.success).toBe(true);
    }
  });

  it("should accept saturationBoost=0 (grayscale)", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            saturationBoost: 0,
          },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.layers[0].animation.saturationBoost).toBe(0);
    }
  });

  it("should reject saturationBoost > 10", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            saturationBoost: 11,
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should reject luminanceKey > 1", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            luminanceKey: 1.5,
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should reject phaseOffset > 360", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            colorCycle: { speed: 1.0, period: 10, phaseOffset: 400 },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative phaseOffset", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            colorCycle: { speed: 1.0, period: 10, phaseOffset: -90 },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should accept duration=1 with period=1", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      duration: 1,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            colorCycle: { speed: 1.0, period: 1 },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should accept luminanceKey range 0-1", () => {
    for (const val of [0, 0.5, 1]) {
      const result = sceneSchema.safeParse({
        ...validScene,
        layers: [
          {
            ...validScene.layers[0],
            animation: {
              ...validScene.layers[0].animation,
              luminanceKey: val,
            },
          },
        ],
      });
      expect(result.success).toBe(true);
    }
  });

  it("should parse existing scene.json without new fields", () => {
    const oldScene = {
      version: 1,
      source: "test.png",
      resolution: [1080, 1080],
      duration: 10,
      layers: [
        {
          id: "bg",
          file: "layers/layer-0.png",
          zIndex: 0,
          animation: {
            colorCycle: { speed: 1.0, period: 10 },
          },
        },
      ],
    };
    const result = sceneSchema.safeParse(oldScene);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.layers[0].animation.saturationBoost).toBe(2.5);
      expect(result.data.layers[0].animation.luminanceKey).toBe(0.6);
    }
  });

  it("should guarantee luminanceKey=0 means uniform shift", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            luminanceKey: 0,
          },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.layers[0].animation.luminanceKey).toBe(0);
    }
  });

  it("should have dynamic period error message", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            colorCycle: { speed: 1.0, period: 3 },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const periodIssue = result.error.issues.find((i: { message: string }) =>
        i.message.includes("Period must be a divisor")
      );
      expect(periodIssue).toBeDefined();
      if (!periodIssue) throw new Error("Expected dynamic period issue");
      expect(periodIssue.message).toContain("divisor of 10");
    }
  });

  it("should accept speed=0", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            colorCycle: { speed: 0, period: 10 },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should preserve schema version 1", () => {
    const result = sceneSchema.parse(validScene);
    expect(result.version).toBe(1);
  });

  it("should reject negative opacity", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [{ ...validScene.layers[0], opacity: -0.5 }],
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty layers array", () => {
    const result = sceneSchema.safeParse({ ...validScene, layers: [] });
    expect(result.success).toBe(false);
  });

  it("should apply default effects when omitted", () => {
    const result = sceneSchema.parse(validScene);
    expect(result.effects.bloom.strength).toBe(0.6);
    expect(result.effects.chromaticAberration.offset).toBe(1.5);
  });

  // ── Depth Cinematic Effects: effectsSchema extensions ──

  it("effectsSchema accepts parallax with valid scale", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      effects: { parallax: { scale: 0.05 } },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.effects.parallax.scale).toBe(0.05);
    }
  });

  it("effectsSchema rejects parallax scale > 0.1", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      effects: { parallax: { scale: 0.2 } },
    });
    expect(result.success).toBe(false);
  });

  it("effectsSchema rejects parallax scale < 0", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      effects: { parallax: { scale: -0.01 } },
    });
    expect(result.success).toBe(false);
  });

  it("effectsSchema defaults parallax to { scale: 0 }", () => {
    const result = sceneSchema.parse(validScene);
    expect(result.effects.parallax.scale).toBe(0);
  });

  it("effectsSchema accepts haze with valid intensity", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      effects: { haze: { intensity: 0.5 } },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.effects.haze.intensity).toBe(0.5);
    }
  });

  it("effectsSchema rejects haze intensity > 1", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      effects: { haze: { intensity: 1.5 } },
    });
    expect(result.success).toBe(false);
  });

  it("effectsSchema rejects haze intensity < 0", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      effects: { haze: { intensity: -0.01 } },
    });
    expect(result.success).toBe(false);
  });

  it("effectsSchema defaults haze to { intensity: 0 }", () => {
    const result = sceneSchema.parse(validScene);
    expect(result.effects.haze.intensity).toBe(0);
  });

  it("effectsSchema accepts feather with valid radius", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      effects: { feather: { radius: 0.1 } },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.effects.feather.radius).toBe(0.1);
    }
  });

  it("effectsSchema rejects feather radius > 0.2", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      effects: { feather: { radius: 0.3 } },
    });
    expect(result.success).toBe(false);
  });

  it("effectsSchema rejects feather radius < 0", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      effects: { feather: { radius: -0.01 } },
    });
    expect(result.success).toBe(false);
  });

  it("effectsSchema defaults feather to { radius: 0 }", () => {
    const result = sceneSchema.parse(validScene);
    expect(result.effects.feather.radius).toBe(0);
  });

  it("existing effects schema defaults unchanged after additions", () => {
    const result = sceneSchema.parse(validScene);
    expect(result.effects.bloom.strength).toBe(0.6);
    expect(result.effects.bloom.radius).toBe(0.4);
    expect(result.effects.bloom.threshold).toBe(0.7);
    expect(result.effects.chromaticAberration.offset).toBe(1.5);
    expect(result.effects.chromaticAberration.modulationOffset).toBe(0.3);
  });

  it("sceneSchema parses with both effectsSchema.parallax and animationSchema.parallax coexisting", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      effects: { parallax: { scale: 0.05 } },
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            parallax: { depth: 0.5 },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.effects.parallax.scale).toBe(0.05);
      expect(result.data.layers[0].animation.parallax?.depth).toBe(0.5);
    }
  });
});

describe("sceneSchema audio field", () => {
  const baseScene = {
    version: 1 as const,
    source: "test.png",
    resolution: [1080, 1080] as [number, number],
    duration: 10,
    fps: 30,
    layers: [
      {
        id: "bg",
        file: "layers/layer-0.png",
        zIndex: 0,
        animation: {
          colorCycle: { speed: 1.0, period: 10 },
        },
      },
    ],
  };

  it("audio field optional — scene without audio parses OK", () => {
    const result = sceneSchema.safeParse(baseScene);
    expect(result.success).toBe(true);
  });

  it("audio field valid — valid audio object parses", () => {
    const result = sceneSchema.safeParse({
      ...baseScene,
      audio: {
        key: "Am",
        genre: "techno",
        energy: 0.7,
      },
    });
    expect(result.success).toBe(true);
  });

  it("audio key invalid — rejects bad key", () => {
    const result = sceneSchema.safeParse({
      ...baseScene,
      audio: { key: "Xm#" },
    });
    expect(result.success).toBe(false);
  });

  it("audio preset injection — rejects shell characters", () => {
    const result = sceneSchema.safeParse({
      ...baseScene,
      audio: { preset: "; rm -rf /" },
    });
    expect(result.success).toBe(false);
  });

  it("audio preset valid — accepts alphanumeric+dash+underscore", () => {
    const result = sceneSchema.safeParse({
      ...baseScene,
      audio: { preset: "techno-default_v2" },
    });
    expect(result.success).toBe(true);
  });

  it("audio genre house accepted", () => {
    const result = sceneSchema.safeParse({
      ...baseScene,
      audio: { genre: "house" },
    });
    expect(result.success).toBe(true);
  });

  it("audio genre dnb accepted", () => {
    const result = sceneSchema.safeParse({
      ...baseScene,
      audio: { genre: "dnb" },
    });
    expect(result.success).toBe(true);
  });

  it("audio genre ambient accepted", () => {
    const result = sceneSchema.safeParse({
      ...baseScene,
      audio: { genre: "ambient" },
    });
    expect(result.success).toBe(true);
  });

  it("audio defaults applied when fields omitted", () => {
    const result = sceneSchema.parse({
      ...baseScene,
      audio: {},
    });
    expect(result.audio?.key).toBe("Am");
    expect(result.audio?.scale).toBe("minor");
    expect(result.audio?.genre).toBe("techno");
    expect(result.audio?.energy).toBe(0.7);
  });

  it("audio bpm optional with valid range", () => {
    const result = sceneSchema.safeParse({
      ...baseScene,
      audio: { bpm: 128 },
    });
    expect(result.success).toBe(true);
  });

  it("audio bpm rejects out of range", () => {
    const result = sceneSchema.safeParse({
      ...baseScene,
      audio: { bpm: 300 },
    });
    expect(result.success).toBe(false);
  });
});

describe("scene-schema — T-A1 multipassFeedback effect", () => {
  const minimal = {
    version: 1,
    source: "x.png",
    resolution: [720, 1280] as [number, number],
    duration: 20,
    fps: 30,
    layers: [
      {
        id: "l0",
        file: "layers/layer-0.png",
        zIndex: 0,
      },
    ],
  };

  it("accepts scene without multipassFeedback (backward compat)", () => {
    const r = sceneSchema.safeParse(minimal);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.effects.multipassFeedback.strength).toBe(0);
    }
  });

  it("multipassFeedback max strength is 0.95", () => {
    const r = sceneSchema.safeParse({
      ...minimal,
      effects: { multipassFeedback: { strength: 1.0 } },
    });
    expect(r.success).toBe(false);
  });

  it("multipassFeedback defaults warp=0.2, decay=0.9, hueShift=0", () => {
    const r = sceneSchema.parse(minimal);
    const mf = r.effects.multipassFeedback;
    expect(mf.warp).toBe(0.2);
    expect(mf.decay).toBe(0.9);
    expect(mf.hueShift).toBe(0);
    expect(mf.reactionDiffusionAmount).toBe(0);
    expect(mf.reactionDiffusionSpeed).toBe(0.35);
  });

  it("accepts optional multipassFeedback mask path", () => {
    const r = sceneSchema.safeParse({
      ...minimal,
      effects: { multipassFeedback: { strength: 0.32, mask: "layers/portal.png" } },
    });
    expect(r.success).toBe(true);
  });

  it("accepts reaction-diffusion-lite without ordinary feedback strength", () => {
    const r = sceneSchema.safeParse({
      ...minimal,
      effects: {
        multipassFeedback: {
          strength: 0,
          reactionDiffusionAmount: 0.7,
          reactionDiffusionSpeed: 0.45,
        },
      },
    });
    expect(r.success).toBe(true);
  });

  it("rejects reaction-diffusion-lite values outside safe range", () => {
    const r = sceneSchema.safeParse({
      ...minimal,
      effects: {
        multipassFeedback: {
          reactionDiffusionAmount: 1.2,
          reactionDiffusionSpeed: -0.1,
        },
      },
    });
    expect(r.success).toBe(false);
  });
});

describe("scene-schema — R9 structural primitives", () => {
  const minimal = {
    version: 1,
    source: "x.png",
    resolution: [720, 1280] as [number, number],
    duration: 20,
    fps: 30,
    layers: [
      {
        id: "l0",
        file: "layers/layer-0.png",
        zIndex: 0,
        animation: {
          depthField: "layers/depth.png",
          flowField: "layers/flow-field.png",
          structureFlow: { strength: 0.003, cycles: 3 },
        },
      },
    ],
  };

  it("defaults camera drift and structure flow to off", () => {
    const r = sceneSchema.parse({
      version: 1,
      source: "x.png",
      resolution: [720, 1280],
      layers: [{ id: "l0", file: "layers/layer-0.png", zIndex: 0 }],
    });

    expect(r.effects.cameraDrift).toEqual({ radius: 0, cycles: 1, pivot: 0.5 });
    expect(r.layers[0]?.animation.structureFlow).toEqual({ strength: 0, cycles: 3 });
  });

  it("accepts depthField, flowField, structureFlow, and cameraDrift bounds", () => {
    const r = sceneSchema.safeParse({
      ...minimal,
      effects: { cameraDrift: { radius: 0.006, cycles: 1, pivot: 0.5 } },
    });
    expect(r.success).toBe(true);
  });

  it("rejects camera drift radius above 0.02 and structure flow above 0.005", () => {
    expect(sceneSchema.safeParse({ ...minimal, effects: { cameraDrift: { radius: 0.03 } } }).success).toBe(false);
    expect(sceneSchema.safeParse({
      ...minimal,
      layers: [
        {
          id: "l0",
          file: "layers/layer-0.png",
          zIndex: 0,
          animation: { structureFlow: { strength: 0.006 } },
        },
      ],
    }).success).toBe(false);
  });
});

describe("LayerRole schema", () => {
  const VALID_ROLES: LayerRole[] = [
    "background-plate",
    "background",
    "midground",
    "subject",
    "detail",
    "foreground-occluder",
  ];

  it("should accept valid LayerRole values", () => {
    for (const role of VALID_ROLES) {
      const result = layerRoleSchema.safeParse(role);
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid role string", () => {
    const result = layerRoleSchema.safeParse("invalid-role");
    expect(result.success).toBe(false);
  });

  it("should parse scene.json without role field (backward compat)", () => {
    const sceneWithoutRole = {
      version: 1,
      source: "test.png",
      resolution: [1080, 1080],
      duration: 10,
      fps: 30,
      layers: [
        {
          id: "bg",
          file: "layers/layer-0.png",
          zIndex: 0,
          animation: {
            colorCycle: { speed: 1.0, period: 10 },
          },
        },
      ],
    };
    const result = sceneSchema.safeParse(sceneWithoutRole);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.layers[0].role).toBeUndefined();
    }
  });

  it("should parse scene.json with role field", () => {
    const sceneWithRole = {
      version: 1,
      source: "test.png",
      resolution: [1080, 1080],
      duration: 10,
      fps: 30,
      layers: [
        {
          id: "bg",
          file: "layers/layer-0.png",
          zIndex: 0,
          role: "subject",
          animation: {
            colorCycle: { speed: 1.0, period: 10 },
          },
        },
      ],
    };
    const result = sceneSchema.safeParse(sceneWithRole);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.layers[0].role).toBe("subject");
    }
  });
});
