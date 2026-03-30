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
    luminanceFallbackEnabled: z.boolean().default(true),
    luminanceFallbackMinSamLayers: z.number().int().min(0).max(12).default(3),
    luminanceFallbackZoneCount: z.number().int().min(1).max(8).default(6),
    luminanceFallbackResidualOnly: z.boolean().default(false),
    luminanceFallbackResidualCoverageMin: z.number().min(0.0).max(1.0).default(0.0),
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
    luminanceFallbackEnabled: true,
    luminanceFallbackMinSamLayers: 4,
    luminanceFallbackZoneCount: 3,
    luminanceFallbackResidualOnly: true,
    luminanceFallbackResidualCoverageMin: 0.03,
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
    colorCycleSpeedMul: 0.75,
    glowIntensityMul: 0,
    saturationBoostMul: 0.622,
    luminanceKeyMul: 1.056,
    bloomStrengthMul: 0.799,
    chromaticAberrationOffsetMul: 0.907,
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
