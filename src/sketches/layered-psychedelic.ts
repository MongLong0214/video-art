import * as THREE from "three";
import type { Sketch } from "./psychedelic";
import type { LayerConfig, SceneConfig } from "@/lib/scene-schema";
import { loadScene } from "@/lib/scene-loader";
import vertexShader from "@/shaders/layer.vert";
import fragmentShader from "@/shaders/layer.frag";

interface LayerMesh {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  config: LayerConfig;
}

export type LayeredSketch = Sketch & { sceneConfig: SceneConfig };

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

  const textures = await Promise.all(
    config.layers.map((l) => loadTexture(textureLoader, `/${l.file}`)),
  );

  for (let idx = 0; idx < config.layers.length; idx++) {
    const layerConfig = config.layers[idx];
    const texture = textures[idx];
    texture.colorSpace = THREE.SRGBColorSpace;

    const anim = layerConfig.animation;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTexture: { value: texture },
        uTime: { value: 0 },
        uLoopDuration: { value: loopDuration },
        uOpacity: { value: layerConfig.opacity },
        // Color cycle
        uColorCycleSpeed: { value: anim.colorCycle?.speed ?? 0 },
        uColorCycleHueRange: { value: anim.colorCycle?.hueRange ?? 0 },
        uColorCyclePeriod: { value: anim.colorCycle?.period ?? 10 },
        uPhaseOffset: { value: anim.colorCycle?.phaseOffset ?? 0 },
        // Wave
        uWaveAmplitude: { value: anim.wave?.amplitude ?? 0 },
        uWaveFrequency: { value: anim.wave?.frequency ?? 0 },
        uWavePeriod: { value: anim.wave?.period ?? 10 },
        // Glow
        uGlowIntensity: { value: anim.glow?.intensity ?? 0 },
        uGlowPulse: { value: anim.glow?.pulse ?? 0 },
        uGlowPeriod: { value: anim.glow?.period ?? loopDuration },
        // Parallax
        uParallaxDepth: { value: anim.parallax?.depth ?? 0 },
        // Psychedelic color engine
        uSaturationBoost: { value: anim.saturationBoost ?? 2.5 },
        uLuminanceKey: { value: anim.luminanceKey ?? 0.6 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = layerConfig.zIndex * 0.1;
    mesh.renderOrder = layerConfig.zIndex;

    scene.add(mesh);
    layerMeshes.push({ mesh, material, config: layerConfig });
  }

  return {
    scene,
    camera,
    sceneConfig: config,
    update(time: number) {
      const normalizedTime = (time % loopDuration) / loopDuration;
      for (const { material } of layerMeshes) {
        material.uniforms.uTime.value = normalizedTime;
      }
    },
    resize(_width: number, _height: number) {
      // OrthographicCamera is fixed -1..1, no resize needed for square
    },
    dispose() {
      for (const { mesh, material } of layerMeshes) {
        mesh.geometry.dispose();
        material.dispose();
        const tex = material.uniforms.uTexture.value as THREE.Texture;
        tex.dispose();
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
