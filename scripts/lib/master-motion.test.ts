import { describe, expect, it } from "vitest";
import { CALM_GLOW_WAVES, EXTREME_GLOW_WAVES } from "./master-motion.js";

describe("master motion edge glow waves", () => {
  it("keeps edge glow motion below ornament in calm and extreme tiers", () => {
    expect(CALM_GLOW_WAVES.edge).toEqual({ strength: 0.25, speed: 5, sharpness: 0.55, fieldCycles: 1 });
    expect(EXTREME_GLOW_WAVES.edge).toEqual({ strength: 0.45, speed: 8, sharpness: 0.65, fieldCycles: 1 });

    expect(CALM_GLOW_WAVES.edge.strength).toBeLessThan(CALM_GLOW_WAVES.ornament.strength);
    expect(EXTREME_GLOW_WAVES.edge.strength).toBeLessThan(EXTREME_GLOW_WAVES.ornament.strength);
    expect(EXTREME_GLOW_WAVES.edge.speed).toBeLessThan(EXTREME_GLOW_WAVES.ornament.speed);
  });
});
