import * as THREE from "three";
import type { Sketch } from "./psychedelic";
import type { LayerConfig, SceneConfig } from "@/lib/scene-schema";
import { loadScene } from "@/lib/scene-loader";
import { FrameTexturePool, computeFrameIndex } from "@/lib/frame-texture-pool";
import vertexShader from "@/shaders/layer.vert";
import fragmentShader from "@/shaders/layer.frag";

interface LayerMesh {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  config: LayerConfig;
  textureSource: THREE.Texture | FrameTexturePool;
}

export type LayeredSketch = Sketch & {
  sceneConfig: SceneConfig;
  preloadMotionFrames: () => Promise<void>;
};

export async function createLayeredPsychedelic(
  sceneUrl = "/scene.json",
): Promise<LayeredSketch> {
  const config = await loadScene(sceneUrl);
  const loopDuration = config.duration;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 100);
  camera.position.z = 10;

  const textureLoader = new THREE.TextureLoader();
  const layerMeshes: LayerMesh[] = [];

  // Load textures: static PNG or FrameTexturePool for motion layers
  const textureSources: (THREE.Texture | FrameTexturePool)[] = [];
  for (const l of config.layers) {
    if (l.motion?.enabled) {
      textureSources.push(
        new FrameTexturePool(l.motion.framesDir, l.motion.frameCount),
      );
    } else {
      textureSources.push(await loadTexture(textureLoader, `/${l.file}`));
    }
  }

  // For initial render, static textures are used directly.
  // Motion layers use the original PNG as initial texture (replaced per-frame in update).
  const textures = await Promise.all(
    config.layers.map((l) => loadTexture(textureLoader, `/${l.file}`)),
  );

  for (let idx = 0; idx < config.layers.length; idx++) {
    const layerConfig = config.layers[idx];
    const texture = textures[idx];
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const anim = layerConfig.animation;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTexture: { value: texture },
        uTime: { value: 0 },
        uLoopDuration: { value: loopDuration },
        uOpacity: { value: layerConfig.opacity },
        uColorCycleSpeed: { value: anim.colorCycle?.speed ?? 0 },
        uColorCyclePeriod: { value: anim.colorCycle?.period ?? 10 },
        uPhaseOffset: { value: anim.colorCycle?.phaseOffset ?? 0 },
        uGlowIntensity: { value: anim.glow?.intensity ?? 0 },
        uGlowPulse: { value: anim.glow?.pulse ?? 0 },
        uGlowPeriod: { value: anim.glow?.period ?? loopDuration },
        uSaturationBoost: { value: anim.saturationBoost ?? 2.5 },
        uLuminanceKey: { value: anim.luminanceKey ?? 0.6 },
        uSatBlendLow: { value: anim.satBlendLow ?? 0.1 },
        uSatBlendHigh: { value: anim.satBlendHigh ?? 0.4 },
        uSatInjectionMul: { value: anim.satInjectionMul ?? 0.35 },
        uGlowPulseFloor: { value: anim.glowPulseFloor ?? 0.0 },
        uLumExponent: { value: anim.lumExponent ?? 1.0 },
        uDepthNorm: { value: (layerConfig.meanDepth ?? 128) / 255 },
        uParallaxScale: { value: config.effects?.parallax?.scale ?? 0 },
        uHazeIntensity: { value: config.effects?.haze?.intensity ?? 0 },
        uFeatherRadius: { value: config.effects?.feather?.radius ?? 0 },
        uHueKey: { value: anim.hueKey ?? 0 },
        uHueSpeed: { value: anim.hueSpeed ?? 1 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
    });

    // Apply blend mode from scene.json
    const blending = layerConfig.blending ?? "normal";
    if (blending === "screen") {
      material.blending = THREE.CustomBlending;
      material.blendEquation = THREE.AddEquation;
      material.blendSrc = THREE.OneFactor;
      material.blendDst = THREE.OneMinusSrcColorFactor;
    } else if (blending === "add") {
      material.blending = THREE.AdditiveBlending;
    } else if (blending === "multiply") {
      material.blending = THREE.MultiplyBlending;
    }

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = layerConfig.zIndex * 0.1;
    mesh.renderOrder = layerConfig.zIndex;

    scene.add(mesh);
    layerMeshes.push({ mesh, material, config: layerConfig, textureSource: textureSources[idx] });
  }

  return {
    scene,
    camera,
    sceneConfig: config,
    async preloadMotionFrames() {
      for (const { textureSource } of layerMeshes) {
        if (textureSource instanceof FrameTexturePool) {
          await textureSource.preloadAll();
        }
      }
    },
    update(time: number) {
      const normalizedTime = (time % loopDuration) / loopDuration;
      for (const { material, textureSource } of layerMeshes) {
        material.uniforms.uTime.value = normalizedTime;

        // Motion layers: swap texture per frame
        if (textureSource instanceof FrameTexturePool) {
          const frameIndex = computeFrameIndex(normalizedTime, textureSource.frameCount);
          const frameTex = textureSource.getTexture(frameIndex);
          if (frameTex) {
            material.uniforms.uTexture.value = frameTex;
          }
        }
      }
    },
    resize(_width: number, _height: number) {
      // OrthographicCamera is fixed -1..1, no resize needed for square
    },
    dispose() {
      for (const { mesh, material, textureSource } of layerMeshes) {
        mesh.geometry.dispose();
        material.dispose();
        if (textureSource instanceof FrameTexturePool) {
          textureSource.dispose();
        } else {
          textureSource.dispose();
        }
        scene.remove(mesh);
      }
      layerMeshes.length = 0;
    },
  };
}

function loadTexture(
  loader: THREE.TextureLoader,
  url: string,
): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}
