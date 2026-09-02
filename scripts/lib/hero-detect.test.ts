import { describe, expect, it } from "vitest";
import { applyHeroOverride, detectHero, needsCustomTravel, type HeroDetect } from "./hero-detect.js";

const timeout = 90_000;

const fakeForm: HeroDetect = {
  kind: "form",
  cx: 800,
  cy: 400,
  cxN: 0.49,
  cyN: 0.137,
  width: 1632,
  height: 2912,
  rInner: 16,
  rOuter: 78,
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
  confidence: 0.62,
  reasons: ["form (peaks=0)"],
};

describe("applyHeroOverride (r346/r348: detector form, living part halo)", () => {
  it("re-centers and re-kinds with explicit halo radii", () => {
    const hero = applyHeroOverride(fakeForm, "halo@0.50,0.20:130/630", "concentric eye rings are the hero");
    expect(hero.kind).toBe("halo");
    expect(hero.cx).toBe(816);
    expect(hero.cy).toBe(582);
    expect(hero.rInner).toBe(130);
    expect(hero.rOuter).toBe(630);
    expect(hero.override?.spec).toBe("halo@0.50,0.20:130/630");
    expect(hero.reasons.at(-1)).toContain("concentric eye rings");
    expect(needsCustomTravel(hero.kind)).toBe(true);
  });

  it("pour keeps detected radii, accepts an explicit water line", () => {
    const hero = applyHeroOverride(fakeForm, "pour@0.46,0.28:w0.70", "painted pour from the pupil");
    expect(hero.kind).toBe("pour");
    expect(hero.waterNy).toBe(0.7);
    expect(hero.rOuter).toBe(78);
  });

  it("refuses halo without radii, bad grammar, empty reason, out-of-range center", () => {
    expect(() => applyHeroOverride(fakeForm, "halo@0.5,0.2", "x")).toThrow(/radii/);
    expect(() => applyHeroOverride(fakeForm, "spiral@0.5,0.2", "x")).toThrow(/--hero must look like/);
    expect(() => applyHeroOverride(fakeForm, "beam@0.5,0.2", "  ")).toThrow(/hero-reason/);
    expect(() => applyHeroOverride(fakeForm, "beam@1.5,0.2", "x")).toThrow(/normalized/);
  });
});

describe("detectHero (approved fixtures)", () => {
  it(
    "r325 is a large rainbow halo centered on the rings",
    async () => {
      const hero = await detectHero("sources/approved/r325-ganesha-rainbow-rings.png");
      expect(hero.kind).toBe("halo");
      expect(hero.cxN).toBeGreaterThan(0.44);
      expect(hero.cxN).toBeLessThan(0.56);
      expect(hero.cyN).toBeGreaterThan(0.24);
      expect(hero.cyN).toBeLessThan(0.38);
      expect(hero.peakCount).toBeGreaterThanOrEqual(3);
      expect(needsCustomTravel(hero.kind)).toBe(true);
    },
    timeout,
  );

  it(
    "r342 is a pour from the third eye",
    async () => {
      const hero = await detectHero("sources/approved/r342-cosmic-buddha-eye-fall.png");
      expect(hero.kind).toBe("pour");
      expect(hero.cxN).toBeGreaterThan(0.38);
      expect(hero.cxN).toBeLessThan(0.54);
      expect(hero.cyN).toBeGreaterThan(0.22);
      expect(hero.cyN).toBeLessThan(0.36);
      expect(needsCustomTravel(hero.kind)).toBe(true);
    },
    timeout,
  );

  it(
    "r221 face is form (no custom halo/pour)",
    async () => {
      const hero = await detectHero("sources/approved/r221-eye-mirror.png");
      expect(hero.kind).toBe("form");
      expect(needsCustomTravel(hero.kind)).toBe(false);
    },
    timeout,
  );

  it(
    "r242 hand-face is form",
    async () => {
      const hero = await detectHero("sources/approved/r242-hand-face.png");
      expect(hero.kind).toBe("form");
      expect(needsCustomTravel(hero.kind)).toBe(false);
    },
    timeout,
  );

  it(
    "r274 is a beam (dark silhouettes + spray), not a pour",
    async () => {
      const hero = await detectHero("sources/approved/r274-dual-abstract-beam.png");
      expect(hero.kind).toBe("beam");
      expect(needsCustomTravel(hero.kind)).toBe(true);
    },
    timeout,
  );
});
