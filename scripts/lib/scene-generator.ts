import path from "node:path";
import type { PostProcessResult } from "./postprocess.js";
import type { SceneConfig } from "../../src/lib/scene-schema.js";

const LAYER_PRESETS = [
  // zIndex 0 = background (highest coverage)
  {
    colorCycle: { speed: 0.3, hueRange: 360, period: 20 },
    wave: { amplitude: 5, frequency: 0.5, period: 10 },
    glow: { intensity: 0.1, pulse: 0.2, period: 20 },
    parallax: { depth: 0.0 },
  },
  // zIndex 1 = main subject
  {
    colorCycle: { speed: 0.15, hueRange: 180, period: 20 },
    wave: { amplitude: 2, frequency: 0.3, period: 10 },
    glow: { intensity: 0.4, pulse: 0.5, period: 5 },
    parallax: { depth: 0.3 },
  },
  // zIndex 2 = detail
  {
    colorCycle: { speed: 0.2, hueRange: 120, period: 10 },
    wave: { amplitude: 3, frequency: 0.4, period: 5 },
    glow: { intensity: 0.3, pulse: 0.3, period: 4 },
    parallax: { depth: 0.5 },
  },
  // zIndex 3+ = foreground
  {
    colorCycle: { speed: 0.1, hueRange: 90, period: 10 },
    wave: { amplitude: 1.5, frequency: 0.2, period: 4 },
    glow: { intensity: 0.5, pulse: 0.6, period: 2 },
    parallax: { depth: 0.7 },
  },
];

export async function generateSceneJson(
  sourceName: string,
  result: PostProcessResult,
  resolution: [number, number] = [1080, 1080],
): Promise<SceneConfig> {
  const layers: SceneConfig["layers"] = [];

  for (let i = 0; i < result.files.length; i++) {
    const filePath = result.files[i];
    const preset = LAYER_PRESETS[Math.min(i, LAYER_PRESETS.length - 1)];

    const layerNames = ["background", "subject", "detail", "foreground"];
    const id = i < layerNames.length ? layerNames[i] : `layer-${i}`;

    layers.push({
      id,
      file: `layers/${path.basename(filePath)}`,
      zIndex: i,
      opacity: 1.0,
      animation: preset,
    });
  }

  return {
    version: 1,
    source: sourceName,
    resolution,
    duration: 20,
    fps: 30,
    layers,
    effects: {
      bloom: { strength: 0.6, radius: 0.4, threshold: 0.7 },
      chromaticAberration: { offset: 1.5 },
      sparkle: { count: 80, sizeMin: 2, sizeMax: 6, speed: 1.0 },
    },
  };
}
