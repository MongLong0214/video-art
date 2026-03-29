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
  })
  .refine((c) => c.simpleEdgeMax < c.complexEdgeMin, {
    message: "simpleEdgeMax must be less than complexEdgeMin",
    path: ["simpleEdgeMax"],
  });

export type ResearchConfig = z.infer<typeof ResearchConfigSchema>;

export function getDefaultConfig(): ResearchConfig {
  return ResearchConfigSchema.parse({
    samMaskLimit: 3,
    minRetainedLayers: 1,
    alphaThreshold: 96,
    uniqueCoverageThreshold: 0.02,
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
