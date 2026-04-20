import * as THREE from "three";
import type { Sketch } from "./psychedelic";
import simShader from "@/shaders/sketches/cellular-sim.frag";
import displayShader from "@/shaders/sketches/cellular.frag";

const GRID = 256;
const STEPS_PER_FRAME = 4;

const fullscreenVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

function createStateTarget(): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(GRID, GRID, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping,
  });
}

export function createCellularSketch(): Sketch {
  const renderer = null as unknown as THREE.WebGLRenderer; // placeholder reference, set in update via global
  void renderer;

  const simScene = new THREE.Scene();
  const simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const simGeom = new THREE.PlaneGeometry(2, 2);
  const simMat = new THREE.ShaderMaterial({
    uniforms: {
      uState: { value: null as THREE.Texture | null },
      uGridSize: { value: new THREE.Vector2(GRID, GRID) },
      uFeed: { value: 0.0367 },
      uKill: { value: 0.0649 },
      uDiffA: { value: 1.0 },
      uDiffB: { value: 0.5 },
      uTime: { value: 0 },
    },
    vertexShader: fullscreenVert,
    fragmentShader: simShader,
  });
  const simQuad = new THREE.Mesh(simGeom, simMat);
  simScene.add(simQuad);

  // Ping-pong targets
  let target0 = createStateTarget();
  let target1 = createStateTarget();

  // Initial state: center seed of v
  const initScene = new THREE.Scene();
  const initMat = new THREE.ShaderMaterial({
    vertexShader: fullscreenVert,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        // u=1 substrate, v seeded heavily near center + random sprinkle
        vec2 c = vUv - 0.5;
        float d = length(c);
        float u = 1.0;
        float v = 0.0;
        if (d < 0.4) v = 0.3 + 0.1 * h(vUv * 80.0);
        if (h(vUv * 150.0) > 0.7) v = max(v, 0.3);
        gl_FragColor = vec4(u, v, 0.0, 1.0);
      }
    `,
  });
  const initQuad = new THREE.Mesh(simGeom, initMat);
  initScene.add(initQuad);

  // Display scene (main output)
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
  let stepCount = 0;

  // Inject a reference to the global renderer via a side channel — main.ts sets this
  const getRenderer = (): THREE.WebGLRenderer | null => {
    const r = (window as unknown as { __renderer?: THREE.WebGLRenderer }).__renderer;
    return r ?? null;
  };

  const initializeState = (renderer: THREE.WebGLRenderer): void => {
    const prevTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(target0);
    renderer.clear();
    renderer.render(initScene, simCamera);
    renderer.setRenderTarget(target1);
    renderer.clear();
    renderer.render(initScene, simCamera);
    renderer.setRenderTarget(prevTarget);
    initialized = true;
  };

  return {
    scene,
    camera,
    update(time: number, _dt: number) {
      const renderer = getRenderer();
      if (!renderer) return;
      if (!initialized) initializeState(renderer);

      for (let i = 0; i < STEPS_PER_FRAME; i++) {
        simMat.uniforms.uState.value = target0.texture;
        simMat.uniforms.uTime.value = time + i * 0.01;
        const prev = renderer.getRenderTarget();
        renderer.setRenderTarget(target1);
        renderer.render(simScene, simCamera);
        renderer.setRenderTarget(prev);
        const tmp = target0;
        target0 = target1;
        target1 = tmp;
        stepCount++;
      }

      displayMat.uniforms.uState.value = target0.texture;
      displayMat.uniforms.uTime.value = time;
    },
    resize() {
      // sim grid fixed at 512; display scales via viewport
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
