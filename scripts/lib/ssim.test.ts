/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { rmse, imageSimilarity, ssimLite, type ImageBuffer } from "./ssim.js";

function makeBuffer(w: number, h: number, fill: number): ImageBuffer {
  return {
    data: Buffer.alloc(w * h * 4, fill),
    width: w,
    height: h,
    channels: 4,
  };
}

describe("ssim/rmse helpers", () => {
  it("rmse returns 0 for identical images", () => {
    const a = makeBuffer(16, 16, 128);
    const b = makeBuffer(16, 16, 128);
    expect(rmse(a, b)).toBe(0);
  });

  it("rmse > 0 for different images", () => {
    const a = makeBuffer(16, 16, 0);
    const b = makeBuffer(16, 16, 255);
    expect(rmse(a, b)).toBeCloseTo(1.0, 2);
  });

  it("imageSimilarity returns 1 for identical", () => {
    const a = makeBuffer(16, 16, 128);
    const b = makeBuffer(16, 16, 128);
    expect(imageSimilarity(a, b)).toBe(1);
  });

  it("ssimLite returns ~1 for identical", () => {
    const a = makeBuffer(32, 32, 128);
    const b = makeBuffer(32, 32, 128);
    const s = ssimLite(a, b);
    expect(s).toBeGreaterThan(0.99);
  });

  it("ssimLite returns <0.9 for very different", () => {
    const a = makeBuffer(32, 32, 0);
    const b = makeBuffer(32, 32, 255);
    const s = ssimLite(a, b);
    expect(s).toBeLessThan(0.9);
  });

  it("rmse throws on size mismatch", () => {
    const a = makeBuffer(16, 16, 0);
    const b = makeBuffer(8, 8, 0);
    expect(() => rmse(a, b)).toThrow();
  });
});
