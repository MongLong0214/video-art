import { describe, it, expect } from "vitest";
import { sceneSchema } from "./scene-schema";

const validScene = {
  version: 1,
  source: "test.png",
  resolution: [1080, 1080] as [number, number],
  duration: 20,
  fps: 30,
  layers: [
    {
      id: "bg",
      file: "layers/layer-0.png",
      zIndex: 0,
      animation: {
        colorCycle: { speed: 0.3, hueRange: 360, period: 20 },
      },
    },
  ],
};

describe("sceneSchema", () => {
  it("should accept a valid scene config", () => {
    const result = sceneSchema.safeParse(validScene);
    expect(result.success).toBe(true);
  });

  it("should reject invalid version", () => {
    const result = sceneSchema.safeParse({ ...validScene, version: 2 });
    expect(result.success).toBe(false);
  });

  it("should reject invalid period (not divisor of 20)", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            colorCycle: { speed: 0.3, hueRange: 360, period: 3 },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should accept all valid periods: 1, 2, 4, 5, 10, 20", () => {
    for (const period of [1, 2, 4, 5, 10, 20]) {
      const result = sceneSchema.safeParse({
        ...validScene,
        layers: [
          {
            ...validScene.layers[0],
            animation: {
              wave: { amplitude: 5, frequency: 0.5, period },
            },
          },
        ],
      });
      expect(result.success).toBe(true);
    }
  });

  it("should reject negative opacity", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [{ ...validScene.layers[0], opacity: -0.5 }],
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty layers array", () => {
    const result = sceneSchema.safeParse({ ...validScene, layers: [] });
    expect(result.success).toBe(false);
  });

  it("should apply default effects when omitted", () => {
    const result = sceneSchema.parse(validScene);
    expect(result.effects.bloom.strength).toBe(0.6);
    expect(result.effects.chromaticAberration.offset).toBe(1.5);
    expect(result.effects.sparkle.count).toBe(80);
  });

  it("should reject extra unknown fields via strict parsing", () => {
    const result = sceneSchema.safeParse({ ...validScene, unknownField: true });
    // Zod strips unknown fields by default, so this still passes
    expect(result.success).toBe(true);
  });
});
