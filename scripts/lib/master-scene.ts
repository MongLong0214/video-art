import path from "node:path";
import type { Analysis, CameraDriftParams, DerivedParams, HueSpace, Intent, Palette, PhaseKind, RuleTrace, StructureFlowParams } from "./master-derivation.js";
import { addTrace, PALETTES } from "./master-derivation.js";
import { glowWavesForMotion, portalFeedbackFor } from "./master-motion.js";
import type { DetailLayerId, SceneLayerId } from "./master-motion.js";

type RotationFields = {
  readonly hueSpace?: HueSpace;
  readonly greenCompress?: number;
};

const GREEN_RISK_BODY_PALETTE_AMOUNT = 0.55;
const GREEN_RISK_ORNAMENT_PALETTE_AMOUNT = 0.65;
const GREEN_RISK_VOID_PALETTE_AMOUNT = 0.5;
const GREEN_RISK_VOID_SAT_FLOOR = 0.35;
const GREEN_RISK_BODY_SAT_FLOOR = 0.55;
const GREEN_RISK_ORNAMENT_SAT_FLOOR = 0.65;
const DARK_ANCHOR_EXISTS_PCT = 3;
const BLOOM_THRESHOLD_MIN = 0.55;
const BLOOM_THRESHOLD_MAX = 0.9;
const PRESERVE_PALETTE_AMOUNTS: Record<SceneLayerId, number> = {
  base: 0,
  void: 0.15,
  body: 0.1,
  ornament: 0.15,
  edge: 0.3,
  highlight: 0.1,
};
function phaseFor(kind: PhaseKind | undefined): string | undefined {
  return kind ? `layers/phase-${kind}.png` : undefined;
}

function amountFor(intent: Intent, value: number): number {
  return intent === "preserve" ? Math.min(value, 0.12) : Math.min(1, Math.max(0, value));
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function paletteFields(palette: Palette) {
  return { paletteA: palette.A, paletteB: palette.B, paletteC: palette.C, paletteD: palette.D };
}

function depthField(cameraDrift: CameraDriftParams) {
  return cameraDrift.radius > 0 ? { depthField: "layers/depth.png" } : {};
}

function structureFlowFields(layerId: SceneLayerId, structureFlow: StructureFlowParams) {
  if ((layerId === "body" || layerId === "edge") && structureFlow.strength > 0) {
    return { flowField: "layers/flow-field.png", structureFlow };
  }
  return {};
}

function deriveBloom(analysis: Analysis, traceRows: RuleTrace[]) {
  const satHeadroom = clamp((analysis.M2.satMean - 0.45) * 0.12, 0, 0.04);
  const brightAreaHeadroom = clamp(analysis.M1.brightAreaPct * 0.002, 0, 0.04);
  const rawThreshold = analysis.M1.p95 + 0.1 + satHeadroom + brightAreaHeadroom;
  const threshold = round4(clamp(rawThreshold, BLOOM_THRESHOLD_MIN, BLOOM_THRESHOLD_MAX));
  const brightVividSource = analysis.M1.p95 >= 0.7 || analysis.M2.satMean >= 0.55 || analysis.M1.brightAreaPct >= 8;
  const bloom = {
    strength: brightVividSource ? 0.48 : 0.58,
    radius: brightVividSource ? 0.5 : 0.56,
    threshold,
  };
  addTrace(
    traceRows,
    "bloom",
    { ...bloom, sourceP95: analysis.M1.p95, sourceSatMean: analysis.M2.satMean, brightAreaPct: analysis.M1.brightAreaPct, rawThreshold: round4(rawThreshold) },
    "R15.displayBrightness.bloomThreshold",
    `threshold derives from M1.p95 plus display-referred headroom, clamped ${BLOOM_THRESHOLD_MIN}-${BLOOM_THRESHOLD_MAX}; strength/radius are modestly lower for bright vivid sources`,
  );
  return bloom;
}

export function buildScene(sourcePath: string, imageSize: readonly [number, number], analysis: Analysis, derived: DerivedParams) {
  const primary = PALETTES[derived.paletteName];
  const night = PALETTES["jewel-night"];
  const opal = PALETTES["jewel-opal"];
  const greenRisk = analysis.M3.greenRisk;
  const intent = derived.resolvedIntent;
  const preserveGlowWave = derived.colorPath === "preserve-glow-wave";
  const glowWaves = glowWavesForMotion(derived.motionTier);
  const glowWaveFor = (layerId: SceneLayerId) => glowWaves[layerId];
  const phaseAmountFor = (layerId: DetailLayerId, kind: PhaseKind): number => derived.layerPhaseAmounts?.[layerId] ?? derived.phaseAmounts[kind];
  const bodyField = derived.phaseFieldAssignment.body;
  const ornamentField = derived.phaseFieldAssignment.ornament;
  const edgeField = derived.phaseFieldAssignment.edge;
  const bottomSaturationVoid = analysis.M1.darkAnchorPct < DARK_ANCHOR_EXISTS_PCT;
  const bloom = deriveBloom(analysis, derived.ruleTrace);
  const rotationFields = (layerId: string, paletteAmount: number): RotationFields => {
    if (preserveGlowWave) return { hueSpace: "oklch", greenCompress: 0.85 };
    if (!greenRisk) return {};
    const fields: RotationFields = {
      hueSpace: derived.greenRiskColorRoute.hueSpace,
      greenCompress: derived.greenRiskColorRoute.greenCompress,
    };
    addTrace(derived.ruleTrace, "hueRotation", { layer: layerId, paletteAmount, ...fields }, derived.greenRiskColorRoute.rule, `${derived.greenRiskColorRoute.reason}; palette-dominant vivid floors still apply to edge/body/ornament`);
    return fields;
  };
  const basePaletteAmount = preserveGlowWave ? PRESERVE_PALETTE_AMOUNTS.base : amountFor(intent, Math.min(0.1, derived.paletteAmount * 0.2));
  const voidPaletteAmount = preserveGlowWave ? PRESERVE_PALETTE_AMOUNTS.void : amountFor(intent, greenRisk ? GREEN_RISK_VOID_PALETTE_AMOUNT : Math.min(0.5, derived.paletteAmount * 0.8));
  const bodyPaletteAmount = preserveGlowWave ? PRESERVE_PALETTE_AMOUNTS.body : amountFor(intent, greenRisk ? GREEN_RISK_BODY_PALETTE_AMOUNT : derived.paletteAmount);
  const ornamentPaletteAmount = preserveGlowWave ? PRESERVE_PALETTE_AMOUNTS.ornament : amountFor(intent, greenRisk ? GREEN_RISK_ORNAMENT_PALETTE_AMOUNT : Math.min(1, derived.paletteAmount + 0.2));
  const edgePaletteAmount = preserveGlowWave ? PRESERVE_PALETTE_AMOUNTS.edge : amountFor(intent, Math.min(1, derived.paletteAmount + 0.35));
  const highlightPaletteAmount = preserveGlowWave ? PRESERVE_PALETTE_AMOUNTS.highlight : amountFor(intent, Math.min(0.3, derived.paletteAmount * 0.5));
  const voidSaturationBoost = bottomSaturationVoid ? 1.2 : 1.0;
  const bodySaturationBoost = preserveGlowWave ? 1.25 : 1.35;
  const ornamentSaturationBoost = preserveGlowWave ? 1.25 : 1.8;
  const edgeSaturationBoost = 1.25;
  const bodyPaletteValueFloor = preserveGlowWave ? 0 : 0.22;
  const ornamentPaletteValueFloor = preserveGlowWave ? 0 : 0.25;
  const edgePaletteValueFloor = preserveGlowWave ? 0 : 0.18;
  const highlightPaletteValueFloor = preserveGlowWave ? 0 : 0.4;
  const voidPaletteSatFloor = preserveGlowWave ? 0 : GREEN_RISK_VOID_SAT_FLOOR;
  const bodyPaletteSatFloor = preserveGlowWave ? 0 : greenRisk ? GREEN_RISK_BODY_SAT_FLOOR : 0.35;
  const ornamentPaletteSatFloor = preserveGlowWave ? 0 : greenRisk ? GREEN_RISK_ORNAMENT_SAT_FLOOR : 0.55;
  const edgePaletteSatFloor = preserveGlowWave ? 0 : 0.35;
  const highlightPaletteSatFloor = preserveGlowWave ? 0 : 0.2;
  const voidHueKey = Math.min(derived.hueKey, bottomSaturationVoid ? 0.4 : 0.2);
  if (preserveGlowWave) {
    addTrace(derived.ruleTrace, "layerPaletteAmount", PRESERVE_PALETTE_AMOUNTS, "R8.finishedVivid→preserve+glowWave", "finished-vivid preserve path uses fixed low per-layer palette budgets; greenRisk cannot raise them");
  } else if (greenRisk) {
    addTrace(derived.ruleTrace, "layerPaletteAmount", { void: voidPaletteAmount, body: bodyPaletteAmount, ornament: ornamentPaletteAmount }, "R4.greenRisk→paletteDominant", "body and ornament use palette-dominant jewel routing; void is unified separately for the R7 background pass");
    addTrace(derived.ruleTrace, "paletteFloors", { void: { paletteValueFloor: 0, paletteSatFloor: GREEN_RISK_VOID_SAT_FLOOR }, body: { paletteValueFloor: 0.22, paletteSatFloor: GREEN_RISK_BODY_SAT_FLOOR }, ornament: { paletteValueFloor: 0.25, paletteSatFloor: GREEN_RISK_ORNAMENT_SAT_FLOOR } }, "R4.greenRisk→vividPaletteFloors", "green-risk subject layers keep value and saturation floors high enough for jewel tones");
    addTrace(derived.ruleTrace, "voidUnify", { bottomSaturationFallback: bottomSaturationVoid, darkAnchorPct: analysis.M1.darkAnchorPct, paletteAmount: voidPaletteAmount, paletteValueFloor: 0, paletteSatFloor: GREEN_RISK_VOID_SAT_FLOOR, saturationBoost: voidSaturationBoost, hueKey: voidHueKey }, "R7.voidUnify", bottomSaturationVoid ? "bottom-saturation void fallback uses stronger palette blend and bounded hue-key for coherent slow background waves" : "dark-anchor void keeps a low value floor while raising palette coherence");
  }
  addTrace(derived.ruleTrace, "glowWave", glowWaves, derived.motionTier === "extreme" ? "R10.motionExtreme.glowWave" : "D-3-6.layerGlowWave", `${derived.motionTier} motion applies per-layer glowWave independently from colorPath=${derived.colorPath}`);
  return {
    version: 1,
    source: path.basename(sourcePath),
    resolution: imageSize,
    duration: 20,
    fps: 30,
    layers: [
      { id: "base", file: "layers/base.png", zIndex: 0, blending: "normal", role: "background-plate", animation: { colorCycle: { speed: derived.speeds.base, period: 20, phaseOffset: 0 }, ...depthField(derived.cameraDrift), saturationBoost: 1.05, satInjectionMul: 0, hueKey: Math.min(derived.hueKey, 0.3), hueSpeed: 1.2, paletteAmount: basePaletteAmount, paletteValueFloor: preserveGlowWave ? 0 : 0.1, bicubicFilter: true, glowWave: glowWaveFor("base"), ...rotationFields("base", basePaletteAmount) } },
      { id: "void", file: "layers/void.png", zIndex: 1, blending: "normal", role: "background", animation: { colorCycle: { speed: derived.speeds.void, period: 20, phaseOffset: 40 }, ...depthField(derived.cameraDrift), saturationBoost: voidSaturationBoost, satInjectionMul: 0, hueKey: voidHueKey, hueSpeed: 1.0, paletteAmount: voidPaletteAmount, paletteValueFloor: 0.0, paletteSatFloor: voidPaletteSatFloor, glowWave: glowWaveFor("void"), ...paletteFields(night), ...rotationFields("void", voidPaletteAmount) } },
      { id: "body", file: "layers/body.png", zIndex: 2, blending: "normal", role: "midground", animation: { colorCycle: { speed: derived.speeds.body, period: 20, phaseOffset: 90 }, phaseField: phaseFor(bodyField), ...depthField(derived.cameraDrift), ...structureFlowFields("body", derived.structureFlow), phaseAmount: phaseAmountFor("body", bodyField), saturationBoost: bodySaturationBoost, valueLift: derived.valueLift, satInjectionMul: 0, hueKey: derived.hueKey, hueSpeed: 2.0, paletteAmount: bodyPaletteAmount, paletteValueFloor: bodyPaletteValueFloor, paletteSatFloor: bodyPaletteSatFloor, glowWave: glowWaveFor("body"), ...paletteFields(primary), bicubicFilter: true, ...rotationFields("body", bodyPaletteAmount) } },
      { id: "ornament", file: "layers/ornament.png", zIndex: 3, blending: "normal", role: "detail", animation: { colorCycle: { speed: derived.speeds.ornament, period: 20, phaseOffset: 180 }, phaseField: phaseFor(ornamentField), ...depthField(derived.cameraDrift), phaseAmount: phaseAmountFor("ornament", ornamentField), saturationBoost: ornamentSaturationBoost, satInjectionMul: 0, hueKey: Math.min(0.8, derived.hueKey + 0.1), hueSpeed: 2.2, paletteAmount: ornamentPaletteAmount, paletteValueFloor: ornamentPaletteValueFloor, paletteSatFloor: ornamentPaletteSatFloor, glowWave: glowWaveFor("ornament"), ...paletteFields(primary), ...rotationFields("ornament", ornamentPaletteAmount) } },
      { id: "edge", file: "layers/edge.png", zIndex: 4, blending: "screen", opacity: 0.18, role: "detail", animation: { colorCycle: { speed: derived.speeds.edge, period: 20, phaseOffset: 270 }, phaseField: phaseFor(edgeField), ...depthField(derived.cameraDrift), ...structureFlowFields("edge", derived.structureFlow), phaseAmount: phaseAmountFor("edge", edgeField), saturationBoost: edgeSaturationBoost, satInjectionMul: 0, hueKey: Math.min(0.8, derived.hueKey), hueSpeed: 2.0, paletteAmount: edgePaletteAmount, paletteValueFloor: edgePaletteValueFloor, paletteSatFloor: edgePaletteSatFloor, glowWave: glowWaveFor("edge"), ...paletteFields(opal), ...rotationFields("edge", edgePaletteAmount) } },
      { id: "highlight", file: "layers/highlight.png", zIndex: 5, blending: "add", opacity: 0.12, role: "light-rays", animation: { colorCycle: { speed: derived.speeds.highlight, period: 20, phaseOffset: 180 }, ...depthField(derived.cameraDrift), saturationBoost: 1.2, satInjectionMul: 0, hueKey: Math.min(0.3, derived.hueKey), hueSpeed: 1.5, paletteAmount: highlightPaletteAmount, paletteValueFloor: highlightPaletteValueFloor, paletteSatFloor: highlightPaletteSatFloor, glowWave: glowWaveFor("highlight"), ...rotationFields("highlight", highlightPaletteAmount) } },
    ],
    effects: {
      bloom,
      chromaticAberration: { offset: 0.6, modulationOffset: 0.1 },
      multipassFeedback: portalFeedbackFor(derived.portalFeedback, derived.motionTier),
      cameraDrift: derived.cameraDrift,
      godRays: { intensity: 0 },
      aura: { intensity: 0 },
      kaleidoscope: { segments: 0, blend: 0 },
      mandala: { opacity: 0 },
      trails: { strength: 0 },
      parallax: { scale: 0 },
      haze: { intensity: 0 },
      feather: { radius: 0 },
      filmGrade: { grain: 0, vignetteIntensity: 0.12, vignetteRadius: 1.08, vignetteTintR: 0.14, vignetteTintG: 0.05, vignetteTintB: 0.05, contrast: 1.03, sCurve: 0.07 },
    },
  };
}
