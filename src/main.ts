import { createRenderer } from "@/core/renderer";
import { Clock } from "@/core/clock";
import { Recorder } from "@/core/recorder";
import { createPsychedelic } from "@/sketches/psychedelic";

// --- config ---
const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 60;

// --- setup ---
const renderer = createRenderer({ width: WIDTH, height: HEIGHT });
const clock = new Clock(FPS);
const recorder = new Recorder(renderer.domElement, FPS);

// --- active sketch ---
const sketch = createPsychedelic();
sketch.resize(WIDTH, HEIGHT);

// --- resize (fit to window, maintain aspect) ---
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

// --- keyboard ---
window.addEventListener("keydown", (e) => {
  if (e.key === "r" || e.key === "R") {
    if (!recorder.recording) {
      clock.startRecording();
      recorder.start();
    } else {
      recorder.stop();
      clock.stopRecording();
    }
  }
});

// --- info ---
const info = document.getElementById("info");
if (info) info.textContent = "press R to record";

// --- animation loop ---
const animate = () => {
  requestAnimationFrame(animate);
  const { time, dt } = clock.tick();
  sketch.update(time, dt);
  renderer.render(sketch.scene, sketch.camera);
};

animate();
