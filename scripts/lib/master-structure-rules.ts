import type { Analysis, ColorPath, RuleTrace } from "./master-derivation.js";
import { R10_PORTAL_FEEDBACK, R9_PORTAL_FEEDBACK } from "./master-motion.js";
import type { MotionTier } from "./master-motion.js";

export type CameraDriftParams = {
  readonly radius: number;
  readonly cycles: number;
  readonly pivot: number;
};

export type StructureFlowParams = {
  readonly strength: number;
  readonly cycles: number;
};

export const CAMERA_DRIFT_OFF: CameraDriftParams = { radius: 0, cycles: 1, pivot: 0.5 };
export const STRUCTURE_FLOW_OFF: StructureFlowParams = { strength: 0, cycles: 3 };

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function trace(traceRows: RuleTrace[], parameter: string, value: unknown, rule: string, reason: string): void {
  traceRows.push({ parameter, value, rule, reason });
}

export type StructureDerivationInput = {
  readonly colorPath: ColorPath;
  readonly analysis: Analysis;
  readonly motionTier: MotionTier;
  readonly traceRows: RuleTrace[];
};

export function deriveStructureFields(input: StructureDerivationInput) {
  const { colorPath, analysis, motionTier, traceRows } = input;
  if (colorPath !== "preserve-glow-wave") {
    return {
      cameraDrift: CAMERA_DRIFT_OFF,
      structureFlow: STRUCTURE_FLOW_OFF,
      portalFeedback: false,
    };
  }

  const cameraDrift: CameraDriftParams =
    (analysis.M7.figureAreaPct >= 20 && analysis.M7.figureAreaPct <= 70) || analysis.M6.radialSym > 0.25
      ? { radius: motionTier === "extreme" ? 0.008 : 0.006, cycles: 1, pivot: 0.5 }
      : CAMERA_DRIFT_OFF;
  if (cameraDrift.radius > 0) {
    const rule = motionTier === "extreme" ? "R10.motionExtreme.cameraDrift" : "R9.depthDrift";
    const reason = motionTier === "extreme"
      ? `extreme motion raises active camera drift radius to 0.008; figureAreaPct=${analysis.M7.figureAreaPct}, radialSym=${analysis.M6.radialSym}`
      : `enabled on preserve path because figureAreaPct=${analysis.M7.figureAreaPct} and radialSym=${analysis.M6.radialSym}`;
    trace(traceRows, "cameraDrift", cameraDrift, rule, reason);
  }

  const calmStructureFlow: StructureFlowParams =
    analysis.M5.structType === "line" || analysis.M5.structType === "texture"
      ? {
          strength: round4(clamp(0.0035 * (1 - analysis.M4.busyness), 0.0012, 0.0035)),
          cycles: 3,
        }
      : STRUCTURE_FLOW_OFF;
  const structureFlow: StructureFlowParams = motionTier === "extreme" && calmStructureFlow.strength > 0
    ? { strength: round4(Math.min(calmStructureFlow.strength * 1.6, 0.005)), cycles: 5 }
    : calmStructureFlow;
  if (structureFlow.strength > 0) {
    const rule = motionTier === "extreme" ? "R10.motionExtreme.structureFlow" : "R9.structFlow";
    const reason = motionTier === "extreme"
      ? `extreme motion scales previous structureFlow strength ${calmStructureFlow.strength} by 1.6 and sets cycles=5 for structType=${analysis.M5.structType}`
      : `enabled on preserve path for structType=${analysis.M5.structType}; strength scales by 1-busyness=${round4(1 - analysis.M4.busyness)}`;
    trace(traceRows, "structureFlow", structureFlow, rule, reason);
  }

  const portalFeedback = analysis.M7.figureAreaPct >= 10 && analysis.M7.figureAreaPct <= 70;
  if (portalFeedback) {
    const rule = motionTier === "extreme" ? "R10.motionExtreme.portalFeedback" : "R9.portalFeedback";
    const value = motionTier === "extreme" ? R10_PORTAL_FEEDBACK : R9_PORTAL_FEEDBACK;
    const reason = motionTier === "extreme"
      ? `extreme motion keeps active portal feedback visible while shortening decay to ${R10_PORTAL_FEEDBACK.decay} because figureAreaPct=${analysis.M7.figureAreaPct}`
      : `enabled with figure portal mask because figureAreaPct=${analysis.M7.figureAreaPct}`;
    trace(traceRows, "portalFeedback", value, rule, reason);
  }

  return { cameraDrift, structureFlow, portalFeedback };
}
