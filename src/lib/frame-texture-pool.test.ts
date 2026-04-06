import { describe, it, expect } from "vitest";
import { computeFrameIndex } from "./frame-texture-pool.js";

describe("computeFrameIndex", () => {
  it("normalizedTime 0 returns frame 0", () => {
    expect(computeFrameIndex(0, 100)).toBe(0);
  });

  it("normalizedTime 0.5 returns midpoint frame", () => {
    expect(computeFrameIndex(0.5, 100)).toBe(50);
  });

  it("normalizedTime 0.999 returns last frame (99)", () => {
    expect(computeFrameIndex(0.999, 100)).toBe(99);
  });

  it("normalizedTime 1.0 clamps to last frame", () => {
    expect(computeFrameIndex(1.0, 100)).toBe(99);
  });

  it("normalizedTime negative clamps to 0", () => {
    expect(computeFrameIndex(-0.1, 100)).toBe(0);
  });

  it("frameCount 1 always returns 0", () => {
    expect(computeFrameIndex(0.5, 1)).toBe(0);
  });

  it("frameCount 384 at normalizedTime 0.5 returns 192", () => {
    expect(computeFrameIndex(0.5, 384)).toBe(192);
  });
});
