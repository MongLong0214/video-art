import { z } from "zod";
import { existsSync, readFileSync } from "fs";
import {
  ALPHA_THRESHOLD,
  MIN_COVERAGE,
  IOU_DEDUPE_THRESHOLD,
  UNIQUE_COVERAGE_THRESHOLD,
  MIN_RETAINED_LAYERS,
} from "../lib/pipeline-constants.js";

export const ResearchConfigSchema = z
  .object({
    // ── SAM 2 Decomposition ─────────────────────────────────
    samMaskLimit: z.number().int().min(3).max(12).nullable().default(null),
    samPointsPerSide: z.number().int().min(16).max(128).default(64),
    samPredIouThresh: z.number().min(0.1).max(0.99).default(0.7),
    samStabilityScoreThresh: z.number().min(0.1).max(0.99).default(0.92),
    maxLayers: z.number().int().min(3).max(16).default(12),
    minRetainedLayers: z.number().int().min(1).max(12).default(MIN_RETAINED_LAYERS),

    // ── Candidate Extraction ─────────────────────────────────
    alphaThreshold: z.number().int().min(1).max(254).default(ALPHA_THRESHOLD),
    minCoverage: z.number().min(0.001).max(0.05).default(MIN_COVERAGE),

    // ── Complexity Scoring ───────────────────────────────────
    simpleEdgeMax: z.number().min(0.01).max(0.3).default(0.1),
    simpleEntropyMax: z.number().min(3.0).max(8.0).default(5.5),
    complexEdgeMin: z.number().min(0.05).max(0.5).default(0.2),
    complexEntropyMin: z.number().min(4.0).max(9.0).default(7.0),
    edgePixelThreshold: z.number().int().min(10).max(100).default(30),

    // ── Ownership ────────────────────────────────────────────
    iouDedupeThreshold: z.number().min(0.3).max(0.98).default(IOU_DEDUPE_THRESHOLD),
    uniqueCoverageThreshold: z.number().min(0.001).max(0.1).default(UNIQUE_COVERAGE_THRESHOLD),

    // ── Role Assignment ──────────────────────────────────────
    centralityThreshold: z.number().min(0.1).max(0.4).default(0.25),
    bgPlateMinBboxRatio: z.number().min(0.1).max(0.6).default(0.3),
    edgeTolerancePx: z.number().int().min(1).max(10).default(2),

    // ── Depth Role Assignment ───────────────────────────
    depthRoleWeight: z.number().min(0.0).max(1.0).default(0.5),
    depthForegroundThreshold: z.number().min(0.1).max(0.4).default(0.3),
    depthBackgroundThreshold: z.number().min(0.5).max(0.9).default(0.7),

    // ── Scene Generator Multipliers ──────────────────────────
    colorCycleSpeedMul: z.number().min(0.1).max(3.0).default(1.0),
    glowIntensityMul: z.number().min(0.0).max(3.0).default(1.0),
    saturationBoostMul: z.number().min(0.1).max(3.0).default(1.0),
    luminanceKeyMul: z.number().min(0.1).max(3.0).default(1.0),
    bloomStrengthMul: z.number().min(0.0).max(3.0).default(1.0),
    chromaticAberrationOffsetMul: z.number().min(0.0).max(3.0).default(1.0),

    // ── Effect Composer Axes ─────────────────────────────────
    bloomRadiusMul: z.number().min(0.1).max(3.0).default(1.0),
    bloomThresholdMul: z.number().min(0.1).max(3.0).default(1.0),
    caModulationOffsetMul: z.number().min(0.1).max(3.0).default(1.0),

    // ── Shader Axes ──────────────────────────────────────────
    satBlendLow: z.number().min(0.01).max(0.5).default(0.1),
    satBlendHigh: z.number().min(0.1).max(0.8).default(0.4),
    satInjectionMul: z.number().min(0.1).max(1.0).default(0.35),
    glowPulseFloor: z.number().min(0.0).max(0.9).default(0.0),
    lumExponent: z.number().min(0.5).max(3.0).default(1.0),

    // ── Scene Generator Axes ─────────────────────────────────
    tempoMul: z.number().min(0.3).max(3.0).default(1.0),
    phaseSpreadMul: z.number().min(0.1).max(3.0).default(1.0),
    periodRangeLow: z.number().min(1.0).max(10.0).default(1.0),
    periodRangeHigh: z.number().min(5.0).max(30.0).default(20.0),
    glowPeriodMul: z.number().min(0.3).max(3.0).default(1.0),

    // ── Depth Cinematic Axes ────────────────────────────────────
    depthSpeedInfluence: z.number().min(0.0).max(2.0).default(0.0),
    depthGlowInfluence: z.number().min(0.0).max(2.0).default(0.0),
    depthParallaxScale: z.number().min(0.0).max(0.1).default(0.0),
    hazeIntensity: z.number().min(0.0).max(1.0).default(0.0),
    featherRadius: z.number().min(0.0).max(0.2).default(0.0),

    // ── SAM3 / VLM Axes ────────────────────────────────────────
    sam3Threshold: z.number().min(0.1).max(0.9).default(0.25),
    vlmMaxPrompts: z.number().int().min(3).max(10).default(6),
    secondPassEnabled: z.boolean().default(true),
    secondPassThreshold: z.number().min(0.5).max(0.95).default(0.8),
    useSam3: z.boolean().default(true),

    // ── Mask Post-Processing ───────────────────────────────────
    morphCloseEnabled: z.boolean().default(true),
    morphCloseKernelScale: z.number().min(0.001).max(0.05).default(0.01),
    alphaMatteEnabled: z.boolean().default(true),
    alphaMatteRadiusScale: z.number().min(0.001).max(0.02).default(0.003),

    // ── Model Selection ────────────────────────────────────────
    segmentationModel: z.enum(["sam3", "grounded-sam2", "evf-sam"]).default("sam3"),
    apiProvider: z.enum(["replicate", "fal"]).default("replicate"),

    // ── Blend Mode ───────────────────────────────────────────
    blendMode: z.enum(["normal", "add", "multiply", "screen"]).default("normal"),
  })
  .refine((c) => c.simpleEdgeMax < c.complexEdgeMin, {
    message: "simpleEdgeMax must be less than complexEdgeMin",
    path: ["simpleEdgeMax"],
  })
  .refine((c) => c.satBlendLow < c.satBlendHigh, {
    message: "satBlendLow must be less than satBlendHigh",
    path: ["satBlendLow"],
  })
  .refine((c) => c.periodRangeLow < c.periodRangeHigh, {
    message: "periodRangeLow must be less than periodRangeHigh",
    path: ["periodRangeLow"],
  });

export type ResearchConfig = z.infer<typeof ResearchConfigSchema>;

export function getDefaultConfig(): ResearchConfig {
  return ResearchConfigSchema.parse({
    samMaskLimit: 6,
    samPointsPerSide: 80,
    samPredIouThresh: 0.6,
    samStabilityScoreThresh: 0.9,
    maxLayers: 12,
    minRetainedLayers: 1,
    alphaThreshold: 96,
    minCoverage: 0.005,
    simpleEdgeMax: 0.1,
    simpleEntropyMax: 5.5,
    complexEdgeMin: 0.2,
    complexEntropyMin: 7,
    edgePixelThreshold: 30,
    iouDedupeThreshold: 0.92,
    uniqueCoverageThreshold: 0.02,
    centralityThreshold: 0.25,
    bgPlateMinBboxRatio: 0.3,
    edgeTolerancePx: 2,
    depthRoleWeight: 0.5,
    depthForegroundThreshold: 0.3,
    depthBackgroundThreshold: 0.7,
    colorCycleSpeedMul: 1.5,
    glowIntensityMul: 0.2,
    saturationBoostMul: 2.0,
    luminanceKeyMul: 1.2,
    bloomStrengthMul: 0.3,
    chromaticAberrationOffsetMul: 0.5,
    lumExponent: 1.5,
    depthSpeedInfluence: 0,
    depthGlowInfluence: 0,
    depthParallaxScale: 0,
    hazeIntensity: 0,
    featherRadius: 0,
    sam3Threshold: 0.25,
    vlmMaxPrompts: 6,
    secondPassEnabled: true,
    secondPassThreshold: 0.8,
    useSam3: true,
    morphCloseEnabled: true,
    morphCloseKernelScale: 0.01,
    alphaMatteEnabled: true,
    alphaMatteRadiusScale: 0.003,
    segmentationModel: "sam3",
    apiProvider: "replicate",
  });
}

function normalizeLegacyConfigInput(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const normalized = { ...(value as Record<string, unknown>) };
  if (
    normalized.samMaskLimit == null &&
    typeof normalized.numLayers === "number"
  ) {
    normalized.samMaskLimit = normalized.numLayers;
  }

  return normalized;
}

export function loadConfig(filePath?: string): ResearchConfig {
  const targetPath = filePath ?? "scripts/research/research-config.ts";

  if (!existsSync(targetPath)) {
    console.warn(`Config file not found: ${targetPath}. Using defaults.`);
    return getDefaultConfig();
  }

  try {
    const raw = readFileSync(targetPath, "utf-8");

    if (targetPath.endsWith(".json")) {
      return ResearchConfigSchema.parse(
        normalizeLegacyConfigInput(JSON.parse(raw)),
      );
    }

    // For .ts files: extract object literal from the exported config
    // Look for a JSON-like object between braces after parse({...})
    const objMatch = raw.match(/\.parse\(\s*(\{[\s\S]*?\})\s*\)/);
    if (objMatch?.[1]) {
      try {
        // The parse({}) call uses defaults, so an empty object is valid
        const extracted = objMatch[1].replace(/\/\/.*$/gm, "").trim();
        const parsed = normalizeLegacyConfigInput(JSON.parse(extracted));
        return ResearchConfigSchema.parse(parsed);
      } catch {
        // Empty {} or unparseable — use defaults
        return getDefaultConfig();
      }
    }

    return getDefaultConfig();
  } catch (err) {
    console.warn(
      `Failed to parse config from ${targetPath}: ${err instanceof Error ? err.message : err}. Using defaults.`,
    );
    return getDefaultConfig();
  }
}
