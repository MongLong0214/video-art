import { describe, expect, it } from "vitest";
import type { HeroDetect } from "./hero-detect.js";
import { patchSessionScene, sceneNeedsTravelPlates } from "./session-scene.js";

const formHero = (over: Partial<HeroDetect>): HeroDetect => ({
  kind: "form",
  cx: 800,
  cy: 800,
  cxN: 0.5,
  cyN: 0.28,
  width: 1632,
  height: 2912,
  rInner: 40,
  rOuter: 200,
  waterNy: 0.72,
  angularCoverage: 0,
  haloScore: 0,
  pourScore: 0,
  beamScore: 0,
  highSatPct: 0.2,
  peakCount: 0,
  streamWidthFrac: 1,
  flankContrast: 0,
  hueBins: 0,
  irisScore: 0,
  confidence: 0.6,
  reasons: [],
  ...over,
});

const goldenScene = () => ({
  layers: [
    {
      id: "source",
      file: "layers/source.png",
      animation: {
        colorCycle: { speed: 0, period: 20, phaseOffset: 0 },
        phaseField: "layers/phase-edge.png",
        phaseField2: "layers/phase-mix.png",
        flowField: "layers/flow-field.png",
        sourcePrism: { amount: 1, phaseFlowPx: 27 },
      },
    },
  ],
  effects: { multipassFeedback: { rotate: 0 }, godRays: { intensity: 0 } },
});

describe("patchSessionScene", () => {
  it("leaves form sources on the golden", () => {
    const scene = goldenScene();
    const patched = patchSessionScene(scene, formHero({ kind: "form" }));
    expect(patched).toBe(scene);
    expect(sceneNeedsTravelPlates(patched)).toBe(false);
  });

  it("wires halo plates + advection + hold, rotate stays 0", () => {
    const patched = patchSessionScene(goldenScene(), formHero({ kind: "halo" }));
    expect(sceneNeedsTravelPlates(patched)).toBe(true);
    expect(patched.layers?.[0]?.animation?.phaseField).toBe("layers/phase-halo.png");
    expect(patched.layers?.[0]?.animation?.flowField).toBe("layers/flow-halo-counter.png");
    expect(patched.layers?.[1]?.file).toBe("layers/figure-hold.png");
    // r346 v11: the hold is a textured second language, never a frozen sticker (surface6/floor0.08 default killed).
    const hold = patched.layers?.[1]?.animation as { sourcePrism?: { surfaceCycles?: number }; colorMotionMask?: { floor?: number } };
    expect(Number(hold.sourcePrism?.surfaceCycles)).toBeGreaterThanOrEqual(20);
    expect(hold.colorMotionMask?.floor).toBe(1);
    expect(patched.effects?.multipassFeedback?.rotate).toBe(0);
    const adv = patched.layers?.[0]?.animation?.sourceFlowAdvection as { fieldAlign?: number };
    expect(Number(adv.fieldAlign)).toBeGreaterThanOrEqual(0.5);
  });

  it("wires pour with forwardBias stream", () => {
    const patched = patchSessionScene(goldenScene(), formHero({ kind: "pour" }));
    expect(patched.layers?.[0]?.animation?.phaseField).toBe("layers/phase-fall.png");
    const adv = patched.layers?.[0]?.animation?.sourceFlowAdvection as { forwardBias?: number; fieldAlign?: number };
    expect(Number(adv.forwardBias)).toBeGreaterThanOrEqual(0.4);
    expect(Number(adv.fieldAlign)).toBe(1);
  });
});
