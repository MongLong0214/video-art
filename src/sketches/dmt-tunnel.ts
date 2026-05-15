import * as THREE from "three";
import type { Sketch } from "./psychedelic";
import { DEFAULT_DMT_CONFIG, type DmtConfig } from "./dmt-config";
import vertexShader from "@/shaders/base.vert";
import fragmentShader from "@/shaders/dmt-tunnel.frag";

export type DmtSketch = Sketch & { dmtConfig: DmtConfig };

export async function createDmtTunnel(configUrl = "/dmt-config.json"): Promise<DmtSketch> {
  let config: DmtConfig = DEFAULT_DMT_CONFIG;
  try {
    const res = await fetch(configUrl);
    if (res.ok) {
      const remote = (await res.json()) as Partial<DmtConfig>;
      config = { ...DEFAULT_DMT_CONFIG, ...remote };
    }
  } catch {
    // use defaults
  }

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(config.resolution[0], config.resolution[1]) },
      uSymmetry: { value: config.symmetry },
      uZoomLoops: { value: config.zoomLoops },
      uCameraLoops: { value: config.cameraLoops },
      uFoldScale: { value: config.foldScale },
      uPaletteMode: { value: config.paletteMode },
      uHueSpeed: { value: config.hueSpeed },
      uGlow: { value: config.glow },
    },
    depthTest: false,
    depthWrite: false,
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const loopDuration = config.duration;

  return {
    scene,
    camera,
    dmtConfig: config,
    update(time: number) {
      // normalize 0..1 for seamless loop
      const normalized = (time % loopDuration) / loopDuration;
      material.uniforms.uTime.value = normalized;
    },
    resize(width: number, height: number) {
      material.uniforms.uResolution.value.set(width, height);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      scene.remove(mesh);
    },
  };
}
