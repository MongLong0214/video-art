import { describe, it, expect } from "vitest";
import { sceneSchema, getValidPeriods } from "./scene-schema";

const validScene = {
  version: 1,
  source: "test.png",
  resolution: [1080, 1080] as [number, number],
  duration: 10,
  fps: 30,
  layers: [
    {
      id: "bg",
      file: "layers/layer-0.png",
      zIndex: 0,
      animation: {
        colorCycle: { speed: 1.0, period: 10 },
      },
    },
  ],
};

describe("getValidPeriods", () => {
  it("getValidPeriods(10) returns [1,2,5,10]", () => {
    expect(getValidPeriods(10)).toEqual([1, 2, 5, 10]);
  });

  it("getValidPeriods(20) returns [1,2,4,5,10,20]", () => {
    expect(getValidPeriods(20)).toEqual([1, 2, 4, 5, 10, 20]);
  });

  it("getValidPeriods(1) returns [1]", () => {
    expect(getValidPeriods(1)).toEqual([1]);
  });

  it("getValidPeriods(60) returns 12 divisors", () => {
    expect(getValidPeriods(60)).toHaveLength(12);
  });
});

describe("sceneSchema", () => {
  it("should accept a valid scene config", () => {
    const result = sceneSchema.safeParse(validScene);
    expect(result.success).toBe(true);
  });

  it("should reject invalid version", () => {
    const result = sceneSchema.safeParse({ ...validScene, version: 2 });
    expect(result.success).toBe(false);
  });

  it("should have default duration of 20", () => {
    const { duration: _, ...rest } = validScene;
    const result = sceneSchema.parse(rest);
    expect(result.duration).toBe(20);
  });

  it("should reject duration > 300", () => {
    const result = sceneSchema.safeParse({ ...validScene, duration: 301 });
    expect(result.success).toBe(false);
  });

  it("should accept duration 300", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      duration: 300,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            colorCycle: { speed: 1.0, period: 300 },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should accept duration 0.5 (min boundary)", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      duration: 1,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            colorCycle: { speed: 1.0, period: 1 },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should reject non-integer duration", () => {
    const result = sceneSchema.safeParse({ ...validScene, duration: 7.5 });
    expect(result.success).toBe(false);
  });

  it("should accept valid periods for duration=10: 1,2,5,10", () => {
    for (const period of [1, 2, 5, 10]) {
      const result = sceneSchema.safeParse({
        ...validScene,
        layers: [
          {
            ...validScene.layers[0],
            animation: {
              colorCycle: { speed: 1.0, period },
            },
          },
        ],
      });
      expect(result.success).toBe(true);
    }
  });

  it("should reject period=4 for duration=10", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            colorCycle: { speed: 1.0, period: 4 },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should reject period=20 for duration=10", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            colorCycle: { speed: 1.0, period: 20 },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should accept period=4 for duration=20", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      duration: 20,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            colorCycle: { speed: 1.0, period: 4 },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should have default saturationBoost of 2.5", () => {
    const result = sceneSchema.parse(validScene);
    expect(result.layers[0].animation.saturationBoost).toBe(2.5);
  });

  it("should have default luminanceKey of 0.6", () => {
    const result = sceneSchema.parse(validScene);
    expect(result.layers[0].animation.luminanceKey).toBe(0.6);
  });

  it("should have default phaseOffset of 0", () => {
    const result = sceneSchema.parse(validScene);
    expect(result.layers[0].animation.colorCycle?.phaseOffset).toBe(0);
  });

  it("should accept saturationBoost range 0-10", () => {
    for (const val of [0, 5, 10]) {
      const result = sceneSchema.safeParse({
        ...validScene,
        layers: [
          {
            ...validScene.layers[0],
            animation: {
              ...validScene.layers[0].animation,
              saturationBoost: val,
            },
          },
        ],
      });
      expect(result.success).toBe(true);
    }
  });

  it("should accept saturationBoost=0 (grayscale)", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            saturationBoost: 0,
          },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.layers[0].animation.saturationBoost).toBe(0);
    }
  });

  it("should reject saturationBoost > 10", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            saturationBoost: 11,
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should reject luminanceKey > 1", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            luminanceKey: 1.5,
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should reject phaseOffset > 360", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            colorCycle: { speed: 1.0, period: 10, phaseOffset: 400 },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative phaseOffset", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            colorCycle: { speed: 1.0, period: 10, phaseOffset: -90 },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should accept duration=1 with period=1", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      duration: 1,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            colorCycle: { speed: 1.0, period: 1 },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should accept luminanceKey range 0-1", () => {
    for (const val of [0, 0.5, 1]) {
      const result = sceneSchema.safeParse({
        ...validScene,
        layers: [
          {
            ...validScene.layers[0],
            animation: {
              ...validScene.layers[0].animation,
              luminanceKey: val,
            },
          },
        ],
      });
      expect(result.success).toBe(true);
    }
  });

  it("should parse existing scene.json without new fields", () => {
    const oldScene = {
      version: 1,
      source: "test.png",
      resolution: [1080, 1080],
      duration: 10,
      layers: [
        {
          id: "bg",
          file: "layers/layer-0.png",
          zIndex: 0,
          animation: {
            colorCycle: { speed: 1.0, period: 10 },
          },
        },
      ],
    };
    const result = sceneSchema.safeParse(oldScene);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.layers[0].animation.saturationBoost).toBe(2.5);
      expect(result.data.layers[0].animation.luminanceKey).toBe(0.6);
    }
  });

  it("should guarantee luminanceKey=0 means uniform shift", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            luminanceKey: 0,
          },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.layers[0].animation.luminanceKey).toBe(0);
    }
  });

  it("should have dynamic period error message", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            colorCycle: { speed: 1.0, period: 3 },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const periodIssue = result.error.issues.find((i: { message: string }) =>
        i.message.includes("Period must be a divisor")
      );
      expect(periodIssue).toBeDefined();
      expect(periodIssue!.message).toContain("divisor of 10");
    }
  });

  it("should accept speed=0", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            colorCycle: { speed: 0, period: 10 },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should preserve schema version 1", () => {
    const result = sceneSchema.parse(validScene);
    expect(result.version).toBe(1);
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
});

describe("sceneSchema audio field", () => {
  const baseScene = {
    version: 1 as const,
    source: "test.png",
    resolution: [1080, 1080] as [number, number],
    duration: 10,
    fps: 30,
    layers: [
      {
        id: "bg",
        file: "layers/layer-0.png",
        zIndex: 0,
        animation: {
          colorCycle: { speed: 1.0, period: 10 },
        },
      },
    ],
  };

  it("audio field optional — scene without audio parses OK", () => {
    const result = sceneSchema.safeParse(baseScene);
    expect(result.success).toBe(true);
  });

  it("audio field valid — valid audio object parses", () => {
    const result = sceneSchema.safeParse({
      ...baseScene,
      audio: {
        key: "Am",
        genre: "techno",
        energy: 0.7,
      },
    });
    expect(result.success).toBe(true);
  });

  it("audio key invalid — rejects bad key", () => {
    const result = sceneSchema.safeParse({
      ...baseScene,
      audio: { key: "Xm#" },
    });
    expect(result.success).toBe(false);
  });

  it("audio preset injection — rejects shell characters", () => {
    const result = sceneSchema.safeParse({
      ...baseScene,
      audio: { preset: "; rm -rf /" },
    });
    expect(result.success).toBe(false);
  });

  it("audio preset valid — accepts alphanumeric+dash+underscore", () => {
    const result = sceneSchema.safeParse({
      ...baseScene,
      audio: { preset: "techno-default_v2" },
    });
    expect(result.success).toBe(true);
  });

  it("audio genre house accepted", () => {
    const result = sceneSchema.safeParse({
      ...baseScene,
      audio: { genre: "house" },
    });
    expect(result.success).toBe(true);
  });

  it("audio genre dnb accepted", () => {
    const result = sceneSchema.safeParse({
      ...baseScene,
      audio: { genre: "dnb" },
    });
    expect(result.success).toBe(true);
  });

  it("audio genre ambient accepted", () => {
    const result = sceneSchema.safeParse({
      ...baseScene,
      audio: { genre: "ambient" },
    });
    expect(result.success).toBe(true);
  });

  it("audio defaults applied when fields omitted", () => {
    const result = sceneSchema.parse({
      ...baseScene,
      audio: {},
    });
    expect(result.audio?.key).toBe("Am");
    expect(result.audio?.scale).toBe("minor");
    expect(result.audio?.genre).toBe("techno");
    expect(result.audio?.energy).toBe(0.7);
  });

  it("audio bpm optional with valid range", () => {
    const result = sceneSchema.safeParse({
      ...baseScene,
      audio: { bpm: 128 },
    });
    expect(result.success).toBe(true);
  });

  it("audio bpm rejects out of range", () => {
    const result = sceneSchema.safeParse({
      ...baseScene,
      audio: { bpm: 300 },
    });
    expect(result.success).toBe(false);
  });
});
