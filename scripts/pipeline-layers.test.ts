/**
 * T8: Pipeline Unit/Integration Tests
 *
 * Tests CLI parsing, config loading, scene generation, and schema validation with synthetic data.
 * Does NOT exercise actual API calls, image decomposition, or video export.
 * For real API E2E coverage, run manually: npm run pipeline:layers <input.png> --prompts "..."
 */
import { describe, it, expect } from "vitest";
import { generateSceneJson, type RetainedLayer } from "./lib/scene-generator.js";
import { sceneSchema } from "../src/lib/scene-schema.js";
import { parseCliArgs } from "./lib/pipeline-cli.js";
import { getDefaultConfig, loadConfig } from "./research/research-config.js";
import { checkFfmpeg } from "./lib/check-deps.js";
import fs from "node:fs";

describe("Pipeline unit/integration tests (T8)", () => {
  it("AC-1: pipeline generates valid scene from synthetic layers", async () => {
    const layers: RetainedLayer[] = [
      { file: "layers/bg-plate-filled.png", role: "background-plate", coverage: 1.0, uniqueCoverage: 0.6, meanDepth: 30 },
      { file: "layers/layer-0.png", role: "subject", coverage: 0.4, uniqueCoverage: 0.3, meanDepth: 180 },
      { file: "layers/layer-1.png", role: "midground", coverage: 0.3, uniqueCoverage: 0.2, meanDepth: 120 },
      { file: "layers/layer-2.png", role: "foreground-occluder", coverage: 0.1, uniqueCoverage: 0.08, meanDepth: 220 },
    ];

    const scene = await generateSceneJson("test-input.png", layers, [1080, 1080], 20);

    // Output structure checks (AC-2 proxy: scene.json + layers exist in output)
    expect(scene.layers.length).toBe(4);
    expect(scene.layers.every(l => l.file.endsWith(".png"))).toBe(true);
    expect(scene.resolution).toEqual([1080, 1080]);
    expect(scene.duration).toBe(20);
    expect(scene.fps).toBe(30);
  });

  it("AC-3: scene.json validates against sceneSchema", async () => {
    const layers: RetainedLayer[] = [
      { file: "layers/bg-plate-filled.png", role: "background-plate", coverage: 1.0, uniqueCoverage: 0.7, meanDepth: 30 },
      { file: "layers/layer-0.png", role: "subject", coverage: 0.4, uniqueCoverage: 0.3, meanDepth: 200 },
    ];

    const scene = await generateSceneJson("smoke-test.png", layers, [1920, 1080], 20);
    const result = sceneSchema.safeParse(scene);

    expect(result.success).toBe(true);
    if (!result.success) {
      console.error("Schema validation failed:", result.error.format());
    }
  });

  it("AC-3: default config produces schema-valid scene", async () => {
    const config = getDefaultConfig();
    const layers: RetainedLayer[] = [
      { file: "layers/bg.png", role: "background-plate", coverage: 1.0, uniqueCoverage: 0.8 },
      { file: "layers/fg.png", role: "subject", coverage: 0.3, uniqueCoverage: 0.2, meanDepth: 128 },
    ];

    const scene = await generateSceneJson("default-config-test.png", layers, [1080, 1080], 20, config);
    const result = sceneSchema.safeParse(scene);

    expect(result.success).toBe(true);
  });

  it("AC-4: checkFfmpeg reports availability", () => {
    try {
      checkFfmpeg();
    } catch (err) {
      expect((err as Error).message).toMatch(/ffmpeg/i);
    }
  });

  it("pipeline CLI parses all flags correctly", () => {
    const args = parseCliArgs([
      "input.png",
      "--duration", "20",
      "--production",
      "--fps", "60",
      "--prores",
    ]);

    expect(args.inputPath).toBe("input.png");
    expect(args.duration).toBe(20);
    expect(args.production).toBe(true);
    expect(args.fps).toBe(60);
    expect(args.prores).toBe(true);
  });

  it("scene effects reflect depth distribution", async () => {
    const layers: RetainedLayer[] = [
      { file: "layers/far.png", role: "background", coverage: 0.8, uniqueCoverage: 0.6, meanDepth: 20 },
      { file: "layers/near.png", role: "foreground-occluder", coverage: 0.2, uniqueCoverage: 0.15, meanDepth: 230 },
    ];

    const scene = await generateSceneJson("effects-test.png", layers, [1080, 1080], 20);

    // Far layers present → parallax and haze should be active (auto-calc from null default)
    expect(scene.effects.parallax.scale).toBeGreaterThan(0);
    expect(scene.effects.haze.intensity).toBeGreaterThan(0);
    // Foreground-occluder present → feather active
    expect(scene.effects.feather.radius).toBeGreaterThan(0);
  });

  // ── Integration: CLI → Config → Scene → Schema chain ──────────────

  it("integration: CLI flags + loadConfig + generateSceneJson → valid scene", async () => {
    const args = parseCliArgs([
      "input.png",
      "--duration", "15",
      "--fps", "60",
    ]);
    const config = loadConfig();

    const layers: RetainedLayer[] = [
      { file: "layers/bg.png", role: "background-plate", coverage: 1.0, uniqueCoverage: 0.7, meanDepth: 30 },
      { file: "layers/fg.png", role: "subject", coverage: 0.4, uniqueCoverage: 0.3, meanDepth: 200 },
    ];

    const scene = await generateSceneJson(
      "integration-test.png",
      layers,
      [1080, 1080],
      args.duration ?? 20,
      config,
      args.fps,
    );

    expect(scene.duration).toBe(15);
    expect(scene.fps).toBe(60);
    const result = sceneSchema.safeParse(scene);
    expect(result.success).toBe(true);
  });

  it("pipeline.ts supports --no-preview flag", () => {
    const pipelineSrc = fs.readFileSync("scripts/pipeline.ts", "utf-8");
    expect(pipelineSrc).toContain("--no-preview");
    expect(pipelineSrc).toContain("noPreview");
  });

  // ── T3 spec: depth config 0 = off ──────────────

  it("T3-AC4: depthParallaxScale=0 → parallax exactly 0", async () => {
    const layers: RetainedLayer[] = [
      { file: "layers/far.png", role: "background", coverage: 0.8, uniqueCoverage: 0.6, meanDepth: 20 },
      { file: "layers/near.png", role: "subject", coverage: 0.3, uniqueCoverage: 0.2, meanDepth: 220 },
    ];
    const scene = await generateSceneJson("t3-test.png", layers, [1080, 1080], 20, {
      depthParallaxScale: 0,
      hazeIntensity: 0,
      featherRadius: 0,
    });
    expect(scene.effects.parallax.scale).toBe(0);
    expect(scene.effects.haze.intensity).toBe(0);
    expect(scene.effects.feather.radius).toBe(0);
  });

  it("T3-AC4: null defaults auto-activate depth effects", async () => {
    const layers: RetainedLayer[] = [
      { file: "layers/far.png", role: "background", coverage: 0.8, uniqueCoverage: 0.6, meanDepth: 20 },
      { file: "layers/near.png", role: "foreground-occluder", coverage: 0.2, uniqueCoverage: 0.15, meanDepth: 220 },
    ];
    // No config = null defaults = auto-activation
    const scene = await generateSceneJson("t3-auto-test.png", layers, [1080, 1080], 20);
    expect(scene.effects.parallax.scale).toBeGreaterThan(0);
    expect(scene.effects.haze.intensity).toBeGreaterThan(0);
    expect(scene.effects.feather.radius).toBeGreaterThan(0);
  });
});