import "dotenv/config";
import puppeteer, { type Browser } from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { exec, execFile, type ChildProcess } from "node:child_process";
import { checkFfmpeg } from "./lib/check-deps.js";
import {
  parseTitle,
  createRunContext,
  snapshotLayers,
} from "./lib/archive.js";

import { sceneSchema } from "../src/lib/scene-schema.js";

const FPS = 60;

async function waitForServer(url: string, maxWait = 20000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not ready
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not start within ${maxWait}ms`);
}

function startViteServer(port: number): ChildProcess {
  return exec(`npx vite --port ${port}`, { cwd: process.cwd() });
}

async function captureFrames(outputDir: string, totalFrames: number, resolution: [number, number]): Promise<void> {
  const TOTAL_FRAMES = totalFrames;
  const port = 5299;
  fs.mkdirSync(outputDir, { recursive: true });

  console.log("Starting Vite dev server...");
  const viteProcess = startViteServer(port);
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

    console.log(`Starting capture: ${TOTAL_FRAMES} frames @ ${FPS}fps...`);
    await page.evaluate(`window.__startCapture(${FPS})`);

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

function encodeVideo(inputFramesDir: string, outputPath: string): Promise<void> {
  const ffmpegArgs = [
    "-y",
    "-framerate", String(FPS),
    "-i", path.join(inputFramesDir, "frame_%05d.png"),
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-b:v", "15M",
    "-preset", "slow",
    "-movflags", "+faststart",
    outputPath,
  ];

  return new Promise((resolve, reject) => {
    console.log(`Encoding: ${path.basename(outputPath)}`);
    const proc = execFile("ffmpeg", ffmpegArgs, (err) => {
      if (err) reject(new Error(`ffmpeg failed: ${err.message}`));
      else resolve();
    });
    proc.stderr?.on("data", (d: string) => {
      if (d.includes("frame=")) process.stdout.write(`\r  ${d.trim()}`);
    });
  });
}

async function main() {
  const keepFrames = process.argv.includes("--keep-frames");
  const title = parseTitle(process.argv.slice(2));

  checkFfmpeg();

  const projectRoot = process.cwd();
  const ctx = createRunContext(projectRoot, title, "layered");
  const outputPath = path.join(ctx.archiveDir, `${title}.mp4`);

  // Load duration from scene.json
  const scenePath = path.join(projectRoot, "public", "scene.json");
  if (!fs.existsSync(scenePath)) {
    throw new Error("public/scene.json not found. Run pipeline:layers first.");
  }
  const sceneJson = JSON.parse(fs.readFileSync(scenePath, "utf-8"));
  const config = sceneSchema.parse(sceneJson);
  const DURATION = config.duration;
  const TOTAL_FRAMES = FPS * DURATION;

  const [resW, resH] = config.resolution;
  console.log(`Title: ${title}`);
  console.log(`Archive: ${path.relative(projectRoot, ctx.archiveDir)}/`);
  console.log(`Resolution: ${resW}x${resH}`);
  console.log(`Duration: ${DURATION}s, ${TOTAL_FRAMES} frames @ ${FPS}fps`);

  const estimatedMB = (TOTAL_FRAMES * 4.5).toFixed(0);
  console.log(`Estimated disk usage: ~${estimatedMB}MB for ${TOTAL_FRAMES} frames`);

  await captureFrames(ctx.paths.frames, TOTAL_FRAMES, config.resolution);
  await encodeVideo(ctx.paths.frames, outputPath);

  // Snapshot layers + scene.json into archive
  snapshotLayers(projectRoot, ctx.archiveDir);

  if (keepFrames) {
    ctx.skipCleanup();
    console.log(`\nFrames kept at: ${ctx.paths.frames}`);
  }

  console.log(`\nOutput: ${path.relative(projectRoot, outputPath)}`);
  const stats = fs.statSync(outputPath);
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(1)}MB`);

  // Cleanup _work/ before listing (unless --keep-frames)
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