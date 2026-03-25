import * as THREE from "three";
import { createShaderPlane } from "@/lib/shader-plane";
import vertexShader from "@/shaders/base.vert";
import fragmentShader from "@/shaders/sketches/rainbow-spiral.frag";
import type { Sketch } from "./psychedelic";

export const createRainbowSpiral = (): Sketch => {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const { mesh, material, geometry } = createShaderPlane(
    vertexShader,
    fragmentShader,
  );
  scene.add(mesh);

  return {
    scene,
    camera,
    update(time: number) {
      material.uniforms.uTime.value = time;
    },
    resize(width: number, height: number) {
      material.uniforms.uResolution.value.set(width, height);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
};
