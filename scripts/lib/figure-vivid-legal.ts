/**
 * Figure-vivid loop legality (CREATE-OS §0 / R-018 / R-038 / R-062).
 * Used by agents + tests so extreme-halluc knobs cannot silently violate product law.
 */

export type FigureVividLegalResult = {
  ok: boolean;
  reasons: string[];
};

type LooseScene = {
  layers?: Array<{
    animation?: {
      colorCycle?: { speed?: number };
      phaseField?: string;
      phaseField2?: string;
      polarTwist?: number;
      rotateSpeed?: number;
      sourcePrism?: { amount?: number; phaseFlowPx?: number } | null;
    };
  }>;
  effects?: {
    multipassFeedback?: { rotate?: number };
    godRays?: { intensity?: number };
    kaleidoscope?: { segments?: number };
  };
};

export const assertFigureVividLegal = (scene: LooseScene): FigureVividLegalResult => {
  const reasons: string[] = [];
  const layer = scene.layers?.[0];
  const anim = layer?.animation ?? {};
  const phase = `${anim.phaseField ?? ""}${anim.phaseField2 ?? ""}`;
  const rotate = scene.effects?.multipassFeedback?.rotate ?? 0;
  const godRays = scene.effects?.godRays?.intensity ?? 0;
  const ccSpeed = anim.colorCycle?.speed ?? 0;
  const prism = anim.sourcePrism;

  if (!prism || !(Number(prism.amount) > 0)) {
    reasons.push("sourcePrism.amount must be > 0 (in-place prism on)");
  }
  if (ccSpeed !== 0) {
    reasons.push(`colorCycle.speed must be 0 for figure-vivid (got ${ccSpeed})`);
  }
  if (phase.includes("angular")) {
    reasons.push("phaseField/phaseField2 must not use phase-angular (R-062)");
  }
  if (rotate !== 0) {
    reasons.push(`multipassFeedback.rotate must be 0 (got ${rotate})`);
  }
  if ((anim.polarTwist ?? 0) !== 0) {
    reasons.push(`polarTwist must be 0 (got ${anim.polarTwist})`);
  }
  if ((anim.rotateSpeed ?? 0) !== 0) {
    reasons.push(`rotateSpeed must be 0 (got ${anim.rotateSpeed})`);
  }
  const kaleido = scene.effects?.kaleidoscope?.segments ?? 0;
  if (kaleido !== 0) {
    reasons.push(`kaleidoscope.segments must be 0 (got ${kaleido})`);
  }
  if (godRays > 0.5) {
    reasons.push(`godRays.intensity ${godRays} looks like main motion (R-038 kill); keep 0 or auxiliary only`);
  }

  return { ok: reasons.length === 0, reasons };
};
