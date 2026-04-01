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

import { sceneSchema } from "../src/lib/scene-schema.js";

import { waitForServer } from "./lib/browser-utils.js";

const ALLOWED_PRESETS = new Set(["ultrafast","superfast","veryfast","faster","fast","medium","slow","slower","veryslow"]);
const PRESET = ALLOWED_PRESETS.has(process.env.RESEARCH_PRESET ?? "") ? process.env.RESEARCH_PRESET! : "veryslow";

function startViteServer(port: number, projectRoot: string): ChildProcess {
  return execFile("npx", ["vite", "--port", String(port)], { cwd: projectRoot }) as unknown as ChildProcess;
}

async function captureFrames(outputDir: string, totalFrames: number, resolution: [number, number], fps: number): Promise<void> {
  const TOTAL_FRAMES = totalFrames;
  const port = 5299;
  fs.mkdirSync(outputDir, { recursive: true });

  console.log("Starting Vite dev server...");
  const viteProcess = startViteServer(port, process.cwd());
  let browser: Browser | null = null;

  // Ensure vite is killed on any exit (SIGINT → RunContext → process.exit → 'exit' event)
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

    console.log(`Starting capture: ${TOTAL_FRAMES} frames @ ${fps}fps...`);
    await page.evaluate(`window.__startCapture(${fps})`);

    for (let i = 0; i < TOTAL_FRAMES; i++) {
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

      if ((i + 1) % 30 === 0 || i === TOTAL_FRAMES - 1) {
        const pct = (((i + 1) / TOTAL_FRAMES) * 100).toFixed(0);
        process.stdout.write(`\r  ${i + 1}/${TOTAL_FRAMES} frames (${pct}%)`);
      }
    }

    console.log("\nCapture complete.");
  } finally {
    await browser?.close().catch(() => {});
    viteProcess.kill();
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

  checkFfmpeg();

  const projectRoot = process.cwd();
  const ctx = createRunContext(projectRoot, title, "layered");

  // Load duration from scene.json
  const scenePath = path.join(projectRoot, "public", "scene.json");
  if (!fs.existsSync(scenePath)) {
    throw new Error("public/scene.json not found. Run pipeline:layers first.");
  }
  const sceneJson = JSON.parse(fs.readFileSync(scenePath, "utf-8"));
  const config = sceneSchema.parse(sceneJson);
  const DURATION = config.duration;

  // FPS priority: CLI --fps > scene.json fps (always present via Zod default 30)
  const FPS = cliFps ?? config.fps;
  const TOTAL_FRAMES = FPS * DURATION;

  const ext = proresFlag ? ".mov" : ".mp4";
  const outputPath = path.join(ctx.archiveDir, `${title}${ext}`);

  const [resW, resH] = config.resolution;
  console.log(`Title: ${title}`);
  console.log(`Archive: ${path.relative(projectRoot, ctx.archiveDir)}/`);
  console.log(`Resolution: ${resW}x${resH}`);
  console.log(`Duration: ${DURATION}s, ${TOTAL_FRAMES} frames @ ${FPS}fps${proresFlag ? " (ProRes 4444)" : ""}`);

  const estimatedMB = (TOTAL_FRAMES * 4.5).toFixed(0);
  console.log(`Estimated disk usage: ~${estimatedMB}MB for ${TOTAL_FRAMES} frames`);

  try {
    await captureFrames(ctx.paths.frames, TOTAL_FRAMES, config.resolution, FPS);
    await encodeVideo(ctx.paths.frames, outputPath, { fps: FPS, duration: DURATION, prores: proresFlag });
  } catch (err) {
    ctx.cleanup();
    throw err;
  }

  // Snapshot layers + scene.json into archive
  snapshotLayers(projectRoot, ctx.archiveDir);

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