import { z } from "zod";

const VALID_PERIODS = [1, 2, 4, 5, 10, 20] as const;
const periodSchema = z.number().refine((v) => VALID_PERIODS.includes(v as 1), {
  message: `Period must be a divisor of 20: ${VALID_PERIODS.join(", ")}`,
});

const animationSchema = z.object({
  colorCycle: z
    .object({
      speed: z.number(),
      hueRange: z.number().min(0).max(360),
      period: periodSchema,
    })
    .optional(),
  wave: z
    .object({
      amplitude: z.number().min(0),
      frequency: z.number().min(0),
      period: periodSchema,
    })
    .optional(),
  glow: z
    .object({
      intensity: z.number().min(0),
      pulse: z.number().min(0),
      period: periodSchema,
    })
    .optional(),
  parallax: z
    .object({
      depth: z.number(),
    })
    .optional(),
});

const layerSchema = z.object({
  id: z.string(),
  file: z.string(),
  zIndex: z.number().int().min(0),
  opacity: z.number().min(0).max(1).default(1),
  animation: animationSchema.default({}),
});

const bloomSchema = z.object({
  strength: z.number().min(0).default(0.6),
  radius: z.number().min(0).default(0.4),
  threshold: z.number().min(0).max(1).default(0.7),
});

const chromaticAberrationSchema = z.object({
  offset: z.number().min(0).default(1.5),
});

const sparkleSchema = z.object({
  count: z.number().int().min(0).default(80),
  sizeMin: z.number().min(0).default(2),
  sizeMax: z.number().min(0).default(6),
  speed: z.number().min(0).default(1),
});

const effectsSchema = z.object({
  bloom: bloomSchema.default({ strength: 0.6, radius: 0.4, threshold: 0.7 }),
  chromaticAberration: chromaticAberrationSchema.default({ offset: 1.5 }),
  sparkle: sparkleSchema.default({ count: 80, sizeMin: 2, sizeMax: 6, speed: 1 }),
});

export const sceneSchema = z.object({
  version: z.literal(1),
  source: z.string(),
  resolution: z.tuple([z.number().positive(), z.number().positive()]),
  duration: z.number().positive().default(20),
  fps: z.number().positive().default(30),
  layers: z.array(layerSchema).min(1),
  effects: effectsSchema.default({
    bloom: { strength: 0.6, radius: 0.4, threshold: 0.7 },
    chromaticAberration: { offset: 1.5 },
    sparkle: { count: 80, sizeMin: 2, sizeMax: 6, speed: 1 },
  }),
});

export type SceneConfig = z.infer<typeof sceneSchema>;
export type LayerConfig = z.infer<typeof layerSchema>;
export type AnimationConfig = z.infer<typeof animationSchema>;
export type EffectsConfig = z.infer<typeof effectsSchema>;
