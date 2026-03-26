import * as THREE from "three";
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  BloomEffect,
  ChromaticAberrationEffect,
  Effect,
  BlendFunction,
} from "postprocessing";
import type { EffectsConfig } from "./scene-schema";
import { PALETTE_VEC3 } from "./palette";
import sparkleFragment from "@/shaders/sparkle.frag";

class SparkleEffect extends Effect {
  constructor(
    resolution: THREE.Vector2,
    config: EffectsConfig["sparkle"],
  ) {
    const paletteArray = new Float32Array(24 * 3);
    for (let i = 0; i < 24; i++) {
      paletteArray[i * 3] = PALETTE_VEC3[i][0];
      paletteArray[i * 3 + 1] = PALETTE_VEC3[i][1];
      paletteArray[i * 3 + 2] = PALETTE_VEC3[i][2];
    }

    super("SparkleEffect", sparkleFragment, {
      blendFunction: BlendFunction.ADD,
      uniforms: new Map<string, THREE.Uniform>([
        ["uTime", new THREE.Uniform(0)],
        ["uResolution", new THREE.Uniform(resolution)],
        ["uSparkleCount", new THREE.Uniform(config.count)],
        ["uSparkleSizeMin", new THREE.Uniform(config.sizeMin)],
        ["uSparkleSizeMax", new THREE.Uniform(config.sizeMax)],
        ["uSparkleSpeed", new THREE.Uniform(config.speed)],
        ["uPalette", new THREE.Uniform(paletteArray)],
      ]),
    });
  }

  setTime(t: number) {
    const u = this.uniforms.get("uTime");
    if (u) u.value = t;
  }
}

export interface ComposerSetup {
  composer: EffectComposer;
  sparkleEffect: SparkleEffect;
}

export function createComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  effects: EffectsConfig,
  resolution: [number, number],
): ComposerSetup {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomEffect = new BloomEffect({
    intensity: effects.bloom.strength,
    radius: effects.bloom.radius,
    luminanceThreshold: effects.bloom.threshold,
    mipmapBlur: true,
  });

  const caEffect = new ChromaticAberrationEffect({
    offset: new THREE.Vector2(
      effects.chromaticAberration.offset * 0.001,
      effects.chromaticAberration.offset * 0.001,
    ),
    radialModulation: true,
    modulationOffset: 0.3,
  });

  const sparkleEffect = new SparkleEffect(
    new THREE.Vector2(resolution[0], resolution[1]),
    effects.sparkle,
  );

  const effectPass = new EffectPass(camera, bloomEffect, caEffect, sparkleEffect);
  composer.addPass(effectPass);

  return { composer, sparkleEffect };
}
