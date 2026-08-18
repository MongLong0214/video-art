import { describe, it, expect } from "vitest";
import { assertFigureVividLegal } from "./figure-vivid-legal";

const baseLegal = () => ({
  layers: [
    {
      animation: {
        colorCycle: { speed: 0, period: 20, phaseOffset: 0 },
        phaseField: "layers/phase-edge.png",
        phaseField2: "layers/phase-mix.png",
        sourcePrism: {
          amount: 1,
          phaseFlowPx: 58,
          phaseFlowCycles: 11,
          surfaceCycles: 24,
        },
      },
    },
  ],
  effects: {
    multipassFeedback: { strength: 0.32, warp: 0.012, rotate: 0 },
    godRays: { intensity: 0 },
  },
});

describe("assertFigureVividLegal", () => {
  it("accepts extreme-halluc knobs that stay figure-vivid legal", () => {
    const r = assertFigureVividLegal(baseLegal());
    expect(r.ok).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it("rejects body colorCycle (R-018)", () => {
    const s = baseLegal();
    s.layers[0].animation.colorCycle.speed = 14;
    const r = assertFigureVividLegal(s);
    expect(r.ok).toBe(false);
    expect(r.reasons.some((x) => x.includes("colorCycle"))).toBe(true);
  });

  it("rejects phase-angular (R-062)", () => {
    const s = baseLegal();
    s.layers[0].animation.phaseField2 = "layers/phase-angular.png";
    const r = assertFigureVividLegal(s);
    expect(r.ok).toBe(false);
    expect(r.reasons.some((x) => x.includes("angular"))).toBe(true);
  });

  it("rejects multipass rotate (R-062)", () => {
    const s = baseLegal();
    s.effects.multipassFeedback.rotate = 0.02;
    const r = assertFigureVividLegal(s);
    expect(r.ok).toBe(false);
    expect(r.reasons.some((x) => x.includes("rotate"))).toBe(true);
  });

  it("rejects kaleidoscope segments (R-060)", () => {
    const s = baseLegal() as ReturnType<typeof baseLegal> & { effects: { kaleidoscope?: { segments: number } } };
    s.effects.kaleidoscope = { segments: 6 };
    const r = assertFigureVividLegal(s);
    expect(r.ok).toBe(false);
    expect(r.reasons.some((x) => x.includes("kaleidoscope"))).toBe(true);
  });

  it("rejects missing sourcePrism", () => {
    const s = baseLegal();
    s.layers[0].animation.sourcePrism = null as unknown as {
      amount: number;
      phaseFlowPx: number;
      phaseFlowCycles: number;
      surfaceCycles: number;
    };
    const r = assertFigureVividLegal(s);
    expect(r.ok).toBe(false);
    expect(r.reasons.some((x) => x.includes("sourcePrism"))).toBe(true);
  });
});
