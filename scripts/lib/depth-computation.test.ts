import { describe, it, expect } from "vitest";

/**
 * T3: meanDepth Computation + Schema — TDD tests.
 */
describe("T3: meanDepth Computation", () => {
  describe("computeMeanDepth", () => {
    it("should be exported from pipeline module", async () => {
      const mod = await import("./depth-computation.js");
      expect(typeof mod.computeMeanDepth).toBe("function");
    });

    it("should return mean=200 for uniform depth=200 with full mask", async () => {
      const { computeMeanDepth } = await import("./depth-computation.js");
      const w = 4, h = 4;
      const depthMap = new Uint8Array(w * h).fill(200);
      const mask = new Uint8Array(w * h).fill(1);
      expect(computeMeanDepth(depthMap, mask, w, h)).toBe(200);
    });

    it("should return ~127.5 for half-0/half-255 depth with full mask", async () => {
      const { computeMeanDepth } = await import("./depth-computation.js");
      const w = 4, h = 4;
      const depthMap = new Uint8Array(w * h);
      for (let i = 0; i < 8; i++) depthMap[i] = 0;
      for (let i = 8; i < 16; i++) depthMap[i] = 255;
      const mask = new Uint8Array(w * h).fill(1);
      expect(computeMeanDepth(depthMap, mask, w, h)).toBeCloseTo(127.5, 0);
    });

    it("should return 128 for empty mask (all zeros)", async () => {
      const { computeMeanDepth } = await import("./depth-computation.js");
      const w = 4, h = 4;
      const depthMap = new Uint8Array(w * h).fill(200);
      const mask = new Uint8Array(w * h).fill(0);
      expect(computeMeanDepth(depthMap, mask, w, h)).toBe(128);
    });

    it("should average only masked region", async () => {
      const { computeMeanDepth } = await import("./depth-computation.js");
      const w = 4, h = 4;
      const depthMap = new Uint8Array(w * h);
      depthMap[0] = 100; depthMap[1] = 200;  // masked
      depthMap[2] = 50; depthMap[3] = 50;    // not masked
      const mask = new Uint8Array(w * h).fill(0);
      mask[0] = 1; mask[1] = 1;
      expect(computeMeanDepth(depthMap, mask, w, h)).toBe(150);
    });

    it("should handle 1x1 pixel edge case", async () => {
      const { computeMeanDepth } = await import("./depth-computation.js");
      const depthMap = new Uint8Array([42]);
      const mask = new Uint8Array([1]);
      expect(computeMeanDepth(depthMap, mask, 1, 1)).toBe(42);
    });
  });

  describe("depthStats", () => {
    it("should compute stats for an array of depths", async () => {
      const { computeDepthStats } = await import("./depth-computation.js");
      const stats = computeDepthStats([50, 100, 150, 200]);
      expect(stats.min).toBe(50);
      expect(stats.max).toBe(200);
      expect(stats.mean).toBe(125);
      expect(stats.stddev).toBeCloseTo(55.9, 0);
      expect(stats.count).toBe(4);
    });

    it("should handle empty array", async () => {
      const { computeDepthStats } = await import("./depth-computation.js");
      const stats = computeDepthStats([]);
      expect(stats.count).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.mean).toBe(0);
      expect(stats.stddev).toBe(0);
    });

    it("should handle single value (stddev=0)", async () => {
      const { computeDepthStats } = await import("./depth-computation.js");
      const stats = computeDepthStats([128]);
      expect(stats.count).toBe(1);
      expect(stats.stddev).toBe(0);
      expect(stats.mean).toBe(128);
    });

    it("should handle all identical values (stddev=0)", async () => {
      const { computeDepthStats } = await import("./depth-computation.js");
      const stats = computeDepthStats([128, 128, 128]);
      expect(stats.stddev).toBe(0);
    });
  });
});
