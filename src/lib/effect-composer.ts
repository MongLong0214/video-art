import * as THREE from "three";
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  BloomEffect,
  ChromaticAberrationEffect,
} from "postprocessing";
import type { EffectsConfig } from "./scene-schema";

export interface ComposerSetup {
  composer: EffectComposer;
}

export function createComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  effects: EffectsConfig,
  _resolution: [number, number],
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

  const effectPass = new EffectPass(camera, bloomEffect, caEffect);
  composer.addPass(effectPass);

  return { composer };
}
