import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateSceneJson } from "./scene-generator.js";
import type { RetainedLayer } from "./scene-generator.js";
import { getValidPeriods, sceneSchema } from "../../src/lib/scene-schema.js";
import type { SceneConfig, LayerRole } from "../../src/lib/scene-schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP = path.join(__dirname, "__test_scene_tmp__");

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

  roleScene = await generateSceneJson("test.png", mockLayers, [1080, 1080], 20);
});

afterAll(() => {
  fs.rmSync(TMP, { recursive: true, force: true });
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
    expect(roleScene.effects.bloom.strength).toBe(0.6);
    expect(roleScene.effects.chromaticAberration.offset).toBe(1.5);
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

  it("should apply research multipliers to post-processing effects", async () => {
    const scene = await generateSceneJson("test.png", mockLayers, [1080, 1080], 20, {
      bloomStrengthMul: 0.5,
      chromaticAberrationOffsetMul: 0.25,
    });

    expect(scene.effects.bloom.strength).toBeCloseTo(0.3);
    expect(scene.effects.bloom.radius).toBe(0.4);
    expect(scene.effects.bloom.threshold).toBe(0.7);
    expect(scene.effects.chromaticAberration.offset).toBeCloseTo(0.375);
  });

  // ── T1: Effect Composer Axes ──────────────────────────

  it("should apply bloomRadiusMul to effects", async () => {
    const scene = await generateSceneJson("test.png", mockLayers, [1080, 1080], 20, {
      bloomRadiusMul: 2.0,
    });
    expect(scene.effects.bloom.radius).toBeCloseTo(0.8);
  });

  it("should clamp bloomRadiusMul at radius=1.0", async () => {
    const scene = await generateSceneJson("test.png", mockLayers, [1080, 1080], 20, {
      bloomRadiusMul: 3.0,
    });
    expect(scene.effects.bloom.radius).toBe(1.0);
  });

  it("should apply bloomThresholdMul to effects", async () => {
    const scene = await generateSceneJson("test.png", mockLayers, [1080, 1080], 20, {
      bloomThresholdMul: 0.5,
    });
    expect(scene.effects.bloom.threshold).toBeCloseTo(0.35);
  });

  it("should apply caModulationOffsetMul to effects", async () => {
    const scene = await generateSceneJson("test.png", mockLayers, [1080, 1080], 20, {
      caModulationOffsetMul: 2.0,
    });
    expect(scene.effects.chromaticAberration.modulationOffset).toBeCloseTo(0.6);
  });

  it("should produce identical effects with default effect axes", async () => {
    const scene = await generateSceneJson("test.png", mockLayers, [1080, 1080], 20, {});
    expect(scene.effects.bloom.radius).toBe(0.4);
    expect(scene.effects.bloom.threshold).toBe(0.7);
    expect(scene.effects.chromaticAberration.modulationOffset).toBe(0.3);
  });

  // ── T2: Shader Axes in scene.json ──────────────────

  it("should include shader params in scene.json animation", async () => {
    const scene = await generateSceneJson("test.png", mockLayers, [1080, 1080], 20, {
      satBlendLow: 0.2,
    });
    expect(scene.layers[0].animation.satBlendLow).toBe(0.2);
  });

  it("should produce default shader params matching hardcoded values", async () => {
    const scene = await generateSceneJson("test.png", mockLayers, [1080, 1080], 20, {});
    const anim = scene.layers[0].animation;
    expect(anim.satBlendLow).toBe(0.1);
    expect(anim.satBlendHigh).toBe(0.4);
    expect(anim.satInjectionMul).toBe(0.35);
    expect(anim.glowPulseFloor).toBe(0.0);
    expect(anim.lumExponent).toBe(1.0);
  });

  // ── T4: SceneGen Axes ──────────────────────────────

  it("should apply tempoMul to color cycle speed", async () => {
    const slow = await generateSceneJson("test.png", mockLayers, [1080, 1080], 20, { tempoMul: 0.5 });
    const normal = await generateSceneJson("test.png", mockLayers, [1080, 1080], 20, { tempoMul: 1.0 });
    const slowSpeed = slow.layers[0].animation.colorCycle!.speed;
    const normalSpeed = normal.layers[0].animation.colorCycle!.speed;
    expect(slowSpeed).toBeLessThan(normalSpeed);
  });

  it("should apply phaseSpreadMul to phase offsets", async () => {
    const scene = await generateSceneJson("test.png", mockLayers, [1080, 1080], 20, { phaseSpreadMul: 2.0 });
    const offset1 = scene.layers[1].animation.colorCycle!.phaseOffset;
    const defaultScene = await generateSceneJson("test.png", mockLayers, [1080, 1080], 20, {});
    const defaultOffset1 = defaultScene.layers[1].animation.colorCycle!.phaseOffset;
    expect(offset1).not.toBe(defaultOffset1);
  });

  it("should filter periods by periodRangeLow/High", async () => {
    const scene = await generateSceneJson("test.png", mockLayers, [1080, 1080], 20, {
      periodRangeLow: 4.0, periodRangeHigh: 10.0,
    });
    for (const layer of scene.layers) {
      const period = layer.animation.colorCycle!.period;
      expect(period).toBeGreaterThanOrEqual(4);
      expect(period).toBeLessThanOrEqual(10);
    }
  });

  it("should fallback to all periods when range yields empty list", async () => {
    const scene = await generateSceneJson("test.png", mockLayers, [1080, 1080], 20, {
      periodRangeLow: 11.0, periodRangeHigh: 19.0,
    });
    expect(scene.layers[0].animation.colorCycle!.period).toBeDefined();
  });

  it("should produce identical scene with default scenegen axes", async () => {
    const withAxes = await generateSceneJson("test.png", mockLayers, [1080, 1080], 20, {
      tempoMul: 1.0, phaseSpreadMul: 1.0, periodRangeLow: 1.0, periodRangeHigh: 20.0,
    });
    const without = await generateSceneJson("test.png", mockLayers, [1080, 1080], 20, {});
    expect(withAxes.layers[0].animation.colorCycle!.speed).toBe(without.layers[0].animation.colorCycle!.speed);
    expect(withAxes.layers[0].animation.colorCycle!.phaseOffset).toBe(without.layers[0].animation.colorCycle!.phaseOffset);
  });

  // ── T5: Blend Mode ──────────────────────────────

  it("should include blending field in scene.json layers", async () => {
    const scene = await generateSceneJson("test.png", mockLayers, [1080, 1080], 20, { blendMode: "add" });
    expect(scene.layers[0].blending).toBe("add");
  });

  it("should default blending to normal", async () => {
    const scene = await generateSceneJson("test.png", mockLayers, [1080, 1080], 20, {});
    expect(scene.layers[0].blending).toBe("normal");
  });
});
