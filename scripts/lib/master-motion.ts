import type { Analysis, ColorPath } from "./master-derivation.js";

export type MotionTier = "calm" | "extreme";
export type SceneLayerId = "base" | "void" | "body" | "ornament" | "edge" | "highlight";
export type DetailLayerId = "body" | "ornament" | "edge";

export type LayerMotionSpeeds = Record<SceneLayerId, number>;
export type LayerPhaseAmounts = Record<DetailLayerId, number>;

export type GlowWaveFields = {
  readonly strength: number;
  readonly speed: number;
  readonly sharpness: number;
  readonly fieldCycles: number;
};

export type MultipassFeedbackFields = {
  readonly strength: number;
  readonly warp: number;
  readonly decay: number;
  readonly hueShift: number;
  readonly zoom: number;
  readonly rotate: number;
  readonly mask?: string;
};

export const DEFAULT_MOTION_TIER: MotionTier = "extreme";

const BASE_ROTATION_SPEEDS: readonly number[] = [2, 3, 5, 8, 13, 22];

export const CALM_GLOW_WAVES: Record<SceneLayerId, GlowWaveFields> = {
  base: { strength: 0, speed: 0, sharpness: 0.5, fieldCycles: 1 },
  void: { strength: 0, speed: 0, sharpness: 0.5, fieldCycles: 1 },
  body: { strength: 0.28, speed: 5, sharpness: 0.45, fieldCycles: 1 },
  ornament: { strength: 0.45, speed: 8, sharpness: 0.6, fieldCycles: 1 },
  edge: { strength: 0.25, speed: 5, sharpness: 0.55, fieldCycles: 1 },
  highlight: { strength: 0.35, speed: 8, sharpness: 0.6, fieldCycles: 1 },
};

export const EXTREME_GLOW_WAVES: Record<SceneLayerId, GlowWaveFields> = {
  base: CALM_GLOW_WAVES.base,
  void: CALM_GLOW_WAVES.void,
  body: { strength: 0.5, speed: 8, sharpness: 0.6, fieldCycles: 1 },
  ornament: { strength: 0.7, speed: 13, sharpness: 0.7, fieldCycles: 1.5 },
  edge: { strength: 0.45, speed: 8, sharpness: 0.65, fieldCycles: 1 },
  highlight: { strength: 0.55, speed: 13, sharpness: 0.65, fieldCycles: 1 },
};

export const EXTREME_PRESERVE_SPEEDS: LayerMotionSpeeds = {
  base: 2,
  void: 3,
  body: 8,
  ornament: 13,
  edge: 21,
  highlight: 13,
};

export const EXTREME_PRESERVE_PHASE_AMOUNTS: LayerPhaseAmounts = {
  body: 0.3,
  ornament: 0.4,
  edge: 0.5,
};

export const R8_MULTIPASS_FEEDBACK: MultipassFeedbackFields = { strength: 0.2, warp: 0, decay: 0.82, hueShift: 0.015, zoom: 1.0, rotate: 0 };
export const R9_PORTAL_FEEDBACK: MultipassFeedbackFields = { strength: 0.24, warp: 0, decay: 0.83, hueShift: 0, zoom: 0.985, rotate: 0, mask: "layers/portal.png" };
export const R10_PORTAL_FEEDBACK: MultipassFeedbackFields = { strength: 0.3, warp: 0, decay: 0.83, hueShift: 0, zoom: 0.98, rotate: 0, mask: "layers/portal.png" };

export function motionTierOrDefault(motionTier: MotionTier | undefined): MotionTier {
  return motionTier ?? DEFAULT_MOTION_TIER;
}

export function glowWavesForMotion(motionTier: MotionTier): Record<SceneLayerId, GlowWaveFields> {
  return motionTier === "extreme" ? EXTREME_GLOW_WAVES : CALM_GLOW_WAVES;
}

export function layerPhaseAmountsForMotion(motionTier: MotionTier, colorPath: ColorPath): LayerPhaseAmounts | undefined {
  if (motionTier === "extreme" && colorPath === "preserve-glow-wave") return EXTREME_PRESERVE_PHASE_AMOUNTS;
  return undefined;
}

export function speedMap(analysis: Analysis, colorPath: ColorPath, motionTier: MotionTier): LayerMotionSpeeds {
  if (colorPath === "preserve-glow-wave") {
    if (motionTier === "extreme") return EXTREME_PRESERVE_SPEEDS;
    return { base: 0, void: 2, body: 2, ornament: 3, edge: 5, highlight: 3 };
  }
  const scaled = BASE_ROTATION_SPEEDS.map((speed) => Math.max(1, Math.round(speed * (1 - 0.4 * analysis.M8.finishedVivid))));
  return { base: scaled[0], void: scaled[0], body: scaled[2], ornament: scaled[4], edge: scaled[5], highlight: scaled[3] };
}

export function portalFeedbackFor(enabled: boolean, motionTier: MotionTier): MultipassFeedbackFields {
  if (!enabled) return R8_MULTIPASS_FEEDBACK;
  return motionTier === "extreme" ? R10_PORTAL_FEEDBACK : R9_PORTAL_FEEDBACK;
}
