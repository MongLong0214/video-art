import path from "node:path";
import type { SceneConfig, LayerRole, AnimationConfig } from "../../src/lib/scene-schema.js";
import { getValidPeriods } from "../../src/lib/scene-schema.js";

export interface RetainedLayer {
  file: string;
  role: LayerRole;
  coverage: number;
  uniqueCoverage: number;
}

// Role-based preset factory: returns animation config for a given role
// Period selection: background roles get longer periods, detail/fg get shorter
function getRolePreset(
  role: LayerRole,
  index: number,
  total: number,
  duration: number,
): AnimationConfig {
  const periods = getValidPeriods(duration).sort((a, b) => b - a);
  const phaseOffset = Math.round((360 * index) / total);

  // Period selection helper: pick from sorted periods (descending) by tier
  // tier 0 = longest period (background-plate), tier 4 = shortest (detail)
  const pickPeriod = (tier: number): number => {
    const idx = Math.min(Math.floor((tier / 5) * periods.length), periods.length - 1);
    return periods[idx];
  };

  const presets: Record<LayerRole, AnimationConfig> = {
    "background-plate": {
      colorCycle: { speed: 5, period: pickPeriod(0), phaseOffset },
      wave: { amplitude: 1, frequency: 0.2, period: pickPeriod(0) },
      glow: { intensity: 0.1, pulse: 0.2, period: pickPeriod(0) },
      parallax: { depth: 0.1 },
      saturationBoost: 2.5,
      luminanceKey: 0.4,
    },
    background: {
      colorCycle: { speed: 8, period: pickPeriod(1), phaseOffset },
      wave: { amplitude: 1.5, frequency: 0.3, period: pickPeriod(1) },
      glow: { intensity: 0.15, pulse: 0.3, period: pickPeriod(1) },
      parallax: { depth: 0.2 },
      saturationBoost: 2.3,
      luminanceKey: 0.45,
    },
    midground: {
      colorCycle: { speed: 10, period: pickPeriod(2), phaseOffset },
      wave: { amplitude: 2, frequency: 0.35, period: pickPeriod(2) },
      glow: { intensity: 0.2, pulse: 0.4, period: pickPeriod(2) },
      parallax: { depth: 0.3 },
      saturationBoost: 2.5,
      luminanceKey: 0.55,
    },
    subject: {
      colorCycle: { speed: 10, period: pickPeriod(2), phaseOffset },
      wave: { amplitude: 2, frequency: 0.4, period: pickPeriod(2) },
      glow: { intensity: 0.25, pulse: 0.45, period: pickPeriod(3) },
      parallax: { depth: 0.35 },
      saturationBoost: 2.8,
      luminanceKey: 0.6,
    },
    detail: {
      colorCycle: { speed: 15, period: pickPeriod(4), phaseOffset },
      wave: { amplitude: 0.5, frequency: 0.5, period: pickPeriod(4) },
      glow: { intensity: 0.3, pulse: 0.5, period: pickPeriod(4) },
      parallax: { depth: 0.4 },
      saturationBoost: 2.2,
      luminanceKey: 0.65,
    },
    "foreground-occluder": {
      colorCycle: { speed: 8, period: pickPeriod(3), phaseOffset },
      wave: { amplitude: 1.2, frequency: 0.3, period: pickPeriod(3) },
      glow: { intensity: 0.15, pulse: 0.3, period: pickPeriod(3) },
      parallax: { depth: 0.45 },
      saturationBoost: 1.8,
      luminanceKey: 0.5,
    },
  };

  return presets[role];
}

export async function generateSceneJson(
  sourceName: string,
  layers: RetainedLayer[],
  resolution: [number, number] = [1080, 1080],
  duration: number = 20,
): Promise<SceneConfig> {
  // Cap resolution while maintaining aspect ratio (Puppeteer + GPU limit)
  const MAX_OUTPUT_DIM = 1920;
  let [w, h] = resolution;
  if (w > MAX_OUTPUT_DIM || h > MAX_OUTPUT_DIM) {
    const scale = MAX_OUTPUT_DIM / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  // Ensure even dimensions for h264 yuv420p encoding
  const evenRes: [number, number] = [
    w % 2 === 0 ? w : w - 1,
    h % 2 === 0 ? h : h - 1,
  ];

  const sceneLayers: SceneConfig["layers"] = [];

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const role: LayerRole = layer.role || "midground";
    const preset = getRolePreset(role, i, layers.length, duration);

    sceneLayers.push({
      id: `layer-${i}`,
      file: layer.file.startsWith("layers/") ? layer.file : `layers/${path.basename(layer.file)}`,
      zIndex: i,
      opacity: 1.0,
      role,
      animation: preset,
    });
  }

  return {
    version: 1,
    source: sourceName,
    resolution: evenRes,
    duration,
    fps: 30,
    layers: sceneLayers,
    effects: {
      bloom: { strength: 0.6, radius: 0.4, threshold: 0.7 },
      chromaticAberration: { offset: 1.5 },
    },
  };
}
