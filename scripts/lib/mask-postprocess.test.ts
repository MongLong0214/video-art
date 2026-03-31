import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { fillMaskHoles, applyAlphaMatte } from "./mask-postprocess.js";

// Helper: create a grayscale mask PNG buffer
async function createMask(
  width: number,
  height: number,
  painter: (data: Uint8Array, w: number, h: number) => void,
): Promise<Buffer> {
  const data = new Uint8Array(width * height);
  painter(data, width, height);
  return sharp(Buffer.from(data), { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();
}

// Helper: create a donut mask (solid circle with interior hole)
function paintDonut(
  data: Uint8Array,
  w: number,
  h: number,
  outerR: number,
  innerR: number,
): void {
  const cx = w / 2, cy = h / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      data[y * w + x] = dist <= outerR && dist > innerR ? 255 : 0;
    }
  }
}

// Helper: read mask pixels as grayscale array
async function readMask(buf: Buffer, w: number, h: number): Promise<Uint8Array> {
  const raw = await sharp(buf).resize(w, h).grayscale().raw().toBuffer();
  return new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
}

// ==========================================================================
// T5: fillMaskHoles
// ==========================================================================

describe("fillMaskHoles (T5)", () => {
  it("fills donut interior (small hole)", async () => {
    const W = 50, H = 50;
    const mask = await createMask(W, H, (d) => paintDonut(d, W, H, 20, 5));

    const filled = await fillMaskHoles(mask, W, H);
    const pixels = await readMask(filled, W, H);

    // Center pixel (25,25) should now be filled
    expect(pixels[25 * W + 25]).toBeGreaterThan(128);
  });

  it("does not expand outer boundary", async () => {
    const W = 50, H = 50;
    const mask = await createMask(W, H, (d) => paintDonut(d, W, H, 15, 3));

    const filled = await fillMaskHoles(mask, W, H);
    const pixels = await readMask(filled, W, H);

    // Corner pixel (0,0) should remain empty
    expect(pixels[0]).toBeLessThan(128);
    // Far edge pixel
    expect(pixels[49 * W + 49]).toBeLessThan(128);
  });

  it("respects config disabled", async () => {
    const W = 50, H = 50;
    const mask = await createMask(W, H, (d) => paintDonut(d, W, H, 20, 5));

    const result = await fillMaskHoles(mask, W, H, { enabled: false });
    // Should return the exact same buffer
    expect(Buffer.compare(mask, result)).toBe(0);
  });

  it("preserves fully solid mask", async () => {
    const W = 20, H = 20;
    const mask = await createMask(W, H, (d) => d.fill(255));

    const filled = await fillMaskHoles(mask, W, H);
    const pixels = await readMask(filled, W, H);

    // All pixels should remain opaque
    for (let i = 0; i < W * H; i++) {
      expect(pixels[i]).toBeGreaterThan(200);
    }
  });

  it("handles fully transparent mask", async () => {
    const W = 20, H = 20;
    const mask = await createMask(W, H, () => {}); // all zeros

    const result = await fillMaskHoles(mask, W, H);
    // Should return same buffer (no work needed)
    expect(Buffer.compare(mask, result)).toBe(0);
  });

  it("iterative blur fills larger holes", async () => {
    const W = 80, H = 80;
    // Larger donut with bigger inner hole
    const mask = await createMask(W, H, (d) => paintDonut(d, W, H, 30, 12));

    const filled = await fillMaskHoles(mask, W, H);
    const pixels = await readMask(filled, W, H);

    // Center should be at least partially filled after iterations
    const centerIdx = 40 * W + 40;
    expect(pixels[centerIdx]).toBeGreaterThan(0);
  });
});

// ==========================================================================
// T6: applyAlphaMatte
// ==========================================================================

describe("applyAlphaMatte (T6)", () => {
  it("creates edge gradient", async () => {
    const W = 100, H = 100;
    // Solid white square
    const mask = await createMask(W, H, (d) => {
      for (let y = 10; y < 90; y++) {
        for (let x = 10; x < 90; x++) {
          d[y * W + x] = 255;
        }
      }
    });

    const matted = await applyAlphaMatte(mask, W, H, { radiusScale: 0.03 });
    const pixels = await readMask(matted, W, H);

    // Interior (50,50) should be near-opaque
    expect(pixels[50 * W + 50]).toBeGreaterThan(200);

    // Edge pixel (10,50) should be partially transparent (gradient)
    const edgeVal = pixels[10 * W + 50];
    expect(edgeVal).toBeGreaterThan(0);
    expect(edgeVal).toBeLessThan(255);
  });

  it("keeps interior fully opaque", async () => {
    const W = 100, H = 100;
    const mask = await createMask(W, H, (d) => {
      for (let y = 20; y < 80; y++) {
        for (let x = 20; x < 80; x++) {
          d[y * W + x] = 255;
        }
      }
    });

    const matted = await applyAlphaMatte(mask, W, H, { radiusScale: 0.01 });
    const pixels = await readMask(matted, W, H);

    // Deep interior should be fully opaque
    expect(pixels[50 * W + 50]).toBe(255);
  });

  it("respects config disabled", async () => {
    const W = 50, H = 50;
    const mask = await createMask(W, H, (d) => d.fill(255));

    const result = await applyAlphaMatte(mask, W, H, { enabled: false });
    expect(Buffer.compare(mask, result)).toBe(0);
  });
});
