import * as THREE from "three";
import { createShaderPlane } from "@/lib/shader-plane";
import vertexShader from "@/shaders/base.vert";
import fragmentShader from "@/shaders/psychedelic.frag";

export interface Sketch {
  scene: THREE.Scene;
  camera: THREE.Camera;
  update: (time: number, dt: number) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

export const createPsychedelic = (): Sketch => {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const { mesh, material, geometry } = createShaderPlane(
    vertexShader,
    fragmentShader,
  );

  scene.add(mesh);

  const mouse = new THREE.Vector2(0, 0);

  const onMouseMove = (e: MouseEvent) => {
    mouse.x = e.clientX / window.innerWidth;
    mouse.y = 1.0 - e.clientY / window.innerHeight;
    material.uniforms.uMouse.value.copy(mouse);
  };

  window.addEventListener("mousemove", onMouseMove);

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
      window.removeEventListener("mousemove", onMouseMove);
      geometry.dispose();
      material.dispose();
    },
  };
};
