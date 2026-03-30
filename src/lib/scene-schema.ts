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
  animation: animationSchema.default({
    saturationBoost: 2.5,
    luminanceKey: 0.6,
    satBlendLow: 0.1,
    satBlendHigh: 0.4,
    satInjectionMul: 0.35,
    glowPulseFloor: 0.0,
    lumExponent: 1.0,
  }),
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

const effectsSchema = z.object({
  bloom: bloomSchema.default({ strength: 0.6, radius: 0.4, threshold: 0.7 }),
  chromaticAberration: chromaticAberrationSchema.default({ offset: 1.5, modulationOffset: 0.3 }),
  parallax: parallaxEffectSchema.default({ scale: 0 }),
  haze: hazeEffectSchema.default({ intensity: 0 }),
  feather: featherEffectSchema.default({ radius: 0 }),
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
    resolution: z.tuple([z.number().positive(), z.number().positive()]),
    duration: z.number().int().positive().max(300).default(20),
    fps: z.number().positive().default(30),
    layers: z.array(layerSchema).min(1),
    effects: effectsSchema.default({
      bloom: { strength: 0.6, radius: 0.4, threshold: 0.7 },
      chromaticAberration: { offset: 1.5, modulationOffset: 0.3 },
      parallax: { scale: 0 },
      haze: { intensity: 0 },
      feather: { radius: 0 },
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
    });
  });

export type SceneConfig = z.infer<typeof sceneSchema>;
export type LayerConfig = z.infer<typeof layerSchema>;
export type AnimationConfig = z.infer<typeof animationSchema>;
export type EffectsConfig = z.infer<typeof effectsSchema>;
export type AudioConfig = z.infer<typeof audioSchema>;

export interface LayerCandidate {
  id: string;
  source: "sam2-segment" | "sam3-semantic";
  filePath: string;
  width: number;
  height: number;
  coverage: number;
  uniqueCoverage?: number;
  meanDepth?: number;
  bbox: { x: number; y: number; w: number; h: number };
  centroid: { x: number; y: number };
  edgeDensity: number;
  componentCount: number;
  role?: LayerRole;
  parentId?: string;
  droppedReason?: string;
}
