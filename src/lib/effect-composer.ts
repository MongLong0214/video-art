import * as THREE from "three";
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  BloomEffect,
  ChromaticAberrationEffect,
  ShaderPass,
} from "postprocessing";
import type { EffectsConfig } from "./scene-schema";

const kaleidoVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const kaleidoFragmentShader = `
  uniform sampler2D inputBuffer;
  uniform float uSegments;
  uniform float uBlend;
  varying vec2 vUv;

  #define TAU 6.28318530718

  void main() {
    vec4 original = texture2D(inputBuffer, vUv);
    if (uSegments < 2.0) {
      gl_FragColor = original;
      return;
    }
    vec2 centered = vUv - 0.5;
    float angle = atan(centered.y, centered.x);
    if (angle < 0.0) angle += TAU;
    float radius = length(centered);

    float segAngle = TAU / uSegments;
    float idx = floor(angle / segAngle);
    float localAngle = angle - idx * segAngle;
    if (mod(idx, 2.0) > 0.5) {
      localAngle = segAngle - localAngle;
    }

    vec2 kaleidoUv = vec2(cos(localAngle), sin(localAngle)) * radius + 0.5;
    vec4 kaleidoColor = texture2D(inputBuffer, kaleidoUv);
    gl_FragColor = mix(original, kaleidoColor, uBlend);
  }
`;

const trailsVertexShader = kaleidoVertexShader;

const trailsFragmentShader = `
  uniform sampler2D inputBuffer;
  uniform sampler2D uPrevFrame;
  uniform float uTrailStrength;
  varying vec2 vUv;

  void main() {
    vec4 current = texture2D(inputBuffer, vUv);
    vec4 prev = texture2D(uPrevFrame, vUv);
    gl_FragColor = mix(current, prev, uTrailStrength);
  }
`;

const blitVertexShader = kaleidoVertexShader;
const blitFragmentShader = `
  uniform sampler2D inputBuffer;
  varying vec2 vUv;
  void main() {
    gl_FragColor = texture2D(inputBuffer, vUv);
  }
`;

export function createComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  effects: EffectsConfig,
  resolution: [number, number],
) {
  const composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType,
  });

  const trailStrength = effects.trails?.strength ?? 0;
  const hasTrails = trailStrength > 0;

  // When trails are active, keep everything in buffers (don't render to screen mid-chain)
  if (hasTrails) {
    composer.autoRenderToScreen = false;
  }

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
    modulationOffset: effects.chromaticAberration.modulationOffset,
  });

  const effectPass = new EffectPass(camera, bloomEffect, caEffect);
  composer.addPass(effectPass);

  // Kaleidoscope pass
  const kaleidoSegments = effects.kaleidoscope?.segments ?? 0;
  if (kaleidoSegments >= 2) {
    const kaleidoMaterial = new THREE.ShaderMaterial({
      uniforms: {
        inputBuffer: { value: null },
        uSegments: { value: kaleidoSegments },
        uBlend: { value: effects.kaleidoscope?.blend ?? 0.3 },
      },
      vertexShader: kaleidoVertexShader,
      fragmentShader: kaleidoFragmentShader,
    });
    composer.addPass(new ShaderPass(kaleidoMaterial, "inputBuffer"));
  }

  // Trails (temporal echo) feedback
  let feedbackTarget: THREE.WebGLRenderTarget | null = null;

  if (hasTrails) {
    feedbackTarget = new THREE.WebGLRenderTarget(resolution[0], resolution[1], {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });

    const trailsMaterial = new THREE.ShaderMaterial({
      uniforms: {
        inputBuffer: { value: null },
        uPrevFrame: { value: feedbackTarget.texture },
        uTrailStrength: { value: trailStrength },
      },
      vertexShader: trailsVertexShader,
      fragmentShader: trailsFragmentShader,
    });
    composer.addPass(new ShaderPass(trailsMaterial, "inputBuffer"));
  }

  // Blit quad for manual screen output + feedback copy
  const blitGeo = new THREE.PlaneGeometry(2, 2);
  const blitMat = new THREE.ShaderMaterial({
    uniforms: { inputBuffer: { value: null } },
    vertexShader: blitVertexShader,
    fragmentShader: blitFragmentShader,
  });
  const blitQuad = new THREE.Mesh(blitGeo, blitMat);
  const blitScene = new THREE.Scene();
  blitScene.add(blitQuad);
  const blitCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const originalRender = composer.render.bind(composer);

  const wrapper = {
    ...composer,
    render(delta?: number) {
      originalRender(delta);

      if (hasTrails) {
        // outputBuffer now has the final composited result (trails included)
        const resultTexture = composer.outputBuffer.texture;
        blitMat.uniforms.inputBuffer.value = resultTexture;

        // Copy to feedback buffer for next frame
        if (feedbackTarget) {
          renderer.setRenderTarget(feedbackTarget);
          renderer.render(blitScene, blitCamera);
        }

        // Render to screen (canvas) for capture/display
        renderer.setRenderTarget(null);
        renderer.render(blitScene, blitCamera);
      }
    },
    dispose() {
      feedbackTarget?.dispose();
      blitGeo.dispose();
      blitMat.dispose();
      composer.dispose();
    },
  };

  return { composer: wrapper };
}
