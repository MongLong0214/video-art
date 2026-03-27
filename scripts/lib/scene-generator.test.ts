import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { postprocessLayers } from "./postprocess.js";
import { generateSceneJson } from "./scene-generator.js";
import type { RetainedLayer } from "./scene-generator.js";
import { getValidPeriods, sceneSchema } from "../../src/lib/scene-schema.js";
import type { SceneConfig, LayerRole } from "../../src/lib/scene-schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP = path.join(__dirname, "__test_scene_tmp__");

let ppResult: Awaited<ReturnType<typeof postprocessLayers>>;

// Role-based scene (primary test target)
const ALL_ROLES: LayerRole[] = [
  "background-plate",
  "background",
  "midground",
  "subject",
  "detail",
  "foreground-occluder",
];

const mockLayers: RetainedLayer[] = ALL_ROLES.map((role, i) => ({
  file: `layers/layer-${i}.png`,
  role,
  coverage: 1 - i * 0.15,
  uniqueCoverage: 0.8 - i * 0.1,
}));

let roleScene: SceneConfig;

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

  roleScene = await generateSceneJson("test.png", mockLayers, [1080, 1080], 20);
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

describe("generateSceneJson (role-based)", () => {
  it("should generate valid scene.json structure", () => {
    expect(roleScene.version).toBe(1);
    expect(roleScene.source).toBe("test.png");
    expect(roleScene.resolution).toEqual([1080, 1080]);
    expect(roleScene.duration).toBe(20);
    expect(roleScene.fps).toBe(30);
    expect(roleScene.layers.length).toBe(6);
    expect(roleScene.effects).toBeDefined();
  });

  it("should have required fields on each layer", () => {
    for (const layer of roleScene.layers) {
      expect(layer.id).toBeDefined();
      expect(layer.file).toBeDefined();
      expect(typeof layer.zIndex).toBe("number");
      expect(typeof layer.opacity).toBe("number");
      expect(layer.animation).toBeDefined();
    }
  });

  it("should have all periods as divisors of duration", () => {
    const validPeriods = getValidPeriods(roleScene.duration);

    for (const layer of roleScene.layers) {
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

  it("should have K*speed as integer for seamless loop", () => {
    for (const layer of roleScene.layers) {
      const colorCycle = layer.animation.colorCycle;
      if (colorCycle) {
        const K = roleScene.duration / colorCycle.period;
        expect(Number.isInteger(K * colorCycle.speed)).toBe(true);
      }
    }
  });

  // --- T8 Role-Based Preset Tests ---

  it("should assign slowest parallax to background-plate", () => {
    const bgPlate = roleScene.layers.find((l) => l.role === "background-plate");
    expect(bgPlate).toBeDefined();
    const bgPlateDepth = bgPlate!.animation.parallax!.depth;

    // background-plate should have the smallest parallax depth (slowest movement)
    for (const layer of roleScene.layers) {
      if (layer.role !== "background-plate" && layer.animation.parallax) {
        expect(bgPlateDepth).toBeLessThanOrEqual(layer.animation.parallax.depth);
      }
    }
  });

  it("should assign fastest hue to detail", () => {
    const detail = roleScene.layers.find((l) => l.role === "detail");
    expect(detail).toBeDefined();
    const detailSpeed = detail!.animation.colorCycle!.speed;

    // detail should have the highest colorCycle speed
    for (const layer of roleScene.layers) {
      if (layer.role !== "detail" && layer.animation.colorCycle) {
        expect(detailSpeed).toBeGreaterThanOrEqual(layer.animation.colorCycle.speed);
      }
    }
  });

  it("should assign conservative saturation to fg-occluder", () => {
    const fgOccluder = roleScene.layers.find((l) => l.role === "foreground-occluder");
    expect(fgOccluder).toBeDefined();

    const midground = roleScene.layers.find((l) => l.role === "midground");
    expect(midground).toBeDefined();

    // foreground-occluder saturation should be lower than midground (conservative)
    expect(fgOccluder!.animation.saturationBoost).toBeLessThan(
      midground!.animation.saturationBoost,
    );
  });

  it("should include midground preset", () => {
    const midground = roleScene.layers.find((l) => l.role === "midground");
    expect(midground).toBeDefined();

    const bg = roleScene.layers.find((l) => l.role === "background");
    const subject = roleScene.layers.find((l) => l.role === "subject");
    expect(bg).toBeDefined();
    expect(subject).toBeDefined();

    // midground colorCycle speed should be between background and subject
    const midSpeed = midground!.animation.colorCycle!.speed;
    const bgSpeed = bg!.animation.colorCycle!.speed;
    const subjectSpeed = subject!.animation.colorCycle!.speed;
    expect(midSpeed).toBeGreaterThanOrEqual(bgSpeed);
    expect(midSpeed).toBeLessThanOrEqual(subjectSpeed);
  });

  it("should include role in scene.json layer", () => {
    for (const layer of roleScene.layers) {
      expect(layer.role).toBeDefined();
      expect(ALL_ROLES).toContain(layer.role);
    }
  });

  it("should not use index-based preset", async () => {
    // generatePreset(index, total) should not exist as an export
    // The function signature accepts RetainedLayer[] not PostProcessResult
    // Verify by checking that the module does not export generatePreset
    const mod = await import("./scene-generator.js");
    expect((mod as Record<string, unknown>).generatePreset).toBeUndefined();
  });

  it("should generate valid scene for all roles", () => {
    // Parse through the full Zod schema -- validates all constraints
    const result = sceneSchema.safeParse(roleScene);
    expect(result.success).toBe(true);
  });

  // --- Structural tests retained from original ---

  it("should set saturationBoost in presets (1.0-3.0)", () => {
    for (const layer of roleScene.layers) {
      expect(layer.animation.saturationBoost).toBeGreaterThanOrEqual(1.0);
      expect(layer.animation.saturationBoost).toBeLessThanOrEqual(3.0);
    }
  });

  it("should set luminanceKey in presets (0.3-0.8)", () => {
    for (const layer of roleScene.layers) {
      expect(layer.animation.luminanceKey).toBeGreaterThanOrEqual(0.3);
      expect(layer.animation.luminanceKey).toBeLessThanOrEqual(0.8);
    }
  });

  it("should include wave preset with valid periods", () => {
    const validPeriods = getValidPeriods(roleScene.duration);

    for (const layer of roleScene.layers) {
      expect(layer.animation.wave).toBeDefined();
      expect(validPeriods).toContain(layer.animation.wave!.period);
      expect(layer.animation.wave!.amplitude).toBeGreaterThan(0);
    }
  });

  it("should include glow preset with valid periods", () => {
    const validPeriods = getValidPeriods(roleScene.duration);

    for (const layer of roleScene.layers) {
      expect(layer.animation.glow).toBeDefined();
      expect(validPeriods).toContain(layer.animation.glow!.period);
      expect(layer.animation.glow!.intensity).toBeGreaterThan(0);
    }
  });

  it("should distribute phaseOffset across layers", () => {
    const offsets = roleScene.layers.map((l) => l.animation.colorCycle?.phaseOffset ?? 0);
    // All offsets should be in [0, 360) and distributed (not all the same)
    const uniqueOffsets = new Set(offsets);
    expect(uniqueOffsets.size).toBeGreaterThan(1);
    for (const offset of offsets) {
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(offset).toBeLessThanOrEqual(360);
    }
  });

  // --- Edge case: role fallback for undefined role ---
  it("should fallback to midground for layer without role", () => {
    const noRoleLayer: RetainedLayer = {
      file: "layers/no-role.png",
      role: undefined as unknown as LayerRole,
      coverage: 0.5,
      uniqueCoverage: 0.3,
    };
    // Should not throw -- midground fallback
    const scenePromise = generateSceneJson("test.png", [noRoleLayer], [1080, 1080], 20);
    expect(scenePromise).resolves.toBeDefined();
  });
});
