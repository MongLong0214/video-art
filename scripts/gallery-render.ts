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
const GALLERY_HEIGHT = 720;
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

async function main(): Promise<void> {
  const presets = fs
    .readdirSync(PRESET_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  console.log(`shader-dev gallery render: ${presets.length} presets`);
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
    for (let i = 0; i < presets.length; i++) {
      const preset = presets[i];
      console.log(`[${i + 1}/${presets.length}] ${preset}`);
      try {
        await renderPreset(browser, port, preset, tempScenePath);
      } catch (err) {
        console.error(`  ✗ ${preset} failed:`, err instanceof Error ? err.message : err);
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
