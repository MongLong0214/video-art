import "dotenv/config";
import puppeteer, { type Browser } from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { execFile, type ChildProcess } from "node:child_process";
import { checkFfmpeg } from "./lib/check-deps.js";
import {
  parseTitle,
  createRunContext,
  snapshotLayers,
} from "./lib/archive.js";
import { findAvailablePort } from "./lib/work-dir.js";

import { sceneSchema } from "../src/lib/scene-schema.js";

import { waitForServer } from "./lib/browser-utils.js";

const ALLOWED_PRESETS = new Set(["ultrafast","superfast","veryfast","faster","fast","medium","slow","slower","veryslow"]);
const PRESET = ALLOWED_PRESETS.has(process.env.RESEARCH_PRESET ?? "") ? process.env.RESEARCH_PRESET! : "veryslow";

function startViteServer(port: number, projectRoot: string, workDir?: string): ChildProcess {
  const env = { ...process.env };
  if (workDir) env.VITE_PUBLIC_DIR = workDir;
  return execFile("npx", ["vite", "--port", String(port)], { cwd: projectRoot, env }) as unknown as ChildProcess;
}

async function killViteGracefully(proc: ChildProcess): Promise<void> {
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      proc.kill("SIGKILL");
      resolve();
    }, 2000);
    proc.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
    proc.kill("SIGTERM");
  });
}

async function captureFrames(outputDir: string, totalFrames: number, resolution: [number, number], fps: number, workDir?: string): Promise<void> {
  const port = workDir ? await findAvailablePort() : 5299;
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`Starting Vite dev server (port ${port})...`);
  const viteProcess = startViteServer(port, process.cwd(), workDir);
  let browser: Browser | null = null;

  const killVite = () => { viteProcess.kill(); };
  process.on("exit", killVite);

  try {
    await waitForServer(`http://localhost:${port}`);
    console.log("Server ready.");

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--use-gl=angle", "--disable-gpu-compositing"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: resolution[0], height: resolution[1] });
    await page.goto(`http://localhost:${port}/?mode=layered`, {
      waitUntil: "networkidle0",
    });

    await page.waitForFunction("window.__captureReady === true", {
      timeout: 15000,
    });

    console.log(`Starting capture: ${totalFrames} frames @ ${fps}fps...`);
    await page.evaluate(`window.__startCapture(${fps})`);

    for (let i = 0; i < totalFrames; i++) {
      const dataUrl = (await page.evaluate(
        "window.__captureFrame()",
      )) as string;

      const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
      const buf = Buffer.from(base64, "base64");
      const framePath = path.join(
        outputDir,
        `frame_${String(i).padStart(5, "0")}.png`,
      );
      fs.writeFileSync(framePath, buf);

      if ((i + 1) % 30 === 0 || i === totalFrames - 1) {
        const pct = (((i + 1) / totalFrames) * 100).toFixed(0);
        process.stdout.write(`\r  ${i + 1}/${totalFrames} frames (${pct}%)`);
      }
    }

    console.log("\nCapture complete.");
  } finally {
    await browser?.close().catch(() => {});
    await killViteGracefully(viteProcess);
    process.removeListener("exit", killVite);
  }
}

interface EncodeOptions {
  fps: number;
  duration: number;
  prores: boolean;
}

function encodeVideo(inputFramesDir: string, outputPath: string, options: EncodeOptions): Promise<void> {
  const { fps, duration, prores } = options;
  const rawCrf = parseInt(process.env.RESEARCH_CRF ?? "", 10);
  const CRF = Number.isFinite(rawCrf) && rawCrf >= 0 && rawCrf <= 51 ? rawCrf : 15;
  const PIX_FMT = process.env.RESEARCH_PIX_FMT === "yuv444p" ? "yuv444p" : "yuv420p";

  const ffmpegArgs = prores
    ? [
        "-y",
        "-framerate", String(fps),
        "-i", path.join(inputFramesDir, "frame_%05d.png"),
        "-c:v", "prores_ks",
        "-profile:v", "4",
        "-pix_fmt", "yuva444p10le",
        outputPath,
      ]
    : [
        "-y",
        "-framerate", String(fps),
        "-i", path.join(inputFramesDir, "frame_%05d.png"),
        "-c:v", "libx264",
        "-pix_fmt", PIX_FMT,
        "-crf", String(CRF),
        "-preset", PRESET,
        "-movflags", "+faststart",
        outputPath,
      ];

  return new Promise<void>((resolve, reject) => {
    console.log(`Encoding: ${path.basename(outputPath)}${prores ? " (ProRes 4444)" : ""}`);
    const proc = execFile("ffmpeg", ffmpegArgs, (err) => {
      if (err) reject(new Error(`ffmpeg failed: ${err.message}`));
      else resolve();
    });
    proc.stderr?.on("data", (d: string) => {
      if (d.includes("frame=")) process.stdout.write(`\r  ${d.trim()}`);
    });
  }).then(() => {
    const stat = fs.statSync(outputPath);
    const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);
    const bitrateMbps = duration > 0 ? ((stat.size * 8) / (duration * 1_000_000)).toFixed(2) : "N/A";
    console.log(`\nOutput: ${outputPath}`);
    console.log(`Size: ${sizeMB}MB, Bitrate: ${bitrateMbps} Mbps`);
  });
}

async function main() {
  const keepFrames = process.argv.includes("--keep-frames");
  const proresFlag = process.argv.includes("--prores");
  const title = parseTitle(process.argv.slice(2));

  // Parse --fps from CLI
  let cliFps: number | undefined;
  const fpsIdx = process.argv.indexOf("--fps");
  if (fpsIdx !== -1 && fpsIdx + 1 < process.argv.length) {
    const val = parseInt(process.argv[fpsIdx + 1], 10);
    if (Number.isFinite(val) && val >= 1 && val <= 120) cliFps = val;
  }

  // Parse --work-dir from CLI
  let workDir: string | undefined;
  const wdIdx = process.argv.indexOf("--work-dir");
  if (wdIdx !== -1 && wdIdx + 1 < process.argv.length) {
    workDir = process.argv[wdIdx + 1];
  }

  // Parse --archive-dir from CLI (reuse existing archive dir from publish.ts)
  let archiveDirOverride: string | undefined;
  const adIdx = process.argv.indexOf("--archive-dir");
  if (adIdx !== -1 && adIdx + 1 < process.argv.length) {
    archiveDirOverride = process.argv[adIdx + 1];
  }

  checkFfmpeg();

  const projectRoot = process.cwd();
  const ctx = createRunContext(projectRoot, title, "layered", archiveDirOverride);

  // Load duration from scene.json (from workDir or public/)
  const sourceDir = workDir || path.join(projectRoot, "public");
  const scenePath = path.join(sourceDir, "scene.json");
  if (!fs.existsSync(scenePath)) {
    throw new Error(`scene.json not found at ${scenePath}. Run pipeline-pro first.`);
  }
  const sceneJson = JSON.parse(fs.readFileSync(scenePath, "utf-8"));
  const config = sceneSchema.parse(sceneJson);
  const DURATION = config.duration;

  // FPS priority: CLI --fps > scene.json fps (default 60)
  const FPS = cliFps ?? config.fps;
  const totalFrames = FPS * DURATION;

  const ext = proresFlag ? ".mov" : ".mp4";
  const outputPath = path.join(ctx.archiveDir, `${title}${ext}`);

  const [resW, resH] = config.resolution;
  console.log(`Title: ${title}`);
  console.log(`Archive: ${path.relative(projectRoot, ctx.archiveDir)}/`);
  console.log(`Resolution: ${resW}x${resH}`);
  console.log(`Duration: ${DURATION}s, ${totalFrames} frames @ ${FPS}fps${proresFlag ? " (ProRes 4444)" : ""}`);

  const estimatedMB = (totalFrames * 4.5).toFixed(0);
  console.log(`Estimated disk usage: ~${estimatedMB}MB for ${totalFrames} frames`);

  try {
    await captureFrames(ctx.paths.frames, totalFrames, config.resolution, FPS, workDir);
    await encodeVideo(ctx.paths.frames, outputPath, { fps: FPS, duration: DURATION, prores: proresFlag });
  } catch (err) {
    ctx.cleanup();
    throw err;
  }

  // Snapshot layers + scene.json into archive
  snapshotLayers(sourceDir, ctx.archiveDir);

  if (keepFrames) {
    ctx.skipCleanup();
    console.log(`\nFrames kept at: ${ctx.paths.frames}`);
  }

  console.log(`\nOutput: ${path.relative(projectRoot, outputPath)}`);
  const stats = fs.statSync(outputPath);
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(1)}MB`);

  if (!keepFrames) ctx.cleanup();

  const files = fs.readdirSync(ctx.archiveDir, { recursive: true }) as string[];
  console.log(`\nArchive contents:`);
  for (const f of files) {
    console.log(`  ${f}`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});