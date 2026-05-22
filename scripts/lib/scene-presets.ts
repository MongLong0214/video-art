/**
 * Scene tone presets for pipeline-pro.
 *
 * - prism-sunset (default): Triadic phase (0/120/240) + warm vignette + strong CA prism.
 *   Tuned sat 4.2/4.8/3.6, godRays 1.05, bloom 0.92, CA 0.26/0.07. Production baseline.
 * - commercial: Enterprise vivid (sat 4.4/5.4/3.8, godRays 1.1, bloom 1.0).
 * - elegant: Restrained tasteful (sat 2.4/2.6/1.95, godRays 0.55, bloom 0.55).
 */

export type Tone = "prism-sunset" | "commercial" | "elegant";

export interface LayerAnimation {
  colorCycle: { speed: number; period: number; phaseOffset: number };
  glow: { intensity: number; pulse: number; period: number };
  saturationBoost: number;
  luminanceKey: number;
  satBlendLow: number;
  satBlendHigh: number;
  satInjectionMul: number;
  glowPulseFloor: number;
  lumExponent: number;
  hueKey: number;
  hueSpeed: number;
  breath: { amplitude: number; frequency: number; period: number };
  noiseScale: number;
  noiseSpeed: number;
  noiseAmount: number;
  rimIntensity: number;
  rimHueShift: number;
  rimWidth: number;
  ringIntensity: number;
  ringFreq: number;
  ringPeriod: number;
}

export interface SceneEffects {
  bloom: { strength: number; radius: number; threshold: number };
  chromaticAberration: { offset: number; modulationOffset: number };
  parallax: { scale: number };
  haze: { intensity: number };
  feather: { radius: number };
  trails: { strength: number };
  kaleidoscope: { segments: number; blend: number };
  godRays: {
    intensity: number;
    decay: number;
    density: number;
    weight: number;
    threshold: number;
    samples: number;
    centerX: number;
    centerY: number;
  };
  aura: { intensity: number; radius: number; hueSpeed: number; samples: number };
  mandala: {
    opacity: number;
    segments: number;
    rings: number;
    rotationSpeed: number;
    breathSpeed: number;
    hueSpeed: number;
  };
  filmGrade: {
    grain: number;
    vignetteIntensity: number;
    vignetteRadius: number;
    vignetteTintR: number;
    vignetteTintG: number;
    vignetteTintB: number;
    contrast: number;
    sCurve: number;
  };
}

export interface TonePreset {
  layer0: LayerAnimation;
  layer1: LayerAnimation;
  layer2: LayerAnimation;
  effects: SceneEffects;
}

const SHARED_ZERO_MOTION = {
  noiseScale: 0,
  noiseSpeed: 0,
  noiseAmount: 0,
  rimIntensity: 0,
  rimHueShift: 0,
  ringIntensity: 0,
} as const;

export const COMMERCIAL_PRESET: TonePreset = {
  layer0: {
    colorCycle: { speed: 19, period: 20, phaseOffset: 0 },
    glow: { intensity: 0, pulse: 0, period: 10 },
    saturationBoost: 4.4,
    luminanceKey: 0.5,
    satBlendLow: 0.03,
    satBlendHigh: 0.42,
    satInjectionMul: 0.95,
    glowPulseFloor: 0,
    lumExponent: 0.85,
    hueKey: 4.4,
    hueSpeed: 18,
    breath: { amplitude: 0, frequency: 3, period: 10 },
    ...SHARED_ZERO_MOTION,
    rimWidth: 0.004,
    ringFreq: 30,
    ringPeriod: 10,
  },
  layer1: {
    colorCycle: { speed: 22, period: 10, phaseOffset: 180 },
    glow: { intensity: 0.1, pulse: 0, period: 5 },
    saturationBoost: 5.4,
    luminanceKey: 0.55,
    satBlendLow: 0.03,
    satBlendHigh: 0.45,
    satInjectionMul: 1.4,
    glowPulseFloor: 0,
    lumExponent: 0.78,
    hueKey: 5.4,
    hueSpeed: 20,
    breath: { amplitude: 0, frequency: 5, period: 5 },
    ...SHARED_ZERO_MOTION,
    rimWidth: 0.002,
    ringFreq: 22,
    ringPeriod: 5,
  },
  layer2: {
    colorCycle: { speed: 16, period: 10, phaseOffset: 90 },
    glow: { intensity: 0, pulse: 0, period: 5 },
    saturationBoost: 3.8,
    luminanceKey: 0.3,
    satBlendLow: 0.02,
    satBlendHigh: 0.34,
    satInjectionMul: 0.85,
    glowPulseFloor: 0,
    lumExponent: 0.82,
    hueKey: 3.8,
    hueSpeed: 14,
    breath: { amplitude: 0, frequency: 3, period: 5 },
    ...SHARED_ZERO_MOTION,
    rimWidth: 0.004,
    ringFreq: 30,
    ringPeriod: 10,
  },
  effects: {
    bloom: { strength: 1.0, radius: 0.92, threshold: 0.2 },
    chromaticAberration: { offset: 0.18, modulationOffset: 0.05 },
    parallax: { scale: 0 },
    haze: { intensity: 0 },
    feather: { radius: 0 },
    trails: { strength: 0 },
    kaleidoscope: { segments: 0, blend: 0 },
    godRays: {
      intensity: 1.1,
      decay: 0.984,
      density: 0.96,
      weight: 1.0,
      threshold: 0.18,
      samples: 128,
      centerX: 0.5,
      centerY: 0.25,
    },
    aura: { intensity: 1.05, radius: 0.054, hueSpeed: 0.34, samples: 30 },
    mandala: {
      opacity: 0,
      segments: 6,
      rings: 3,
      rotationSpeed: 0.16,
      breathSpeed: 0.06,
      hueSpeed: 0.08,
    },
    filmGrade: {
      grain: 0,
      vignetteIntensity: 0.05,
      vignetteRadius: 1.25,
      vignetteTintR: 0.04,
      vignetteTintG: 0.02,
      vignetteTintB: 0.13,
      contrast: 1.005,
      sCurve: 0.04,
    },
  },
};

export const ELEGANT_PRESET: TonePreset = {
  layer0: {
    colorCycle: { speed: 18, period: 20, phaseOffset: 0 },
    glow: { intensity: 0, pulse: 0, period: 10 },
    saturationBoost: 2.4,
    luminanceKey: 0.5,
    satBlendLow: 0.03,
    satBlendHigh: 0.3,
    satInjectionMul: 0.54,
    glowPulseFloor: 0,
    lumExponent: 1.05,
    hueKey: 2.2,
    hueSpeed: 15,
    breath: { amplitude: 0, frequency: 3, period: 10 },
    ...SHARED_ZERO_MOTION,
    rimWidth: 0.004,
    ringFreq: 30,
    ringPeriod: 10,
  },
  layer1: {
    colorCycle: { speed: 17, period: 10, phaseOffset: 180 },
    glow: { intensity: 0, pulse: 0, period: 5 },
    saturationBoost: 2.6,
    luminanceKey: 0.58,
    satBlendLow: 0.03,
    satBlendHigh: 0.24,
    satInjectionMul: 0.56,
    glowPulseFloor: 0,
    lumExponent: 1.1,
    hueKey: 2.5,
    hueSpeed: 16,
    breath: { amplitude: 0, frequency: 5, period: 5 },
    ...SHARED_ZERO_MOTION,
    rimWidth: 0.002,
    ringFreq: 22,
    ringPeriod: 5,
  },
  layer2: {
    colorCycle: { speed: 14, period: 10, phaseOffset: 90 },
    glow: { intensity: 0, pulse: 0, period: 5 },
    saturationBoost: 1.95,
    luminanceKey: 0.3,
    satBlendLow: 0.02,
    satBlendHigh: 0.18,
    satInjectionMul: 0.36,
    glowPulseFloor: 0,
    lumExponent: 0.92,
    hueKey: 2.0,
    hueSpeed: 12,
    breath: { amplitude: 0, frequency: 3, period: 5 },
    ...SHARED_ZERO_MOTION,
    rimWidth: 0.004,
    ringFreq: 30,
    ringPeriod: 10,
  },
  effects: {
    bloom: { strength: 0.55, radius: 0.78, threshold: 0.4 },
    chromaticAberration: { offset: 0.08, modulationOffset: 0.04 },
    parallax: { scale: 0 },
    haze: { intensity: 0 },
    feather: { radius: 0 },
    trails: { strength: 0 },
    kaleidoscope: { segments: 0, blend: 0 },
    godRays: {
      intensity: 0.55,
      decay: 0.98,
      density: 0.93,
      weight: 0.78,
      threshold: 0.32,
      samples: 128,
      centerX: 0.5,
      centerY: 0.4,
    },
    aura: { intensity: 0.65, radius: 0.04, hueSpeed: 0.26, samples: 28 },
    mandala: {
      opacity: 0,
      segments: 14,
      rings: 7,
      rotationSpeed: 0.08,
      breathSpeed: 0.18,
      hueSpeed: 0.08,
    },
    filmGrade: {
      grain: 0,
      vignetteIntensity: 0.15,
      vignetteRadius: 1.08,
      vignetteTintR: 0.04,
      vignetteTintG: 0.02,
      vignetteTintB: 0.13,
      contrast: 1.025,
      sCurve: 0.1,
    },
  },
};

export const PRISM_SUNSET_PRESET: TonePreset = {
  layer0: {
    colorCycle: { speed: 21, period: 20, phaseOffset: 0 },
    glow: { intensity: 0, pulse: 0, period: 10 },
    saturationBoost: 4.2,
    luminanceKey: 0.48,
    satBlendLow: 0.03,
    satBlendHigh: 0.42,
    satInjectionMul: 0.92,
    glowPulseFloor: 0,
    lumExponent: 0.9,
    hueKey: 3.6,
    hueSpeed: 19,
    breath: { amplitude: 0, frequency: 3, period: 10 },
    ...SHARED_ZERO_MOTION,
    rimWidth: 0.004,
    ringFreq: 30,
    ringPeriod: 10,
  },
  layer1: {
    colorCycle: { speed: 24, period: 10, phaseOffset: 120 },
    glow: { intensity: 0.1, pulse: 0, period: 5 },
    saturationBoost: 4.8,
    luminanceKey: 0.55,
    satBlendLow: 0.03,
    satBlendHigh: 0.44,
    satInjectionMul: 1.22,
    glowPulseFloor: 0,
    lumExponent: 0.84,
    hueKey: 4.2,
    hueSpeed: 21,
    breath: { amplitude: 0, frequency: 5, period: 5 },
    ...SHARED_ZERO_MOTION,
    rimWidth: 0.002,
    ringFreq: 22,
    ringPeriod: 5,
  },
  layer2: {
    colorCycle: { speed: 18, period: 10, phaseOffset: 240 },
    glow: { intensity: 0, pulse: 0, period: 5 },
    saturationBoost: 3.6,
    luminanceKey: 0.3,
    satBlendLow: 0.02,
    satBlendHigh: 0.34,
    satInjectionMul: 0.76,
    glowPulseFloor: 0,
    lumExponent: 0.82,
    hueKey: 3.2,
    hueSpeed: 16,
    breath: { amplitude: 0, frequency: 3, period: 5 },
    ...SHARED_ZERO_MOTION,
    rimWidth: 0.004,
    ringFreq: 30,
    ringPeriod: 10,
  },
  effects: {
    bloom: { strength: 0.92, radius: 0.9, threshold: 0.24 },
    chromaticAberration: { offset: 0.26, modulationOffset: 0.07 },
    parallax: { scale: 0 },
    haze: { intensity: 0 },
    feather: { radius: 0 },
    trails: { strength: 0 },
    kaleidoscope: { segments: 0, blend: 0 },
    godRays: {
      intensity: 1.05,
      decay: 0.983,
      density: 0.96,
      weight: 1.0,
      threshold: 0.2,
      samples: 128,
      centerX: 0.5,
      centerY: 0.3,
    },
    aura: { intensity: 1.0, radius: 0.052, hueSpeed: 0.32, samples: 30 },
    mandala: {
      opacity: 0,
      segments: 6,
      rings: 3,
      rotationSpeed: 0.16,
      breathSpeed: 0.06,
      hueSpeed: 0.08,
    },
    filmGrade: {
      grain: 0,
      vignetteIntensity: 0.14,
      vignetteRadius: 1.08,
      vignetteTintR: 0.16,
      vignetteTintG: 0.05,
      vignetteTintB: 0.04,
      contrast: 1.025,
      sCurve: 0.08,
    },
  },
};

export const TONE_PRESETS: Record<Tone, TonePreset> = {
  "prism-sunset": PRISM_SUNSET_PRESET,
  commercial: COMMERCIAL_PRESET,
  elegant: ELEGANT_PRESET,
};

export const DEFAULT_TONE: Tone = "prism-sunset";

export const MIN_RESOLUTION = { width: 1632, height: 2912 } as const;
