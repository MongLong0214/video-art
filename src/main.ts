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
const MODE = params.get("mode"); // "layered" or null
const SKETCH_NAME = params.get("sketch") || "psychedelic";

// --- config ---
const IS_LAYERED = MODE === "layered";
const sketchConfig = getSketchConfig(SKETCH_NAME);
let WIDTH = IS_LAYERED ? 1080 : sketchConfig.width;
let HEIGHT = IS_LAYERED ? 1080 : sketchConfig.height;
const FPS = sketchConfig.fps;
let LOOP_DUR = IS_LAYERED ? 20.0 : sketchConfig.loopDuration; // overridden by sceneConfig in init()

// --- renderer ---
const renderer = new THREE.WebGLRenderer({
  antialias: false,
  preserveDrawingBuffer: true,
});
renderer.setSize(WIDTH, HEIGHT);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = IS_LAYERED ? THREE.ACESFilmicToneMapping : getToneMapping(sketchConfig);
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

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
    return createLayeredPsychedelic("/scene.json");
  }
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
    updatePostUniforms = () => {};
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
      const label = IS_LAYERED ? "layered" : SKETCH_NAME;
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
    if (!typingEl || IS_LAYERED || SKETCH_NAME !== "psychedelic") {
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
