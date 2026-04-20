import * as THREE from "three";
import type { Sketch } from "./psychedelic";
import simShader from "@/shaders/sketches/particles-sim.frag";
import pointsVert from "@/shaders/sketches/particles.vert";
import pointsFrag from "@/shaders/sketches/particles.frag";

const TEX_SIZE = 256;
const PARTICLE_COUNT = TEX_SIZE * TEX_SIZE; // 65,536

const fullscreenVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

function createPosTarget(): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(TEX_SIZE, TEX_SIZE, {
    type: THREE.FloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  });
}

export function createParticlesSketch(): Sketch {
  // Sim scene
  const simScene = new THREE.Scene();
  const simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const simMat = new THREE.ShaderMaterial({
    uniforms: {
      uPosition: { value: null as THREE.Texture | null },
      uTime: { value: 0 },
      uDt: { value: 1 / 60 },
    },
    vertexShader: fullscreenVert,
    fragmentShader: simShader,
  });
  const simQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMat);
  simScene.add(simQuad);

  // Init scene
  const initMat = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: fullscreenVert,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        // Random initial position in [-1, 1] + random life [0,1] + unique seed
        float rx = h(vUv * 123.45) * 2.0 - 1.0;
        float ry = h(vUv * 678.9 + 100.0) * 2.0 - 1.0;
        float life = h(vUv * 333.7 + 50.0);
        float seed = h(vUv * 55.5);
        gl_FragColor = vec4(rx, ry, life, seed);
      }
    `,
  });
  const initScene = new THREE.Scene();
  initScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), initMat));

  // Ping-pong
  let target0 = createPosTarget();
  let target1 = createPosTarget();

  // Points geometry
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const indices = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3 + 0] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;
    indices[i] = i;
  }
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setAttribute("aIndex", new THREE.BufferAttribute(indices, 1));

  const pointsMat = new THREE.ShaderMaterial({
    uniforms: {
      uPosition: { value: null as THREE.Texture | null },
      uParticleSize: { value: 2.5 },
    },
    vertexShader: pointsVert,
    fragmentShader: pointsFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geom, pointsMat);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene.add(points);

  let initialized = false;

  const getRenderer = (): THREE.WebGLRenderer | null => {
    const r = (window as unknown as { __renderer?: THREE.WebGLRenderer }).__renderer;
    return r ?? null;
  };

  const initialize = (renderer: THREE.WebGLRenderer): void => {
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
    update(time: number, dt: number) {
      const renderer = getRenderer();
      if (!renderer) return;
      if (!initialized) initialize(renderer);

      // Sim step
      simMat.uniforms.uPosition.value = target0.texture;
      simMat.uniforms.uTime.value = time;
      simMat.uniforms.uDt.value = Math.min(dt, 1 / 30);
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(target1);
      renderer.render(simScene, simCamera);
      renderer.setRenderTarget(prev);
      const tmp = target0;
      target0 = target1;
      target1 = tmp;

      pointsMat.uniforms.uPosition.value = target0.texture;
    },
    resize() {
      // fixed tex size
    },
    dispose() {
      simMat.dispose();
      initMat.dispose();
      pointsMat.dispose();
      geom.dispose();
      target0.dispose();
      target1.dispose();
    },
  };
}
