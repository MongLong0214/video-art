import * as THREE from "three";

export interface RendererConfig {
  width?: number;
  height?: number;
  pixelRatio?: number;
  antialias?: boolean;
}

const DEFAULT_CONFIG: Required<RendererConfig> = {
  width: 1920,
  height: 1080,
  pixelRatio: 1,
  antialias: false,
};

export const createRenderer = (config: Partial<RendererConfig> = {}) => {
  const { width, height, pixelRatio, antialias } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const renderer = new THREE.WebGLRenderer({
    antialias,
    preserveDrawingBuffer: true, // for recording
  });

  renderer.setSize(width, height);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  document.body.appendChild(renderer.domElement);

  return renderer;
};
