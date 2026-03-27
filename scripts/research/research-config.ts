import { z } from "zod";

export const ResearchConfigSchema = z
  .object({
    // ── Decomposition ────────────────────────────────────────
    numLayers: z.number().int().min(2).max(12).default(4),
    method: z
      .enum(["qwen-only", "qwen-zoedepth"])
      .default("qwen-only"),

    // ── Candidate Extraction ─────────────────────────────────
    alphaThreshold: z.number().int().min(1).max(254).default(128),
    minCoverage: z.number().min(0.001).max(0.05).default(0.005),

    // ── Complexity Scoring ───────────────────────────────────
    simpleEdgeMax: z.number().min(0.01).max(0.3).default(0.1),
    simpleEntropyMax: z.number().min(3.0).max(8.0).default(5.5),
    complexEdgeMin: z.number().min(0.05).max(0.5).default(0.2),
    complexEntropyMin: z.number().min(4.0).max(9.0).default(7.0),
    edgePixelThreshold: z.number().int().min(10).max(100).default(30),

    // ── Dedupe & Ownership ───────────────────────────────────
    iouDedupeThreshold: z.number().min(0.3).max(0.95).default(0.85),
    uniqueCoverageThreshold: z
      .number()
      .min(0.005)
      .max(0.1)
      .default(0.02),

    // ── Role Assignment ──────────────────────────────────────
    centralityThreshold: z.number().min(0.1).max(0.4).default(0.25),
    bgPlateMinBboxRatio: z.number().min(0.1).max(0.6).default(0.3),
    edgeTolerancePx: z.number().int().min(1).max(10).default(2),

    // ── Retention ────────────────────────────────────────────
    maxLayers: z.number().int().min(3).max(16).default(8),
    minRetainedLayers: z.number().int().min(1).max(6).default(3),

    // ── Depth (Variant B only) ───────────────────────────────
    depthZones: z.number().int().min(2).max(8).default(4),
    depthSplitThreshold: z.number().min(0.05).max(0.4).default(0.15),

    // ── Variant Selection ────────────────────────────────────
    qualityThresholdPct: z.number().min(1).max(30).default(10),

    // ── Scene Generator Multipliers ──────────────────────────
    colorCycleSpeedMul: z.number().min(0.1).max(3.0).default(1.0),
    parallaxDepthMul: z.number().min(0.1).max(3.0).default(1.0),
    waveAmplitudeMul: z.number().min(0.0).max(3.0).default(1.0),
    glowIntensityMul: z.number().min(0.0).max(3.0).default(1.0),
    saturationBoostMul: z.number().min(0.1).max(3.0).default(1.0),
    luminanceKeyMul: z.number().min(0.1).max(3.0).default(1.0),
  })
  .refine((c) => c.simpleEdgeMax < c.complexEdgeMin, {
    message: "simpleEdgeMax must be less than complexEdgeMin",
    path: ["simpleEdgeMax"],
  });

export type ResearchConfig = z.infer<typeof ResearchConfigSchema>;

export function getDefaultConfig(): ResearchConfig {
  return ResearchConfigSchema.parse({});
}
