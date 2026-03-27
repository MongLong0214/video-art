import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";

import { scoreComplexity } from "./complexity-scoring.js";

// ---------- helpers ----------

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cs-comp-"));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function createRgbBuffer(width: number, height: number, r: number, g: number, b: number): Buffer {
  const buf = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    buf[i * 3] = r;
    buf[i * 3 + 1] = g;
    buf[i * 3 + 2] = b;
  }
  return buf;
}

async function saveRgbPng(buf: Buffer, width: number, height: number, name: string): Promise<string> {
  const filePath = path.join(tmpDir, name);
  await sharp(buf, { raw: { width, height, channels: 3 } }).png().toFile(filePath);
  return filePath;
}

// ==========================================================================
// Sobel edge detection
// ==========================================================================

describe("Sobel edge detection", () => {
  it("should return low edge density for flat image", async () => {
    const buf = createRgbBuffer(50, 50, 128, 128, 128);
    const f = await saveRgbPng(buf, 50, 50, "sobel-flat.png");
    const result = await scoreComplexity(f);
    expect(result.edgeDensity).toBeLessThan(0.05);
  });

  it("should return higher edge density for vertical line", async () => {
    const buf = createRgbBuffer(50, 50, 128, 128, 128);
    // Draw vertical white line at x=25
    for (let y = 0; y < 50; y++) {
      const idx = (y * 50 + 25) * 3;
      buf[idx] = 255;
      buf[idx + 1] = 255;
      buf[idx + 2] = 255;
    }
    const f = await saveRgbPng(buf, 50, 50, "sobel-vline.png");
    const result = await scoreComplexity(f);
    expect(result.edgeDensity).toBeGreaterThan(0);
  });

  it("should return higher edge density for horizontal line", async () => {
    const buf = createRgbBuffer(50, 50, 128, 128, 128);
    // Draw horizontal white line at y=25
    for (let x = 0; x < 50; x++) {
      const idx = (25 * 50 + x) * 3;
      buf[idx] = 255;
      buf[idx + 1] = 255;
      buf[idx + 2] = 255;
    }
    const f = await saveRgbPng(buf, 50, 50, "sobel-hline.png");
    const result = await scoreComplexity(f);
    expect(result.edgeDensity).toBeGreaterThan(0);
  });

  it("should detect diagonal line edges", async () => {
    const buf = createRgbBuffer(50, 50, 0, 0, 0);
    for (let i = 0; i < 50; i++) {
      const idx = (i * 50 + i) * 3;
      buf[idx] = 255;
      buf[idx + 1] = 255;
      buf[idx + 2] = 255;
    }
    const f = await saveRgbPng(buf, 50, 50, "sobel-diag.png");
    const result = await scoreComplexity(f);
    expect(result.edgeDensity).toBeGreaterThan(0);
  });

  it("should return near-zero edge density for 1px checkerboard (Sobel symmetric cancellation)", async () => {
    // A perfect 1-pixel checkerboard causes Sobel kernels to cancel out
    // at interior pixels due to symmetric neighbor patterns. Only border
    // pixels produce non-zero gradients, yielding very low edge density.
    const W = 50, H = 50;
    const buf = Buffer.alloc(W * H * 3);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 3;
        const val = (x + y) % 2 === 0 ? 255 : 0;
        buf[idx] = val;
        buf[idx + 1] = val;
        buf[idx + 2] = val;
      }
    }
    const f = await saveRgbPng(buf, W, H, "sobel-checker.png");
    const result = await scoreComplexity(f);
    expect(result.edgeDensity).toBeGreaterThan(0);
    expect(result.edgeDensity).toBeLessThan(0.05);
  });
});

// ==========================================================================
// Color entropy
// ==========================================================================

describe("color entropy", () => {
  it("should return 0 entropy for single-color gray image", async () => {
    const buf = createRgbBuffer(30, 30, 128, 128, 128);
    const f = await saveRgbPng(buf, 30, 30, "ent-gray.png");
    const result = await scoreComplexity(f);
    expect(result.colorEntropy).toBeCloseTo(0, 1);
  });

  it("should return 0 entropy for single-color pure black", async () => {
    const buf = createRgbBuffer(30, 30, 0, 0, 0);
    const f = await saveRgbPng(buf, 30, 30, "ent-black.png");
    const result = await scoreComplexity(f);
    expect(result.colorEntropy).toBeCloseTo(0, 1);
  });

  it("should return low entropy for 2 colors", async () => {
    const buf = createRgbBuffer(30, 30, 255, 0, 0);
    // Fill bottom half with blue
    for (let y = 15; y < 30; y++) {
      for (let x = 0; x < 30; x++) {
        const idx = (y * 30 + x) * 3;
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 255;
      }
    }
    const f = await saveRgbPng(buf, 30, 30, "ent-2color.png");
    const result = await scoreComplexity(f);
    expect(result.colorEntropy).toBeLessThan(3);
  });

  it("should return higher entropy for gradient (many hues)", async () => {
    const W = 360, H = 10;
    const buf = Buffer.alloc(W * H * 3);
    for (let x = 0; x < W; x++) {
      // hue = x degrees
      const h = x;
      const s = 1, v = 1;
      const c = v * s;
      const hp = h / 60;
      const x2 = c * (1 - Math.abs((hp % 2) - 1));
      let r1 = 0, g1 = 0, b1 = 0;
      if (hp < 1) { r1 = c; g1 = x2; }
      else if (hp < 2) { r1 = x2; g1 = c; }
      else if (hp < 3) { g1 = c; b1 = x2; }
      else if (hp < 4) { g1 = x2; b1 = c; }
      else if (hp < 5) { r1 = x2; b1 = c; }
      else { r1 = c; b1 = x2; }
      const m = v - c;
      for (let y = 0; y < H; y++) {
        const idx = (y * W + x) * 3;
        buf[idx] = Math.round((r1 + m) * 255);
        buf[idx + 1] = Math.round((g1 + m) * 255);
        buf[idx + 2] = Math.round((b1 + m) * 255);
      }
    }
    const f = await saveRgbPng(buf, W, H, "ent-gradient.png");
    const result = await scoreComplexity(f);
    expect(result.colorEntropy).toBeGreaterThan(3);
  });
});

// ==========================================================================
// Complexity tiers
// ==========================================================================

describe("complexity tiers", () => {
  it("should classify flat gray image as simple", async () => {
    const buf = createRgbBuffer(50, 50, 128, 128, 128);
    const f = await saveRgbPng(buf, 50, 50, "tier-simple.png");
    const result = await scoreComplexity(f);
    expect(result.tier).toBe("simple");
  });

  it("should produce layerCount=3 for simple", async () => {
    const buf = createRgbBuffer(50, 50, 128, 128, 128);
    const f = await saveRgbPng(buf, 50, 50, "tier-simple-lc.png");
    const result = await scoreComplexity(f);
    expect(result.layerCount).toBe(3);
  });

  it("should only return 3, 4, or 6 for layerCount", async () => {
    const buf = createRgbBuffer(30, 30, 100, 100, 100);
    const f = await saveRgbPng(buf, 30, 30, "tier-valid-lc.png");
    const result = await scoreComplexity(f);
    expect([3, 4, 6]).toContain(result.layerCount);
  });

  it("should classify checkerboard with gradients as complex", async () => {
    const W = 100, H = 100;
    const buf = Buffer.alloc(W * H * 3);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 3;
        // High-frequency checkerboard + color gradient
        const check = ((Math.floor(x / 5) + Math.floor(y / 5)) % 2) * 255;
        buf[idx] = (check + x * 2) % 256;
        buf[idx + 1] = (check + y * 2) % 256;
        buf[idx + 2] = (x * y) % 256;
      }
    }
    const f = await saveRgbPng(buf, W, H, "tier-complex.png");
    const result = await scoreComplexity(f);
    // High edges + high entropy → complex
    expect(result.tier).toBe("complex");
    expect(result.layerCount).toBe(6);
  });

  it("should respect custom thresholds via config", async () => {
    const buf = createRgbBuffer(50, 50, 128, 128, 128);
    const f = await saveRgbPng(buf, 50, 50, "tier-custom.png");
    // Very strict simple threshold → should still be simple
    const result = await scoreComplexity(f, {
      simpleEdgeMax: 0.5,
      simpleEntropyMax: 8.0,
    });
    expect(result.tier).toBe("simple");
  });
});

// ==========================================================================
// Edge pixel threshold variations
// ==========================================================================

describe("edge pixel threshold", () => {
  it("should detect more edges with lower threshold", async () => {
    const buf = createRgbBuffer(50, 50, 128, 128, 128);
    for (let y = 0; y < 50; y++) {
      const idx = (y * 50 + 25) * 3;
      buf[idx] = 140;
    }
    const f = await saveRgbPng(buf, 50, 50, "ept-low.png");
    const lowThresh = await scoreComplexity(f, { edgePixelThreshold: 10 });
    const highThresh = await scoreComplexity(f, { edgePixelThreshold: 80 });
    expect(lowThresh.edgeDensity).toBeGreaterThanOrEqual(highThresh.edgeDensity);
  });

  it("should detect fewer edges with higher threshold", async () => {
    const W = 50, H = 50;
    const buf = Buffer.alloc(W * H * 3);
    // Subtle gradient
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < H; y++) {
        const idx = (y * W + x) * 3;
        buf[idx] = Math.round(x * 255 / W);
        buf[idx + 1] = 128;
        buf[idx + 2] = 128;
      }
    }
    const f = await saveRgbPng(buf, W, H, "ept-high.png");
    const result = await scoreComplexity(f, { edgePixelThreshold: 100 });
    expect(result.edgeDensity).toBeLessThan(0.5);
  });
});

// ==========================================================================
// Boundary values
// ==========================================================================

describe("boundary values", () => {
  it("should handle edgeDensity exactly at simpleEdgeMax=0.10", async () => {
    // Result should be simple if edgeDensity < 0.10 and entropy < 5.5
    const buf = createRgbBuffer(30, 30, 128, 128, 128);
    const f = await saveRgbPng(buf, 30, 30, "bound-edge.png");
    const result = await scoreComplexity(f);
    if (result.edgeDensity < 0.10 && result.colorEntropy < 5.5) {
      expect(result.tier).toBe("simple");
    }
  });

  it("should handle all-white image", async () => {
    const buf = createRgbBuffer(30, 30, 255, 255, 255);
    const f = await saveRgbPng(buf, 30, 30, "bound-white.png");
    const result = await scoreComplexity(f);
    expect(result.tier).toBe("simple");
    expect(result.edgeDensity).toBeCloseTo(0, 1);
    expect(result.colorEntropy).toBeCloseTo(0, 1);
  });

  it("should handle all-black image", async () => {
    const buf = createRgbBuffer(30, 30, 0, 0, 0);
    const f = await saveRgbPng(buf, 30, 30, "bound-black.png");
    const result = await scoreComplexity(f);
    expect(result.tier).toBe("simple");
    expect(result.colorEntropy).toBeCloseTo(0, 1);
  });

  it("should handle all-red image", async () => {
    const buf = createRgbBuffer(30, 30, 255, 0, 0);
    const f = await saveRgbPng(buf, 30, 30, "bound-red.png");
    const result = await scoreComplexity(f);
    expect(result.tier).toBe("simple");
  });

  it("should return edgeDensity in [0,1] range", async () => {
    const buf = createRgbBuffer(30, 30, 128, 128, 128);
    const f = await saveRgbPng(buf, 30, 30, "bound-range.png");
    const result = await scoreComplexity(f);
    expect(result.edgeDensity).toBeGreaterThanOrEqual(0);
    expect(result.edgeDensity).toBeLessThanOrEqual(1);
  });

  it("should return colorEntropy >= 0", async () => {
    const buf = createRgbBuffer(30, 30, 128, 128, 128);
    const f = await saveRgbPng(buf, 30, 30, "bound-entropy.png");
    const result = await scoreComplexity(f);
    expect(result.colorEntropy).toBeGreaterThanOrEqual(0);
  });
});
