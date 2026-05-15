import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import type { Sketch } from "@/sketches/psychedelic";
import { Clock } from "@/core/clock";
import { createShaderPlane } from "@/lib/shader-plane";
import { getSketchConfig, getToneMapping } from "@/lib/sketch-registry";
import postVertexShader from "@/shaders/post.vert";
import postFragmentShader from "@/shaders/post.frag";
import baseVertexShader from "@/shaders/base.vert";

// --- load all sketch shaders via glob ---
const sketchShaders = import.meta.glob("/src/shaders/sketches/*.frag", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function getSketchShader(name: string): string {
  const key = `/src/shaders/sketches/${name}.frag`;
  const shader = sketchShaders[key];
  if (!shader) {
    const available = Object.keys(sketchShaders)
      .map((k) => k.replace("/src/shaders/sketches/", "").replace(".frag", ""))
      .join(", ");
    throw new Error(`Sketch "${name}" not found. Available: ${available}`);
  }
  return shader;
}

// --- URL params ---
const params = new URLSearchParams(window.location.search);
const MODE = params.get("mode"); // "layered" | "dmt" | null
const SKETCH_NAME = params.get("sketch") || "psychedelic";
const SCENE_URL = params.get("scene") || "/scene.json";
const DMT_CONFIG_URL = params.get("dmt") || "/dmt-config.json";

// --- config ---
const IS_LAYERED = MODE === "layered";
const IS_DMT = MODE === "dmt";
const sketchConfig = getSketchConfig(SKETCH_NAME);
let WIDTH = IS_LAYERED || IS_DMT ? 1080 : sketchConfig.width;
let HEIGHT = IS_LAYERED || IS_DMT ? 1080 : sketchConfig.height;
const FPS = sketchConfig.fps;
let LOOP_DUR = IS_LAYERED || IS_DMT ? 20.0 : sketchConfig.loopDuration; // overridden by config in init()

// --- renderer ---
const renderer = new THREE.WebGLRenderer({
  antialias: false,
  preserveDrawingBuffer: true,
});
renderer.setSize(WIDTH, HEIGHT);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = IS_LAYERED || IS_DMT ? THREE.ACESFilmicToneMapping : getToneMapping(sketchConfig);
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// Expose renderer for FBO-based sketches (cellular, particles)
(window as unknown as { __renderer: THREE.WebGLRenderer }).__renderer = renderer;

// --- sketch loading ---
function createShaderSketch(name: string): Sketch {
  const fragmentShader = getSketchShader(name);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const { mesh, material, geometry } = createShaderPlane(
    baseVertexShader,
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
    update(time: number, _dt: number) {
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
}

async function loadSketch(): Promise<Sketch> {
  if (IS_LAYERED) {
    const { createLayeredPsychedelic } = await import(
      "@/sketches/layered-psychedelic"
    );
    return createLayeredPsychedelic(SCENE_URL);
  }
  if (IS_DMT) {
    const { createDmtTunnel } = await import("@/sketches/dmt-tunnel");
    return createDmtTunnel(DMT_CONFIG_URL);
  }
  // Custom sketches with FBO or bespoke logic
  if (SKETCH_NAME === "cellular") {
    const { createCellularSketch } = await import("@/sketches/cellular");
    const s = createCellularSketch();
    s.resize(WIDTH, HEIGHT);
    return s;
  }
  if (SKETCH_NAME === "particles") {
    const { createParticlesSketch } = await import("@/sketches/particles");
    const s = createParticlesSketch();
    s.resize(WIDTH, HEIGHT);
    return s;
  }
  // Fullscreen fragment-shader sketches (loaded via glob)
  const sketch = createShaderSketch(SKETCH_NAME);
  sketch.resize(WIDTH, HEIGHT);
  return sketch;
}

async function init() {
  const sketch = await loadSketch();

  // --- dynamic duration + resolution from scene.json (layered mode) ---
  if (IS_LAYERED) {
    const layeredSketch = sketch as import("@/sketches/layered-psychedelic").LayeredSketch;
    LOOP_DUR = layeredSketch.sceneConfig.duration;
    const [w, h] = layeredSketch.sceneConfig.resolution;
    WIDTH = w;
    HEIGHT = h;
    renderer.setSize(WIDTH, HEIGHT);
  }

  if (IS_DMT) {
    const dmtSketch = sketch as import("@/sketches/dmt-tunnel").DmtSketch;
    LOOP_DUR = dmtSketch.dmtConfig.duration;
    const [w, h] = dmtSketch.dmtConfig.resolution;
    WIDTH = w;
    HEIGHT = h;
    renderer.setSize(WIDTH, HEIGHT);
    dmtSketch.resize(w, h);
  }

  // --- post-processing ---
  let composerRender: () => void;
  let updatePostUniforms: (time: number) => void;

  if (IS_LAYERED) {
    const { createComposer } = await import("@/lib/effect-composer");
    const layeredSketch = sketch as import("@/sketches/layered-psychedelic").LayeredSketch;
    const config = layeredSketch.sceneConfig;
    const { composer } = createComposer(
      renderer,
      sketch.scene,
      sketch.camera,
      config.effects,
      config.resolution,
    );
    composerRender = () => composer.render();
    updatePostUniforms = (time: number) => composer.setTime(time);
  } else if (IS_DMT) {
    const dmtSketch = sketch as import("@/sketches/dmt-tunnel").DmtSketch;
    const dc = dmtSketch.dmtConfig;
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(sketch.scene, sketch.camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(WIDTH, HEIGHT),
      dc.bloomStrength,
      dc.bloomRadius,
      dc.bloomThreshold,
    );
    composer.addPass(bloomPass);

    // DMT post is a THIN pass — shader already does AgX + CA + vignette + grade.
    // Composer only adds bloom (above). caOffset/vignetteIntensity/contrast
    // from config are retained as minimal LUT-style final tweaks (non-dup).
    const dmtPostShader = {
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uContrast: { value: dc.contrast },
        uCaOffset: { value: dc.caOffset },
        uVignetteIntensity: { value: dc.vignetteIntensity },
      },
      vertexShader: postVertexShader,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uContrast;
        uniform float uCaOffset;
        uniform float uVignetteIntensity;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv - 0.5;
          float d = length(p);
          vec2 dir = p / max(d, 0.0001);
          vec2 ca = dir * uCaOffset * 0.0045 * smoothstep(0.05, 0.82, d);
          vec3 col;
          col.r = texture2D(tDiffuse, vUv + ca * 1.20).r;
          col.g = texture2D(tDiffuse, vUv).g;
          col.b = texture2D(tDiffuse, vUv - ca * 1.45).b;
          vec3 soft = (
            texture2D(tDiffuse, vUv + ca * 2.25).rgb +
            texture2D(tDiffuse, vUv - ca * 2.25).rgb +
            texture2D(tDiffuse, vUv + ca.yx * vec2(1.0, -1.0) * 1.70).rgb +
            texture2D(tDiffuse, vUv - ca.yx * vec2(1.0, -1.0) * 1.70).rgb
          ) * 0.25;
          col = mix(col, soft, 0.10 * smoothstep(0.08, 0.80, d));
          float vig = 1.0 - uVignetteIntensity * 0.13 * pow(d * 1.45, 2.0);
          col *= clamp(vig, 0.78, 1.0);
          // Mild final contrast lift (shader already did primary grade)
          col = (col - 0.5) * uContrast + 0.5;
          col = clamp(col, 0.0, 1.0);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    };
    composer.addPass(new ShaderPass(dmtPostShader));

    composerRender = () => composer.render();
    updatePostUniforms = (time: number) => {
      dmtPostShader.uniforms.uTime.value = time;
    };
  } else if (sketchConfig.postProcessing === "none") {
    composerRender = () => renderer.render(sketch.scene, sketch.camera);
    updatePostUniforms = () => {};
  } else {
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(sketch.scene, sketch.camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(WIDTH, HEIGHT),
      0.6, 0.5, 0.15,
    );
    composer.addPass(bloomPass);

    const postShader = {
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
      },
      vertexShader: postVertexShader,
      fragmentShader: postFragmentShader,
    };
    composer.addPass(new ShaderPass(postShader));

    composerRender = () => composer.render();
    updatePostUniforms = (time: number) => {
      postShader.uniforms.uTime.value = time;
    };
  }

  // --- resize ---
  const resize = () => {
    const aspect = WIDTH / HEIGHT;
    const windowAspect = window.innerWidth / window.innerHeight;

    let w: number, h: number;
    if (windowAspect > aspect) {
      h = window.innerHeight;
      w = h * aspect;
    } else {
      w = window.innerWidth;
      h = w / aspect;
    }

    renderer.domElement.style.width = `${w}px`;
    renderer.domElement.style.height = `${h}px`;
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.left = `${(window.innerWidth - w) / 2}px`;
    renderer.domElement.style.top = `${(window.innerHeight - h) / 2}px`;
  };
  window.addEventListener("resize", resize);
  resize();

  // --- clock ---
  const clock = new Clock(FPS);

  // --- recording ---
  let recording = false;
  let mediaRecorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];

  const startRec = () => {
    chunks = [];
    const stream = renderer.domElement.captureStream(FPS);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 20_000_000,
    });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${SKETCH_NAME}-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      chunks = [];
    };
    clock.startRecording();
    mediaRecorder.start();
    recording = true;
    updateInfo();
  };

  const stopRec = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      clock.stopRecording();
      recording = false;
      updateInfo();
    }
  };

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === "r" || e.key === "R") {
      recording ? stopRec() : startRec();
    }
  };
  window.addEventListener("keydown", onKeydown);

  // --- info ---
  const info = document.getElementById("info");
  const updateInfo = () => {
    if (!info) return;
    if (recording) {
      info.textContent = "● REC (press R to stop)";
      info.classList.add("recording");
    } else {
      const label = IS_LAYERED ? "layered" : IS_DMT ? "dmt" : SKETCH_NAME;
      info.textContent = `[${label}] press R to record`;
      info.classList.remove("recording");
    }
  };
  updateInfo();

  // --- typing text (psychedelic sketch only) ---
  const typingEl = document.getElementById("typing-text");
  const TYPING_TEXT = "teleportation music";
  const TYPING_SPEED = TYPING_TEXT.length / (LOOP_DUR - 1.5);

  const updateTyping = (time: number) => {
    if (!typingEl || IS_LAYERED || IS_DMT || SKETCH_NAME !== "psychedelic") {
      if (typingEl) typingEl.textContent = "";
      return;
    }
    const lt = time % LOOP_DUR;
    const charCount = Math.min(
      Math.floor(lt * TYPING_SPEED),
      TYPING_TEXT.length,
    );
    typingEl.textContent = TYPING_TEXT.slice(0, charCount);
  };

  // --- frame capture API (for Puppeteer export) ---
  let capturing = false;
  const win = window as unknown as Record<string, unknown>;
  win.__captureReady = true;
  win.__clock = clock;
  win.__captureFrame = () => {
    const { time } = clock.tick();
    sketch.update(time, clock.dt);
    updatePostUniforms(time);
    composerRender();
    return renderer.domElement.toDataURL("image/png");
  };
  win.__startCapture = (fps: number) => {
    capturing = true;
    clock.setFps(fps);
    // Loop-seam fix: pre-render last ~0.5s of the loop so trails feedback
    // buffer matches continuous-loop state at frame 0.
    const warmupFrames = Math.max(15, Math.floor(fps * 0.5));
    const dt = 1 / fps;
    for (let i = 0; i < warmupFrames; i++) {
      const t = LOOP_DUR - (warmupFrames - i) * dt;
      sketch.update(t, dt);
      updatePostUniforms(t);
      composerRender();
    }
    clock.startRecording();
  };

  // --- animation loop (disabled during capture) ---
  const animate = () => {
    if (capturing) return;
    requestAnimationFrame(animate);
    const { time } = clock.tick();

    sketch.update(time, clock.dt);
    updatePostUniforms(time);

    composerRender();
    updateTyping(time);
  };

  animate();

  // --- cleanup on HMR / page unload ---
  window.addEventListener("beforeunload", () => {
    sketch.dispose();
    renderer.dispose();
  });

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      sketch.dispose();
      renderer.dispose();
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeydown);
    });
  }
}

init().catch((err) => {
  console.error("Failed to initialize:", err);
});
