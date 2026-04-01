import { z } from "zod";
import { existsSync, readFileSync } from "fs";

export const ResearchConfigSchema = z
  .object({
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
    depthSpeedInfluence: z.number().min(0.0).max(2.0).nullable().default(null),
    depthGlowInfluence: z.number().min(0.0).max(2.0).nullable().default(null),
    depthParallaxScale: z.number().min(0.0).max(0.1).nullable().default(null),
    hazeIntensity: z.number().min(0.0).max(1.0).nullable().default(null),
    featherRadius: z.number().min(0.0).max(0.2).nullable().default(null),

    // ── Blend Mode ───────────────────────────────────────────
    blendMode: z.enum(["normal", "add", "multiply", "screen"]).default("normal"),
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
    colorCycleSpeedMul: 1.5,
    glowIntensityMul: 0.2,
    saturationBoostMul: 2.0,
    luminanceKeyMul: 1.2,
    bloomStrengthMul: 0.3,
    chromaticAberrationOffsetMul: 0.5,
    lumExponent: 1.5,
  });
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
      return ResearchConfigSchema.parse(JSON.parse(raw));
    }

    const objMatch = raw.match(/\.parse\(\s*(\{[\s\S]*?\})\s*\)/);
    if (objMatch?.[1]) {
      try {
        let extracted = objMatch[1];
        extracted = extracted.replace(/\/\/.*$/gm, "");
        extracted = extracted.replace(/,(\s*[}\]])/g, "$1");
        extracted = extracted.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
        extracted = extracted.trim();
        return ResearchConfigSchema.parse(JSON.parse(extracted));
      } catch (innerErr) {
        console.warn(
          `Config parse issue in ${targetPath}: ${innerErr instanceof Error ? innerErr.message : innerErr}. Using defaults.`,
        );
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
