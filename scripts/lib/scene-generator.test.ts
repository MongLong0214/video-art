import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { postprocessLayers } from "./postprocess.js";
import { generateSceneJson } from "./scene-generator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP = path.join(__dirname, "__test_scene_tmp__");
const VALID_PERIODS = [1, 2, 4, 5, 10, 20];

beforeAll(async () => {
  fs.mkdirSync(TMP, { recursive: true });

  // Create 4 test layers with different alpha coverages
  const configs = [
    { name: "layer-0.png", coverage: 0.9 }, // ~90% opaque
    { name: "layer-1.png", coverage: 0.5 }, // ~50%
    { name: "layer-2.png", coverage: 0.2 }, // ~20%
    { name: "layer-3.png", coverage: 0.1 }, // ~10%
  ];

  for (const { name, coverage } of configs) {
    const size = 200;
    const channels = 4;
    const buf = Buffer.alloc(size * size * channels);

    const opaqueCount = Math.floor(size * size * coverage);
    for (let i = 0; i < size * size; i++) {
      const offset = i * channels;
      buf[offset] = 128; // R
      buf[offset + 1] = 64; // G
      buf[offset + 2] = 200; // B
      buf[offset + 3] = i < opaqueCount ? 255 : 0; // A
    }

    await sharp(buf, { raw: { width: size, height: size, channels } })
      .png()
      .toFile(path.join(TMP, name));
  }
});

afterAll(() => {
  fs.rmSync(TMP, { recursive: true, force: true });
});

describe("postprocessLayers", () => {
  it("should order layers by alpha coverage descending", async () => {
    const result = await postprocessLayers(TMP);
    expect(result.files.length).toBe(4);

    // Coverages should be sorted descending
    for (let i = 0; i < result.coverages.length - 1; i++) {
      expect(result.coverages[i]).toBeGreaterThanOrEqual(result.coverages[i + 1]);
    }
  });
});

describe("generateSceneJson", () => {
  it("should generate valid scene.json structure", async () => {
    const ppResult = await postprocessLayers(TMP);
    const scene = await generateSceneJson("test.png", ppResult);

    expect(scene.version).toBe(1);
    expect(scene.source).toBe("test.png");
    expect(scene.resolution).toEqual([1080, 1080]);
    expect(scene.duration).toBe(20);
    expect(scene.fps).toBe(30);
    expect(scene.layers.length).toBe(4);
    expect(scene.effects).toBeDefined();
    expect(scene.effects.bloom).toBeDefined();
    expect(scene.effects.chromaticAberration).toBeDefined();
    expect(scene.effects.sparkle).toBeDefined();
  });

  it("should have required fields on each layer", async () => {
    const ppResult = await postprocessLayers(TMP);
    const scene = await generateSceneJson("test.png", ppResult);

    for (const layer of scene.layers) {
      expect(layer.id).toBeDefined();
      expect(layer.file).toBeDefined();
      expect(typeof layer.zIndex).toBe("number");
      expect(typeof layer.opacity).toBe("number");
      expect(layer.animation).toBeDefined();
    }
  });

  it("should have all animation periods as divisors of 20", async () => {
    const ppResult = await postprocessLayers(TMP);
    const scene = await generateSceneJson("test.png", ppResult);

    for (const layer of scene.layers) {
      const { animation } = layer;
      if (animation.colorCycle) {
        expect(VALID_PERIODS).toContain(animation.colorCycle.period);
      }
      if (animation.wave) {
        expect(VALID_PERIODS).toContain(animation.wave.period);
      }
      if (animation.glow) {
        expect(VALID_PERIODS).toContain(animation.glow.period);
      }
    }
  });
});
