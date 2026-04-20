import * as THREE from "three";
import type { Sketch } from "./psychedelic";
import simShader from "@/shaders/sketches/cellular-sim.frag";
import displayShader from "@/shaders/sketches/cellular.frag";

const GRID = 256;
// 20 sim steps per display frame — at 60fps that's 1200 steps/sec.
// At f=0.055/k=0.062 (maze regime), visible pattern forms in ~300-500 steps.
const STEPS_PER_FRAME = 20;

const fullscreenVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

function createStateTarget(): THREE.WebGLRenderTarget {
  // FloatType confirmed supported on ANGLE via T0-b spike (err 3.2e-8).
  return new THREE.WebGLRenderTarget(GRID, GRID, {
    type: THREE.FloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
  });
}

export function createCellularSketch(): Sketch {
  const simScene = new THREE.Scene();
  const simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const simGeom = new THREE.PlaneGeometry(2, 2);
  const simMat = new THREE.ShaderMaterial({
    uniforms: {
      uState: { value: null as THREE.Texture | null },
      uGridSize: { value: new THREE.Vector2(GRID, GRID) },
      // "Maze" regime — forms stripes/labyrinth fast
      uFeed: { value: 0.055 },
      uKill: { value: 0.062 },
      uDiffA: { value: 1.0 },
      uDiffB: { value: 0.5 },
    },
    vertexShader: fullscreenVert,
    fragmentShader: simShader,
  });
  const simQuad = new THREE.Mesh(simGeom, simMat);
  simScene.add(simQuad);

  let target0 = createStateTarget();
  let target1 = createStateTarget();

  // Initial state: background u=1, v=0 everywhere. Seed: large central disk
  // with v=0.5 + heavy noise sprinkle for organic variation.
  const initScene = new THREE.Scene();
  const initMat = new THREE.ShaderMaterial({
    vertexShader: fullscreenVert,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec2 c = vUv - 0.5;
        float d = length(c);
        float u = 1.0;
        float v = 0.0;
        // Central disk — strong seed
        if (d < 0.4) {
          v = 0.5;
        }
        // 40% noise sprinkle everywhere
        if (h(vUv * 180.0) > 0.6) {
          u = 0.5;
          v = max(v, 0.25);
        }
        // Dense inner noise for pattern bootstrap
        if (d < 0.35 && h(vUv * 350.0) > 0.4) {
          v = 0.6;
        }
        gl_FragColor = vec4(u, v, 0.0, 1.0);
      }
    `,
  });
  const initQuad = new THREE.Mesh(simGeom, initMat);
  initScene.add(initQuad);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const displayGeom = new THREE.PlaneGeometry(2, 2);
  const displayMat = new THREE.ShaderMaterial({
    uniforms: {
      uState: { value: null as THREE.Texture | null },
      uTime: { value: 0 },
    },
    vertexShader: fullscreenVert,
    fragmentShader: displayShader,
  });
  const displayQuad = new THREE.Mesh(displayGeom, displayMat);
  scene.add(displayQuad);

  let initialized = false;

  const getRenderer = (): THREE.WebGLRenderer | null => {
    const r = (window as unknown as { __renderer?: THREE.WebGLRenderer }).__renderer;
    return r ?? null;
  };

  const initializeState = (renderer: THREE.WebGLRenderer): void => {
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(target0);
    renderer.render(initScene, simCamera);
    renderer.setRenderTarget(target1);
    renderer.render(initScene, simCamera);
    renderer.setRenderTarget(prev);
    initialized = true;
  };

  return {
    scene,
    camera,
    update(time: number, _dt: number) {
      const renderer = getRenderer();
      if (!renderer) return;
      if (!initialized) initializeState(renderer);

      const prev = renderer.getRenderTarget();
      for (let i = 0; i < STEPS_PER_FRAME; i++) {
        simMat.uniforms.uState.value = target0.texture;
        renderer.setRenderTarget(target1);
        renderer.render(simScene, simCamera);
        const tmp = target0;
        target0 = target1;
        target1 = tmp;
      }
      renderer.setRenderTarget(prev);

      displayMat.uniforms.uState.value = target0.texture;
      displayMat.uniforms.uTime.value = time;
    },
    resize() {
      // Grid fixed; display scales via orthographic viewport
    },
    dispose() {
      simGeom.dispose();
      simMat.dispose();
      displayGeom.dispose();
      displayMat.dispose();
      initMat.dispose();
      target0.dispose();
      target1.dispose();
    },
  };
}
