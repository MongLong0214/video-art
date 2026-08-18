import { describe, expect, it } from "vitest";
import { fillBoxAlpha, fillEllipseAlpha, scanHoldWalls } from "./hold-walls.js";

describe("scanHoldWalls", () => {
  it("rejects an nx/ny rectangle (r342 sky box / r325 knee wall)", () => {
    const alpha = fillBoxAlpha(200, 360, 0.12, 0.08, 0.72, 0.64);
    const r = scanHoldWalls(alpha, 200, 360);
    expect(r.ok).toBe(false);
    expect(r.hits.some((h) => h.axis === "vertical")).toBe(true);
  });

  it("accepts a soft ellipse (v1c head hold)", () => {
    const alpha = fillEllipseAlpha(200, 360, 0.39, 0.36, 0.27, 0.23);
    const r = scanHoldWalls(alpha, 200, 360);
    expect(r.ok).toBe(true);
    expect(r.hits).toEqual([]);
  });
});
