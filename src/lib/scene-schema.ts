import { z } from "zod";

export const getValidPeriods = (duration: number): number[] => {
  if (duration <= 0) throw new Error("Duration must be positive");
  const divisors: number[] = [];
  for (let i = 1; i <= duration; i++) {
    if (duration % i === 0) divisors.push(i);
  }
  return divisors;
};

export const layerRoleSchema = z.enum([
  "background-plate",
  "background",
  "midground",
  "subject",
  "detail",
  "foreground-occluder",
  "light-rays",
]);

export type LayerRole = z.infer<typeof layerRoleSchema>;

const animationSchema = z.object({
  colorCycle: z
    .object({
      speed: z.number(),
      period: z.number().positive(),
      phaseOffset: z.number().min(0).max(360).default(0),
    })
    .optional(),
  colorCycleDesync: z
    .object({
      amount: z.number().min(0).max(0.25).default(0),
      cycles: z.number().int().positive().max(12).default(1),
    })
    .default({ amount: 0, cycles: 1 }),
  wave: z
    .object({
      amplitude: z.number().min(0),
      frequency: z.number().min(0),
      period: z.number().positive(),
    })
    .optional(),
  glow: z
    .object({
      intensity: z.number().min(0),
      pulse: z.number().min(0),
      period: z.number().positive(),
    })
    .optional(),
  glowWave: z
    .object({
      strength: z.number().min(0).max(1).default(0),
      speed: z.number().int().default(0),
      sharpness: z.number().min(0).max(1).default(0.5),
      fieldCycles: z.number().min(0.25).max(2).default(1),
    })
    .default({ strength: 0, speed: 0, sharpness: 0.5, fieldCycles: 1 }),
  glowWavePhaseSource: z.enum(["phaseField", "flowField"]).default("phaseField"),
  glowWave2: z
    .object({
      strength: z.number().min(0).max(1).default(0),
      speed: z.number().int().default(0),
      sharpness: z.number().min(0).max(1).default(0.5),
      fieldCycles: z.number().min(0.25).max(4).default(1),
    })
    .default({ strength: 0, speed: 0, sharpness: 0.5, fieldCycles: 1 }),
  parallax: z
    .object({
      depth: z.number(),
    })
    .optional(),
  saturationBoost: z.number().min(0).max(10).default(2.5),
  luminanceKey: z.number().min(0).max(1).default(0.6),
  satBlendLow: z.number().default(0.1),
  satBlendHigh: z.number().default(0.4),
  satInjectionMul: z.number().default(0.35),
  glowPulseFloor: z.number().default(0.0),
  lumExponent: z.number().default(1.0),
  phaseField: z.string().regex(/^[\w\-\/\.]+\.png$/).optional(),
  phaseField2: z.string().regex(/^[\w\-\/\.]+\.png$/).optional(),
  depthField: z.string().regex(/^[\w\-\/\.]+\.png$/).optional(),
  flowField: z.string().regex(/^[\w\-\/\.]+\.png$/).optional(),
  streamField: z.string().regex(/^[\w\-\/\.]+\.png$/).optional(),
  regionField: z.string().regex(/^[\w\-\/\.]+\.png$/).optional(),
  phaseAmount: z.number().min(0).max(4).default(0),
  phaseWarpAmount: z.number().min(0).max(2).default(0),
  structureFlow: z
    .object({
      strength: z.number().min(0).max(0.005).default(0),
      cycles: z.number().int().positive().default(3),
    })
    .default({ strength: 0, cycles: 3 }),
  tangentMicroflow: z
    .object({
      amount: z.number().min(0).max(1).default(0),
      maxDisplacementPx: z.number().min(0).max(5).default(0),
      cycles: z.number().int().positive().max(48).default(1),
      phaseScale: z.number().min(0).max(8).default(1),
    })
    .default({
      amount: 0,
      maxDisplacementPx: 0,
      cycles: 1,
      phaseScale: 1,
    }),
  sourceFlowAdvection: z
    .object({
      amount: z.number().min(0).max(1).default(0),
      maxDisplacementPx: z.number().min(0).max(64).default(0),
      cycles: z.number().int().positive().max(24).default(1),
      phaseScale: z.number().min(0).max(8).default(1),
      normalMix: z.number().min(0).max(1).default(0.35),
      edgePreserve: z.number().min(0).max(1).default(1),
      detailGain: z.number().min(0).max(6).default(1),
    })
    .default({
      amount: 0,
      maxDisplacementPx: 0,
      cycles: 1,
      phaseScale: 1,
      normalMix: 0.35,
      edgePreserve: 1,
      detailGain: 1,
    }),
  sourceFlowTransport: z
    .object({
      amount: z.number().min(0).max(1).default(0),
      macroDisplacementPx: z.number().min(0).max(96).default(0),
      macroCycles: z.number().int().positive().max(8).default(1),
      microDisplacementPx: z.number().min(0).max(24).default(0),
      microCycles: z.number().int().positive().max(48).default(1),
      phaseScale: z.number().min(0).max(8).default(1),
      normalMix: z.number().min(0).max(1).default(0.35),
      edgePreserve: z.number().min(0).max(1).default(1),
      colorAmount: z.number().min(0).max(1).default(0),
    })
    .default({
      amount: 0,
      macroDisplacementPx: 0,
      macroCycles: 1,
      microDisplacementPx: 0,
      microCycles: 1,
      phaseScale: 1,
      normalMix: 0.35,
      edgePreserve: 1,
      colorAmount: 0,
    }),
  sourceStreamFlow: z
    .object({
      amount: z.number().min(0).max(1).default(0),
      maxDisplacementPx: z.number().min(0).max(48).default(0),
      cycles: z.number().int().positive().max(24).default(1),
      wavelengthPx: z.number().min(8).max(256).default(64),
      edgePreserve: z.number().min(0).max(1).default(1),
      streamPhase: z.boolean().default(false),
      normalMix: z.number().min(0).max(1).default(0),
      materialMaskMix: z.number().min(0).max(1).default(0),
    })
    .default({
      amount: 0,
      maxDisplacementPx: 0,
      cycles: 1,
      wavelengthPx: 64,
      edgePreserve: 1,
      streamPhase: false,
      normalMix: 0,
      materialMaskMix: 0,
    }),
  sourceMaterialDissolve: z
    .object({
      amount: z.number().min(0).max(1).default(0),
      maxDisplacementPx: z.number().min(0).max(32).default(0),
      cycles: z.number().int().positive().max(24).default(1),
      wavelengthPx: z.number().min(8).max(256).default(64),
      edgePreserve: z.number().min(0).max(1).default(1),
      streamPhase: z.boolean().default(false),
    })
    .default({
      amount: 0,
      maxDisplacementPx: 0,
      cycles: 1,
      wavelengthPx: 64,
      edgePreserve: 1,
      streamPhase: false,
    }),
  sourceDetailResidualFlow: z
    .object({
      amount: z.number().min(0).max(1).default(0),
      maxDisplacementPx: z.number().min(0).max(32).default(0),
      cycles: z.number().int().positive().max(24).default(1),
      bandLimitPx: z.number().min(24).max(96).default(24),
      edgePreserve: z.number().min(0).max(1).default(1),
      chromaOnly: z.boolean().default(false),
      streamPhase: z.boolean().default(false),
    })
    .default({
      amount: 0,
      maxDisplacementPx: 0,
      cycles: 1,
      bandLimitPx: 24,
      edgePreserve: 1,
      chromaOnly: false,
      streamPhase: false,
    }),
  sourceRegionAffinity: z
    .object({
      amount: z.number().min(0).max(1).default(0),
      maxDisplacementPx: z.number().min(0).max(32).default(0),
      cycles: z.number().int().positive().max(24).default(1),
      edgePreserve: z.number().min(0).max(1).default(1),
      normalMix: z.number().min(0).max(1).default(0.5),
      streamPhase: z.boolean().default(false),
    })
    .default({
      amount: 0,
      maxDisplacementPx: 0,
      cycles: 1,
      edgePreserve: 1,
      normalMix: 0.5,
      streamPhase: false,
    }),
  sourceChromaFlow: z
    .object({
      amount: z.number().min(0).max(1).default(0),
      maxDisplacementPx: z.number().min(0).max(8).default(0),
      cycles: z.number().int().positive().max(48).default(1),
      phaseScale: z.number().min(0).max(8).default(1),
      normalMix: z.number().min(0).max(1).default(0),
      detailGain: z.number().min(0).max(6).default(1),
    })
    .default({
      amount: 0,
      maxDisplacementPx: 0,
      cycles: 1,
      phaseScale: 1,
      normalMix: 0,
      detailGain: 1,
    }),
  sourceSpectralFlow: z
    .object({
      amount: z.number().min(0).max(1).default(0),
      radiusPx: z.number().min(0).max(24).default(0),
      cycles: z.number().int().positive().max(48).default(1),
      phaseScale: z.number().min(0).max(8).default(1),
      normalMix: z.number().min(0).max(1).default(0),
    })
    .default({
      amount: 0,
      radiusPx: 0,
      cycles: 1,
      phaseScale: 1,
      normalMix: 0,
    }),
  valueLift: z.number().min(0).max(1).default(0),
  greenCompress: z.number().min(0).max(1).default(0),
  hueSpace: z.enum(["hsv", "oklch"]).default("hsv"),
  hueKey: z.number().min(0).default(0),
  hueSpeed: z.number().default(1),
  breath: z
    .object({
      amplitude: z.number().min(0).max(0.1).default(0),
      frequency: z.number().min(0).max(20).default(3),
      period: z.number().positive().default(10),
    })
    .optional(),
  noiseScale: z.number().min(0).max(20).default(0),
  noiseSpeed: z.number().min(0).max(10).default(1),
  noiseAmount: z.number().min(0).max(1).default(0),
  domainWarp: z.number().min(0).max(3).default(0),
  domainWarp2: z.number().min(0).max(3).default(0),
  tileRepeat: z.number().min(0).max(20).default(0),
  polarTwist: z.number().min(-10).max(10).default(0),
  voronoiScale: z.number().min(0).max(50).default(8),
  voronoiAmount: z.number().min(0).max(2).default(0),
  paletteAmount: z.number().min(0).max(1).default(0),
  paletteValueFloor: z.number().min(0).max(1).default(0),
  paletteSatFloor: z.number().min(0).max(1).default(0),
  flowAmp: z.number().min(0).max(0.5).default(0),
  flowScale: z.number().min(0).max(20).default(3),
  adaptiveFlow: z
    .object({
      strength: z.number().min(0).max(1).default(0),
      scale: z.number().min(0).max(20).default(3),
      cycles: z.number().int().positive().max(12).default(1),
      luminanceWeight: z.number().min(0).max(1).default(0),
      saturationWeight: z.number().min(0).max(1).default(0),
      edgeWeight: z.number().min(0).max(1).default(0),
      maxDisplacementPx: z.number().min(0).max(12).default(4),
      edgePreserve: z.number().min(0).max(1).default(1),
    })
    .default({
      strength: 0,
      scale: 3,
      cycles: 1,
      luminanceWeight: 0,
      saturationWeight: 0,
      edgeWeight: 0,
      maxDisplacementPx: 4,
      edgePreserve: 1,
    }),
  colorMotionMask: z
    .object({
      floor: z.number().min(0).max(1).default(1),
      luminanceWeight: z.number().min(0).max(1).default(0),
      saturationWeight: z.number().min(0).max(1).default(0),
      edgeWeight: z.number().min(0).max(1).default(0),
      power: z.number().min(0.25).max(4).default(1),
    })
    .default({
      floor: 1,
      luminanceWeight: 0,
      saturationWeight: 0,
      edgeWeight: 0,
      power: 1,
    }),
  chromaOrbit: z
    .object({
      radius: z.number().min(0).max(0.2).default(0),
      speed: z.number().int().min(-120).max(120).default(0),
      phaseScale: z.number().min(0.25).max(8).default(1),
    })
    .default({
      radius: 0,
      speed: 0,
      phaseScale: 1,
    }),
  sourcePrism: z
    .object({
      amount: z.number().min(0).max(1).default(0),
      radiusPx: z.number().min(0).max(6).default(0),
      directionCycles: z.number().int().min(-40).max(40).default(0),
      chromaCycles: z.number().int().min(-120).max(120).default(0),
      surfaceCycles: z.number().int().min(-120).max(120).default(0),
      phaseFlowPx: z.number().min(0).max(64).default(0),
      phaseFlowCycles: z.number().int().min(-40).max(40).default(0),
      phaseMix: z.number().min(0).max(1).default(0),
      detailBoost: z.number().min(0.25).max(4).default(1),
      phaseScale: z.number().min(0).max(12).default(0),
    })
    .default({
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
    }),
  sourceColorClamp: z
    .object({
      maxDrift: z.number().min(0).max(1).default(1),
    })
    .default({
      maxDrift: 1,
    }),
  paletteA: z.tuple([z.number(), z.number(), z.number()]).default([0.5, 0.5, 0.5]),
  paletteB: z.tuple([z.number(), z.number(), z.number()]).default([0.5, 0.5, 0.5]),
  paletteC: z.tuple([z.number(), z.number(), z.number()]).default([1.0, 1.0, 1.0]),
  paletteD: z.tuple([z.number(), z.number(), z.number()]).default([0.0, 0.33, 0.67]),
  patternType: z.number().min(0).max(3).default(0),
  patternScale: z.number().min(0).max(200).default(20),
  patternAmount: z.number().min(0).max(1).default(0),
  sdfType: z.number().min(0).max(3).default(0),
  sdfScale: z.number().min(0).max(20).default(2),
  sdfAmount: z.number().min(0).max(1).default(0),
  juliaAmount: z.number().min(0).max(1).default(0),
  juliaC: z.tuple([z.number(), z.number()]).default([-0.7, 0.27015]),
  rotateSpeed: z.number().min(-5).max(5).default(0),
  scalePulse: z.number().min(0).max(0.5).default(0),
  bicubicFilter: z.boolean().default(false),
  worleyScale: z.number().min(0).max(50).default(8),
  worleyAmount: z.number().min(0).max(1).default(0),
  rimIntensity: z.number().min(0).max(2).default(0),
  rimHueShift: z.number().min(-2).max(2).default(0.1),
  rimWidth: z.number().min(0).max(0.05).default(0.004),
  ringIntensity: z.number().min(0).max(2).default(0),
  ringFreq: z.number().min(0).max(200).default(30),
  ringPeriod: z.number().positive().default(10),
});

const blendModeSchema = z.enum(["normal", "add", "multiply", "screen"]).default("normal");

const layerSchema = z.object({
  id: z.string(),
  file: z.string().regex(/^[\w\-\/\.]+\.png$/, "Layer file must be a relative PNG path"),
  zIndex: z.number().int().min(0),
  opacity: z.number().min(0).max(1).default(1),
  blending: blendModeSchema,
  role: layerRoleSchema.optional(),
  meanDepth: z.number().min(0).max(255).optional(),
  animation: animationSchema.default(() => animationSchema.parse({})),
});

const bloomSchema = z.object({
  strength: z.number().min(0).default(0.6),
  radius: z.number().min(0).default(0.4),
  threshold: z.number().min(0).max(1).default(0.7),
});

const chromaticAberrationSchema = z.object({
  offset: z.number().min(0).default(1.5),
  modulationOffset: z.number().min(0).max(1).default(0.3),
});

const parallaxEffectSchema = z.object({
  scale: z.number().min(0).max(0.1).default(0),
});

const hazeEffectSchema = z.object({
  intensity: z.number().min(0).max(1).default(0),
});

const featherEffectSchema = z.object({
  radius: z.number().min(0).max(0.2).default(0),
});

const trailsEffectSchema = z.object({
  strength: z.number().min(0).max(0.5).default(0),
});

const kaleidoscopeEffectSchema = z.object({
  segments: z.number().int().min(0).max(12).default(0),
  blend: z.number().min(0).max(1).default(0.3),
});

const godRaysEffectSchema = z.object({
  intensity: z.number().min(0).max(2).default(0),
  decay: z.number().min(0).max(1).default(0.94),
  density: z.number().min(0).max(2).default(0.9),
  weight: z.number().min(0).max(2).default(0.4),
  threshold: z.number().min(0).max(1).default(0.6),
  samples: z.number().int().min(8).max(128).default(64),
  centerX: z.number().min(-1).max(2).default(0.5),
  centerY: z.number().min(-1).max(2).default(0.5),
});

const auraEffectSchema = z.object({
  intensity: z.number().min(0).max(2).default(0),
  radius: z.number().min(0).max(0.2).default(0.04),
  hueSpeed: z.number().min(0).max(5).default(0.1),
  samples: z.number().int().min(4).max(32).default(16),
});

const mandalaEffectSchema = z.object({
  opacity: z.number().min(0).max(1).default(0),
  segments: z.number().int().min(3).max(24).default(12),
  rings: z.number().min(1).max(30).default(8),
  rotationSpeed: z.number().min(-2).max(2).default(0.08),
  breathSpeed: z.number().min(0).max(3).default(0.4),
  hueSpeed: z.number().min(0).max(2).default(0.05),
});

const multipassFeedbackSchema = z.object({
  strength: z.number().min(0).max(0.95).default(0),
  warp: z.number().min(0).max(1).default(0.2),
  decay: z.number().min(0).max(1).default(0.9),
  hueShift: z.number().min(0).max(1).default(0),
  zoom: z.number().min(0.9).max(1.1).default(1.0),
  rotate: z.number().min(-0.2).max(0.2).default(0),
  reactionDiffusionAmount: z.number().min(0).max(1).default(0),
  reactionDiffusionSpeed: z.number().min(0).max(1).default(0.35),
  mask: z.string().regex(/^[\w\-\/\.]+\.png$/).optional(),
});

const lensDistortionSchema = z.object({
  barrel: z.number().min(-0.5).max(0.5).default(0),
  chromatic: z.number().min(0).max(2).default(0),
  dof: z.number().min(0).max(1).default(0),
  vignetteRadius: z.number().min(0.5).max(1).default(1),
});

const cameraDriftEffectSchema = z.object({
  radius: z.number().min(0).max(0.02).default(0),
  cycles: z.number().int().positive().default(1),
  pivot: z.number().min(0).max(1).default(0.5),
});

const filmGradeEffectSchema = z.object({
  grain: z.number().min(0).max(0.3).default(0),
  vignetteIntensity: z.number().min(0).max(1).default(0),
  vignetteRadius: z.number().min(0).max(1.5).default(0.9),
  vignetteTintR: z.number().min(0).max(1).default(0.12),
  vignetteTintG: z.number().min(0).max(1).default(0.05),
  vignetteTintB: z.number().min(0).max(1).default(0.25),
  contrast: z.number().min(0.5).max(2).default(1),
  sCurve: z.number().min(0).max(1).default(0),
});

const effectsSchema = z.object({
  bloom: bloomSchema.default({ strength: 0.6, radius: 0.4, threshold: 0.7 }),
  chromaticAberration: chromaticAberrationSchema.default({ offset: 1.5, modulationOffset: 0.3 }),
  parallax: parallaxEffectSchema.default({ scale: 0 }),
  haze: hazeEffectSchema.default({ intensity: 0 }),
  feather: featherEffectSchema.default({ radius: 0 }),
  trails: trailsEffectSchema.default({ strength: 0 }),
  kaleidoscope: kaleidoscopeEffectSchema.default({ segments: 0, blend: 0.3 }),
  godRays: godRaysEffectSchema.default({ intensity: 0, decay: 0.94, density: 0.9, weight: 0.4, threshold: 0.6, samples: 64, centerX: 0.5, centerY: 0.5 }),
  aura: auraEffectSchema.default({ intensity: 0, radius: 0.04, hueSpeed: 0.1, samples: 16 }),
  mandala: mandalaEffectSchema.default({ opacity: 0, segments: 12, rings: 8, rotationSpeed: 0.08, breathSpeed: 0.4, hueSpeed: 0.05 }),
  filmGrade: filmGradeEffectSchema.default({ grain: 0, vignetteIntensity: 0, vignetteRadius: 0.9, vignetteTintR: 0.12, vignetteTintG: 0.05, vignetteTintB: 0.25, contrast: 1, sCurve: 0 }),
  multipassFeedback: multipassFeedbackSchema.default({ strength: 0, warp: 0.2, decay: 0.9, hueShift: 0, zoom: 1.0, rotate: 0, reactionDiffusionAmount: 0, reactionDiffusionSpeed: 0.35 }),
  lensDistortion: lensDistortionSchema.default({ barrel: 0, chromatic: 0, dof: 0, vignetteRadius: 1 }),
  cameraDrift: cameraDriftEffectSchema.default({ radius: 0, cycles: 1, pivot: 0.5 }),
});

const audioSchema = z.object({
  bpm: z.number().int().min(60).max(200).optional(),
  key: z
    .enum([
      "C", "Cm", "C#", "C#m", "D", "Dm", "D#", "D#m",
      "E", "Em", "F", "Fm", "F#", "F#m",
      "G", "Gm", "G#", "G#m", "A", "Am", "A#", "A#m", "B", "Bm",
    ])
    .default("Am"),
  scale: z
    .enum(["major", "minor", "dorian", "phrygian", "mixolydian"])
    .default("minor"),
  genre: z.enum(["techno", "trance", "house", "dnb", "ambient"]).default("techno"),
  energy: z.number().min(0).max(1).default(0.7),
  preset: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
});

export const sceneSchema = z
  .object({
    version: z.literal(1),
    source: z.string(),
    // Resolution capped to prevent client-side DoS via arbitrary-size ?scene= URLs.
    // 7680 (8K) is the practical upper bound for modern GPUs; layered pipeline produces
    // 9:16 Reels content in 1080×1920 normally.
    resolution: z.tuple([z.number().positive().max(7680), z.number().positive().max(7680)]),
    duration: z.number().int().positive().max(300).default(20),
    fps: z.number().positive().default(60),
    layers: z.array(layerSchema).min(1),
    effects: effectsSchema.default({
      bloom: { strength: 0.6, radius: 0.4, threshold: 0.7 },
      chromaticAberration: { offset: 1.5, modulationOffset: 0.3 },
      parallax: { scale: 0 },
      haze: { intensity: 0 },
      feather: { radius: 0 },
      trails: { strength: 0 },
      kaleidoscope: { segments: 0, blend: 0.3 },
      godRays: { intensity: 0, decay: 0.94, density: 0.9, weight: 0.4, threshold: 0.6, samples: 64, centerX: 0.5, centerY: 0.5 },
      aura: { intensity: 0, radius: 0.04, hueSpeed: 0.1, samples: 16 },
      mandala: { opacity: 0, segments: 12, rings: 8, rotationSpeed: 0.08, breathSpeed: 0.4, hueSpeed: 0.05 },
      filmGrade: { grain: 0, vignetteIntensity: 0, vignetteRadius: 0.9, vignetteTintR: 0.12, vignetteTintG: 0.05, vignetteTintB: 0.25, contrast: 1, sCurve: 0 },
      multipassFeedback: { strength: 0, warp: 0.2, decay: 0.9, hueShift: 0, zoom: 1.0, rotate: 0, reactionDiffusionAmount: 0, reactionDiffusionSpeed: 0.35 },
      lensDistortion: { barrel: 0, chromatic: 0, dof: 0, vignetteRadius: 1 },
      cameraDrift: { radius: 0, cycles: 1, pivot: 0.5 },
    }),
    audio: audioSchema.optional(),
  })
  .superRefine((data, ctx) => {
    const validPeriods = getValidPeriods(data.duration);
    data.layers.forEach((layer, layerIdx) => {
      const anim = layer.animation;
      const checkPeriod = (section: string, period: number) => {
        if (!validPeriods.includes(period)) {
          ctx.addIssue({
            code: "custom",
            message: `Period must be a divisor of ${data.duration}: ${validPeriods.join(", ")}`,
            path: ["layers", layerIdx, "animation", section, "period"],
          });
        }
      };
      if (anim.colorCycle) checkPeriod("colorCycle", anim.colorCycle.period);
      if (anim.wave) checkPeriod("wave", anim.wave.period);
      if (anim.glow) checkPeriod("glow", anim.glow.period);
      if (anim.breath) checkPeriod("breath", anim.breath.period);
      if (anim.sourceFlowTransport.amount > 0 && anim.flowField === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Active sourceFlowTransport requires a source-derived flowField",
          path: ["layers", layerIdx, "animation", "flowField"],
        });
      }
      if (anim.sourceStreamFlow.amount > 0 && anim.flowField === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Active sourceStreamFlow requires a source-derived flowField",
          path: ["layers", layerIdx, "animation", "flowField"],
        });
      }
      if (anim.sourceStreamFlow.amount > 0 && anim.sourceStreamFlow.streamPhase && anim.streamField === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Active sourceStreamFlow streamPhase requires a source-derived streamField",
          path: ["layers", layerIdx, "animation", "streamField"],
        });
      }
      if (anim.sourceMaterialDissolve.amount > 0 && anim.flowField === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Active sourceMaterialDissolve requires a source-derived flowField",
          path: ["layers", layerIdx, "animation", "flowField"],
        });
      }
      if (
        anim.sourceMaterialDissolve.amount > 0 &&
        anim.sourceMaterialDissolve.streamPhase &&
        anim.streamField === undefined
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Active sourceMaterialDissolve streamPhase requires a source-derived streamField",
          path: ["layers", layerIdx, "animation", "streamField"],
        });
      }
      if (anim.sourceDetailResidualFlow.amount > 0 && anim.flowField === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Active sourceDetailResidualFlow requires a source-derived flowField",
          path: ["layers", layerIdx, "animation", "flowField"],
        });
      }
      if (
        anim.sourceDetailResidualFlow.amount > 0 &&
        anim.sourceDetailResidualFlow.streamPhase &&
        anim.streamField === undefined
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Active sourceDetailResidualFlow streamPhase requires a source-derived streamField",
          path: ["layers", layerIdx, "animation", "streamField"],
        });
      }
      if (anim.sourceRegionAffinity.amount > 0 && anim.flowField === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Active sourceRegionAffinity requires a source-derived flowField",
          path: ["layers", layerIdx, "animation", "flowField"],
        });
      }
      if (anim.sourceRegionAffinity.amount > 0 && anim.regionField === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Active sourceRegionAffinity requires a source-derived regionField",
          path: ["layers", layerIdx, "animation", "regionField"],
        });
      }
      if (
        anim.sourceRegionAffinity.amount > 0 &&
        anim.sourceRegionAffinity.streamPhase &&
        anim.streamField === undefined
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Active sourceRegionAffinity streamPhase requires a source-derived streamField",
          path: ["layers", layerIdx, "animation", "streamField"],
        });
      }
    });
  });

export type SceneConfig = z.infer<typeof sceneSchema>;
export type LayerConfig = z.infer<typeof layerSchema>;
export type AnimationConfig = z.infer<typeof animationSchema>;
export type EffectsConfig = z.infer<typeof effectsSchema>;
export type AudioConfig = z.infer<typeof audioSchema>;
