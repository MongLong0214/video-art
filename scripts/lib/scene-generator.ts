import path from "node:path";
import type { SceneConfig, LayerRole, AnimationConfig } from "../../src/lib/scene-schema.js";
import { getValidPeriods } from "../../src/lib/scene-schema.js";
import type { ResearchConfig } from "../research/research-config.js";

export interface RetainedLayer {
  file: string;
  role: LayerRole;
  coverage: number;
  uniqueCoverage: number;
}

// Multiplier keys from ResearchConfig for scene animation scaling
interface SceneMultipliers {
  colorCycleSpeedMul: number;
  parallaxDepthMul: number;
  waveAmplitudeMul: number;
  glowIntensityMul: number;
  saturationBoostMul: number;
  luminanceKeyMul: number;
}

const DEFAULT_MULTIPLIERS: SceneMultipliers = {
  colorCycleSpeedMul: 1.0,
  parallaxDepthMul: 1.0,
  waveAmplitudeMul: 1.0,
  glowIntensityMul: 1.0,
  saturationBoostMul: 1.0,
  luminanceKeyMul: 1.0,
};

// Role-based preset factory: returns animation config for a given role
// Period selection: background roles get longer periods, detail/fg get shorter
function getRolePreset(
  role: LayerRole,
  index: number,
  total: number,
  duration: number,
  mul: SceneMultipliers = DEFAULT_MULTIPLIERS,
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
      colorCycle: { speed: 5 * mul.colorCycleSpeedMul, period: pickPeriod(0), phaseOffset },
      wave: { amplitude: 1 * mul.waveAmplitudeMul, frequency: 0.2, period: pickPeriod(0) },
      glow: { intensity: 0.1 * mul.glowIntensityMul, pulse: 0.2, period: pickPeriod(0) },
      parallax: { depth: 0.1 * mul.parallaxDepthMul },
      saturationBoost: 2.5 * mul.saturationBoostMul,
      luminanceKey: 0.4 * mul.luminanceKeyMul,
    },
    background: {
      colorCycle: { speed: 8 * mul.colorCycleSpeedMul, period: pickPeriod(1), phaseOffset },
      wave: { amplitude: 1.5 * mul.waveAmplitudeMul, frequency: 0.3, period: pickPeriod(1) },
      glow: { intensity: 0.15 * mul.glowIntensityMul, pulse: 0.3, period: pickPeriod(1) },
      parallax: { depth: 0.2 * mul.parallaxDepthMul },
      saturationBoost: 2.3 * mul.saturationBoostMul,
      luminanceKey: 0.45 * mul.luminanceKeyMul,
    },
    midground: {
      colorCycle: { speed: 10 * mul.colorCycleSpeedMul, period: pickPeriod(2), phaseOffset },
      wave: { amplitude: 2 * mul.waveAmplitudeMul, frequency: 0.35, period: pickPeriod(2) },
      glow: { intensity: 0.2 * mul.glowIntensityMul, pulse: 0.4, period: pickPeriod(2) },
      parallax: { depth: 0.3 * mul.parallaxDepthMul },
      saturationBoost: 2.5 * mul.saturationBoostMul,
      luminanceKey: 0.55 * mul.luminanceKeyMul,
    },
    subject: {
      colorCycle: { speed: 10 * mul.colorCycleSpeedMul, period: pickPeriod(2), phaseOffset },
      wave: { amplitude: 2 * mul.waveAmplitudeMul, frequency: 0.4, period: pickPeriod(2) },
      glow: { intensity: 0.25 * mul.glowIntensityMul, pulse: 0.45, period: pickPeriod(3) },
      parallax: { depth: 0.35 * mul.parallaxDepthMul },
      saturationBoost: 2.8 * mul.saturationBoostMul,
      luminanceKey: 0.6 * mul.luminanceKeyMul,
    },
    detail: {
      colorCycle: { speed: 15 * mul.colorCycleSpeedMul, period: pickPeriod(4), phaseOffset },
      wave: { amplitude: 0.5 * mul.waveAmplitudeMul, frequency: 0.5, period: pickPeriod(4) },
      glow: { intensity: 0.3 * mul.glowIntensityMul, pulse: 0.5, period: pickPeriod(4) },
      parallax: { depth: 0.4 * mul.parallaxDepthMul },
      saturationBoost: 2.2 * mul.saturationBoostMul,
      luminanceKey: 0.65 * mul.luminanceKeyMul,
    },
    "foreground-occluder": {
      colorCycle: { speed: 8 * mul.colorCycleSpeedMul, period: pickPeriod(3), phaseOffset },
      wave: { amplitude: 1.2 * mul.waveAmplitudeMul, frequency: 0.3, period: pickPeriod(3) },
      glow: { intensity: 0.15 * mul.glowIntensityMul, pulse: 0.3, period: pickPeriod(3) },
      parallax: { depth: 0.45 * mul.parallaxDepthMul },
      saturationBoost: 1.8 * mul.saturationBoostMul,
      luminanceKey: 0.5 * mul.luminanceKeyMul,
    },
  };

  return presets[role];
}

export async function generateSceneJson(
  sourceName: string,
  layers: RetainedLayer[],
  resolution: [number, number] = [1080, 1080],
  duration: number = 20,
  config?: Partial<ResearchConfig>,
): Promise<SceneConfig> {
  const mul: SceneMultipliers = {
    colorCycleSpeedMul: config?.colorCycleSpeedMul ?? 1.0,
    parallaxDepthMul: config?.parallaxDepthMul ?? 1.0,
    waveAmplitudeMul: config?.waveAmplitudeMul ?? 1.0,
    glowIntensityMul: config?.glowIntensityMul ?? 1.0,
    saturationBoostMul: config?.saturationBoostMul ?? 1.0,
    luminanceKeyMul: config?.luminanceKeyMul ?? 1.0,
  };
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
    const preset = getRolePreset(role, i, layers.length, duration, mul);

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
