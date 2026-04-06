import { describe, it, expect } from "vitest";
import {
  getMotionModel,
  generateMotionPrompt,
  getValidMotionModelNames,
  TARGET_FRAMES,
} from "./motion-models.js";

describe("motion-models", () => {
  it("maps wan-2.2 to correct replicate id", () => {
    const config = getMotionModel("wan-2.2");
    expect(config.replicateId).toBe("wan-video/wan-2.2-i2v-fast");
  });

  it("maps veo-3.1 to correct replicate id", () => {
    const config = getMotionModel("veo-3.1");
    expect(config.replicateId).toBe("google/veo-3.1");
  });

  it("maps seedance to correct replicate id", () => {
    const config = getMotionModel("seedance");
    expect(config.replicateId).toBe("bytedance/seedance-1-pro");
  });

  it("throws for unknown model", () => {
    expect(() => getMotionModel("invalid")).toThrow("Unknown motion model");
  });

  it("returns valid model names", () => {
    const names = getValidMotionModelNames();
    expect(names).toContain("wan-2.2");
    expect(names).toContain("veo-3.1");
    expect(names).toContain("seedance");
  });

  it("TARGET_FRAMES is 192", () => {
    expect(TARGET_FRAMES).toBe(192);
  });
});

describe("generateMotionPrompt", () => {
  it("generates prompt for background-plate", () => {
    const prompt = generateMotionPrompt("background-plate", "medium");
    expect(prompt).toContain("gentle");
    expect(prompt).toContain("static camera");
  });

  it("generates prompt for subject", () => {
    const prompt = generateMotionPrompt("subject", "medium");
    expect(prompt).toContain("breathing");
    expect(prompt).toContain("static camera");
  });

  it("low intensity uses subtle language", () => {
    const prompt = generateMotionPrompt("background-plate", "low");
    expect(prompt).toContain("barely perceptible");
  });

  it("high intensity uses noticeable language", () => {
    const prompt = generateMotionPrompt("background-plate", "high");
    expect(prompt).toContain("noticeable");
  });

  it("undefined role defaults to background-plate", () => {
    const prompt = generateMotionPrompt(undefined, "medium");
    expect(prompt).toContain("wind");
  });
});

describe("flattenRgbaToRgb", () => {
  it("flattens RGBA to RGB with black background", async () => {
    const { flattenRgbaToRgb } = await import("./motion-i2v.js");
    const sharp = (await import("sharp")).default;
    const fs = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "flatten-test-"));
    try {
      const inputPath = path.join(tmpDir, "input.png");
      const outputPath = path.join(tmpDir, "output.png");

      // Create RGBA image with semi-transparent red
      const pixels = Buffer.alloc(32 * 32 * 4);
      for (let i = 0; i < 32 * 32; i++) {
        pixels[i * 4] = 255;     // R
        pixels[i * 4 + 1] = 0;   // G
        pixels[i * 4 + 2] = 0;   // B
        pixels[i * 4 + 3] = 128; // A (50% transparent)
      }
      await sharp(pixels, { raw: { width: 32, height: 32, channels: 4 } })
        .png()
        .toFile(inputPath);

      await flattenRgbaToRgb(inputPath, outputPath);

      const info = await sharp(outputPath).metadata();
      expect(info.channels).toBe(3); // RGB, no alpha
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
