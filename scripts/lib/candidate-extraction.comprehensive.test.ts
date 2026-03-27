import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";

import { extractCandidates } from "./candidate-extraction.js";

// ---------- helpers ----------

function createRgbaBuffer(
  width: number,
  height: number,
  fill: { r: number; g: number; b: number; a: number } = { r: 0, g: 0, b: 0, a: 0 },
): Buffer {
  const buf = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    buf[i * 4] = fill.r;
    buf[i * 4 + 1] = fill.g;
    buf[i * 4 + 2] = fill.b;
    buf[i * 4 + 3] = fill.a;
  }
  return buf;
}

function paintRect(
  buf: Buffer,
  width: number,
  rect: { x: number; y: number; w: number; h: number },
  color: { r: number; g: number; b: number; a: number },
): void {
  for (let row = rect.y; row < rect.y + rect.h; row++) {
    for (let col = rect.x; col < rect.x + rect.w; col++) {
      const idx = (row * width + col) * 4;
      buf[idx] = color.r;
      buf[idx + 1] = color.g;
      buf[idx + 2] = color.b;
      buf[idx + 3] = color.a;
    }
  }
}

function paintPixel(
  buf: Buffer,
  width: number,
  x: number,
  y: number,
  color: { r: number; g: number; b: number; a: number },
): void {
  const idx = (y * width + x) * 4;
  buf[idx] = color.r;
  buf[idx + 1] = color.g;
  buf[idx + 2] = color.b;
  buf[idx + 3] = color.a;
}

const OPAQUE = { r: 255, g: 0, b: 0, a: 255 };
const BLUE = { r: 0, g: 0, b: 255, a: 255 };
const GREEN = { r: 0, g: 255, b: 0, a: 255 };

let tmpDir: string;
let outDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ce-comp-"));
  outDir = path.join(tmpDir, "out");
  fs.mkdirSync(outDir, { recursive: true });
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function savePng(buf: Buffer, width: number, height: number, name: string): Promise<string> {
  const filePath = path.join(tmpDir, name);
  await sharp(buf, { raw: { width, height, channels: 4 } }).png().toFile(filePath);
  return filePath;
}

// ==========================================================================
// BFS Connected Components
// ==========================================================================

describe("BFS connected components", () => {
  it("should find single component filling entire image", async () => {
    const buf = createRgbaBuffer(20, 20, OPAQUE);
    const f = await savePng(buf, 20, 20, "bfs-single-full.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(1);
    expect(candidates[0].coverage).toBeCloseTo(1.0, 2);
  });

  it("should find 2 separated components", async () => {
    const buf = createRgbaBuffer(100, 100);
    paintRect(buf, 100, { x: 0, y: 0, w: 30, h: 30 }, OPAQUE);
    paintRect(buf, 100, { x: 70, y: 70, w: 30, h: 30 }, BLUE);
    const f = await savePng(buf, 100, 100, "bfs-two-sep.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(2);
  });

  it("should find 4 corner components", async () => {
    const W = 100, H = 100;
    const buf = createRgbaBuffer(W, H);
    paintRect(buf, W, { x: 0, y: 0, w: 20, h: 20 }, OPAQUE);
    paintRect(buf, W, { x: 80, y: 0, w: 20, h: 20 }, BLUE);
    paintRect(buf, W, { x: 0, y: 80, w: 20, h: 20 }, GREEN);
    paintRect(buf, W, { x: 80, y: 80, w: 20, h: 20 }, { r: 255, g: 255, b: 0, a: 255 });
    const f = await savePng(buf, W, H, "bfs-4corners.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(4);
  });

  it("should NOT connect diagonal pixels (4-connectivity)", async () => {
    // Create 2x2 checkerboard pattern
    const buf = createRgbaBuffer(4, 4);
    // Only diagonal adjacency, not 4-connected
    paintPixel(buf, 4, 0, 0, OPAQUE);
    paintPixel(buf, 4, 1, 1, OPAQUE);
    paintPixel(buf, 4, 2, 2, OPAQUE);
    paintPixel(buf, 4, 3, 3, OPAQUE);
    const f = await savePng(buf, 4, 4, "bfs-diag.png");
    // Each pixel is isolated under 4-connectivity (no shared edges).
    // 4x4 = 16 pixels total, each pixel = 6.25% coverage > 0.5% threshold,
    // so all 4 isolated components are retained.
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(4);
  });

  it("should find single pixel component (filtered by min coverage)", async () => {
    const buf = createRgbaBuffer(10, 10);
    paintPixel(buf, 10, 5, 5, OPAQUE);
    const f = await savePng(buf, 10, 10, "bfs-1px.png");
    // 1 pixel out of 100 = 1% > 0.5% default threshold
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(1);
  });

  it("should return empty for all-transparent image", async () => {
    const buf = createRgbaBuffer(50, 50);
    const f = await savePng(buf, 50, 50, "bfs-empty.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(0);
  });

  it("should handle full-opaque image as single component", async () => {
    const buf = createRgbaBuffer(30, 30, OPAQUE);
    const f = await savePng(buf, 30, 30, "bfs-full.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(1);
    expect(candidates[0].coverage).toBeCloseTo(1.0, 2);
  });

  it("should treat checkerboard as many isolated pixels", async () => {
    const W = 20, H = 20;
    const buf = createRgbaBuffer(W, H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if ((x + y) % 2 === 0) paintPixel(buf, W, x, y, OPAQUE);
      }
    }
    const f = await savePng(buf, W, H, "bfs-checker.png");
    // Checkerboard: each pixel is isolated (4-connectivity), coverage per component = 1/400 = 0.25% < 0.5%
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(0);
  });

  it("should find L-shape as single component", async () => {
    const W = 20, H = 20;
    const buf = createRgbaBuffer(W, H);
    // Vertical bar
    paintRect(buf, W, { x: 2, y: 2, w: 3, h: 16 }, OPAQUE);
    // Horizontal bar (connected at bottom)
    paintRect(buf, W, { x: 2, y: 15, w: 16, h: 3 }, OPAQUE);
    const f = await savePng(buf, W, H, "bfs-lshape.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(1);
  });

  it("should find ring shape as single component (4-connected)", async () => {
    const W = 20, H = 20;
    const buf = createRgbaBuffer(W, H);
    // Outer rectangle
    paintRect(buf, W, { x: 2, y: 2, w: 16, h: 16 }, OPAQUE);
    // Inner hole (transparent)
    paintRect(buf, W, { x: 5, y: 5, w: 10, h: 10 }, { r: 0, g: 0, b: 0, a: 0 });
    const f = await savePng(buf, W, H, "bfs-ring.png");
    const candidates = await extractCandidates(f, outDir);
    // Ring is 4-connected (all border pixels connect)
    expect(candidates.length).toBe(1);
  });
});

// ==========================================================================
// Alpha threshold boundary values
// ==========================================================================

describe("alpha threshold boundary", () => {
  it("should include pixel at alpha=129 (default threshold 128)", async () => {
    const buf = createRgbaBuffer(20, 20);
    // Fill enough pixels for coverage > 0.5%
    for (let i = 0; i < 20; i++) {
      const idx = (i * 20 + i) * 4;
      buf[idx] = 255;
      buf[idx + 3] = 129;
    }
    // Only diagonal pixels which are not 4-connected, each 1/400
    // Let's fill a block instead
    const buf2 = createRgbaBuffer(20, 20);
    paintRect(buf2, 20, { x: 0, y: 0, w: 10, h: 10 }, { r: 255, g: 0, b: 0, a: 129 });
    const f = await savePng(buf2, 20, 20, "alpha-129.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(1);
  });

  it("should exclude pixel at alpha=128 (not strictly greater)", async () => {
    const buf = createRgbaBuffer(20, 20);
    paintRect(buf, 20, { x: 0, y: 0, w: 10, h: 10 }, { r: 255, g: 0, b: 0, a: 128 });
    const f = await savePng(buf, 20, 20, "alpha-128.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(0);
  });

  it("should exclude pixel at alpha=127", async () => {
    const buf = createRgbaBuffer(20, 20);
    paintRect(buf, 20, { x: 0, y: 0, w: 10, h: 10 }, { r: 255, g: 0, b: 0, a: 127 });
    const f = await savePng(buf, 20, 20, "alpha-127.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(0);
  });

  it("should include pixel at alpha=255", async () => {
    const buf = createRgbaBuffer(20, 20);
    paintRect(buf, 20, { x: 0, y: 0, w: 10, h: 10 }, { r: 255, g: 0, b: 0, a: 255 });
    const f = await savePng(buf, 20, 20, "alpha-255.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(1);
  });

  it("should exclude pixel at alpha=0", async () => {
    const buf = createRgbaBuffer(20, 20);
    paintRect(buf, 20, { x: 0, y: 0, w: 10, h: 10 }, { r: 255, g: 0, b: 0, a: 0 });
    const f = await savePng(buf, 20, 20, "alpha-0.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(0);
  });

  it("should respect custom alphaThreshold via config", async () => {
    const buf = createRgbaBuffer(20, 20);
    paintRect(buf, 20, { x: 0, y: 0, w: 10, h: 10 }, { r: 255, g: 0, b: 0, a: 50 });
    const f = await savePng(buf, 20, 20, "alpha-custom.png");
    // With threshold=30, alpha=50 should pass
    const candidates = await extractCandidates(f, outDir, { alphaThreshold: 30 });
    expect(candidates.length).toBe(1);
  });
});

// ==========================================================================
// Min coverage filter
// ==========================================================================

describe("min coverage filter", () => {
  it("should keep component exactly at 0.5% coverage", async () => {
    // 200 pixels image, 1 pixel = 0.5%
    const W = 20, H = 10;
    const buf = createRgbaBuffer(W, H);
    paintPixel(buf, W, 5, 5, OPAQUE);
    const f = await savePng(buf, W, H, "cov-exact.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(1);
  });

  it("should filter component just below 0.5% coverage", async () => {
    // 201+ pixels image where 1 pixel < 0.5%
    const W = 20, H = 11; // 220 pixels, 1px = 0.45%
    const buf = createRgbaBuffer(W, H);
    paintPixel(buf, W, 5, 5, OPAQUE);
    const f = await savePng(buf, W, H, "cov-below.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(0);
  });

  it("should keep component just above 0.5% coverage", async () => {
    const W = 10, H = 10; // 100 pixels
    const buf = createRgbaBuffer(W, H);
    paintPixel(buf, W, 5, 5, OPAQUE);
    // 1 pixel out of 100 = 1% > 0.5%
    const f = await savePng(buf, W, H, "cov-above.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(1);
  });

  it("should respect custom minCoverage config", async () => {
    const W = 100, H = 100; // 10000 pixels
    const buf = createRgbaBuffer(W, H);
    // 3x3 block = 9 pixels = 0.09%
    paintRect(buf, W, { x: 10, y: 10, w: 3, h: 3 }, OPAQUE);
    const f = await savePng(buf, W, H, "cov-custom.png");
    // Default: 0.09% < 0.5% => filtered
    const res1 = await extractCandidates(f, outDir);
    expect(res1.length).toBe(0);
    // Custom: 0.09% > 0.05% => kept
    const res2 = await extractCandidates(f, outDir, { minCoverage: 0.0005 });
    expect(res2.length).toBe(1);
  });
});

// ==========================================================================
// Stats computation
// ==========================================================================

describe("stats computation", () => {
  it("should compute correct bbox for top-left rectangle", async () => {
    const W = 50, H = 50;
    const buf = createRgbaBuffer(W, H);
    paintRect(buf, W, { x: 5, y: 10, w: 20, h: 15 }, OPAQUE);
    const f = await savePng(buf, W, H, "stats-bbox-tl.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(1);
    expect(candidates[0].bbox.x).toBe(5);
    expect(candidates[0].bbox.y).toBe(10);
    expect(candidates[0].bbox.w).toBe(20);
    expect(candidates[0].bbox.h).toBe(15);
  });

  it("should compute correct bbox for bottom-right rectangle", async () => {
    const W = 50, H = 50;
    const buf = createRgbaBuffer(W, H);
    paintRect(buf, W, { x: 25, y: 30, w: 25, h: 20 }, OPAQUE);
    const f = await savePng(buf, W, H, "stats-bbox-br.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(1);
    expect(candidates[0].bbox.x).toBe(25);
    expect(candidates[0].bbox.y).toBe(30);
    expect(candidates[0].bbox.w).toBe(25);
    expect(candidates[0].bbox.h).toBe(20);
  });

  it("should compute correct centroid for symmetric rectangle", async () => {
    const W = 50, H = 50;
    const buf = createRgbaBuffer(W, H);
    paintRect(buf, W, { x: 10, y: 10, w: 30, h: 30 }, OPAQUE);
    const f = await savePng(buf, W, H, "stats-cent-sym.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(1);
    expect(candidates[0].centroid.x).toBeCloseTo(24.5, 0);
    expect(candidates[0].centroid.y).toBeCloseTo(24.5, 0);
  });

  it("should compute correct centroid for asymmetric L-shape", async () => {
    const W = 30, H = 30;
    const buf = createRgbaBuffer(W, H);
    // Vertical bar: x=2..4, y=2..17 (3*16 = 48 pixels)
    paintRect(buf, W, { x: 2, y: 2, w: 3, h: 16 }, OPAQUE);
    // Horizontal bar: x=2..17, y=15..17 (16*3 = 48, minus overlap 3*3=9 = 39 new)
    paintRect(buf, W, { x: 2, y: 15, w: 16, h: 3 }, OPAQUE);
    const f = await savePng(buf, W, H, "stats-cent-asym.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(1);
    // Centroid should be biased toward the L-shape's mass
    expect(candidates[0].centroid.x).toBeGreaterThan(2);
    expect(candidates[0].centroid.y).toBeGreaterThan(8);
  });

  it("should compute edge density > 0 for bordered shape", async () => {
    const W = 30, H = 30;
    const buf = createRgbaBuffer(W, H);
    paintRect(buf, W, { x: 5, y: 5, w: 20, h: 20 }, OPAQUE);
    const f = await savePng(buf, W, H, "stats-edge.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(1);
    expect(candidates[0].edgeDensity).toBeGreaterThan(0);
    expect(candidates[0].edgeDensity).toBeLessThanOrEqual(1);
  });

  it("should have componentCount = 1 for each candidate", async () => {
    const W = 50, H = 50;
    const buf = createRgbaBuffer(W, H);
    paintRect(buf, W, { x: 0, y: 0, w: 20, h: 20 }, OPAQUE);
    paintRect(buf, W, { x: 30, y: 30, w: 20, h: 20 }, BLUE);
    const f = await savePng(buf, W, H, "stats-cc.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(2);
    expect(candidates[0].componentCount).toBe(1);
    expect(candidates[1].componentCount).toBe(1);
  });

  it("should compute coverage correctly", async () => {
    const W = 50, H = 50;
    const buf = createRgbaBuffer(W, H);
    // 25*25 = 625 pixels out of 2500 = 25%
    paintRect(buf, W, { x: 10, y: 10, w: 25, h: 25 }, OPAQUE);
    const f = await savePng(buf, W, H, "stats-coverage.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(1);
    expect(candidates[0].coverage).toBeCloseTo(0.25, 2);
  });
});

// ==========================================================================
// Edge cases: 1x1, empty, full images
// ==========================================================================

describe("edge case images", () => {
  it("should handle 1x1 opaque image", async () => {
    const buf = Buffer.from([255, 0, 0, 255]);
    const f = await savePng(buf, 1, 1, "edge-1x1-opaque.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(1);
    expect(candidates[0].coverage).toBe(1.0);
    expect(candidates[0].bbox).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it("should handle 1x1 transparent image", async () => {
    const buf = Buffer.from([0, 0, 0, 0]);
    const f = await savePng(buf, 1, 1, "edge-1x1-trans.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(0);
  });

  it("should produce unique IDs for each candidate", async () => {
    const W = 100, H = 100;
    const buf = createRgbaBuffer(W, H);
    paintRect(buf, W, { x: 0, y: 0, w: 30, h: 30 }, OPAQUE);
    paintRect(buf, W, { x: 40, y: 40, w: 30, h: 30 }, BLUE);
    paintRect(buf, W, { x: 70, y: 0, w: 30, h: 30 }, GREEN);
    const f = await savePng(buf, W, H, "edge-ids.png");
    const candidates = await extractCandidates(f, outDir);
    const ids = candidates.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should set source to qwen-base", async () => {
    const buf = createRgbaBuffer(20, 20, OPAQUE);
    const f = await savePng(buf, 20, 20, "edge-source.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates[0].source).toBe("qwen-base");
  });

  it("should save component PNGs to output directory", async () => {
    const testOutDir = path.join(tmpDir, "edge-out");
    fs.mkdirSync(testOutDir, { recursive: true });
    const buf = createRgbaBuffer(30, 30, OPAQUE);
    const f = await savePng(buf, 30, 30, "edge-pngs.png");
    const candidates = await extractCandidates(f, testOutDir);
    expect(candidates.length).toBe(1);
    expect(fs.existsSync(candidates[0].filePath)).toBe(true);
  });

  it("should set width and height on candidates", async () => {
    const buf = createRgbaBuffer(40, 30, OPAQUE);
    const f = await savePng(buf, 40, 30, "edge-dims.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates[0].width).toBe(40);
    expect(candidates[0].height).toBe(30);
  });
});

// ==========================================================================
// Multiple overlapping shapes
// ==========================================================================

describe("overlapping and touching shapes", () => {
  it("should merge two adjacent rectangles into single component", async () => {
    const W = 50, H = 50;
    const buf = createRgbaBuffer(W, H);
    paintRect(buf, W, { x: 5, y: 5, w: 20, h: 20 }, OPAQUE);
    paintRect(buf, W, { x: 25, y: 5, w: 20, h: 20 }, OPAQUE);
    const f = await savePng(buf, W, H, "overlap-adjacent.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(1);
  });

  it("should separate two rectangles with 1px gap", async () => {
    const W = 50, H = 50;
    const buf = createRgbaBuffer(W, H);
    paintRect(buf, W, { x: 5, y: 5, w: 10, h: 20 }, OPAQUE);
    // 1px gap at x=15
    paintRect(buf, W, { x: 16, y: 5, w: 10, h: 20 }, OPAQUE);
    const f = await savePng(buf, W, H, "overlap-gap.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(2);
  });

  it("should handle vertically adjacent rectangles as single component", async () => {
    const W = 50, H = 50;
    const buf = createRgbaBuffer(W, H);
    paintRect(buf, W, { x: 10, y: 5, w: 20, h: 15 }, OPAQUE);
    paintRect(buf, W, { x: 10, y: 20, w: 20, h: 15 }, BLUE);
    const f = await savePng(buf, W, H, "overlap-vert.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(1);
  });
});

// ==========================================================================
// Large image simulation
// ==========================================================================

describe("larger image handling", () => {
  it("should handle 200x200 image with multiple components", async () => {
    const W = 200, H = 200;
    const buf = createRgbaBuffer(W, H);
    paintRect(buf, W, { x: 0, y: 0, w: 80, h: 80 }, OPAQUE);
    paintRect(buf, W, { x: 120, y: 0, w: 80, h: 80 }, BLUE);
    paintRect(buf, W, { x: 0, y: 120, w: 80, h: 80 }, GREEN);
    paintRect(buf, W, { x: 120, y: 120, w: 80, h: 80 }, { r: 255, g: 255, b: 0, a: 255 });
    const f = await savePng(buf, W, H, "large-200.png");
    const candidates = await extractCandidates(f, outDir);
    expect(candidates.length).toBe(4);
    // Each is 80*80=6400 out of 40000 = 16%
    for (const c of candidates) {
      expect(c.coverage).toBeCloseTo(0.16, 1);
    }
  });

  it("should complete within 2s for 500x500 image", async () => {
    const W = 500, H = 500;
    const buf = createRgbaBuffer(W, H, OPAQUE);
    const f = await savePng(buf, W, H, "large-500.png");
    const start = performance.now();
    const candidates = await extractCandidates(f, outDir);
    const elapsed = performance.now() - start;
    expect(candidates.length).toBe(1);
    expect(elapsed).toBeLessThan(2000);
  });
});
