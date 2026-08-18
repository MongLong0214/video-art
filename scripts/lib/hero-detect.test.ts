import { describe, expect, it } from "vitest";
import { detectHero, needsCustomTravel } from "./hero-detect.js";

const timeout = 90_000;

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
