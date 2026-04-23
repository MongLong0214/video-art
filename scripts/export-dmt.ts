import "dotenv/config";
import puppeteer, { type Browser } from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { execFile, type ChildProcess } from "node:child_process";
import { checkFfmpeg } from "./lib/check-deps.js";
import { parseTitle, createRunContext } from "./lib/archive.js";
import { findAvailablePort } from "./lib/work-dir.js";
import { waitForServer } from "./lib/browser-utils.js";

import { DEFAULT_DMT_CONFIG, type DmtConfig } from "../src/sketches/dmt-config.js";

function startViteServer(port: number, projectRoot: string): ChildProcess {
  return execFile("npx", ["vite", "--port", String(port)], { cwd: projectRoot }) as unknown as ChildProcess;
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

async function captureFrames(
  outputDir: string,
  totalFrames: number,
  resolution: [number, number],
  fps: number,
  configPath: string,
): Promise<void> {
  const port = await findAvailablePort();
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`Starting Vite dev server (port ${port})...`);
  const viteProcess = startViteServer(port, process.cwd());
  let browser: Browser | null = null;

  const killVite = () => { viteProcess.kill(); };
  process.on("exit", killVite);

  try {
    await waitForServer(`http://localhost:${port}`);
    console.log("Server ready.");

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

    const page = await browser.newPage();
    await page.setViewport({ width: resolution[0], height: resolution[1] });
    // config is served from /public, pass via query param
    const configQuery = encodeURIComponent(configPath);
    await page.goto(`http://localhost:${port}/?mode=dmt&dmt=${configQuery}`, {
      waitUntil: "networkidle0",
    });

    await page.waitForFunction("window.__captureReady === true", { timeout: 15000 });

    console.log(`Starting capture: ${totalFrames} frames @ ${fps}fps...`);
    await page.evaluate(`window.__startCapture(${fps})`);

    for (let i = 0; i < totalFrames; i++) {
      const dataUrl = (await page.evaluate("window.__captureFrame()")) as string;
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
      const buf = Buffer.from(base64, "base64");
      const framePath = path.join(outputDir, `frame_${String(i).padStart(5, "0")}.png`);
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

async function encodeVideo(
  inputFramesDir: string,
  outputPath: string,
  fps: number,
): Promise<void> {
  const args = [
    "-y",
    "-framerate", String(fps),
    "-i", path.join(inputFramesDir, "frame_%05d.png"),
    "-r", "30",
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "15",
    "-profile:v", "high",
    "-level:v", "4.0",
    "-pix_fmt", "yuv420p",
    "-g", "60",
    "-maxrate", "20M",
    "-bufsize", "40M",
    "-color_range", "tv",
    "-colorspace", "bt709",
    "-color_primaries", "bt709",
    "-color_trc", "iec61966-2-1",
    "-movflags", "+faststart",
    outputPath,
  ];

  await new Promise<void>((resolve, reject) => {
    console.log(`Encoding: ${path.basename(outputPath)}`);
    const proc = execFile("ffmpeg", args, (err) => {
      if (err) reject(new Error(`ffmpeg failed: ${err.message}`));
      else resolve();
    });
    proc.stderr?.on("data", (d: string) => {
      if (d.includes("frame=")) process.stdout.write(`\r  ${d.trim()}`);
    });
  });
  const stat = fs.statSync(outputPath);
  console.log(`\nOutput: ${outputPath} (${(stat.size / 1048576).toFixed(1)}MB)`);
}

async function main() {
  const title = parseTitle(process.argv.slice(2));

  let cliFps: number | undefined;
  const fpsIdx = process.argv.indexOf("--fps");
  if (fpsIdx !== -1 && fpsIdx + 1 < process.argv.length) {
    const val = parseInt(process.argv[fpsIdx + 1], 10);
    if (Number.isFinite(val) && val >= 1 && val <= 120) cliFps = val;
  }

  // --variant a|b|c|d → selects public/dmt-config-{v}.json
  let variant = "a";
  const vIdx = process.argv.indexOf("--variant");
  if (vIdx !== -1 && vIdx + 1 < process.argv.length) {
    variant = process.argv[vIdx + 1];
  }

  checkFfmpeg();

  const projectRoot = process.cwd();
  const configPath = `/dmt-config-${variant}.json`;
  const configFsPath = path.join(projectRoot, "public", `dmt-config-${variant}.json`);
  if (!fs.existsSync(configFsPath)) {
    throw new Error(`DMT config not found: ${configFsPath}`);
  }
  const remoteCfg = JSON.parse(fs.readFileSync(configFsPath, "utf-8")) as Partial<DmtConfig>;
  const config: DmtConfig = { ...DEFAULT_DMT_CONFIG, ...remoteCfg };

  const ctx = createRunContext(projectRoot, title, "dmt");

  const DURATION = config.duration;
  const FPS = cliFps ?? config.fps;
  const totalFrames = FPS * DURATION;
  const outputPath = path.join(ctx.archiveDir, `${title}.mp4`);

  const [resW, resH] = config.resolution;
  console.log(`Title: ${title}, Variant: ${variant}`);
  console.log(`Archive: ${path.relative(projectRoot, ctx.archiveDir)}/`);
  console.log(`Resolution: ${resW}x${resH}, ${totalFrames} frames @ ${FPS}fps`);

  try {
    await captureFrames(ctx.paths.frames, totalFrames, config.resolution, FPS, configPath);
    await encodeVideo(ctx.paths.frames, outputPath, FPS);
  } catch (err) {
    ctx.cleanup();
    throw err;
  }

  // snapshot config
  fs.copyFileSync(configFsPath, path.join(ctx.archiveDir, `dmt-config-${variant}.json`));

  console.log(`\nOutput: ${path.relative(projectRoot, outputPath)}`);
  ctx.cleanup();
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
