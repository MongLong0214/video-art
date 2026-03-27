import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";

// Will fail until implementation exists
import { extractCandidates } from "./candidate-extraction.js";

// ---------- helpers ----------

/** Create an RGBA buffer of given dimensions, all pixels transparent by default */
function createRgbaBuffer(
  width: number,
  height: number,
  fill: { r: number; g: number; b: number; a: number } = {
    r: 0,
    g: 0,
    b: 0,
    a: 0,
  },
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

/** Paint a filled rectangle into an RGBA buffer */
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

// ---------- test fixtures ----------

let tmpDir: string;
let outputDir: string;

// Paths to synthetic test images
let twoRegionsPath: string;
let lShapePath: string;
let tinyBlobPath: string;
let knownRectPath: string;
let coverageRectPath: string;
let fullyTransparentPath: string;
let fullyOpaquePath: string;
let perfImagePath: string;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cca-test-"));
  outputDir = path.join(tmpDir, "output");
  fs.mkdirSync(outputDir, { recursive: true });

  // --- 1. Two disconnected regions (200x200) ---
  // Left block: cols 10-49, rows 10-49 (40x40)
  // Right block: cols 150-189, rows 150-189 (40x40)
  const twoRegBuf = createRgbaBuffer(200, 200);
  paintRect(twoRegBuf, 200, { x: 10, y: 10, w: 40, h: 40 }, { r: 255, g: 0, b: 0, a: 255 });
  paintRect(twoRegBuf, 200, { x: 150, y: 150, w: 40, h: 40 }, { r: 0, g: 0, b: 255, a: 255 });
  twoRegionsPath = path.join(tmpDir, "two-regions.png");
  await sharp(twoRegBuf, { raw: { width: 200, height: 200, channels: 4 } })
    .png()
    .toFile(twoRegionsPath);

  // --- 2. L-shape connected region (100x100) ---
  // Horizontal bar: cols 10-59, rows 40-49 (50x10)
  // Vertical bar:   cols 10-19, rows 10-49 (10x40)
  // These share cols 10-19, rows 40-49 -> connected
  const lShapeBuf = createRgbaBuffer(100, 100);
  paintRect(lShapeBuf, 100, { x: 10, y: 40, w: 50, h: 10 }, { r: 0, g: 255, b: 0, a: 255 });
  paintRect(lShapeBuf, 100, { x: 10, y: 10, w: 10, h: 40 }, { r: 0, g: 255, b: 0, a: 255 });
  lShapePath = path.join(tmpDir, "l-shape.png");
  await sharp(lShapeBuf, { raw: { width: 100, height: 100, channels: 4 } })
    .png()
    .toFile(lShapePath);

  // --- 3. Tiny blob (200x200, 0.3% coverage) ---
  // 200x200 = 40000 pixels. 0.3% = 120 pixels -> ~11x11 block = 121 pixels
  // That's 121/40000 = 0.3025% < 0.5%
  const tinyBuf = createRgbaBuffer(200, 200);
  paintRect(tinyBuf, 200, { x: 90, y: 90, w: 11, h: 11 }, { r: 128, g: 128, b: 128, a: 255 });
  tinyBlobPath = path.join(tmpDir, "tiny-blob.png");
  await sharp(tinyBuf, { raw: { width: 200, height: 200, channels: 4 } })
    .png()
    .toFile(tinyBlobPath);

  // --- 4. Known rect for bbox test (200x200) ---
  // Rect at cols 30-79, rows 20-69 (50x50)
  const knownRectBuf = createRgbaBuffer(200, 200);
  paintRect(knownRectBuf, 200, { x: 30, y: 20, w: 50, h: 50 }, { r: 200, g: 100, b: 50, a: 255 });
  knownRectPath = path.join(tmpDir, "known-rect.png");
  await sharp(knownRectBuf, { raw: { width: 200, height: 200, channels: 4 } })
    .png()
    .toFile(knownRectPath);

  // --- 5. Coverage rect (200x200, 50x50 opaque) ---
  // Coverage = 2500 / 40000 = 0.0625
  const coverBuf = createRgbaBuffer(200, 200);
  paintRect(coverBuf, 200, { x: 75, y: 75, w: 50, h: 50 }, { r: 255, g: 255, b: 255, a: 255 });
  coverageRectPath = path.join(tmpDir, "coverage-rect.png");
  await sharp(coverBuf, { raw: { width: 200, height: 200, channels: 4 } })
    .png()
    .toFile(coverageRectPath);

  // --- 6. Fully transparent (100x100) ---
  const transpBuf = createRgbaBuffer(100, 100);
  fullyTransparentPath = path.join(tmpDir, "fully-transparent.png");
  await sharp(transpBuf, { raw: { width: 100, height: 100, channels: 4 } })
    .png()
    .toFile(fullyTransparentPath);

  // --- 7. Fully opaque (100x100) ---
  const opaqueBuf = createRgbaBuffer(100, 100, { r: 128, g: 64, b: 32, a: 255 });
  fullyOpaquePath = path.join(tmpDir, "fully-opaque.png");
  await sharp(opaqueBuf, { raw: { width: 100, height: 100, channels: 4 } })
    .png()
    .toFile(fullyOpaquePath);

  // --- 8. Large image for perf test (2048x2048) ---
  // Checkerboard-ish pattern: 4 large blocks in corners
  const perfBuf = createRgbaBuffer(2048, 2048);
  paintRect(perfBuf, 2048, { x: 0, y: 0, w: 512, h: 512 }, { r: 255, g: 0, b: 0, a: 255 });
  paintRect(perfBuf, 2048, { x: 1536, y: 0, w: 512, h: 512 }, { r: 0, g: 255, b: 0, a: 255 });
  paintRect(perfBuf, 2048, { x: 0, y: 1536, w: 512, h: 512 }, { r: 0, g: 0, b: 255, a: 255 });
  paintRect(perfBuf, 2048, { x: 1536, y: 1536, w: 512, h: 512 }, { r: 255, g: 255, b: 0, a: 255 });
  perfImagePath = path.join(tmpDir, "perf-2048.png");
  await sharp(perfBuf, { raw: { width: 2048, height: 2048, channels: 4 } })
    .png()
    .toFile(perfImagePath);
});

afterAll(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ---------- tests ----------

describe("extractCandidates", () => {
  it("should split two disconnected regions into 2 candidates", async () => {
    const outDir = path.join(outputDir, "t1");
    fs.mkdirSync(outDir, { recursive: true });

    const candidates = await extractCandidates(twoRegionsPath, outDir);

    expect(candidates).toHaveLength(2);
    for (const c of candidates) {
      expect(c.filePath).toBeTruthy();
      expect(fs.existsSync(c.filePath)).toBe(true);
    }
  });

  it("should merge connected pixels (L-shape) into 1 candidate", async () => {
    const outDir = path.join(outputDir, "t2");
    fs.mkdirSync(outDir, { recursive: true });

    const candidates = await extractCandidates(lShapePath, outDir);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].componentCount).toBe(1);
  });

  it("should drop tiny components below 0.5% coverage", async () => {
    const outDir = path.join(outputDir, "t3");
    fs.mkdirSync(outDir, { recursive: true });

    const candidates = await extractCandidates(tinyBlobPath, outDir);

    expect(candidates).toHaveLength(0);
  });

  it("should compute correct bbox", async () => {
    const outDir = path.join(outputDir, "t4");
    fs.mkdirSync(outDir, { recursive: true });

    const candidates = await extractCandidates(knownRectPath, outDir);

    expect(candidates).toHaveLength(1);
    const bbox = candidates[0].bbox;
    expect(bbox.x).toBe(30);
    expect(bbox.y).toBe(20);
    expect(bbox.w).toBe(50);
    expect(bbox.h).toBe(50);
  });

  it("should compute correct centroid", async () => {
    const outDir = path.join(outputDir, "t5");
    fs.mkdirSync(outDir, { recursive: true });

    // Known rect: cols 30-79, rows 20-69 -> centroid at (54.5, 44.5)
    const candidates = await extractCandidates(knownRectPath, outDir);

    expect(candidates).toHaveLength(1);
    const centroid = candidates[0].centroid;
    expect(centroid.x).toBeCloseTo(54.5, 0);
    expect(centroid.y).toBeCloseTo(44.5, 0);
  });

  it("should compute correct coverage ratio", async () => {
    const outDir = path.join(outputDir, "t6");
    fs.mkdirSync(outDir, { recursive: true });

    const candidates = await extractCandidates(coverageRectPath, outDir);

    expect(candidates).toHaveLength(1);
    // 50x50 = 2500 opaque pixels in 200x200 = 40000 total
    expect(candidates[0].coverage).toBeCloseTo(0.0625, 3);
  });

  it("should return 0 candidates for fully transparent image", async () => {
    const outDir = path.join(outputDir, "t7");
    fs.mkdirSync(outDir, { recursive: true });

    const candidates = await extractCandidates(fullyTransparentPath, outDir);

    expect(candidates).toHaveLength(0);
  });

  it("should return 1 candidate with coverage=1.0 for fully opaque image", async () => {
    const outDir = path.join(outputDir, "t8");
    fs.mkdirSync(outDir, { recursive: true });

    const candidates = await extractCandidates(fullyOpaquePath, outDir);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].coverage).toBeCloseTo(1.0, 3);
  });

  it("should complete within 2s for 2048x2048", async () => {
    if (process.env.CI) return; // skip in CI

    const outDir = path.join(outputDir, "t9");
    fs.mkdirSync(outDir, { recursive: true });

    const start = performance.now();
    const candidates = await extractCandidates(perfImagePath, outDir);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(2000);
    expect(candidates.length).toBeGreaterThanOrEqual(1);
  });
});
