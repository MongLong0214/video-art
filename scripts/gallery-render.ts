/**
 * Quick-preview batch renderer for shader-dev solo presets.
 * Renders all presets in public/presets/solo/ as short 720x720 mp4s.
 *
 * Usage: npx tsx scripts/gallery-render.ts
 * Output: out/shader-gallery/T{N}-{name}.mp4
 *
 * Each render ~30-45s. Total ~10min for 13 presets.
 */
import "dotenv/config";
import puppeteer, { type Browser } from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { waitForServer } from "./lib/browser-utils.js";

const PROJECT_ROOT = process.cwd();
const PRESET_DIR = path.join(PROJECT_ROOT, "public", "presets", "solo");
const OUT_DIR = path.join(PROJECT_ROOT, "out", "shader-gallery");
const GALLERY_WIDTH = 720;
const GALLERY_HEIGHT = 1280;
const GALLERY_DURATION = 5;
const GALLERY_FPS = 30;
const TOTAL_FRAMES = GALLERY_DURATION * GALLERY_FPS;

fs.mkdirSync(OUT_DIR, { recursive: true });

function rewritePresetForGallery(srcPath: string): string {
  // Modified preset is written to PUBLIC root temporarily so the Vite dev
  // server can load it via /gallery-temp.json. Duration=5s + period=5 are valid.
  const src = JSON.parse(fs.readFileSync(srcPath, "utf-8"));
  src.duration = GALLERY_DURATION;
  src.resolution = [GALLERY_WIDTH, GALLERY_HEIGHT];
  src.fps = GALLERY_FPS;
  for (const layer of src.layers) {
    const anim = layer.animation;
    // Force any .period sub-fields down to a divisor of 5
    const clampPeriod = (p: number) => (p === 5 || p === 1 ? p : 5);
    if (anim.colorCycle) anim.colorCycle.period = clampPeriod(anim.colorCycle.period);
    if (anim.glow) anim.glow.period = clampPeriod(anim.glow.period);
    if (anim.breath) anim.breath.period = clampPeriod(anim.breath.period);
    if (anim.wave) anim.wave.period = clampPeriod(anim.wave.period);
    if (typeof anim.ringPeriod === "number") anim.ringPeriod = clampPeriod(anim.ringPeriod);
  }
  return JSON.stringify(src, null, 2);
}

function startViteServer(port: number): ChildProcess {
  return spawn("npx", ["vite", "--port", String(port)], {
    cwd: PROJECT_ROOT,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function killVite(proc: ChildProcess): Promise<void> {
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => { proc.kill("SIGKILL"); resolve(); }, 2000);
    proc.once("exit", () => { clearTimeout(timeout); resolve(); });
    proc.kill("SIGTERM");
  });
}

function encodeMp4(framesDir: string, outputPath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const args = [
      "-y",
      "-framerate", String(GALLERY_FPS),
      "-i", path.join(framesDir, "frame_%05d.png"),
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      outputPath,
    ];
    const proc = execFile("ffmpeg", args, (err) => {
      if (err) reject(new Error(`ffmpeg failed: ${err.message}`));
      else resolve();
    });
    proc.stderr?.on("data", () => { /* silent */ });
  });
}

async function renderPreset(
  browser: Browser,
  port: number,
  presetFile: string,
  tempScenePath: string,
): Promise<void> {
  const presetId = path.basename(presetFile, ".json");
  const outMp4 = path.join(OUT_DIR, `${presetId}.mp4`);
  const framesDir = path.join(OUT_DIR, `.frames-${presetId}`);
  fs.mkdirSync(framesDir, { recursive: true });

  // Write the gallery-adjusted scene JSON into public/ so vite serves it
  const modified = rewritePresetForGallery(path.join(PRESET_DIR, presetFile));
  fs.writeFileSync(tempScenePath, modified, "utf-8");

  const sceneUrl = "/" + path.basename(tempScenePath);
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: GALLERY_WIDTH, height: GALLERY_HEIGHT });
    await page.goto(
      `http://localhost:${port}/?mode=layered&scene=${sceneUrl}`,
      { waitUntil: "networkidle0" },
    );
    await page.waitForFunction("window.__captureReady === true", { timeout: 15000 });
    await page.evaluate(`window.__startCapture(${GALLERY_FPS})`);

    const t0 = Date.now();
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const dataUrl = (await page.evaluate("window.__captureFrame()")) as string;
      const buf = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ""), "base64");
      fs.writeFileSync(
        path.join(framesDir, `frame_${String(i).padStart(5, "0")}.png`),
        buf,
      );
    }
    const dtCapture = ((Date.now() - t0) / 1000).toFixed(1);

    const tEnc = Date.now();
    await encodeMp4(framesDir, outMp4);
    const dtEncode = ((Date.now() - tEnc) / 1000).toFixed(1);

    const sizeKB = (fs.statSync(outMp4).size / 1024).toFixed(0);
    console.log(`  ✓ ${presetId}.mp4 — ${sizeKB}KB (capture ${dtCapture}s + encode ${dtEncode}s)`);
  } finally {
    await page.close();
    fs.rmSync(framesDir, { recursive: true, force: true });
  }
}

const SKETCH_NAMES = ["volumetric", "cellular", "particles", "fractal-cave"];

// Tier A before/after comparison pairs (AC-4.2 21+ artifact contract)
const TIER_A_DEMO = [
  {
    name: "baseline-pre-A",
    base: "solo/T13-baseline.json",
    overlay: null as Record<string, unknown> | null,
  },
  {
    name: "baseline-post-A",
    base: "solo/T13-baseline.json",
    overlay: {
      multipassFeedback: { strength: 0.7, warp: 0.3, decay: 0.92, hueShift: 0.02 },
      lensDistortion: { barrel: 0.15, chromatic: 1.2, dof: 0.2, vignetteRadius: 0.92 },
    },
  },
  {
    name: "mandala-pre-A",
    base: "shader-dev-mandala-flow.json",
    overlay: null,
  },
  {
    name: "mandala-post-A",
    base: "shader-dev-mandala-flow.json",
    overlay: {
      multipassFeedback: { strength: 0.5, warp: 0.35, decay: 0.95, hueShift: 0 },
      lensDistortion: { barrel: 0.18, chromatic: 1.5, dof: 0, vignetteRadius: 0.9 },
    },
  },
];

async function renderTierADemo(
  browser: Browser,
  port: number,
  tempScenePath: string,
): Promise<void> {
  for (const demo of TIER_A_DEMO) {
    console.log(`[tier-a-demo] ${demo.name}`);
    // demo.base is relative to public/presets/ (not PRESET_DIR which points to solo subdir)
    const basePath = path.join(PROJECT_ROOT, "public", "presets", demo.base);
    const raw = JSON.parse(fs.readFileSync(basePath, "utf-8"));
    const adjusted = rewritePresetForGalleryObject(raw);
    if (demo.overlay) {
      adjusted.effects = { ...(adjusted.effects ?? {}), ...demo.overlay };
    }
    fs.writeFileSync(tempScenePath, JSON.stringify(adjusted, null, 2), "utf-8");

    const outMp4 = path.join(OUT_DIR, `${demo.name}.mp4`);
    const framesDir = path.join(OUT_DIR, `.frames-${demo.name}`);
    fs.mkdirSync(framesDir, { recursive: true });
    const sceneUrl = "/" + path.basename(tempScenePath);

    const page = await browser.newPage();
    try {
      await page.setViewport({ width: GALLERY_WIDTH, height: GALLERY_HEIGHT });
      await page.goto(
        `http://localhost:${port}/?mode=layered&scene=${sceneUrl}`,
        { waitUntil: "networkidle0" },
      );
      await page.waitForFunction("window.__captureReady === true", { timeout: 15000 });
      await page.evaluate(`window.__startCapture(${GALLERY_FPS})`);
      for (let i = 0; i < TOTAL_FRAMES; i++) {
        const dataUrl = (await page.evaluate("window.__captureFrame()")) as string;
        const buf = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ""), "base64");
        fs.writeFileSync(path.join(framesDir, `frame_${String(i).padStart(5, "0")}.png`), buf);
      }
      await encodeMp4(framesDir, outMp4);
      const sizeKB = (fs.statSync(outMp4).size / 1024).toFixed(0);
      console.log(`  ✓ ${demo.name}.mp4 — ${sizeKB}KB`);
    } finally {
      await page.close();
      fs.rmSync(framesDir, { recursive: true, force: true });
    }
  }
}

function rewritePresetForGalleryObject(src: Record<string, unknown>): Record<string, unknown> {
  // Same as rewritePresetForGallery but takes parsed object directly
  const obj = JSON.parse(JSON.stringify(src)) as Record<string, unknown>;
  obj.duration = GALLERY_DURATION;
  obj.resolution = [GALLERY_WIDTH, GALLERY_HEIGHT];
  obj.fps = GALLERY_FPS;
  for (const layer of (obj.layers as Array<Record<string, unknown>>) ?? []) {
    const anim = layer.animation as Record<string, unknown>;
    const clamp = (p: number) => (p === 1 ? 1 : 5);
    if (anim?.colorCycle) (anim.colorCycle as { period: number }).period = clamp((anim.colorCycle as { period: number }).period);
    if (anim?.glow) (anim.glow as { period: number }).period = clamp((anim.glow as { period: number }).period);
    if (anim?.breath) (anim.breath as { period: number }).period = clamp((anim.breath as { period: number }).period);
    if (anim?.wave) (anim.wave as { period: number }).period = clamp((anim.wave as { period: number }).period);
    if (typeof anim?.ringPeriod === "number") anim.ringPeriod = clamp(anim.ringPeriod);
  }
  return obj;
}

async function renderSketch(
  browser: Browser,
  port: number,
  sketch: string,
): Promise<void> {
  // Ticket AC-4.2: filenames must be exactly cellular.mp4/volumetric.mp4/particles.mp4/fractal-cave.mp4
  const outMp4 = path.join(OUT_DIR, `${sketch}.mp4`);
  const framesDir = path.join(OUT_DIR, `.frames-${sketch}`);
  fs.mkdirSync(framesDir, { recursive: true });

  const page = await browser.newPage();
  try {
    await page.setViewport({ width: GALLERY_WIDTH, height: GALLERY_HEIGHT });
    await page.goto(
      `http://localhost:${port}/?sketch=${sketch}`,
      { waitUntil: "networkidle0" },
    );
    await page.waitForFunction("window.__captureReady === true", { timeout: 15000 });
    await page.evaluate(`window.__startCapture(${GALLERY_FPS})`);

    const t0 = Date.now();
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const dataUrl = (await page.evaluate("window.__captureFrame()")) as string;
      const buf = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ""), "base64");
      fs.writeFileSync(
        path.join(framesDir, `frame_${String(i).padStart(5, "0")}.png`),
        buf,
      );
    }
    const dtCapture = ((Date.now() - t0) / 1000).toFixed(1);

    const tEnc = Date.now();
    await encodeMp4(framesDir, outMp4);
    const dtEncode = ((Date.now() - tEnc) / 1000).toFixed(1);

    const sizeKB = (fs.statSync(outMp4).size / 1024).toFixed(0);
    console.log(`  ✓ ${sketch}.mp4 — ${sizeKB}KB (capture ${dtCapture}s + encode ${dtEncode}s)`);
  } finally {
    await page.close();
    fs.rmSync(framesDir, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const sketchOnly = process.argv.includes("--sketches-only");
  const tierADemoOnly = process.argv.includes("--tier-a-demo");
  const skipTierADemo = process.argv.includes("--no-demo");
  const presets = sketchOnly ? [] : fs
    .readdirSync(PRESET_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  console.log(`shader-dev gallery render: ${presets.length} presets + ${SKETCH_NAMES.length} sketches`);
  console.log(`Resolution: ${GALLERY_WIDTH}x${GALLERY_HEIGHT}, ${GALLERY_DURATION}s @ ${GALLERY_FPS}fps`);
  console.log(`Output: ${path.relative(PROJECT_ROOT, OUT_DIR)}/\n`);

  const port = 5299;
  const tempScenePath = path.join(PROJECT_ROOT, "public", "gallery-temp.json");
  const viteProc = startViteServer(port);
  process.on("exit", () => { viteProc.kill(); });

  let browser: Browser | null = null;
  try {
    await waitForServer(`http://localhost:${port}`);
    console.log("Vite ready\n");

    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--use-gl=angle",
        "--enable-gpu-rasterization",
        "--enable-webgl",
        "--ignore-gpu-blocklist",
      ],
    });

    const t0 = Date.now();
    if (tierADemoOnly) {
      await renderTierADemo(browser, port, tempScenePath);
    } else {
      // Layered presets
      for (let i = 0; i < presets.length; i++) {
        const preset = presets[i];
        console.log(`[layered ${i + 1}/${presets.length}] ${preset}`);
        try {
          await renderPreset(browser, port, preset, tempScenePath);
        } catch (err) {
          console.error(`  ✗ ${preset} failed:`, err instanceof Error ? err.message : err);
        }
      }
      // Sketch modes (Tier B/C)
      for (let i = 0; i < SKETCH_NAMES.length; i++) {
        const sketch = SKETCH_NAMES[i];
        console.log(`[sketch ${i + 1}/${SKETCH_NAMES.length}] ${sketch}`);
        try {
          await renderSketch(browser, port, sketch);
        } catch (err) {
          console.error(`  ✗ ${sketch} failed:`, err instanceof Error ? err.message : err);
        }
      }
      // Tier A before/after demo pairs (unless skipped)
      if (!sketchOnly && !skipTierADemo) {
        await renderTierADemo(browser, port, tempScenePath);
      }
    }
    const totalMin = ((Date.now() - t0) / 60000).toFixed(1);
    console.log(`\nAll done in ${totalMin} min.`);
    console.log(`Gallery: ${path.relative(PROJECT_ROOT, OUT_DIR)}/`);
  } finally {
    await browser?.close().catch(() => {});
    await killVite(viteProc);
    if (fs.existsSync(tempScenePath)) fs.unlinkSync(tempScenePath);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
