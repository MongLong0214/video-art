// Pipeline Runner — Full pipeline orchestrator for autoresearch
// layers decomposition → Vite + Puppeteer capture → ffmpeg encode → video.mp4
// Deterministic output path: .cache/research/current/video.mp4

import { execFileSync, exec, execFile, type ChildProcess } from "child_process";
import fs from "node:fs";
import path from "node:path";
import puppeteer, { type Browser } from "puppeteer";
import { sceneSchema } from "../../src/lib/scene-schema.js";
import { waitForServer } from "../lib/browser-utils.js";

const RESEARCH_DIR = ".cache/research/current";
const RESEARCH_FRAMES_DIR = `${RESEARCH_DIR}/frames`;
const RESEARCH_VIDEO_PATH = `${RESEARCH_DIR}/video.mp4`;
const RESEARCH_MANIFEST_GLOB = "out/layered";
const VITE_PORT = 5298;
const FPS = 60;

export interface PipelineResult {
  videoPath: string;
  manifestPath: string;
  elapsedMs: number;
}

// ── Step 1: Layer Decomposition ─────────────────────────────

function runLayerDecomposition(
  inputPath: string,
  cwd: string,
  config?: Record<string, unknown>,
): string {
  const args = ["tsx", "scripts/pipeline-layers.ts", inputPath];

  if (config?.method) args.push("--variant", String(config.method));
  if (config?.numLayers) args.push("--layers", String(config.numLayers));

  const output = execFileSync("npx", args, {
    cwd,
    encoding: "utf-8",
    timeout: 300_000,
    stdio: ["pipe", "pipe", "pipe"],
  });

  // Extract archive dir from output for manifest lookup
  const archiveMatch = output.match(/Archive:\s*(.+)/);
  return archiveMatch?.[1]?.trim() ?? "";
}

// ── Step 2: Vite + Puppeteer Capture + ffmpeg Encode ────────

function startVite(cwd: string): ChildProcess {
  return exec(`npx vite --port ${VITE_PORT}`, { cwd });
}

async function captureAndEncode(cwd: string): Promise<string> {
  // Read scene config
  const scenePath = path.join(cwd, "public/scene.json");
  if (!fs.existsSync(scenePath)) {
    throw new Error("public/scene.json not found after pipeline-layers");
  }
  const sceneJson = JSON.parse(fs.readFileSync(scenePath, "utf-8"));
  const config = sceneSchema.parse(sceneJson);
  const duration = config.duration;
  const totalFrames = FPS * duration;
  const [width, height] = config.resolution;

  // Prepare output dirs
  const framesDir = path.join(cwd, RESEARCH_FRAMES_DIR);
  fs.mkdirSync(framesDir, { recursive: true });

  // Start Vite
  const viteProcess = startVite(cwd);
  const killVite = () => {
    try { viteProcess.kill(); } catch { /* already dead */ }
  };
  process.on("exit", killVite);

  let browser: Browser | null = null;

  try {
    await waitForServer(`http://localhost:${VITE_PORT}`);

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--use-gl=angle", "--disable-gpu-compositing"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.goto(`http://localhost:${VITE_PORT}/?mode=layered`, {
      waitUntil: "networkidle0",
    });

    await page.waitForFunction("window.__captureReady === true", {
      timeout: 15000,
    });

    await page.evaluate(`window.__startCapture(${FPS})`);

    for (let i = 0; i < totalFrames; i++) {
      const dataUrl = (await page.evaluate("window.__captureFrame()")) as string;
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync(
        path.join(framesDir, `frame_${String(i).padStart(5, "0")}.png`),
        Buffer.from(base64, "base64"),
      );

      if ((i + 1) % 60 === 0 || i === totalFrames - 1) {
        const pct = (((i + 1) / totalFrames) * 100).toFixed(0);
        process.stdout.write(`\r  capture: ${i + 1}/${totalFrames} (${pct}%)`);
      }
    }
    console.log(""); // newline after progress
  } finally {
    await browser?.close().catch(() => {});
    killVite();
    process.removeListener("exit", killVite);
  }

  // Encode with ffmpeg
  const outputPath = path.join(cwd, RESEARCH_VIDEO_PATH);
  await new Promise<void>((resolve, reject) => {
    execFile("ffmpeg", [
      "-y",
      "-framerate", String(FPS),
      "-i", path.join(framesDir, "frame_%05d.png"),
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-crf", "18",
      "-preset", "fast",
      "-movflags", "+faststart",
      outputPath,
    ], (err) => {
      if (err) reject(new Error(`ffmpeg encode failed: ${err.message}`));
      else resolve();
    });
  });

  // Cleanup frames
  fs.rmSync(framesDir, { recursive: true, force: true });

  return outputPath;
}

// ── Step 3: Find Manifest ───────────────────────────────────

function findManifest(archiveDir: string): string {
  if (!archiveDir) return "";
  const manifestPath = path.join(archiveDir, "decomposition-manifest.json");
  return fs.existsSync(manifestPath) ? manifestPath : "";
}

// ── Public API ──────────────────────────────────────────────

export async function runFullPipeline(
  cwd: string,
  inputPath: string,
  config?: Record<string, unknown>,
): Promise<PipelineResult> {
  const startMs = Date.now();

  // Ensure research output dir exists
  fs.mkdirSync(path.join(cwd, RESEARCH_DIR), { recursive: true });

  // Step 1: Layer decomposition (Replicate API → scene.json + layers)
  console.log("  [pipeline] Layer decomposition...");
  const archiveDir = runLayerDecomposition(inputPath, cwd, config);

  // Step 2: Video export (Vite + Puppeteer + ffmpeg)
  console.log("  [pipeline] Video capture + encode...");
  const videoPath = await captureAndEncode(cwd);

  // Step 3: Locate manifest
  const manifestPath = findManifest(archiveDir);

  const elapsedMs = Date.now() - startMs;
  console.log(`  [pipeline] Complete: ${videoPath} (${(elapsedMs / 1000).toFixed(1)}s)`);

  return { videoPath, manifestPath, elapsedMs };
}

// ── Input Image Resolution ──────────────────────────────────

export function resolveInputImagePath(cwd: string): string {
  // Priority: input.png at project root
  const inputPng = path.join(cwd, "input.png");
  if (fs.existsSync(inputPng)) return "input.png";

  // Fallback: any .png in project root (excluding source outputs)
  const rootFiles = fs.readdirSync(cwd).filter(
    (f) => f.endsWith(".png") && !f.startsWith(".") && f !== "favicon.png",
  );
  if (rootFiles.length === 1) return rootFiles[0];

  throw new Error(
    "No input image found. Place input.png at the project root.",
  );
}
