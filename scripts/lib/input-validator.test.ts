import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import {
  validateAndPrepare,
  detectManualLayers,
  ensureRgba,
} from "./input-validator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP = path.join(__dirname, "__test_tmp__");

beforeAll(() => {
  fs.mkdirSync(TMP, { recursive: true });
});

afterAll(() => {
  fs.rmSync(TMP, { recursive: true, force: true });
});

async function createTestImage(
  name: string,
  width: number,
  height: number,
  channels: 3 | 4 = 4,
): Promise<string> {
  const filePath = path.join(TMP, name);
  await sharp({
    create: { width, height, channels, background: { r: 255, g: 0, b: 0, alpha: 1 } },
  })
    .png()
    .toFile(filePath);
  return filePath;
}

describe("validateAndPrepare", () => {
  it("should accept a valid PNG under limits", async () => {
    const img = await createTestImage("valid.png", 512, 512);
    const result = await validateAndPrepare(img);
    expect(result.width).toBe(512);
    expect(result.height).toBe(512);
    expect(result.wasResized).toBe(false);
  });

  it("should reject unsupported formats", async () => {
    const bmpPath = path.join(TMP, "test.bmp");
    fs.writeFileSync(bmpPath, "fake");
    await expect(validateAndPrepare(bmpPath)).rejects.toThrow("Unsupported format");
  });

  it("should reject files larger than 20MB", async () => {
    const bigPath = path.join(TMP, "big.png");
    // Create a file that's over 20MB
    const buf = Buffer.alloc(21 * 1024 * 1024, 0);
    fs.writeFileSync(bigPath, buf);
    await expect(validateAndPrepare(bigPath)).rejects.toThrow("File too large");
  });

  it("should auto-resize images exceeding 4096px", async () => {
    const img = await createTestImage("large.png", 5000, 3000);
    const result = await validateAndPrepare(img);
    expect(result.wasResized).toBe(true);
    expect(result.width).toBeLessThanOrEqual(4096);
    expect(result.height).toBeLessThanOrEqual(4096);
  });

  it("should reject non-existent files", async () => {
    await expect(validateAndPrepare("/fake/path.png")).rejects.toThrow("not found");
  });
});

describe("detectManualLayers", () => {
  it("should return null when layers dir does not exist", () => {
    expect(detectManualLayers("/nonexistent/dir")).toBeNull();
  });

  it("should return null when fewer than 2 layers", async () => {
    const dir = path.join(TMP, "manual-sparse");
    fs.mkdirSync(dir, { recursive: true });
    await createTestImage("layer-0.png", 100, 100);
    fs.copyFileSync(path.join(TMP, "layer-0.png"), path.join(dir, "layer-0.png"));
    expect(detectManualLayers(dir)).toBeNull();
  });

  it("should detect manual layers when present", async () => {
    const dir = path.join(TMP, "manual-layers");
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < 3; i++) {
      const img = await createTestImage(`ml-${i}.png`, 100, 100);
      fs.copyFileSync(img, path.join(dir, `layer-${i}.png`));
    }
    const result = detectManualLayers(dir);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(3);
  });
});

describe("ensureRgba", () => {
  it("should convert RGB to RGBA", async () => {
    const img = await createTestImage("rgb.png", 100, 100, 3);
    await ensureRgba(img);
    const meta = await sharp(img).metadata();
    expect(meta.channels).toBe(4);
  });
});
