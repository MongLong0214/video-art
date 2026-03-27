import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { scoreComplexity } from "./complexity-scoring.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP = path.join(__dirname, "__test_complexity__");

beforeAll(async () => {
  fs.mkdirSync(TMP, { recursive: true });

  // Simple: solid color image (low edge, low entropy)
  await sharp({
    create: { width: 256, height: 256, channels: 3, background: { r: 128, g: 128, b: 128 } },
  })
    .png()
    .toFile(path.join(TMP, "simple.png"));

  // Complex: random noise image (high edge density)
  const noiseSize = 256 * 256 * 3;
  const noiseBuf = Buffer.alloc(noiseSize);
  // Use deterministic pseudo-random for reproducibility
  let seed = 42;
  for (let i = 0; i < noiseSize; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    noiseBuf[i] = seed % 256;
  }
  await sharp(noiseBuf, { raw: { width: 256, height: 256, channels: 3 } })
    .png()
    .toFile(path.join(TMP, "complex.png"));

  // Medium: multi-hue vertical stripes (moderate edge density, moderate entropy)
  // Thin color stripes cycle through 36 hues with varying saturation by row
  const medBuf = Buffer.alloc(256 * 256 * 3);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const idx = (y * 256 + x) * 3;
      const hueIdx = Math.floor(x / 4) % 36;
      const hue = hueIdx * 10;
      const sat = 0.5 + 0.5 * (y / 255);
      const val = 0.5 + 0.5 * ((255 - y) / 255);
      const c = val * sat;
      const xx = c * (1 - Math.abs(((hue / 60) % 2) - 1));
      const m = val - c;
      let r1 = 0, g1 = 0, b1 = 0;
      if (hue < 60) { r1 = c; g1 = xx; }
      else if (hue < 120) { r1 = xx; g1 = c; }
      else if (hue < 180) { g1 = c; b1 = xx; }
      else if (hue < 240) { g1 = xx; b1 = c; }
      else if (hue < 300) { r1 = xx; b1 = c; }
      else { r1 = c; b1 = xx; }
      medBuf[idx] = Math.round((r1 + m) * 255);
      medBuf[idx + 1] = Math.round((g1 + m) * 255);
      medBuf[idx + 2] = Math.round((b1 + m) * 255);
    }
  }
  await sharp(medBuf, { raw: { width: 256, height: 256, channels: 3 } })
    .png()
    .toFile(path.join(TMP, "medium.png"));
});

afterAll(() => {
  fs.rmSync(TMP, { recursive: true, force: true });
});

describe("scoreComplexity", () => {
  it("should return 3 for simple image", async () => {
    const result = await scoreComplexity(path.join(TMP, "simple.png"));
    expect(result.tier).toBe("simple");
    expect(result.layerCount).toBe(3);
  });

  it("should return 6 for complex image", async () => {
    const result = await scoreComplexity(path.join(TMP, "complex.png"));
    expect(result.tier).toBe("complex");
    expect(result.layerCount).toBe(6);
  });

  it("should return 4 for medium image", async () => {
    const result = await scoreComplexity(path.join(TMP, "medium.png"));
    expect(result.tier).toBe("medium");
    expect(result.layerCount).toBe(4);
  });

  it("should return edgeDensity in 0-1 range", async () => {
    const result = await scoreComplexity(path.join(TMP, "complex.png"));
    expect(result.edgeDensity).toBeGreaterThanOrEqual(0);
    expect(result.edgeDensity).toBeLessThanOrEqual(1);
  });

  it("should return colorEntropy in bits (> 0)", async () => {
    const result = await scoreComplexity(path.join(TMP, "complex.png"));
    expect(result.colorEntropy).toBeGreaterThan(0);
  });
});
