import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { postprocessLayers } from "./postprocess.js";
import { generateSceneJson } from "./scene-generator.js";
import { getValidPeriods } from "../../src/lib/scene-schema.js";
import type { SceneConfig } from "../../src/lib/scene-schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP = path.join(__dirname, "__test_scene_tmp__");

let ppResult: Awaited<ReturnType<typeof postprocessLayers>>;
let scene: SceneConfig;

beforeAll(async () => {
  fs.mkdirSync(TMP, { recursive: true });

  const configs = [
    { name: "layer-0.png", coverage: 0.9 },
    { name: "layer-1.png", coverage: 0.5 },
    { name: "layer-2.png", coverage: 0.2 },
    { name: "layer-3.png", coverage: 0.1 },
  ];

  for (const { name, coverage } of configs) {
    const size = 200;
    const channels = 4;
    const buf = Buffer.alloc(size * size * channels);

    const opaqueCount = Math.floor(size * size * coverage);
    for (let i = 0; i < size * size; i++) {
      const offset = i * channels;
      buf[offset] = 128;
      buf[offset + 1] = 64;
      buf[offset + 2] = 200;
      buf[offset + 3] = i < opaqueCount ? 255 : 0;
    }

    await sharp(buf, { raw: { width: size, height: size, channels } })
      .png()
      .toFile(path.join(TMP, name));
  }

  ppResult = await postprocessLayers(TMP);
  scene = await generateSceneJson("test.png", ppResult);
});

afterAll(() => {
  fs.rmSync(TMP, { recursive: true, force: true });
});

describe("postprocessLayers", () => {
  it("should order layers by alpha coverage descending", () => {
    expect(ppResult.files.length).toBe(4);

    for (let i = 0; i < ppResult.coverages.length - 1; i++) {
      expect(ppResult.coverages[i]).toBeGreaterThanOrEqual(ppResult.coverages[i + 1]);
    }
  });
});

describe("generateSceneJson", () => {
  it("should generate duration 20 (default)", () => {
    expect(scene.duration).toBe(20);
  });

  it("should generate valid scene.json structure", () => {
    expect(scene.version).toBe(1);
    expect(scene.source).toBe("test.png");
    expect(scene.resolution).toEqual([1080, 1080]);
    expect(scene.duration).toBe(20);
    expect(scene.fps).toBe(30);
    expect(scene.layers.length).toBe(4);
    expect(scene.effects).toBeDefined();
  });

  it("should have required fields on each layer", () => {
    for (const layer of scene.layers) {
      expect(layer.id).toBeDefined();
      expect(layer.file).toBeDefined();
      expect(typeof layer.zIndex).toBe("number");
      expect(typeof layer.opacity).toBe("number");
      expect(layer.animation).toBeDefined();
    }
  });

  it("should have all periods as divisors of duration", () => {
    const validPeriods = getValidPeriods(scene.duration);

    for (const layer of scene.layers) {
      const { animation } = layer;
      if (animation.colorCycle) {
        expect(validPeriods).toContain(animation.colorCycle.period);
      }
      if (animation.wave) {
        expect(validPeriods).toContain(animation.wave.period);
      }
      if (animation.glow) {
        expect(validPeriods).toContain(animation.glow.period);
      }
    }
  });

  it("should set phaseOffset per layer [0, 90, 180, 270]", () => {
    const offsets = scene.layers.map((l) => l.animation.colorCycle?.phaseOffset);
    expect(offsets).toEqual([0, 90, 180, 270]);
  });

  it("should set saturationBoost in presets (2.0-3.0)", () => {
    for (const layer of scene.layers) {
      expect(layer.animation.saturationBoost).toBeGreaterThanOrEqual(2.0);
      expect(layer.animation.saturationBoost).toBeLessThanOrEqual(3.0);
    }
  });

  it("should set luminanceKey in presets (0.4-0.8)", () => {
    for (const layer of scene.layers) {
      expect(layer.animation.luminanceKey).toBeGreaterThanOrEqual(0.4);
      expect(layer.animation.luminanceKey).toBeLessThanOrEqual(0.8);
    }
  });

  it("should set colorCycle speed=13.0", () => {
    for (const layer of scene.layers) {
      expect(layer.animation.colorCycle?.speed).toBe(13.0);
    }
  });

  it("should include wave preset with valid periods", () => {
    const validPeriods = getValidPeriods(scene.duration);

    for (const layer of scene.layers) {
      expect(layer.animation.wave).toBeDefined();
      expect(validPeriods).toContain(layer.animation.wave!.period);
      expect(layer.animation.wave!.amplitude).toBeGreaterThan(0);
    }
  });

  it("should include glow preset with valid periods", () => {
    const validPeriods = getValidPeriods(scene.duration);

    for (const layer of scene.layers) {
      expect(layer.animation.glow).toBeDefined();
      expect(validPeriods).toContain(layer.animation.glow!.period);
      expect(layer.animation.glow!.intensity).toBeGreaterThan(0);
    }
  });

  it("should have K×speed as integer for seamless loop", () => {
    for (const layer of scene.layers) {
      const period = layer.animation.colorCycle!.period;
      const speed = layer.animation.colorCycle!.speed;
      const K = scene.duration / period;
      expect(Number.isInteger(K * speed)).toBe(true);
    }
  });
});
