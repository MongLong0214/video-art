import path from "node:path";
import type { SceneConfig, LayerRole, AnimationConfig } from "../../src/lib/scene-schema.js";
import { getValidPeriods } from "../../src/lib/scene-schema.js";
import type { ResearchConfig } from "../research/research-config.js";

export interface RetainedLayer {
  file: string;
  role: LayerRole;
  coverage: number;
  uniqueCoverage: number;
  meanDepth?: number;
}

// Multiplier keys from ResearchConfig for scene animation scaling
interface SceneMultipliers {
  colorCycleSpeedMul: number;
  glowIntensityMul: number;
  saturationBoostMul: number;
  luminanceKeyMul: number;
  bloomStrengthMul: number;
  chromaticAberrationOffsetMul: number;
  bloomRadiusMul: number;
  bloomThresholdMul: number;
  caModulationOffsetMul: number;
  satBlendLow: number;
  satBlendHigh: number;
  satInjectionMul: number;
  glowPulseFloor: number;
  lumExponent: number;
  tempoMul: number;
  phaseSpreadMul: number;
  periodRangeLow: number;
  periodRangeHigh: number;
  glowPeriodMul: number;
  blendMode: "normal" | "add" | "multiply" | "screen";
  depthSpeedInfluence: number | null;
  depthGlowInfluence: number | null;
  depthParallaxScale: number | null;
  hazeIntensity: number | null;
  featherRadius: number | null;
  hueKey: number;
  hueSpeed: number;
}

const DEFAULT_MULTIPLIERS: SceneMultipliers = {
  colorCycleSpeedMul: 1.0,
  glowIntensityMul: 1.0,
  saturationBoostMul: 1.0,
  luminanceKeyMul: 1.0,
  bloomStrengthMul: 1.0,
  chromaticAberrationOffsetMul: 1.0,
  bloomRadiusMul: 1.0,
  bloomThresholdMul: 1.0,
  caModulationOffsetMul: 1.0,
  satBlendLow: 0.1,
  satBlendHigh: 0.4,
  satInjectionMul: 0.35,
  glowPulseFloor: 0.0,
  lumExponent: 1.0,
  tempoMul: 1.0,
  phaseSpreadMul: 1.0,
  periodRangeLow: 1.0,
  periodRangeHigh: 20.0,
  glowPeriodMul: 1.0,
  blendMode: "normal" as const,
  depthSpeedInfluence: null,
  depthGlowInfluence: null,
  depthParallaxScale: null,
  hazeIntensity: null,
  featherRadius: null,
  hueKey: 1.5,
  hueSpeed: 3.0,
};

export function filterPeriods(
  duration: number,
  low: number,
  high: number,
): number[] {
  const all = getValidPeriods(duration).sort((a, b) => b - a);
  const filtered = all.filter((p) => p >= low && p <= high);
  return filtered.length > 0 ? filtered : all;
}

export function quantizeToNearestDivisor(
  raw: number,
  validPeriods: number[],
): number {
  if (validPeriods.length === 0) return raw;
  let best = validPeriods[0];
  let bestDist = Math.abs(raw - best);
  for (const p of validPeriods) {
    const dist = Math.abs(raw - p);
    if (dist < bestDist || (dist === bestDist && p > best)) {
      best = p;
      bestDist = dist;
    }
  }
  return best;
}

function quantizeLoopSpeed(
  speed: number,
  period: number,
  duration: number,
): number {
  const cyclesPerLoop = duration / period;
  if (!Number.isFinite(cyclesPerLoop) || cyclesPerLoop <= 0) {
    return speed;
  }
  return Math.round(speed * cyclesPerLoop) / cyclesPerLoop;
}

// Role-based preset factory: returns animation config for a given role
// Period selection: background roles get longer periods, detail/fg get shorter
function getRolePreset(
  role: LayerRole,
  index: number,
  total: number,
  duration: number,
  mul: SceneMultipliers = DEFAULT_MULTIPLIERS,
  depthNorm: number = 0,
): AnimationConfig {
  const periods = filterPeriods(duration, mul.periodRangeLow, mul.periodRangeHigh);
  const phaseOffset = Math.round((360 * index) / total * mul.phaseSpreadMul) % 360;

  // Period selection helper: pick from sorted periods (descending) by tier
  // tier 0 = longest period (background-plate), tier 4 = shortest (detail)
  const pickPeriod = (tier: number): number => {
    const idx = Math.min(Math.floor((tier / 5) * periods.length), periods.length - 1);
    return periods[idx];
  };

  const pickGlowPeriod = (tier: number): number => {
    const basePeriod = pickPeriod(tier);
    const raw = basePeriod * mul.glowPeriodMul;
    return quantizeToNearestDivisor(raw, getValidPeriods(duration));
  };

  const tempo = 0.85 * mul.tempoMul;
  const colorCycle = (baseSpeed: number, tier: number) => {
    const period = pickPeriod(tier);
    const depthModulatedSpeed = baseSpeed * mul.colorCycleSpeedMul * tempo * (1 + (mul.depthSpeedInfluence ?? 0) * depthNorm);
    return {
      speed: quantizeLoopSpeed(depthModulatedSpeed, period, duration),
      period,
      phaseOffset,
    };
  };

  const shaderParams = {
    satBlendLow: mul.satBlendLow,
    satBlendHigh: mul.satBlendHigh,
    satInjectionMul: mul.satInjectionMul,
    glowPulseFloor: mul.glowPulseFloor,
    lumExponent: mul.lumExponent,
    hueKey: mul.hueKey,
    hueSpeed: mul.hueSpeed,
  };

  const presets: Record<LayerRole, AnimationConfig> = {
    "background-plate": {
      colorCycle: colorCycle(5, 0),
      glow: { intensity: 0.1 * mul.glowIntensityMul, pulse: 0.2 * tempo, period: pickGlowPeriod(0) },
      saturationBoost: 2.5 * mul.saturationBoostMul,
      luminanceKey: 0.4 * mul.luminanceKeyMul,
      ...shaderParams,
    },
    background: {
      colorCycle: colorCycle(8, 1),
      glow: { intensity: 0.15 * mul.glowIntensityMul, pulse: 0.3 * tempo, period: pickGlowPeriod(1) },
      saturationBoost: 2.3 * mul.saturationBoostMul,
      luminanceKey: 0.45 * mul.luminanceKeyMul,
      ...shaderParams,
    },
    midground: {
      colorCycle: colorCycle(10, 2),
      glow: { intensity: 0.2 * mul.glowIntensityMul, pulse: 0.4 * tempo, period: pickGlowPeriod(2) },
      saturationBoost: 2.5 * mul.saturationBoostMul,
      luminanceKey: 0.55 * mul.luminanceKeyMul,
      ...shaderParams,
    },
    subject: {
      colorCycle: colorCycle(10, 2),
      glow: { intensity: 0.25 * mul.glowIntensityMul, pulse: 0.45 * tempo, period: pickGlowPeriod(3) },
      saturationBoost: 2.8 * mul.saturationBoostMul,
      luminanceKey: 0.6 * mul.luminanceKeyMul,
      ...shaderParams,
    },
    detail: {
      colorCycle: colorCycle(15, 4),
      glow: { intensity: 0.3 * mul.glowIntensityMul, pulse: 0.5 * tempo, period: pickGlowPeriod(4) },
      saturationBoost: 2.2 * mul.saturationBoostMul,
      luminanceKey: 0.65 * mul.luminanceKeyMul,
      ...shaderParams,
    },
    "foreground-occluder": {
      colorCycle: colorCycle(8, 3),
      glow: { intensity: 0.15 * mul.glowIntensityMul, pulse: 0.3 * tempo, period: pickGlowPeriod(3) },
      saturationBoost: 1.8 * mul.saturationBoostMul,
      luminanceKey: 0.5 * mul.luminanceKeyMul,
      ...shaderParams,
    },
  };

  const preset = presets[role];
  if (preset.glow) {
    preset.glow.intensity *= 1 + (mul.depthGlowInfluence ?? 0) * depthNorm;
  }
  return preset;
}

export async function generateSceneJson(
  sourceName: string,
  layers: RetainedLayer[],
  resolution: [number, number] = [1080, 1080],
  duration: number = 20,
  config?: Partial<ResearchConfig>,
  fps: number = 30,
): Promise<SceneConfig> {
  const mul: SceneMultipliers = {
    colorCycleSpeedMul: config?.colorCycleSpeedMul ?? 1.0,
    glowIntensityMul: config?.glowIntensityMul ?? 1.0,
    saturationBoostMul: config?.saturationBoostMul ?? 1.0,
    luminanceKeyMul: config?.luminanceKeyMul ?? 1.0,
    bloomStrengthMul: config?.bloomStrengthMul ?? 1.0,
    chromaticAberrationOffsetMul: config?.chromaticAberrationOffsetMul ?? 1.0,
    bloomRadiusMul: config?.bloomRadiusMul ?? 1.0,
    bloomThresholdMul: config?.bloomThresholdMul ?? 1.0,
    caModulationOffsetMul: config?.caModulationOffsetMul ?? 1.0,
    satBlendLow: config?.satBlendLow ?? 0.1,
    satBlendHigh: config?.satBlendHigh ?? 0.4,
    satInjectionMul: config?.satInjectionMul ?? 0.35,
    glowPulseFloor: config?.glowPulseFloor ?? 0.0,
    lumExponent: config?.lumExponent ?? 1.0,
    tempoMul: config?.tempoMul ?? 1.0,
    phaseSpreadMul: config?.phaseSpreadMul ?? 1.0,
    periodRangeLow: config?.periodRangeLow ?? 1.0,
    periodRangeHigh: config?.periodRangeHigh ?? 20.0,
    glowPeriodMul: config?.glowPeriodMul ?? 1.0,
    blendMode: config?.blendMode ?? "normal",
    depthSpeedInfluence: config?.depthSpeedInfluence ?? null,
    depthGlowInfluence: config?.depthGlowInfluence ?? null,
    depthParallaxScale: config?.depthParallaxScale ?? null,
    hazeIntensity: config?.hazeIntensity ?? null,
    featherRadius: config?.featherRadius ?? null,
    hueKey: 1.5,
    hueSpeed: 3.0,
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

  // Depth stddev guard: if depth variance is too low, cinematic axes are meaningless
  const depthValues = layers.map(l => l.meanDepth).filter((d): d is number => d != null);
  const depthMean = depthValues.length > 0 ? depthValues.reduce((a, b) => a + b, 0) / depthValues.length : 0;
  const stddev = depthValues.length >= 2
    ? Math.sqrt(depthValues.reduce((s, v) => s + (v - depthMean) ** 2, 0) / depthValues.length)
    : 0;
  const cinematicActive = depthValues.length >= 2 && stddev >= 5;
  if (!cinematicActive) {
    mul.depthSpeedInfluence = 0;
    mul.depthGlowInfluence = 0;
    mul.depthParallaxScale = 0;
    mul.hazeIntensity = 0;
    mul.featherRadius = 0;
  } else {
    // Auto-activate depth cinematic effects based on layer depth distribution
    // null = auto-calculate, 0 = explicitly off, >0 = explicit override
    if (mul.depthParallaxScale === null) {
      // Parallax based on depth range: far layers (depthNorm < 0.3) → 0.02, near (> 0.7) → 0.005
      const depthNorms = layers.map(l => (l.meanDepth ?? 128) / 255);
      const minDN = Math.min(...depthNorms);
      mul.depthParallaxScale = minDN < 0.3 ? 0.02
        : minDN > 0.7 ? 0.005
        : 0.02 - (minDN - 0.3) * (0.02 - 0.005) / 0.4;
    }
    if (mul.hazeIntensity === null) {
      // Haze based on far-layer presence: depthNorm < 0.3 → 0.3, > 0.5 → 0
      const depthNorms = layers.map(l => (l.meanDepth ?? 128) / 255);
      const minDN = Math.min(...depthNorms);
      mul.hazeIntensity = minDN < 0.3 ? 0.3
        : minDN > 0.5 ? 0
        : 0.3 * (1 - (minDN - 0.3) / 0.2);
    }
    if (mul.featherRadius === null) {
      // Feather only for scenes with foreground-occluder layers
      const hasOccluder = layers.some(l => l.role === "foreground-occluder");
      mul.featherRadius = hasOccluder ? 0.05 : 0;
    }
    if (mul.depthSpeedInfluence === null) mul.depthSpeedInfluence = 0.3;
    if (mul.depthGlowInfluence === null) mul.depthGlowInfluence = 0.2;
  }

  const sceneLayers: SceneConfig["layers"] = [];

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const role: LayerRole = layer.role || "midground";
    const depthNorm = (layer.meanDepth ?? 128) / 255;
    const preset = getRolePreset(role, i, layers.length, duration, mul, depthNorm);

    sceneLayers.push({
      id: `layer-${i}`,
      file: layer.file.startsWith("layers/") ? layer.file : `layers/${path.basename(layer.file)}`,
      zIndex: i,
      opacity: 1.0,
      blending: mul.blendMode,
      role,
      ...(layer.meanDepth !== undefined ? { meanDepth: layer.meanDepth } : {}),
      animation: preset,
    });
  }

  return {
    version: 1,
    source: sourceName,
    resolution: evenRes,
    duration,
    fps,
    layers: sceneLayers,
    effects: {
      bloom: {
        strength: 0.6 * mul.bloomStrengthMul,
        radius: Math.min(0.4 * mul.bloomRadiusMul, 1.0),
        threshold: Math.min(0.7 * mul.bloomThresholdMul, 1.0),
      },
      chromaticAberration: {
        offset: 1.5 * mul.chromaticAberrationOffsetMul,
        modulationOffset: 0.3 * mul.caModulationOffsetMul,
      },
      parallax: { scale: mul.depthParallaxScale ?? 0 },
      haze: { intensity: mul.hazeIntensity ?? 0 },
      feather: { radius: mul.featherRadius ?? 0 },
    },
  };
}
