import { describe, expect, it } from "vitest";
import { sceneSchema, type LayerConfig, type SceneConfig } from "../../src/lib/scene-schema.js";
import { deriveParameters, type Analysis } from "./master-derivation.js";
import { buildScene } from "./master-scene.js";

const rotationPathAnalysis: Analysis = {
  M1: { p5: 0.08, p50: 0.5, p95: 0.92, darkAnchorPct: 8, brightAreaPct: 18 },
  M2: { satMean: 0.35, vividAreaPct: 42 },
  M3: { dominantHues: [{ hueDeg: 215, weightPct: 52 }], concentration: 0.4, greenRisk: true },
  M4: { edgeDensity: 0.18, busyness: 0.22 },
  M5: { structType: "texture", orientationCoherence: 0.2 },
  M6: { focal: [12, 18], radialSym: 0.12, verticalFlow: 0.18 },
  M7: { figureAreaPct: 40, figureContrast: 0.1, figureCentroid: [320, 480] },
  M8: { finishedVivid: 0.55 },
};

function buildValidatedScene(analysis: Analysis, requestedIntent: "preserve" | "vivid"): SceneConfig {
  const derived = deriveParameters(analysis, { requestedIntent });
  return sceneSchema.parse(buildScene("ganesha.png", [640, 960], analysis, derived));
}

function findLayer(scene: SceneConfig, layerId: string): LayerConfig {
  const layer = scene.layers.find((candidate) => candidate.id === layerId);
  if (!layer) throw new Error(`Missing scene layer: ${layerId}`);
  return layer;
}

describe("master scene edge layer calibration", () => {
  it("keeps rotation-path edge as a subtle screen accent", () => {
    const scene = buildValidatedScene(rotationPathAnalysis, "vivid");
    const body = findLayer(scene, "body");
    const ornament = findLayer(scene, "ornament");
    const edge = findLayer(scene, "edge");

    expect(edge).toMatchObject({
      blending: "screen",
      opacity: 0.18,
      role: "detail",
    });
    expect(edge.animation.saturationBoost).toBeLessThanOrEqual(body.animation.saturationBoost);
    expect(edge.animation.saturationBoost).toBeLessThan(ornament.animation.saturationBoost);
    expect(edge.animation.paletteValueFloor).toBeLessThan(ornament.animation.paletteValueFloor);
    expect(edge.animation.paletteSatFloor).toBeLessThan(ornament.animation.paletteSatFloor);
  });

  it("preserves explicit preserve-path edge color budgets", () => {
    const scene = buildValidatedScene(rotationPathAnalysis, "preserve");
    const edge = findLayer(scene, "edge");

    expect(edge.animation).toMatchObject({
      saturationBoost: 1.25,
      paletteAmount: 0.3,
      paletteSatFloor: 0,
    });
    expect(edge.animation.colorCycle?.speed).toBe(21);
  });
});
