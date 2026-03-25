import * as THREE from "three";

export interface Sketch {
  scene: THREE.Scene;
  camera: THREE.Camera;
  update: (time: number, dt: number) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}
