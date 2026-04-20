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
        uBreathAmp: { value: anim.breath?.amplitude ?? 0 },
        uBreathFreq: { value: anim.breath?.frequency ?? 3 },
        uBreathPeriod: { value: anim.breath?.period ?? 10 },
        uNoiseScale: { value: anim.noiseScale ?? 0 },
        uNoiseSpeed: { value: anim.noiseSpeed ?? 1 },
        uNoiseAmount: { value: anim.noiseAmount ?? 0 },
        uDomainWarp: { value: anim.domainWarp ?? 0 },
        uTileRepeat: { value: anim.tileRepeat ?? 0 },
        uPolarTwist: { value: anim.polarTwist ?? 0 },
        uVoronoiScale: { value: anim.voronoiScale ?? 8 },
        uVoronoiAmount: { value: anim.voronoiAmount ?? 0 },
        uPaletteAmount: { value: anim.paletteAmount ?? 0 },
        uPaletteA: { value: new THREE.Vector3(...(anim.paletteA ?? [0.5, 0.5, 0.5])) },
        uPaletteB: { value: new THREE.Vector3(...(anim.paletteB ?? [0.5, 0.5, 0.5])) },
        uPaletteC: { value: new THREE.Vector3(...(anim.paletteC ?? [1, 1, 1])) },
        uPaletteD: { value: new THREE.Vector3(...(anim.paletteD ?? [0, 0.33, 0.67])) },
        uPatternType: { value: anim.patternType ?? 0 },
        uPatternScale: { value: anim.patternScale ?? 20 },
        uPatternAmount: { value: anim.patternAmount ?? 0 },
        uSDFType: { value: anim.sdfType ?? 0 },
        uSDFScale: { value: anim.sdfScale ?? 2 },
        uSDFAmount: { value: anim.sdfAmount ?? 0 },
        uJuliaAmount: { value: anim.juliaAmount ?? 0 },
        uJuliaC: { value: new THREE.Vector2(...(anim.juliaC ?? [-0.7, 0.27015])) },
        uRotateSpeed: { value: anim.rotateSpeed ?? 0 },
        uScalePulse: { value: anim.scalePulse ?? 0 },
        uRimIntensity: { value: anim.rimIntensity ?? 0 },
        uRimHueShift: { value: anim.rimHueShift ?? 0.1 },
        uRimWidth: { value: anim.rimWidth ?? 0.004 },
        uRingIntensity: { value: anim.ringIntensity ?? 0 },
        uRingFreq: { value: anim.ringFreq ?? 30 },
        uRingPeriod: { value: anim.ringPeriod ?? 10 },
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
