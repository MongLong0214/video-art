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

  // ── Depth Cinematic: Animation Modulation ──────────────

  it("depth speed modulation: meanDepth=255 depthSpeedInfluence=1 → speed > baseline", async () => {
    const depthLayers: RetainedLayer[] = [
      { file: "layers/l0.png", role: "subject", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 255 },
      { file: "layers/l1.png", role: "background", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 0 },
    ];
    const baseline = await generateSceneJson("test.png", depthLayers, [1080, 1080], 20, {});
    const withDepth = await generateSceneJson("test.png", depthLayers, [1080, 1080], 20, { depthSpeedInfluence: 1.0 });
    const baseSpeed = baseline.layers[0].animation.colorCycle!.speed;
    const depthSpeed = withDepth.layers[0].animation.colorCycle!.speed;
    expect(depthSpeed).toBeGreaterThan(baseSpeed);
  });

  it("depth speed modulation: meanDepth=0 depthSpeedInfluence=1 → speed ≈ baseline", async () => {
    const depthLayers: RetainedLayer[] = [
      { file: "layers/l0.png", role: "background", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 0 },
      { file: "layers/l1.png", role: "subject", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 255 },
    ];
    const baseline = await generateSceneJson("test.png", depthLayers, [1080, 1080], 20, {});
    const withDepth = await generateSceneJson("test.png", depthLayers, [1080, 1080], 20, { depthSpeedInfluence: 1.0 });
    const baseSpeed = baseline.layers[0].animation.colorCycle!.speed;
    const depthSpeed = withDepth.layers[0].animation.colorCycle!.speed;
    // meanDepth=0 → depthNorm≈0 → speed *= 1.0 (no change, or very close due to quantize)
    expect(depthSpeed).toBeCloseTo(baseSpeed, 0);
  });

  it("depth speed modulation: meanDepth undefined → depthNorm fallback 128/255 applied", async () => {
    const depthLayers: RetainedLayer[] = [
      { file: "layers/l0.png", role: "subject", coverage: 0.5, uniqueCoverage: 0.4 },
      { file: "layers/l1.png", role: "midground", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 100 },
      { file: "layers/l2.png", role: "background", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 200 },
    ];
    // depthValues=[100,200] → stddev=50 → cinematicActive=true
    // Layer 0: undefined meanDepth → depthNorm=128/255≈0.502 → speed should increase
    const baseline = await generateSceneJson("test.png", depthLayers, [1080, 1080], 20, {});
    const withDepth = await generateSceneJson("test.png", depthLayers, [1080, 1080], 20, { depthSpeedInfluence: 1.0 });
    const baseSpeed = baseline.layers[0].animation.colorCycle!.speed;
    const depthSpeed = withDepth.layers[0].animation.colorCycle!.speed;
    expect(depthSpeed).toBeGreaterThan(baseSpeed);
  });

  it("depthSpeedInfluence=0 (explicit off) → no depth speed modulation", async () => {
    const depthLayers: RetainedLayer[] = [
      { file: "layers/l0.png", role: "subject", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 200 },
      { file: "layers/l1.png", role: "background", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 50 },
    ];
    // explicit 0 = off: no depth modulation on speed
    const withZero = await generateSceneJson("test.png", depthLayers, [1080, 1080], 20, { depthSpeedInfluence: 0, depthGlowInfluence: 0 });
    // Compare against no-depth layers (cinematicActive=false → also no modulation)
    const noDepthLayers: RetainedLayer[] = [
      { file: "layers/l0.png", role: "subject", coverage: 0.5, uniqueCoverage: 0.4 },
      { file: "layers/l1.png", role: "background", coverage: 0.5, uniqueCoverage: 0.4 },
    ];
    const noDepth = await generateSceneJson("test.png", noDepthLayers, [1080, 1080], 20, {});
    expect(withZero.layers[0].animation.colorCycle!.speed).toBe(noDepth.layers[0].animation.colorCycle!.speed);
  });

  it("depth glow modulation: depthGlowInfluence=1 meanDepth=128 → glow > baseline", async () => {
    const depthLayers: RetainedLayer[] = [
      { file: "layers/l0.png", role: "subject", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 128 },
      { file: "layers/l1.png", role: "background", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 0 },
    ];
    const baseline = await generateSceneJson("test.png", depthLayers, [1080, 1080], 20, {});
    const withGlow = await generateSceneJson("test.png", depthLayers, [1080, 1080], 20, { depthGlowInfluence: 1.0 });
    expect(withGlow.layers[0].animation.glow!.intensity).toBeGreaterThan(baseline.layers[0].animation.glow!.intensity);
  });

  it("depthGlowInfluence=0 (explicit off) → no depth glow modulation", async () => {
    const depthLayers: RetainedLayer[] = [
      { file: "layers/l0.png", role: "subject", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 200 },
      { file: "layers/l1.png", role: "background", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 50 },
    ];
    const withZero = await generateSceneJson("test.png", depthLayers, [1080, 1080], 20, { depthSpeedInfluence: 0, depthGlowInfluence: 0 });
    const noDepthLayers: RetainedLayer[] = [
      { file: "layers/l0.png", role: "subject", coverage: 0.5, uniqueCoverage: 0.4 },
      { file: "layers/l1.png", role: "background", coverage: 0.5, uniqueCoverage: 0.4 },
    ];
    const noDepth = await generateSceneJson("test.png", noDepthLayers, [1080, 1080], 20, {});
    expect(withZero.layers[0].animation.glow!.intensity).toBe(noDepth.layers[0].animation.glow!.intensity);
  });

  it("stddev guard: all layers same depth → cinematic axes forced 0", async () => {
    const sameLayers: RetainedLayer[] = [
      { file: "layers/l0.png", role: "subject", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 128 },
      { file: "layers/l1.png", role: "background", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 128 },
      { file: "layers/l2.png", role: "midground", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 129 },
    ];
    const scene = await generateSceneJson("test.png", sameLayers, [1080, 1080], 20, {
      depthSpeedInfluence: 1.0, depthGlowInfluence: 1.0, depthParallaxScale: 0.05, hazeIntensity: 0.5, featherRadius: 0.1,
    });
    // stddev < 5 → speed/glow should be same as default=0
    const baseline = await generateSceneJson("test.png", sameLayers, [1080, 1080], 20, {});
    expect(scene.layers[0].animation.colorCycle!.speed).toBe(baseline.layers[0].animation.colorCycle!.speed);
    expect(scene.effects.parallax.scale).toBe(0);
    expect(scene.effects.haze.intensity).toBe(0);
    expect(scene.effects.feather.radius).toBe(0);
  });

  it("stddev guard: diverse depth → cinematic axes preserved", async () => {
    const diverseLayers: RetainedLayer[] = [
      { file: "layers/l0.png", role: "subject", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 50 },
      { file: "layers/l1.png", role: "background", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 200 },
    ];
    const scene = await generateSceneJson("test.png", diverseLayers, [1080, 1080], 20, {
      depthParallaxScale: 0.05, hazeIntensity: 0.5, featherRadius: 0.1,
    });
    expect(scene.effects.parallax.scale).toBe(0.05);
    expect(scene.effects.haze.intensity).toBe(0.5);
    expect(scene.effects.feather.radius).toBe(0.1);
  });

  it("stddev guard: single layer → cinematic axes forced 0", async () => {
    const singleLayer: RetainedLayer[] = [
      { file: "layers/l0.png", role: "subject", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 128 },
    ];
    const scene = await generateSceneJson("test.png", singleLayer, [1080, 1080], 20, {
      depthSpeedInfluence: 1.0, depthParallaxScale: 0.05,
    });
    expect(scene.effects.parallax.scale).toBe(0);
  });

  it("stddev guard: all layers without meanDepth → cinematic axes forced 0", async () => {
    const noDepthLayers: RetainedLayer[] = [
      { file: "layers/l0.png", role: "subject", coverage: 0.5, uniqueCoverage: 0.4 },
      { file: "layers/l1.png", role: "background", coverage: 0.5, uniqueCoverage: 0.4 },
    ];
    const scene = await generateSceneJson("test.png", noDepthLayers, [1080, 1080], 20, {
      depthParallaxScale: 0.05,
    });
    expect(scene.effects.parallax.scale).toBe(0);
  });

  it("stddev guard: mixed undefined/defined meanDepth → defined values used for stddev", async () => {
    const mixedLayers: RetainedLayer[] = [
      { file: "layers/l0.png", role: "subject", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 100 },
      { file: "layers/l1.png", role: "midground", coverage: 0.5, uniqueCoverage: 0.4 },
      { file: "layers/l2.png", role: "background", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 200 },
    ];
    // depthValues=[100,200] (undefined excluded), stddev=50 → cinematicActive=true
    const scene = await generateSceneJson("test.png", mixedLayers, [1080, 1080], 20, {
      depthParallaxScale: 0.05,
    });
    expect(scene.effects.parallax.scale).toBe(0.05);
  });

  it("effects pass-through: parallax/haze/feather in scene.json", async () => {
    const depthLayers: RetainedLayer[] = [
      { file: "layers/l0.png", role: "subject", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 50 },
      { file: "layers/l1.png", role: "background", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 200 },
    ];
    const scene = await generateSceneJson("test.png", depthLayers, [1080, 1080], 20, {
      depthParallaxScale: 0.05, hazeIntensity: 0.3, featherRadius: 0.08,
    });
    expect(scene.effects.parallax.scale).toBe(0.05);
    expect(scene.effects.haze.intensity).toBe(0.3);
    expect(scene.effects.feather.radius).toBe(0.08);
  });

  it("effects pass-through: default config → effects all 0", async () => {
    const scene = await generateSceneJson("test.png", mockLayers, [1080, 1080], 20, {});
    expect(scene.effects.parallax.scale).toBe(0);
    expect(scene.effects.haze.intensity).toBe(0);
    expect(scene.effects.feather.radius).toBe(0);
  });

  it("explicit 0 depth axes disables modulation", async () => {
    const depthLayers: RetainedLayer[] = [
      { file: "layers/l0.png", role: "subject", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 200 },
      { file: "layers/l1.png", role: "background", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 50 },
    ];
    const off = await generateSceneJson("test.png", depthLayers, [1080, 1080], 20, {
      depthSpeedInfluence: 0, depthGlowInfluence: 0,
    });
    // explicit 0 = off → same as no depth data (no modulation)
    const noDepthLayers = depthLayers.map(l => ({ ...l, meanDepth: undefined }));
    const noDepth = await generateSceneJson("test.png", noDepthLayers, [1080, 1080], 20, {});
    expect(off.layers[0].animation.colorCycle!.speed).toBe(noDepth.layers[0].animation.colorCycle!.speed);
    expect(off.layers[0].animation.glow!.intensity).toBe(noDepth.layers[0].animation.glow!.intensity);
  });

  it("depthParallaxScale=0 (explicit off) → parallax 0 even with depth data", async () => {
    const depthLayers: RetainedLayer[] = [
      { file: "layers/far.png", role: "background", coverage: 0.8, uniqueCoverage: 0.6, meanDepth: 30 },
      { file: "layers/near.png", role: "subject", coverage: 0.3, uniqueCoverage: 0.2, meanDepth: 200 },
    ];
    const scene = await generateSceneJson("test.png", depthLayers, [1080, 1080], 20, {
      depthParallaxScale: 0,
    });
    expect(scene.effects.parallax.scale).toBe(0);
  });

  it("depth modulation applied before quantizeLoopSpeed", async () => {
    const depthLayers: RetainedLayer[] = [
      { file: "layers/l0.png", role: "detail", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 255 },
      { file: "layers/l1.png", role: "background", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 0 },
    ];
    const scene = await generateSceneJson("test.png", depthLayers, [1080, 1080], 20, { depthSpeedInfluence: 1.0 });
    const speed = scene.layers[0].animation.colorCycle!.speed;
    const period = scene.layers[0].animation.colorCycle!.period;
    const K = 20 / period;
    // speed * K should be integer (quantized) and speed > 0
    expect(Number.isInteger(Math.round(K * speed * 1e6) / 1e6)).toBe(true);
    expect(speed).toBeGreaterThan(0);
  });

  it("glow modulation: layer with glow undefined → no error", async () => {
    const noGlowLayer: RetainedLayer[] = [
      { file: "layers/l0.png", role: "subject", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 200 },
      { file: "layers/l1.png", role: "background", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 50 },
    ];
    // Should not throw even with depthGlowInfluence=1
    const scene = await generateSceneJson("test.png", noGlowLayer, [1080, 1080], 20, {
      depthGlowInfluence: 1.0, glowIntensityMul: 0,
    });
    expect(scene.layers[0].animation).toBeDefined();
  });
});

// ==========================================================================
// T3: Depth cinematic effects auto-activation
// ==========================================================================

describe("depth cinematic auto-activation (T3)", () => {
  it("auto-activates parallax when depth data has variance", async () => {
    const layers: RetainedLayer[] = [
      { file: "layers/bg.png", role: "background-plate", coverage: 1.0, uniqueCoverage: 0.7, meanDepth: 30 },
      { file: "layers/fg.png", role: "subject", coverage: 0.3, uniqueCoverage: 0.2, meanDepth: 200 },
    ];
    const scene = await generateSceneJson("test.png", layers, [1080, 1080], 20);
    expect(scene.effects.parallax?.scale).toBeGreaterThan(0);
  });

  it("auto-activates haze for layers with depth variance", async () => {
    const layers: RetainedLayer[] = [
      { file: "layers/bg.png", role: "background-plate", coverage: 1.0, uniqueCoverage: 0.7, meanDepth: 20 },
      { file: "layers/fg.png", role: "subject", coverage: 0.3, uniqueCoverage: 0.2, meanDepth: 180 },
    ];
    const scene = await generateSceneJson("test.png", layers, [1080, 1080], 20);
    expect(scene.effects.haze?.intensity).toBeGreaterThan(0);
  });

  it("does NOT activate cinematic when depth variance is low", async () => {
    const layers: RetainedLayer[] = [
      { file: "layers/a.png", role: "background-plate", coverage: 1.0, uniqueCoverage: 0.7, meanDepth: 128 },
      { file: "layers/b.png", role: "subject", coverage: 0.3, uniqueCoverage: 0.2, meanDepth: 130 },
    ];
    const scene = await generateSceneJson("test.png", layers, [1080, 1080], 20);
    expect(scene.effects.parallax?.scale).toBe(0);
    expect(scene.effects.haze?.intensity).toBe(0);
  });

  it("respects explicit config override (non-zero) over auto-calculation", async () => {
    const layers: RetainedLayer[] = [
      { file: "layers/bg.png", role: "background-plate", coverage: 1.0, uniqueCoverage: 0.7, meanDepth: 30 },
      { file: "layers/fg.png", role: "subject", coverage: 0.3, uniqueCoverage: 0.2, meanDepth: 200 },
    ];
    const scene = await generateSceneJson("test.png", layers, [1080, 1080], 20, {
      depthParallaxScale: 0.05,
      hazeIntensity: 0.8,
    });
    expect(scene.effects.parallax?.scale).toBe(0.05);
    expect(scene.effects.haze?.intensity).toBe(0.8);
  });

  it("no effects without depth data", async () => {
    const layers: RetainedLayer[] = [
      { file: "layers/a.png", role: "background-plate", coverage: 1.0, uniqueCoverage: 0.7 },
      { file: "layers/b.png", role: "subject", coverage: 0.3, uniqueCoverage: 0.2 },
    ];
    const scene = await generateSceneJson("test.png", layers, [1080, 1080], 20);
    expect(scene.effects.parallax?.scale).toBe(0);
  });

  it("AC-1: far-heavy scene → parallax ~0.02", async () => {
    const layers: RetainedLayer[] = [
      { file: "layers/far.png", role: "background", coverage: 0.8, uniqueCoverage: 0.6, meanDepth: 30 },
      { file: "layers/mid.png", role: "subject", coverage: 0.3, uniqueCoverage: 0.2, meanDepth: 100 },
    ];
    const scene = await generateSceneJson("test.png", layers, [1080, 1080], 20);
    // minDN = 30/255 ≈ 0.12 < 0.3 → parallax = 0.02
    expect(scene.effects.parallax.scale).toBeCloseTo(0.02, 2);
  });

  it("AC-1: near-heavy scene → parallax ~0.005", async () => {
    const layers: RetainedLayer[] = [
      { file: "layers/near1.png", role: "subject", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 200 },
      { file: "layers/near2.png", role: "detail", coverage: 0.3, uniqueCoverage: 0.2, meanDepth: 220 },
    ];
    const scene = await generateSceneJson("test.png", layers, [1080, 1080], 20);
    // minDN = 200/255 ≈ 0.78 > 0.7 → parallax = 0.005
    expect(scene.effects.parallax.scale).toBeCloseTo(0.005, 2);
  });

  it("AC-2: far layers → haze ~0.3", async () => {
    const layers: RetainedLayer[] = [
      { file: "layers/far.png", role: "background", coverage: 0.8, uniqueCoverage: 0.6, meanDepth: 20 },
      { file: "layers/fg.png", role: "subject", coverage: 0.3, uniqueCoverage: 0.2, meanDepth: 200 },
    ];
    const scene = await generateSceneJson("test.png", layers, [1080, 1080], 20);
    // minDN = 20/255 ≈ 0.08 < 0.3 → haze = 0.3
    expect(scene.effects.haze.intensity).toBeCloseTo(0.3, 1);
  });

  it("AC-2: near layers → haze 0", async () => {
    const layers: RetainedLayer[] = [
      { file: "layers/near1.png", role: "subject", coverage: 0.5, uniqueCoverage: 0.4, meanDepth: 200 },
      { file: "layers/near2.png", role: "detail", coverage: 0.3, uniqueCoverage: 0.2, meanDepth: 220 },
    ];
    const scene = await generateSceneJson("test.png", layers, [1080, 1080], 20);
    // minDN = 200/255 ≈ 0.78 > 0.5 → haze = 0
    expect(scene.effects.haze.intensity).toBe(0);
  });

  it("AC-3: foreground-occluder → feather ~0.05", async () => {
    const layers: RetainedLayer[] = [
      { file: "layers/bg.png", role: "background", coverage: 0.8, uniqueCoverage: 0.6, meanDepth: 30 },
      { file: "layers/occ.png", role: "foreground-occluder", coverage: 0.2, uniqueCoverage: 0.15, meanDepth: 200 },
    ];
    const scene = await generateSceneJson("test.png", layers, [1080, 1080], 20);
    expect(scene.effects.feather.radius).toBeCloseTo(0.05, 2);
  });

  it("AC-3: no occluder → feather 0", async () => {
    const layers: RetainedLayer[] = [
      { file: "layers/bg.png", role: "background", coverage: 0.8, uniqueCoverage: 0.6, meanDepth: 30 },
      { file: "layers/fg.png", role: "subject", coverage: 0.3, uniqueCoverage: 0.2, meanDepth: 200 },
    ];
    const scene = await generateSceneJson("test.png", layers, [1080, 1080], 20);
    expect(scene.effects.feather.radius).toBe(0);
  });
});
