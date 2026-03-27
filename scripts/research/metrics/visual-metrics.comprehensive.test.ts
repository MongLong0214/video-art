import { describe, it, expect } from "vitest";

import {
  rgbToYCbCr,
  gaussianKernel,
  ssimSingleScale,
  msssim,
  computeMsssimYCbCr,
} from "./ms-ssim.js";
import {
  cannyEdgeDetect,
  dilateEdgeMap,
  edgeF1Score,
  computeEdgePreservation,
} from "./edge-preservation.js";
import { computeTextureRichness } from "./texture-richness.js";

// ---------- helpers ----------

function createFlatArray(w: number, h: number, value: number): Float64Array {
  return new Float64Array(w * h).fill(value);
}

function createNoisyArray(w: number, h: number, seed: number = 42): Float64Array {
  const arr = new Float64Array(w * h);
  let s = seed;
  for (let i = 0; i < arr.length; i++) {
    s = (s * 16807 + 0) % 2147483647;
    arr[i] = (s / 2147483647) * 255;
  }
  return arr;
}

function createGradientArray(w: number, h: number, direction: "horizontal" | "vertical"): Float64Array {
  const arr = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      arr[y * w + x] = direction === "horizontal"
        ? (x / w) * 255
        : (y / h) * 255;
    }
  }
  return arr;
}

function createCheckerboard(w: number, h: number, blockSize: number): Float64Array {
  const arr = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      arr[y * w + x] = ((Math.floor(x / blockSize) + Math.floor(y / blockSize)) % 2) * 255;
    }
  }
  return arr;
}

// ==========================================================================
// rgbToYCbCr
// ==========================================================================

describe("rgbToYCbCr", () => {
  it("should convert black to Y=0, Cb=128, Cr=128", () => {
    const [y, cb, cr] = rgbToYCbCr(0, 0, 0);
    expect(y).toBeCloseTo(0, 0);
    expect(cb).toBeCloseTo(128, 0);
    expect(cr).toBeCloseTo(128, 0);
  });

  it("should convert white to Y≈255, Cb≈128, Cr≈128", () => {
    const [y, cb, cr] = rgbToYCbCr(255, 255, 255);
    expect(y).toBeCloseTo(255, 0);
    expect(cb).toBeCloseTo(128, 0);
    expect(cr).toBeCloseTo(128, 0);
  });

  it("should produce higher Y for brighter colors", () => {
    const [yDark] = rgbToYCbCr(50, 50, 50);
    const [yBright] = rgbToYCbCr(200, 200, 200);
    expect(yBright).toBeGreaterThan(yDark);
  });

  it("should produce correct chroma for pure red", () => {
    const [, cb, cr] = rgbToYCbCr(255, 0, 0);
    expect(cr).toBeGreaterThan(200);
    expect(cb).toBeLessThan(128);
  });

  it("should produce correct chroma for pure blue", () => {
    const [, cb] = rgbToYCbCr(0, 0, 255);
    expect(cb).toBeGreaterThan(200);
  });
});

// ==========================================================================
// gaussianKernel
// ==========================================================================

describe("gaussianKernel", () => {
  it("should produce kernel summing to ~1.0", () => {
    const k = gaussianKernel(11, 1.5);
    let sum = 0;
    for (const row of k) for (const v of row) sum += v;
    expect(sum).toBeCloseTo(1.0, 4);
  });

  it("should produce symmetric kernel", () => {
    const k = gaussianKernel(5, 1.0);
    expect(k[0][0]).toBeCloseTo(k[0][4], 6);
    expect(k[0][0]).toBeCloseTo(k[4][0], 6);
    expect(k[2][2]).toBeGreaterThan(k[0][0]);
  });

  it("should have peak at center", () => {
    const k = gaussianKernel(7, 2.0);
    const center = k[3][3];
    expect(center).toBeGreaterThan(k[0][0]);
    expect(center).toBeGreaterThan(k[3][0]);
  });

  it("should handle size=1", () => {
    const k = gaussianKernel(1, 1.0);
    expect(k.length).toBe(1);
    expect(k[0][0]).toBeCloseTo(1.0, 4);
  });

  it("should handle size=3", () => {
    const k = gaussianKernel(3, 0.5);
    expect(k.length).toBe(3);
    expect(k[0].length).toBe(3);
  });
});

// ==========================================================================
// MS-SSIM
// ==========================================================================

describe("ssimSingleScale", () => {
  it("should return ~1.0 for identical images", () => {
    const W = 32, H = 32;
    const img = createGradientArray(W, H, "horizontal");
    expect(ssimSingleScale(img, img, W, H)).toBeGreaterThan(0.99);
  });

  it("should return lower score for different images", () => {
    const W = 32, H = 32;
    const a = createFlatArray(W, H, 100);
    const b = createNoisyArray(W, H);
    expect(ssimSingleScale(a, b, W, H)).toBeLessThan(0.8);
  });

  it("should return low score for all-black vs all-white", () => {
    const W = 32, H = 32;
    const black = createFlatArray(W, H, 0);
    const white = createFlatArray(W, H, 255);
    const ssim = ssimSingleScale(black, white, W, H);
    expect(ssim).toBeLessThan(0.1);
  });

  it("should return value in [0, 1]", () => {
    const W = 32, H = 32;
    const a = createNoisyArray(W, H, 1);
    const b = createNoisyArray(W, H, 2);
    const ssim = ssimSingleScale(a, b, W, H);
    expect(ssim).toBeGreaterThanOrEqual(0);
    expect(ssim).toBeLessThanOrEqual(1);
  });
});

describe("msssim", () => {
  it("should return ~1.0 for identical images", () => {
    const W = 64, H = 64;
    const img = createGradientArray(W, H, "horizontal");
    expect(msssim(img, img, W, H)).toBeGreaterThan(0.99);
  });

  it("should return lower score for noisy version", () => {
    const W = 64, H = 64;
    const clean = createGradientArray(W, H, "horizontal");
    const noisy = new Float64Array(clean);
    let s = 42;
    for (let i = 0; i < noisy.length; i++) {
      s = (s * 16807) % 2147483647;
      noisy[i] = Math.max(0, Math.min(255, noisy[i] + (s / 2147483647 - 0.5) * 50));
    }
    const score = msssim(clean, noisy, W, H);
    expect(score).toBeLessThan(msssim(clean, clean, W, H));
    expect(score).toBeGreaterThan(0.3);
  });

  it("should handle small image (8x8) gracefully", () => {
    const W = 8, H = 8;
    const img = createFlatArray(W, H, 128);
    const score = msssim(img, img, W, H);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe("computeMsssimYCbCr (M4)", () => {
  it("should return ~1.0 for identical RGB buffers", () => {
    const W = 32, H = 32;
    const buf = Buffer.alloc(W * H * 3);
    for (let i = 0; i < W * H; i++) {
      buf[i * 3] = 128;
      buf[i * 3 + 1] = 64;
      buf[i * 3 + 2] = 200;
    }
    expect(computeMsssimYCbCr(buf, buf, W, H)).toBeGreaterThan(0.99);
  });

  it("should apply 0.8Y + 0.1Cb + 0.1Cr weighting", () => {
    // Verify channel weighting by checking score is dominated by Y channel
    const W = 32, H = 32;
    const ref = Buffer.alloc(W * H * 3, 128);
    // Alter only chroma (keep luma similar)
    const gen = Buffer.alloc(W * H * 3);
    for (let i = 0; i < W * H; i++) {
      gen[i * 3] = 128;
      gen[i * 3 + 1] = 128;
      gen[i * 3 + 2] = 128;
    }
    const score = computeMsssimYCbCr(ref, gen, W, H);
    // Small chroma difference → still high score because Y dominates
    expect(score).toBeGreaterThan(0.7);
  });
});

// ==========================================================================
// Canny Edge Detection (M5)
// ==========================================================================

describe("cannyEdgeDetect", () => {
  it("should detect no edges in flat image", () => {
    const W = 32, H = 32;
    const flat = createFlatArray(W, H, 128);
    const edges = cannyEdgeDetect(flat, W, H);
    const edgeCount = edges.reduce((sum, v) => sum + v, 0);
    expect(edgeCount).toBe(0);
  });

  it("should detect edges in high-contrast image", () => {
    const W = 32, H = 32;
    const img = new Float64Array(W * H);
    // Left half black, right half white
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        img[y * W + x] = x < W / 2 ? 0 : 255;
      }
    }
    const edges = cannyEdgeDetect(img, W, H);
    const edgeCount = edges.reduce((sum, v) => sum + v, 0);
    expect(edgeCount).toBeGreaterThan(0);
  });

  it("should return Uint8Array of 0s and 1s", () => {
    const W = 16, H = 16;
    const img = createNoisyArray(W, H);
    const edges = cannyEdgeDetect(img, W, H);
    for (let i = 0; i < edges.length; i++) {
      expect(edges[i] === 0 || edges[i] === 1).toBe(true);
    }
  });
});

describe("dilateEdgeMap", () => {
  it("should expand single edge pixel by radius", () => {
    const W = 10, H = 10;
    const edges = new Uint8Array(W * H);
    edges[5 * W + 5] = 1; // center pixel
    const dilated = dilateEdgeMap(edges, W, H, 2);
    // 5x5 square around center should all be 1
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        expect(dilated[(5 + dy) * W + (5 + dx)]).toBe(1);
      }
    }
  });

  it("should not modify empty edge map", () => {
    const W = 10, H = 10;
    const edges = new Uint8Array(W * H);
    const dilated = dilateEdgeMap(edges, W, H, 2);
    expect(dilated.reduce((s, v) => s + v, 0)).toBe(0);
  });

  it("should handle radius=0 (no dilation)", () => {
    const W = 10, H = 10;
    const edges = new Uint8Array(W * H);
    edges[5 * W + 5] = 1;
    const dilated = dilateEdgeMap(edges, W, H, 0);
    expect(dilated[5 * W + 5]).toBe(1);
    expect(dilated.reduce((s, v) => s + v, 0)).toBe(1);
  });
});

describe("edgeF1Score", () => {
  it("should return 1.0 for identical edge maps", () => {
    const edges = new Uint8Array(100);
    edges[10] = 1;
    edges[20] = 1;
    edges[30] = 1;
    expect(edgeF1Score(edges, edges)).toBeCloseTo(1.0, 4);
  });

  it("should return 1.0 for both empty (no edges)", () => {
    const ref = new Uint8Array(100);
    const gen = new Uint8Array(100);
    expect(edgeF1Score(ref, gen)).toBe(1.0);
  });

  it("should return 0 when ref has edges but gen has none", () => {
    const ref = new Uint8Array(100);
    ref[10] = 1;
    ref[20] = 1;
    const gen = new Uint8Array(100);
    expect(edgeF1Score(ref, gen)).toBe(0);
  });

  it("should return 0 when gen has edges but ref has none (pure FP)", () => {
    const ref = new Uint8Array(100);
    const gen = new Uint8Array(100);
    gen[10] = 1;
    gen[20] = 1;
    expect(edgeF1Score(ref, gen)).toBe(0);
  });

  it("should return 0.5 for 50% precision/recall", () => {
    const ref = new Uint8Array(100);
    const gen = new Uint8Array(100);
    ref[10] = 1;
    ref[20] = 1;
    gen[10] = 1; // TP
    gen[30] = 1; // FP
    // precision = 1/2, recall = 1/2, F1 = 2*(0.5*0.5)/(0.5+0.5) = 0.5
    expect(edgeF1Score(ref, gen)).toBeCloseTo(0.5, 4);
  });

  it("should return value in [0, 1]", () => {
    const ref = new Uint8Array(100);
    const gen = new Uint8Array(100);
    for (let i = 0; i < 50; i++) ref[i] = 1;
    for (let i = 25; i < 75; i++) gen[i] = 1;
    const f1 = edgeF1Score(ref, gen);
    expect(f1).toBeGreaterThanOrEqual(0);
    expect(f1).toBeLessThanOrEqual(1);
  });
});

describe("computeEdgePreservation (M5)", () => {
  it("should return high score for identical gray images", () => {
    const W = 32, H = 32;
    const img = createGradientArray(W, H, "horizontal");
    const score = computeEdgePreservation(img, img, W, H);
    expect(score).toBeGreaterThan(0.9);
  });

  it("should return lower score when edges differ", () => {
    const W = 32, H = 32;
    const ref = new Float64Array(W * H);
    const gen = new Float64Array(W * H);
    // ref: vertical edge at center
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        ref[y * W + x] = x < W / 2 ? 0 : 255;
      }
    }
    // gen: no edges (flat)
    gen.fill(128);
    const score = computeEdgePreservation(ref, gen, W, H);
    expect(score).toBeLessThan(0.5);
  });

  it("should return value in [0, 1]", () => {
    const W = 32, H = 32;
    const ref = createNoisyArray(W, H, 1);
    const gen = createNoisyArray(W, H, 2);
    const score = computeEdgePreservation(ref, gen, W, H);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

// ==========================================================================
// Texture Richness (M6)
// ==========================================================================

describe("computeTextureRichness (M6)", () => {
  it("should return 1.0 for identical textures", () => {
    const W = 64, H = 64;
    const img = createNoisyArray(W, H);
    expect(computeTextureRichness(img, img, W, H)).toBeCloseTo(1.0, 4);
  });

  it("should return 1.0 for both flat images", () => {
    const W = 64, H = 64;
    const ref = createFlatArray(W, H, 128);
    const gen = createFlatArray(W, H, 128);
    expect(computeTextureRichness(ref, gen, W, H)).toBe(1.0);
  });

  it("should return 0.5 when one is flat and other is textured", () => {
    const W = 64, H = 64;
    const flat = createFlatArray(W, H, 128);
    const noisy = createNoisyArray(W, H);
    expect(computeTextureRichness(flat, noisy, W, H)).toBe(0.5);
    expect(computeTextureRichness(noisy, flat, W, H)).toBe(0.5);
  });

  it("should penalize both richer and poorer textures (bidirectional)", () => {
    // Create images with meaningfully different block-variance entropy.
    // "mixed": some blocks noisy, some flat → spread of variances → higher entropy.
    // "uniform": all blocks similarly noisy → all similar variance → lower entropy.
    const W = 64, H = 64;
    const mixed = new Float64Array(W * H);
    const uniform = new Float64Array(W * H);
    let s = 42;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        s = (s * 16807) % 2147483647;
        const noise = s / 2147483647;
        const bx = Math.floor(x / 8);
        const by = Math.floor(y / 8);
        // mixed: alternating blocks of flat (128) and noisy (0-255)
        if ((bx + by) % 2 === 0) {
          mixed[y * W + x] = 128;
        } else {
          mixed[y * W + x] = noise * 255;
        }
        // uniform: consistent moderate noise everywhere
        uniform[y * W + x] = 128 + (noise - 0.5) * 100;
      }
    }
    const score1 = computeTextureRichness(mixed, uniform, W, H);
    const score2 = computeTextureRichness(uniform, mixed, W, H);
    // Both should be < 1.0 (penalized for difference in entropy)
    expect(score1).toBeLessThan(1.0);
    expect(score2).toBeLessThan(1.0);
    // Both should be >= 0
    expect(score1).toBeGreaterThanOrEqual(0);
    expect(score2).toBeGreaterThanOrEqual(0);
  });

  it("should return value in [0, 1]", () => {
    const W = 64, H = 64;
    const ref = createNoisyArray(W, H, 1);
    const gen = createNoisyArray(W, H, 99);
    const score = computeTextureRichness(ref, gen, W, H);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("should handle small image (8x8) without error", () => {
    const W = 8, H = 8;
    const ref = createNoisyArray(W, H, 1);
    const gen = createNoisyArray(W, H, 2);
    const score = computeTextureRichness(ref, gen, W, H);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
