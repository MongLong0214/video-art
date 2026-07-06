import { describe, expect, it } from "vitest";
import { sceneSchema } from "../../src/lib/scene-schema.js";
import { deriveParameters, type Analysis } from "./master-derivation.js";
import { buildScene } from "./master-scene.js";

const greenRiskAnalysis: Analysis = {
  M1: { p5: 0.08, p50: 0.5, p95: 0.92, darkAnchorPct: 8, brightAreaPct: 18 },
  M2: { satMean: 0.35, vividAreaPct: 42 },
  M3: { dominantHues: [{ hueDeg: 215, weightPct: 52 }], concentration: 0.4, greenRisk: true },
  M4: { edgeDensity: 0.18, busyness: 0.22 },
  M5: { structType: "texture", orientationCoherence: 0.2 },
  M6: { focal: [12, 18], radialSym: 0.12, verticalFlow: 0.18 },
  M7: { figureAreaPct: 40, figureContrast: 0.1, figureCentroid: [320, 480] },
  M8: { finishedVivid: 0.55 },
};

describe("master derivation green-risk rotation rules", () => {
  it("forces radial phase at the figure centroid for mid-sized figures", () => {
    const derived = deriveParameters(greenRiskAnalysis, { requestedIntent: "vivid" });

    expect(derived.phaseKinds).toContain("radial");
    expect(derived.focal).toEqual([320, 480]);
    expect(derived.phaseFieldAssignment.ornament).toBe("radial");
    expect(derived.ruleTrace.some((row) => row.rule === "D-3-4.figureArea20-60→radialOrnament")).toBe(true);
  });

  it("describes disabled valueLift with the actual branch reason", () => {
    const derived = deriveParameters(greenRiskAnalysis, { requestedIntent: "vivid" });
    const trace = derived.ruleTrace.find((row) => row.parameter === "valueLift");

    expect(trace?.value).toBe(0);
    expect(trace?.reason).toContain("valueLift disabled");
  });

  it("routes green-risk vivid layers through palette-dominant HSV compression", () => {
    const derived = deriveParameters(greenRiskAnalysis, { requestedIntent: "vivid" });
    const imageSize: readonly [number, number] = [640, 960];
    const scene = sceneSchema.parse(buildScene("ganesha.png", imageSize, greenRiskAnalysis, derived));

    expect(scene.layers.find((layer) => layer.id === "body")?.animation).toMatchObject({
      paletteAmount: 0.55,
      paletteValueFloor: 0.22,
      paletteSatFloor: 0.55,
    });
    expect(scene.layers.find((layer) => layer.id === "ornament")?.animation).toMatchObject({
      paletteAmount: 0.65,
      paletteValueFloor: 0.25,
      paletteSatFloor: 0.65,
    });
    expect(scene.layers.find((layer) => layer.id === "void")?.animation).toMatchObject({
      paletteAmount: 0.5,
      paletteValueFloor: 0,
      paletteSatFloor: 0.35,
      saturationBoost: 1,
    });
    expect(scene.layers.find((layer) => layer.id === "base")?.animation.paletteAmount).toBeLessThan(0.5);
    expect(scene.layers.find((layer) => layer.id === "highlight")?.animation.paletteAmount).toBeLessThan(0.5);

    for (const layer of scene.layers) {
      expect(layer.animation.hueSpace).toBe("hsv");
      expect(layer.animation.greenCompress).toBe(0.85);
    }
    expect(scene.layers.find((layer) => layer.id === "edge")?.animation.paletteAmount).toBeGreaterThan(0.5);
    expect(scene.layers.find((layer) => layer.id === "body")?.animation.glowWave).toEqual({ strength: 0.5, speed: 8, sharpness: 0.6, fieldCycles: 1 });
    expect(scene.layers.find((layer) => layer.id === "ornament")?.animation.glowWave).toEqual({ strength: 0.7, speed: 13, sharpness: 0.7, fieldCycles: 1.5 });
    expect(scene.layers.find((layer) => layer.id === "edge")?.animation.glowWave).toEqual({ strength: 0.45, speed: 8, sharpness: 0.65, fieldCycles: 1 });

    const paletteTrace = derived.ruleTrace.filter((row) => row.rule === "R4.greenRisk→paletteDominant");
    expect(paletteTrace).toHaveLength(1);
    expect(JSON.stringify(paletteTrace[0]?.value)).toContain("ornament");

    const floorTrace = derived.ruleTrace.filter((row) => row.rule === "R4.greenRisk→vividPaletteFloors");
    expect(floorTrace).toHaveLength(1);
    expect(JSON.stringify(floorTrace[0]?.value)).toContain("paletteSatFloor");

    const voidTrace = derived.ruleTrace.filter((row) => row.rule === "R7.voidUnify");
    expect(voidTrace).toHaveLength(1);

    const routeTrace = derived.ruleTrace.filter((row) => row.rule === "R6.vivid→hsv+greenCompress" && row.parameter === "greenRiskColorRoute");
    expect(routeTrace).toHaveLength(1);

    const rotationTrace = derived.ruleTrace.filter((row) => row.rule === "R6.vivid→hsv+greenCompress" && row.parameter === "hueRotation");
    expect(rotationTrace).toHaveLength(6);
    expect(JSON.stringify(rotationTrace.map((row) => row.value))).toContain("edge");

    const glowTrace = derived.ruleTrace.filter((row) => row.rule === "R10.motionExtreme.glowWave");
    expect(glowTrace).toHaveLength(1);
  });

  it("derives bloom threshold above bright vivid source luminance and records the rule", () => {
    const brightVividAnalysis: Analysis = {
      ...greenRiskAnalysis,
      M1: { p5: 0.0842, p50: 0.4537, p95: 0.7393, darkAnchorPct: 8.9181, brightAreaPct: 4.6545 },
      M2: { satMean: 0.6724, vividAreaPct: 58.5254 },
    };
    const derived = deriveParameters(brightVividAnalysis, { requestedIntent: "vivid" });
    const scene = sceneSchema.parse(buildScene("ganesha.png", [1632, 2912], brightVividAnalysis, derived));

    expect(scene.effects.bloom.threshold).toBeGreaterThan(brightVividAnalysis.M1.p95 + 0.08);
    expect(scene.effects.bloom.threshold).toBeLessThanOrEqual(0.9);
    expect(scene.effects.bloom.strength).toBeGreaterThan(0);

    const bloomTrace = derived.ruleTrace.find((row) => row.parameter === "bloom");
    expect(bloomTrace?.rule).toBe("R15.displayBrightness.bloomThreshold");
    expect(bloomTrace?.value).toMatchObject({ threshold: scene.effects.bloom.threshold, sourceP95: brightVividAnalysis.M1.p95 });
  });

  it("keeps default feedback visible but shortens display-referred accumulation memory", () => {
    const derived = deriveParameters(greenRiskAnalysis, { requestedIntent: "vivid" });
    const scene = sceneSchema.parse(buildScene("ganesha.png", [640, 960], greenRiskAnalysis, derived));

    expect(scene.effects.multipassFeedback.strength).toBeGreaterThanOrEqual(0.2);
    expect(scene.effects.multipassFeedback.decay).toBeLessThanOrEqual(0.87);
    expect(scene.effects.multipassFeedback.hueShift).toBeGreaterThan(0);
  });

  it("unifies bottom-saturation void fallback into coherent palette waves", () => {
    const brightFallbackAnalysis: Analysis = {
      ...greenRiskAnalysis,
      M1: { ...greenRiskAnalysis.M1, darkAnchorPct: 1.2 },
    };
    const derived = deriveParameters(brightFallbackAnalysis, { requestedIntent: "vivid" });
    const imageSize: readonly [number, number] = [640, 960];
    const scene = sceneSchema.parse(buildScene("ganesha.png", imageSize, brightFallbackAnalysis, derived));
    const voidLayer = scene.layers.find((layer) => layer.id === "void");

    expect(voidLayer?.animation).toMatchObject({
      paletteAmount: 0.5,
      paletteSatFloor: 0.35,
      saturationBoost: 1.2,
    });
    expect(voidLayer?.animation.hueKey).toBeLessThanOrEqual(0.4);

    const voidTrace = derived.ruleTrace.find((row) => row.rule === "R7.voidUnify");
    expect(voidTrace?.value).toMatchObject({ bottomSaturationFallback: true, saturationBoost: 1.2 });
  });

  it("keeps green-risk preserve layers in OKLCH compression", () => {
    const derived = deriveParameters(greenRiskAnalysis, { requestedIntent: "preserve" });
    const imageSize: readonly [number, number] = [640, 960];
    const scene = sceneSchema.parse(buildScene("ganesha.png", imageSize, greenRiskAnalysis, derived));

    expect(derived.resolvedIntent).toBe("preserve");
    expect(derived.colorPath).toBe("preserve-glow-wave");
    for (const layer of scene.layers) {
      expect(layer.animation.hueSpace).toBe("oklch");
      expect(layer.animation.greenCompress).toBe(0.85);
      expect(layer.animation.saturationBoost).toBeLessThanOrEqual(1.25);
    }

    expect(scene.layers.find((layer) => layer.id === "body")?.animation).toMatchObject({
      phaseField: "layers/phase-luminance.png",
      phaseAmount: 0.3,
      paletteAmount: 0.1,
      paletteSatFloor: 0,
      glowWave: { strength: 0.5, speed: 8, sharpness: 0.6, fieldCycles: 1 },
    });
    expect(scene.layers.find((layer) => layer.id === "ornament")?.animation).toMatchObject({
      phaseField: "layers/phase-radial.png",
      phaseAmount: 0.4,
      paletteAmount: 0.15,
      paletteSatFloor: 0,
      glowWave: { strength: 0.7, speed: 13, sharpness: 0.7, fieldCycles: 1.5 },
    });
    expect(scene.layers.find((layer) => layer.id === "edge")?.animation).toMatchObject({
      phaseField: "layers/phase-edge.png",
      phaseAmount: 0.5,
      paletteAmount: 0.3,
      paletteSatFloor: 0,
      glowWave: { strength: 0.45, speed: 8, sharpness: 0.65, fieldCycles: 1 },
    });

    const routeTrace = derived.ruleTrace.filter((row) => row.rule === "R8.finishedVivid→preserve+glowWave" && row.parameter === "colorPath");
    expect(routeTrace).toHaveLength(1);
    expect(derived.ruleTrace.some((row) => row.rule === "R10.motionExtreme.phaseAmount")).toBe(true);
  });

  it("finished-vivid sources use preserve+glowWave before green-risk rotation even when vivid is requested", () => {
    const finishedVividAnalysis: Analysis = {
      ...greenRiskAnalysis,
      M8: { finishedVivid: 0.66 },
    };
    const derived = deriveParameters(finishedVividAnalysis, { requestedIntent: "vivid" });
    const imageSize: readonly [number, number] = [640, 960];
    const scene = sceneSchema.parse(buildScene("ganesha.png", imageSize, finishedVividAnalysis, derived));

    expect(derived.resolvedIntent).toBe("preserve");
    expect(derived.colorPath).toBe("preserve-glow-wave");
    expect(derived.speeds).toEqual({ base: 2, void: 3, body: 8, ornament: 13, edge: 21, highlight: 13 });
    expect(scene.layers.find((layer) => layer.id === "body")?.animation.hueSpace).toBe("oklch");
    expect(scene.layers.find((layer) => layer.id === "body")?.animation.paletteAmount).toBe(0.1);
    expect(scene.layers.find((layer) => layer.id === "body")?.animation.paletteSatFloor).toBe(0);
    expect(scene.layers.find((layer) => layer.id === "void")?.animation.paletteAmount).toBe(0.15);
    expect(derived.ruleTrace.some((row) => row.rule === "R8.finishedVivid→preserve+glowWave")).toBe(true);
  });

  it("keeps current R9 camera drift, structure flow, and portal feedback in calm motion", () => {
    const finishedVividAnalysis: Analysis = {
      ...greenRiskAnalysis,
      M4: { ...greenRiskAnalysis.M4, busyness: 0.2 },
      M5: { ...greenRiskAnalysis.M5, structType: "texture" },
      M8: { finishedVivid: 0.66 },
    };
    const derived = deriveParameters(finishedVividAnalysis, { requestedIntent: "vivid", motionTier: "calm" });
    const imageSize: readonly [number, number] = [640, 960];
    const scene = sceneSchema.parse(buildScene("ganesha.png", imageSize, finishedVividAnalysis, derived));

    expect(derived.colorPath).toBe("preserve-glow-wave");
    expect(derived.cameraDrift).toEqual({ radius: 0.006, cycles: 1, pivot: 0.5 });
    expect(derived.structureFlow).toEqual({ strength: 0.0028, cycles: 3 });
    expect(derived.portalFeedback).toBe(true);
    expect(scene.effects.cameraDrift).toEqual({ radius: 0.006, cycles: 1, pivot: 0.5 });
    expect(scene.effects.multipassFeedback).toMatchObject({
      strength: 0.24,
      zoom: 0.985,
      decay: 0.83,
      warp: 0,
      mask: "layers/portal.png",
    });
    expect(scene.layers.find((layer) => layer.id === "base")?.animation.depthField).toBe("layers/depth.png");
    expect(scene.layers.find((layer) => layer.id === "body")?.animation).toMatchObject({
      flowField: "layers/flow-field.png",
      structureFlow: { strength: 0.0028, cycles: 3 },
    });
    expect(scene.layers.find((layer) => layer.id === "edge")?.animation).toMatchObject({
      flowField: "layers/flow-field.png",
      structureFlow: { strength: 0.0028, cycles: 3 },
    });
    expect(derived.ruleTrace.some((row) => row.rule === "R9.depthDrift")).toBe(true);
    expect(derived.ruleTrace.some((row) => row.rule === "R9.structFlow")).toBe(true);
    expect(derived.ruleTrace.some((row) => row.rule === "R9.portalFeedback")).toBe(true);
  });

  it("raises active structural motion and portal feedback in default extreme motion", () => {
    const finishedVividAnalysis: Analysis = {
      ...greenRiskAnalysis,
      M4: { ...greenRiskAnalysis.M4, busyness: 0.2 },
      M5: { ...greenRiskAnalysis.M5, structType: "texture" },
      M8: { finishedVivid: 0.66 },
    };
    const derived = deriveParameters(finishedVividAnalysis, { requestedIntent: "vivid" });
    const imageSize: readonly [number, number] = [640, 960];
    const scene = sceneSchema.parse(buildScene("ganesha.png", imageSize, finishedVividAnalysis, derived));

    expect(derived.motionTier).toBe("extreme");
    expect(derived.cameraDrift).toEqual({ radius: 0.008, cycles: 1, pivot: 0.5 });
    expect(derived.structureFlow).toEqual({ strength: 0.0045, cycles: 5 });
    expect(scene.effects.multipassFeedback).toMatchObject({
      strength: 0.3,
      zoom: 0.98,
      decay: 0.83,
      warp: 0,
      mask: "layers/portal.png",
    });
    expect(scene.layers.find((layer) => layer.id === "body")?.animation.structureFlow).toEqual({ strength: 0.0045, cycles: 5 });
    expect(derived.ruleTrace.some((row) => row.rule === "R10.motionExtreme.cameraDrift")).toBe(true);
    expect(derived.ruleTrace.some((row) => row.rule === "R10.motionExtreme.structureFlow")).toBe(true);
    expect(derived.ruleTrace.some((row) => row.rule === "R10.motionExtreme.portalFeedback")).toBe(true);
  });
});
