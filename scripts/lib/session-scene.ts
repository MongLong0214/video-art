/**
 * Patch a scaffolded golden scene so the measured hero actually travels.
 * Keeps golden color knobs (Isaac quote law). Adds advection + custom plates + hold layer.
 */
import { needsCustomTravel, type HeroDetect } from "./hero-detect.js";

export type LooseAnim = {
  phaseField?: string;
  phaseField2?: string;
  flowField?: string;
  colorCycle?: { speed?: number; period?: number; phaseOffset?: number };
  sourcePrism?: Record<string, unknown> | null;
  sourceFlowAdvection?: Record<string, unknown>;
  sourceFlowTransport?: Record<string, unknown>;
  [key: string]: unknown;
};

export type LooseLayer = {
  id?: string;
  file?: string;
  zIndex?: number;
  opacity?: number;
  blending?: string;
  role?: string;
  animation?: LooseAnim;
};

export type LooseScene = {
  layers?: LooseLayer[];
  effects?: {
    multipassFeedback?: { rotate?: number; [key: string]: unknown };
    godRays?: { intensity?: number; centerX?: number; centerY?: number; [key: string]: unknown };
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type PlateNames = {
  readonly phase: string;
  readonly flow: string;
  readonly hold: string;
};

export function plateNamesFor(kind: HeroDetect["kind"]): PlateNames {
  if (kind === "halo") {
    return { phase: "layers/phase-halo.png", flow: "layers/flow-halo-counter.png", hold: "layers/figure-hold.png" };
  }
  if (kind === "pour") {
    return { phase: "layers/phase-fall.png", flow: "layers/flow-fall.png", hold: "layers/figure-hold.png" };
  }
  return { phase: "layers/phase-beam.png", flow: "layers/flow-beam.png", hold: "layers/figure-hold.png" };
}

function advectionFor(hero: HeroDetect): { advect: Record<string, unknown>; transport: Record<string, unknown> } {
  if (hero.kind === "halo") {
    return {
      advect: {
        amount: 1,
        maxDisplacementPx: 48,
        cycles: 3,
        phaseScale: 1.25,
        normalMix: 0.24,
        edgePreserve: 0.1,
        detailGain: 6,
        forwardBias: 0.1,
        fieldAlign: 0.68,
      },
      transport: {
        amount: 0.8,
        macroDisplacementPx: 34,
        macroCycles: 3,
        microDisplacementPx: 8,
        microCycles: 5,
        phaseScale: 1.15,
        normalMix: 0.22,
        edgePreserve: 0.08,
        colorAmount: 0.28,
        forwardBias: 0.08,
      },
    };
  }
  if (hero.kind === "pour") {
    return {
      advect: {
        amount: 1,
        maxDisplacementPx: 46,
        cycles: 2,
        phaseScale: 1.15,
        normalMix: 0.12,
        edgePreserve: 0.1,
        detailGain: 6,
        forwardBias: 0.48,
        fieldAlign: 1,
      },
      transport: {
        amount: 0.82,
        macroDisplacementPx: 32,
        macroCycles: 2,
        microDisplacementPx: 7,
        microCycles: 4,
        phaseScale: 1.05,
        normalMix: 0.1,
        edgePreserve: 0.08,
        colorAmount: 0.14,
        forwardBias: 0.42,
      },
    };
  }
  return {
    advect: {
      amount: 1,
      maxDisplacementPx: 40,
      cycles: 2,
      phaseScale: 1.1,
      normalMix: 0.16,
      edgePreserve: 0.12,
      detailGain: 5,
      forwardBias: 0.36,
      fieldAlign: 1,
    },
    transport: {
      amount: 0.75,
      macroDisplacementPx: 28,
      macroCycles: 2,
      microDisplacementPx: 6,
      microCycles: 4,
      phaseScale: 1.05,
      normalMix: 0.12,
      edgePreserve: 0.1,
      colorAmount: 0.16,
      forwardBias: 0.32,
    },
  };
}

function holdLayer(names: PlateNames): LooseLayer {
  return {
    id: "figure-hold",
    file: names.hold,
    zIndex: 1,
    opacity: 1,
    blending: "normal",
    role: "subject",
    animation: {
      colorCycle: { speed: 0, period: 20, phaseOffset: 0 },
      hueSpace: "oklch",
      greenCompress: 0.92,
      saturationBoost: 1.38,
      valueLift: 0.006,
      luminanceKey: 0,
      hueKey: 0,
      hueSpeed: 0,
      satInjectionMul: 0.01,
      satBlendLow: 0.04,
      satBlendHigh: 0.7,
      paletteAmount: 0,
      noiseAmount: 0,
      bicubicFilter: true,
      phaseField: "layers/phase-edge.png",
      phaseField2: "layers/phase-mix.png",
      flowField: "layers/flow-field.png",
      phaseAmount: 0,
      phaseWarpAmount: 0,
      glowWavePhaseSource: "flowField",
      glowWave: { strength: 0.22, speed: 9, sharpness: 0.16, fieldCycles: 1.15 },
      glowWave2: { strength: 0.12, speed: 18, sharpness: 0.13, fieldCycles: 1.5 },
      structureFlow: { strength: 0, cycles: 1 },
      sourcePrism: {
        amount: 1,
        radiusPx: 0,
        directionCycles: 0,
        chromaCycles: 0,
        surfaceCycles: 6,
        phaseFlowPx: 6,
        phaseFlowCycles: 2,
        phaseMix: 0.22,
        detailBoost: 0.95,
        phaseScale: 5.5,
      },
      sourceColorClamp: { maxDrift: 0.14 },
      breath: { amplitude: 0.004, frequency: 0.8, period: 20 },
      colorMotionMask: {
        floor: 0.08,
        luminanceWeight: 0.72,
        saturationWeight: 0.65,
        edgeWeight: 0.5,
        power: 1.2,
      },
    },
  };
}

export function patchSessionScene(scene: LooseScene, hero: HeroDetect): LooseScene {
  if (!needsCustomTravel(hero.kind)) return scene;
  const layers = Array.isArray(scene.layers) ? scene.layers.map((layer) => ({ ...layer, animation: { ...layer.animation } })) : [];
  if (layers.length === 0) throw new Error("scene has no layers to patch");
  const names = plateNamesFor(hero.kind);
  const knobs = advectionFor(hero);
  const river = layers[0];
  const anim = river.animation ?? {};
  anim.phaseField = names.phase;
  anim.flowField = names.flow;
  if (!anim.phaseField2) anim.phaseField2 = "layers/phase-luma-hybrid.png";
  anim.sourceFlowAdvection = knobs.advect;
  anim.sourceFlowTransport = knobs.transport;
  if (anim.colorCycle && typeof anim.colorCycle === "object") {
    anim.colorCycle = { ...anim.colorCycle, speed: 0 };
  }
  river.animation = anim;
  river.role = river.role ?? "background";
  river.zIndex = 0;

  const withoutOldHold: LooseLayer[] = [
    river,
    ...layers.slice(1).filter((layer) => layer.id !== "figure-hold" && layer.file !== names.hold),
  ];
  withoutOldHold.push(holdLayer(names));

  const effects = { ...(scene.effects ?? {}) };
  const mp = { ...(effects.multipassFeedback ?? {}) };
  mp.rotate = 0;
  effects.multipassFeedback = mp;
  const rays = { ...(effects.godRays ?? {}) };
  if (typeof rays.intensity === "number" && rays.intensity > 0.45) rays.intensity = 0.18;
  rays.centerX = hero.cxN;
  rays.centerY = hero.cyN;
  effects.godRays = rays;

  return { ...scene, layers: withoutOldHold, effects };
}

export function sceneNeedsTravelPlates(scene: LooseScene): boolean {
  const anim = scene.layers?.[0]?.animation ?? {};
  const phase = `${anim.phaseField ?? ""}`;
  const flow = `${anim.flowField ?? ""}`;
  const customPhase = /phase-(halo|fall|beam)\.png$/.test(phase);
  const customFlow = /flow-(halo|fall|beam)/.test(flow);
  const adv = anim.sourceFlowAdvection as { amount?: number; maxDisplacementPx?: number; fieldAlign?: number } | undefined;
  const traveling =
    Number(adv?.amount ?? 0) > 0 && Number(adv?.maxDisplacementPx ?? 0) >= 24 && Number(adv?.fieldAlign ?? 0) >= 0.5;
  return customPhase && customFlow && traveling;
}
