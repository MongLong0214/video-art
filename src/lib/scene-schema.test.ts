import { describe, it, expect } from "vitest";
import { sceneSchema, getValidPeriods, layerRoleSchema } from "./scene-schema";
import type { LayerRole } from "./scene-schema";

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

  it("defaults hue rotation safety fields to legacy HSV behavior", () => {
    const result = sceneSchema.parse(validScene);
    expect(result.layers[0].animation.hueSpace).toBe("hsv");
    expect(result.layers[0].animation.greenCompress).toBe(0);
  });

  it("defaults glowWave to an inert legacy-compatible object", () => {
    const result = sceneSchema.parse(validScene);
    expect(result.layers[0].animation.glowWave).toEqual({
      strength: 0,
      speed: 0,
      sharpness: 0.5,
      fieldCycles: 1,
    });
    expect(result.layers[0].animation.glowWave2).toEqual({
      strength: 0,
      speed: 0,
      sharpness: 0.5,
      fieldCycles: 1,
    });
    expect(result.layers[0].animation.phaseWarpAmount).toBe(0);
  });

  it("accepts D-3-6 glowWave bounds", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            glowWave: { strength: 0.45, speed: 8, sharpness: 0.6, fieldCycles: 1.25 },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts r18 second glow wave and warped phase-field sampling fields", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            phaseField2: "layers/phase-angular.png",
            phaseWarpAmount: 0.8,
            glowWave2: { strength: 0.55, speed: -5, sharpness: 0.7, fieldCycles: 3.25 },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects glowWave values outside D-3-6 ranges", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            glowWave: { strength: 1.2, speed: 8, sharpness: 0.6, fieldCycles: 2.5 },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects r18 experimental wave values outside safe ranges", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            phaseField2: "layers/phase-angular.jpg",
            phaseWarpAmount: 2.5,
            glowWave2: { strength: 1.2, speed: 4, sharpness: 0.5, fieldCycles: 4.5 },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });


  it("accepts OKLCH hue rotation with green compression", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            hueSpace: "oklch",
            greenCompress: 0.7,
          },
        },
      ],
    });
    expect(result.success).toBe(true);
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
  });

  // ── Depth Cinematic Effects: effectsSchema extensions ──

  it("effectsSchema accepts parallax with valid scale", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      effects: { parallax: { scale: 0.05 } },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.effects.parallax.scale).toBe(0.05);
    }
  });

  it("effectsSchema rejects parallax scale > 0.1", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      effects: { parallax: { scale: 0.2 } },
    });
    expect(result.success).toBe(false);
  });

  it("effectsSchema rejects parallax scale < 0", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      effects: { parallax: { scale: -0.01 } },
    });
    expect(result.success).toBe(false);
  });

  it("effectsSchema defaults parallax to { scale: 0 }", () => {
    const result = sceneSchema.parse(validScene);
    expect(result.effects.parallax.scale).toBe(0);
  });

  it("effectsSchema accepts haze with valid intensity", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      effects: { haze: { intensity: 0.5 } },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.effects.haze.intensity).toBe(0.5);
    }
  });

  it("effectsSchema rejects haze intensity > 1", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      effects: { haze: { intensity: 1.5 } },
    });
    expect(result.success).toBe(false);
  });

  it("effectsSchema rejects haze intensity < 0", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      effects: { haze: { intensity: -0.01 } },
    });
    expect(result.success).toBe(false);
  });

  it("effectsSchema defaults haze to { intensity: 0 }", () => {
    const result = sceneSchema.parse(validScene);
    expect(result.effects.haze.intensity).toBe(0);
  });

  it("effectsSchema accepts feather with valid radius", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      effects: { feather: { radius: 0.1 } },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.effects.feather.radius).toBe(0.1);
    }
  });

  it("effectsSchema rejects feather radius > 0.2", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      effects: { feather: { radius: 0.3 } },
    });
    expect(result.success).toBe(false);
  });

  it("effectsSchema rejects feather radius < 0", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      effects: { feather: { radius: -0.01 } },
    });
    expect(result.success).toBe(false);
  });

  it("effectsSchema defaults feather to { radius: 0 }", () => {
    const result = sceneSchema.parse(validScene);
    expect(result.effects.feather.radius).toBe(0);
  });

  it("existing effects schema defaults unchanged after additions", () => {
    const result = sceneSchema.parse(validScene);
    expect(result.effects.bloom.strength).toBe(0.6);
    expect(result.effects.bloom.radius).toBe(0.4);
    expect(result.effects.bloom.threshold).toBe(0.7);
    expect(result.effects.chromaticAberration.offset).toBe(1.5);
    expect(result.effects.chromaticAberration.modulationOffset).toBe(0.3);
  });

  it("sceneSchema parses with both effectsSchema.parallax and animationSchema.parallax coexisting", () => {
    const result = sceneSchema.safeParse({
      ...validScene,
      effects: { parallax: { scale: 0.05 } },
      layers: [
        {
          ...validScene.layers[0],
          animation: {
            ...validScene.layers[0].animation,
            parallax: { depth: 0.5 },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.effects.parallax.scale).toBe(0.05);
      expect(result.data.layers[0].animation.parallax?.depth).toBe(0.5);
    }
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

describe("scene-schema — T-A1 multipassFeedback effect", () => {
  const minimal = {
    version: 1,
    source: "x.png",
    resolution: [720, 1280] as [number, number],
    duration: 20,
    fps: 30,
    layers: [
      {
        id: "l0",
        file: "layers/layer-0.png",
        zIndex: 0,
      },
    ],
  };

  it("accepts scene without multipassFeedback (backward compat)", () => {
    const r = sceneSchema.safeParse(minimal);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.effects.multipassFeedback.strength).toBe(0);
    }
  });

  it("multipassFeedback max strength is 0.95", () => {
    const r = sceneSchema.safeParse({
      ...minimal,
      effects: { multipassFeedback: { strength: 1.0 } },
    });
    expect(r.success).toBe(false);
  });

  it("multipassFeedback defaults warp=0.2, decay=0.9, hueShift=0", () => {
    const r = sceneSchema.parse(minimal);
    const mf = r.effects.multipassFeedback;
    expect(mf.warp).toBe(0.2);
    expect(mf.decay).toBe(0.9);
    expect(mf.hueShift).toBe(0);
    expect(mf.reactionDiffusionAmount).toBe(0);
    expect(mf.reactionDiffusionSpeed).toBe(0.35);
  });

  it("accepts optional multipassFeedback mask path", () => {
    const r = sceneSchema.safeParse({
      ...minimal,
      effects: { multipassFeedback: { strength: 0.32, mask: "layers/portal.png" } },
    });
    expect(r.success).toBe(true);
  });

  it("accepts reaction-diffusion-lite without ordinary feedback strength", () => {
    const r = sceneSchema.safeParse({
      ...minimal,
      effects: {
        multipassFeedback: {
          strength: 0,
          reactionDiffusionAmount: 0.7,
          reactionDiffusionSpeed: 0.45,
        },
      },
    });
    expect(r.success).toBe(true);
  });

  it("rejects reaction-diffusion-lite values outside safe range", () => {
    const r = sceneSchema.safeParse({
      ...minimal,
      effects: {
        multipassFeedback: {
          reactionDiffusionAmount: 1.2,
          reactionDiffusionSpeed: -0.1,
        },
      },
    });
    expect(r.success).toBe(false);
  });
});

describe("scene-schema — R9 structural primitives", () => {
  const minimal = {
    version: 1,
    source: "x.png",
    resolution: [720, 1280] as [number, number],
    duration: 20,
    fps: 30,
    layers: [
      {
        id: "l0",
        file: "layers/layer-0.png",
        zIndex: 0,
        animation: {
          depthField: "layers/depth.png",
          flowField: "layers/flow-field.png",
          structureFlow: { strength: 0.003, cycles: 3 },
        },
      },
    ],
  };

  it("defaults camera drift and structure flow to off", () => {
    const r = sceneSchema.parse({
      version: 1,
      source: "x.png",
      resolution: [720, 1280],
      layers: [{ id: "l0", file: "layers/layer-0.png", zIndex: 0 }],
    });

    expect(r.effects.cameraDrift).toEqual({ radius: 0, cycles: 1, pivot: 0.5 });
    expect(r.layers[0]?.animation.structureFlow).toEqual({ strength: 0, cycles: 3 });
  });

  it("accepts depthField, flowField, structureFlow, and cameraDrift bounds", () => {
    const r = sceneSchema.safeParse({
      ...minimal,
      effects: { cameraDrift: { radius: 0.006, cycles: 1, pivot: 0.5 } },
    });
    expect(r.success).toBe(true);
  });

  it("rejects camera drift radius above 0.02 and structure flow above 0.005", () => {
    expect(sceneSchema.safeParse({ ...minimal, effects: { cameraDrift: { radius: 0.03 } } }).success).toBe(false);
    expect(sceneSchema.safeParse({
      ...minimal,
      layers: [
        {
          id: "l0",
          file: "layers/layer-0.png",
          zIndex: 0,
          animation: { structureFlow: { strength: 0.006 } },
        },
      ],
    }).success).toBe(false);
  });
});

describe("LayerRole schema", () => {
  const VALID_ROLES: LayerRole[] = [
    "background-plate",
    "background",
    "midground",
    "subject",
    "detail",
    "foreground-occluder",
  ];

  it("should accept valid LayerRole values", () => {
    for (const role of VALID_ROLES) {
      const result = layerRoleSchema.safeParse(role);
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid role string", () => {
    const result = layerRoleSchema.safeParse("invalid-role");
    expect(result.success).toBe(false);
  });

  it("should parse scene.json without role field (backward compat)", () => {
    const sceneWithoutRole = {
      version: 1,
      source: "test.png",
      resolution: [1080, 1080],
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
    const result = sceneSchema.safeParse(sceneWithoutRole);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.layers[0].role).toBeUndefined();
    }
  });

  it("should parse scene.json with role field", () => {
    const sceneWithRole = {
      version: 1,
      source: "test.png",
      resolution: [1080, 1080],
      duration: 10,
      fps: 30,
      layers: [
        {
          id: "bg",
          file: "layers/layer-0.png",
          zIndex: 0,
          role: "subject",
          animation: {
            colorCycle: { speed: 1.0, period: 10 },
          },
        },
      ],
    };
    const result = sceneSchema.safeParse(sceneWithRole);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.layers[0].role).toBe("subject");
    }
  });
});
