import fs from "node:fs";
import { z } from "zod";
import { choosePaletteCandidate } from "./master-palettes.js";
import { deriveStructureFields } from "./master-structure-rules.js";
import { layerPhaseAmountsForMotion, motionTierOrDefault, speedMap } from "./master-motion.js";
import type { PaletteName } from "./master-palettes.js";
import type { CameraDriftParams, StructureFlowParams } from "./master-structure-rules.js";
import type { LayerMotionSpeeds, LayerPhaseAmounts, MotionTier } from "./master-motion.js";

export { PALETTES } from "./master-palettes.js";
export type { Palette, PaletteName, V3 } from "./master-palettes.js";
export type { CameraDriftParams, StructureFlowParams } from "./master-structure-rules.js";
export type { MotionTier } from "./master-motion.js";

export type Intent = "vivid" | "meditative" | "preserve";
export type HueSpace = "hsv" | "oklch";
export type PhaseKind = "radial" | "luminance" | "edge" | "vertical" | "angular";
export type ColorPath = "preserve-glow-wave" | "rotation";

export type RuleTrace = {
  readonly parameter: string;
  readonly value: unknown;
  readonly rule: string;
  readonly reason: string;
};

export type GreenRiskColorRoute = {
  readonly hueSpace: HueSpace;
  readonly greenCompress: number;
  readonly rule: "R6.vivid→hsv+greenCompress" | "R8.finishedVivid→preserve+glowWave";
  readonly reason: string;
};

export type DerivedParams = {
  readonly ruleTrace: RuleTrace[];
  readonly motionTier: MotionTier;
  readonly resolvedIntent: Intent;
  readonly colorPath: ColorPath;
  readonly phaseKinds: readonly PhaseKind[];
  readonly phaseWeights: Record<PhaseKind, number>;
  readonly focal: readonly [number, number];
  readonly edgeCases: Record<string, boolean>;
  readonly paletteName: PaletteName;
  readonly paletteAmount: number;
  readonly speeds: LayerMotionSpeeds;
  readonly hueKey: number;
  readonly phaseAmounts: Record<PhaseKind, number>;
  readonly layerPhaseAmounts?: LayerPhaseAmounts;
  readonly valueLift: number;
  readonly phaseFieldAssignment: Record<"body" | "ornament" | "edge", PhaseKind>;
  readonly greenRiskColorRoute: GreenRiskColorRoute;
  readonly cameraDrift: CameraDriftParams;
  readonly structureFlow: StructureFlowParams;
  readonly portalFeedback: boolean;
};

export type DerivationOptions = {
  readonly manualFocal?: readonly [number, number];
  readonly requestedIntent?: Intent;
  readonly motionTier?: MotionTier;
};

const hueBinSchema = z.object({ hueDeg: z.number(), weightPct: z.number() });
const analysisSchema = z.object({
  M1: z.object({ p5: z.number(), p50: z.number(), p95: z.number(), darkAnchorPct: z.number(), brightAreaPct: z.number() }),
  M2: z.object({ satMean: z.number(), vividAreaPct: z.number() }),
  M3: z.object({ dominantHues: z.array(hueBinSchema), concentration: z.number(), greenRisk: z.boolean() }),
  M4: z.object({ edgeDensity: z.number(), busyness: z.number() }),
  M5: z.object({ structType: z.enum(["line", "texture", "smooth"]), orientationCoherence: z.number() }),
  M6: z.object({ focal: z.tuple([z.number(), z.number()]), radialSym: z.number(), verticalFlow: z.number() }),
  M7: z.object({ figureAreaPct: z.number(), figureContrast: z.number(), figureCentroid: z.tuple([z.number(), z.number()]).optional() }),
  M8: z.object({ finishedVivid: z.number() }),
});

export type Analysis = z.infer<typeof analysisSchema>;

const PHASE_KINDS: readonly PhaseKind[] = ["radial", "luminance", "edge", "vertical", "angular"];
const GREEN_RISK_COMPRESS = 0.85;

export function readAnalysis(filePath: string): Analysis {
  return analysisSchema.parse(JSON.parse(fs.readFileSync(filePath, "utf8")));
}

export function addTrace(traceRows: RuleTrace[], parameter: string, value: unknown, rule: string, reason: string): void {
  traceRows.push({ parameter, value, rule, reason });
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function uniquePhaseKinds(kinds: readonly PhaseKind[]): readonly PhaseKind[] {
  const result: PhaseKind[] = [];
  for (const kind of kinds) {
    if (!result.includes(kind)) result.push(kind);
  }
  return result;
}

function choosePalette(analysis: Analysis, traceRows: RuleTrace[]): PaletteName {
  const { selected, scores } = choosePaletteCandidate(analysis);
  addTrace(traceRows, "palettePreset", { selected, scores }, "E-1-3.dominantHueProximity", "selected nearest lint-corrected jewel preset to M3 dominant hues");
  return selected;
}

function paletteAmount(analysis: Analysis, colorPath: ColorPath, traceRows: RuleTrace[]): number {
  if (colorPath === "preserve-glow-wave") {
    addTrace(traceRows, "paletteAmount", 0.15, "R8.finishedVivid→preserve+glowWave", "preserve path uses per-layer palette budgets and never applies vivid repaint floors");
    return 0.15;
  }
  const vividHigh = analysis.M8.finishedVivid >= 0.45;
  const amount = vividHigh && analysis.M3.greenRisk ? 0.25 : vividHigh ? 0.22 : analysis.M3.greenRisk ? 0.65 : 0.45;
  const rule = vividHigh && analysis.M3.greenRisk ? "R4.greenRisk→lowPaletteBudget" : vividHigh ? "E-1-3.finishedVivid<=0.25" : analysis.M3.greenRisk ? "E-1-3.greenRisk>=0.6" : "E-1-3.defaultSourceFriendly";
  addTrace(traceRows, "paletteAmount", amount, rule, `finishedVivid=${analysis.M8.finishedVivid}, greenRisk=${analysis.M3.greenRisk}; green-risk body/ornament palette dominance is applied per layer`);
  return amount;
}

function phaseSelection(analysis: Analysis, manualFocal: readonly [number, number] | undefined, traceRows: RuleTrace[]) {
  const weights: Record<PhaseKind, number> = { radial: 0, luminance: 0, edge: 0, vertical: 0, angular: 0 };
  const figureAreaRadial = analysis.M7.figureAreaPct >= 20 && analysis.M7.figureAreaPct <= 60;
  const lowBlobContrast = !manualFocal && analysis.M7.figureContrast < 0.16;
  const multiBlobProxy = analysis.M7.figureAreaPct > 55 && analysis.M6.radialSym < 0.18;
  if (!lowBlobContrast || figureAreaRadial) weights.radial += 0.5;
  if (analysis.M6.radialSym >= 0.35 && !multiBlobProxy) weights.angular += 0.3;
  if (analysis.M5.structType === "line") weights.edge += 0.5;
  if (analysis.M5.structType === "smooth") weights.luminance += 0.5;
  if (analysis.M5.structType === "texture") weights.luminance += 0.25;
  if (analysis.M6.verticalFlow >= 0.35) weights.vertical += 0.3;
  if (lowBlobContrast) weights.luminance += 0.5;
  if (Object.values(weights).every((value) => value === 0)) weights.luminance = 1;
  if (multiBlobProxy) weights.angular = 0;
  const weightSum = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const normalized: Record<PhaseKind, number> = { radial: 0, luminance: 0, edge: 0, vertical: 0, angular: 0 };
  for (const kind of PHASE_KINDS) normalized[kind] = round4(weights[kind] / Math.max(1e-6, weightSum));
  const selectedKinds = PHASE_KINDS.filter((kind) => normalized[kind] > 0).sort((a, b) => normalized[b] - normalized[a]).slice(0, 2);
  const kinds: readonly PhaseKind[] = figureAreaRadial && !selectedKinds.includes("radial") ? ["radial", ...selectedKinds] : selectedKinds;
  const figureFocal = analysis.M7.figureCentroid ?? analysis.M6.focal;
  const focal = manualFocal ?? (figureAreaRadial ? figureFocal : analysis.M6.focal);
  addTrace(traceRows, "phaseKinds", { kinds, weights: normalized }, "E-1-2.structureWeights", figureAreaRadial ? "top phase fields plus D-3-4 radial figure field for ornament" : "top one to two phase fields selected from M5/M6/M7");
  addTrace(traceRows, "edgeCases", { lowBlobContrast, multiBlobProxy, figureAreaRadial }, "E-5.focalFallback+multiBlob", "low focal contrast falls back to luminance; multi-blob proxy disables angular");
  if (figureAreaRadial) {
    addTrace(traceRows, "phaseField", { kind: "radial", focal, figureAreaPct: analysis.M7.figureAreaPct }, "D-3-4.figureArea20-60→radialOrnament", "figure area is 20-60%; radial phase is generated at figure centroid and assigned to ornament");
  }
  return { kinds, weights: normalized, focal, edgeCases: { lowBlobContrast, multiBlobProxy, figureAreaRadial } };
}

function phaseAmount(kind: PhaseKind, analysis: Analysis): number {
  if (kind === "angular") return 1;
  const gradient = kind === "edge" ? analysis.M4.edgeDensity * 1.2 : kind === "luminance" ? analysis.M4.busyness : kind === "vertical" ? analysis.M6.verticalFlow : 0.3;
  const raw = 0.6 - 0.5 * gradient;
  if (kind === "luminance") return round4(clamp(raw, 0.3, 1.0));
  if (kind === "edge") return round4(clamp(raw, 0.2, 0.8));
  return round4(clamp(raw, 0.2, 0.6));
}

function resolveIntent(analysis: Analysis, requestedIntent: Intent | undefined): Intent {
  if (analysis.M8.finishedVivid >= 0.6 || requestedIntent === "preserve") return "preserve";
  if (requestedIntent) return requestedIntent;
  return "vivid";
}

function greenRiskColorRoute(analysis: Analysis, requestedIntent: Intent | undefined, resolvedIntent: Intent, traceRows: RuleTrace[]): GreenRiskColorRoute {
  const preserveRoute = resolvedIntent === "preserve";
  const route: GreenRiskColorRoute = preserveRoute
    ? {
        hueSpace: "oklch",
        greenCompress: GREEN_RISK_COMPRESS,
        rule: "R8.finishedVivid→preserve+glowWave",
        reason: requestedIntent === "preserve"
          ? "intent=preserve takes preserve+glowWave before green-risk repaint rules"
          : `finishedVivid=${analysis.M8.finishedVivid} >= 0.6 takes preserve+glowWave before green-risk repaint rules`,
      }
    : {
        hueSpace: "hsv",
        greenCompress: GREEN_RISK_COMPRESS,
        rule: "R6.vivid→hsv+greenCompress",
        reason: `intent=${resolvedIntent} routes green-risk layers through vivid HSV rotation with green compression`,
      };
  if (preserveRoute) {
    addTrace(traceRows, "colorPath", { requestedIntent: requestedIntent ?? "unset", resolvedIntent, finishedVivid: analysis.M8.finishedVivid, greenRisk: analysis.M3.greenRisk, hueSpace: route.hueSpace, greenCompress: route.greenCompress }, route.rule, route.reason);
  } else if (analysis.M3.greenRisk) {
    addTrace(traceRows, "greenRiskColorRoute", { requestedIntent: requestedIntent ?? "unset", resolvedIntent, hueSpace: route.hueSpace, greenCompress: route.greenCompress }, route.rule, route.reason);
  }
  return route;
}

export function deriveParameters(analysis: Analysis, options: DerivationOptions = {}): DerivedParams {
  const ruleTrace: RuleTrace[] = [];
  const motionTier = motionTierOrDefault(options.motionTier);
  const requestedIntent = options.requestedIntent;
  const resolvedIntent = resolveIntent(analysis, requestedIntent);
  const colorPath: ColorPath = resolvedIntent === "preserve" ? "preserve-glow-wave" : "rotation";
  const phases = phaseSelection(analysis, options.manualFocal, ruleTrace);
  const primaryPhase = phases.kinds[0] ?? "luminance";
  const speeds = speedMap(analysis, colorPath, motionTier);
  const hueKey = round4(clamp(1.6 - 2.5 * analysis.M4.edgeDensity, 0.2, 1.6));
  const valueLift = analysis.M7.figureContrast < 0.18 && analysis.M1.p50 < 0.42 ? 0.22 : 0;
  const valueLiftReason = valueLift > 0
    ? "figureContrast low and source mid luminance dark proxy lifts subject/body"
    : `valueLift disabled; figureContrast=${analysis.M7.figureContrast}, p50=${analysis.M1.p50}`;
  const phaseAmounts: Record<PhaseKind, number> = {
    radial: phaseAmount("radial", analysis),
    luminance: phaseAmount("luminance", analysis),
    edge: phaseAmount("edge", analysis),
    vertical: phaseAmount("vertical", analysis),
    angular: phaseAmount("angular", analysis),
  };
  const phaseFieldAssignment: Record<"body" | "ornament" | "edge", PhaseKind> = colorPath === "preserve-glow-wave"
    ? {
        body: "luminance",
        ornament: phases.edgeCases.figureAreaRadial || phases.kinds.includes("radial") ? "radial" : "luminance",
        edge: "edge",
      }
    : {
        body: primaryPhase,
        ornament: phases.edgeCases.figureAreaRadial ? "radial" : phases.kinds.includes("radial") ? "radial" : primaryPhase,
        edge: phases.kinds.includes("edge") ? "edge" : primaryPhase,
      };
  const phaseKinds = colorPath === "preserve-glow-wave"
    ? uniquePhaseKinds(["luminance", phaseFieldAssignment.ornament, "edge", ...phases.kinds])
    : phases.kinds;
  const layerPhaseAmounts = layerPhaseAmountsForMotion(motionTier, colorPath);
  const speedRule = colorPath === "preserve-glow-wave" && motionTier === "extreme" ? "R10.motionExtreme.cadence" : colorPath === "preserve-glow-wave" ? "R8.finishedVivid→preserve+glowWave" : "E-1-4.speedScaleIntegerCorrected";
  const speedReason = colorPath === "preserve-glow-wave" && motionTier === "extreme"
    ? "extreme preserve cadence uses approved integer top-layer range while glowWave carries dense motion"
    : colorPath === "preserve-glow-wave"
      ? "preserve path uses slow integer color drift while glowWave carries motion"
      : `rotation path keeps existing integer cadence scaling; speedScale=${round4(1 - 0.4 * analysis.M8.finishedVivid)}`;
  addTrace(ruleTrace, "speeds", speeds, speedRule, speedReason);
  addTrace(ruleTrace, "hueKey", hueKey, "E-1-4.hueKey", `clamp(1.6 - 2.5*edgeDensity, 0.2, 1.6), edgeDensity=${analysis.M4.edgeDensity}`);
  addTrace(ruleTrace, "phaseAmount", phaseAmounts, "E-1-4.phaseAmount+D-3-4", "amounts clamped by phase kind safety ranges; angular forced integer");
  if (layerPhaseAmounts) {
    addTrace(ruleTrace, "layerPhaseAmount", layerPhaseAmounts, "R10.motionExtreme.phaseAmount", "preserve path enables traveling OKLCH hue bands per structural layer without global repaint");
  }
  addTrace(ruleTrace, "valueLift", valueLift, "E-1-4.valueLift", valueLiftReason);
  addTrace(ruleTrace, "hierarchyBudgets", "D-2-2 fixed blend/opacity/saturation/value-floor table", "D-2-2.layerCadenceBudget", "void fixed dark anchor; bright budget reserved for ornament/edge/highlight");
  addTrace(ruleTrace, "phaseFieldAssignment", phaseFieldAssignment, "D-3-4.layerAssignment", "body uses primary; ornament prefers radial; edge prefers edge-distance");
  const structureFields = deriveStructureFields({ colorPath, analysis, motionTier, traceRows: ruleTrace });
  const colorRoute = greenRiskColorRoute(analysis, requestedIntent, resolvedIntent, ruleTrace);
  return {
    ruleTrace,
    motionTier,
    resolvedIntent,
    colorPath,
    phaseKinds,
    phaseWeights: phases.weights,
    focal: phases.focal,
    edgeCases: phases.edgeCases,
    paletteName: choosePalette(analysis, ruleTrace),
    paletteAmount: paletteAmount(analysis, colorPath, ruleTrace),
    speeds,
    hueKey,
    phaseAmounts,
    layerPhaseAmounts,
    valueLift,
    phaseFieldAssignment,
    greenRiskColorRoute: colorRoute,
    ...structureFields,
  };
}
