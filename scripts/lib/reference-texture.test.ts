/// <reference types="node" />
import { describe, expect, it } from "vitest";
import { analyzeReferenceTexture } from "./reference-texture.js";

type Rgb = readonly [number, number, number];

function toByte(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 255);
}

function yuv(y: number, u: number, v: number): Rgb {
  const r = y + v;
  const b = y + u;
  const g = (y - 0.299 * r - 0.114 * b) / 0.587;
  return [toByte(r), toByte(g), toByte(b)];
}

function makeVideo(width: number, height: number, frameCount: number, pixel: (x: number, y: number, frame: number) => Rgb): Buffer {
  const data = Buffer.alloc(width * height * frameCount * 3);
  for (let frame = 0; frame < frameCount; frame++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = ((frame * height + y) * width + x) * 3;
        const [r, g, b] = pixel(x, y, frame);
        data[offset] = r;
        data[offset + 1] = g;
        data[offset + 2] = b;
      }
    }
  }
  return data;
}

describe("reference texture analysis", () => {
  it("separates fast chroma motion from restrained luminance motion", () => {
    const frameCount = 16;
    const data = makeVideo(12, 12, frameCount, (_x, _y, frame) => {
      const phase = (frame / (frameCount - 1)) * Math.PI * 2;
      return yuv(0.5, Math.cos(phase) * 0.2, Math.sin(phase) * 0.2);
    });

    const result = analyzeReferenceTexture({ data, width: 12, height: 12, fps: 30 });

    expect(result.chromaToLumaMotion).toBeGreaterThan(20);
    expect(result.hueStep95).toBeGreaterThan(10);
    expect(result.loopClosureRatio).toBeLessThan(0.1);
  });

  it("distinguishes coherent advected grain from random frame noise", () => {
    const coherent = makeVideo(20, 20, 18, (x, y, frame) => {
      const band = ((x + frame) % 6) < 3 ? 0.18 : -0.18;
      return yuv(0.48 + (y % 5) * 0.005, band, -band * 0.6);
    });
    let state = 17;
    const random = makeVideo(20, 20, 18, () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      const band = ((state / 0xffffffff) - 0.5) * 0.36;
      return yuv(0.5, band, -band * 0.6);
    });

    const coherentResult = analyzeReferenceTexture({ data: coherent, width: 20, height: 20, fps: 30 });
    const randomResult = analyzeReferenceTexture({ data: random, width: 20, height: 20, fps: 30 });

    expect(coherentResult.temporalCoherence).toBeGreaterThan(randomResult.temporalCoherence + 0.15);
  });

  it("reports motion concentrated on source edges", () => {
    const data = makeVideo(24, 18, 14, (x, _y, frame) => {
      const baseY = x < 12 ? 0.25 : 0.72;
      const edgeBand = x >= 10 && x <= 13;
      const phase = frame % 2 === 0 ? 0.18 : -0.18;
      return edgeBand ? yuv(baseY, phase, -phase) : yuv(baseY, 0, 0);
    });

    const result = analyzeReferenceTexture({ data, width: 24, height: 18, fps: 30 });

    expect(result.edgeMotionRatio).toBeGreaterThan(3);
    expect(result.edgePersistence).toBeGreaterThan(0.95);
  });

  it("separates a global chroma sheet from connected material motion", () => {
    const frameCount = 18;
    const globalSheet = makeVideo(24, 18, frameCount, (_x, _y, frame) => {
      const phase = (frame / frameCount) * Math.PI * 2;
      return yuv(0.5, Math.cos(phase) * 0.2, Math.sin(phase) * 0.2);
    });
    const materialTravel = makeVideo(24, 18, frameCount, (x, y, frame) => {
      const ridge = Math.sin(((x - frame * 0.7) / 5) * Math.PI * 2) * 0.18;
      const contour = Math.sin((y / 6) * Math.PI * 2) * 0.05;
      return yuv(0.46 + contour, ridge, -ridge * 0.65);
    });

    const globalResult = analyzeReferenceTexture({ data: globalSheet, width: 24, height: 18, fps: 30 });
    const materialResult = analyzeReferenceTexture({ data: materialTravel, width: 24, height: 18, fps: 30 });

    expect(globalResult.globalChromaMotionShare).toBeGreaterThan(0.8);
    expect(materialResult.globalChromaMotionShare).toBeLessThan(globalResult.globalChromaMotionShare - 0.2);
    expect(materialResult.connectedMotionCoverage).toBeGreaterThan(0.05);
  });
});
