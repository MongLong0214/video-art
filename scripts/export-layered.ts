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

import { sceneSchema, type SceneConfig } from "../src/lib/scene-schema.js";

import { waitForServer } from "./lib/browser-utils.js";
import { assertPsychedelicFullRenderGate } from "./lib/psychedelic-final-guard.js";
import { enforceSessionGrade } from "./lib/session-grade.js";
import {
  assertRegionAffinityAuthorityAudit,
  sceneUsesRegionAffinity,
} from "./lib/region-affinity-authority-audit.js";

const FEEDBACK_WARMUP_SECONDS = 2;
// --sketch: language-grid tile after 다 별로 / 창의적으로. Half-res, 12fps, first 6s.
// First Isaac-facing look is --preview, not a sketch grid (00 §2, r350).
const SKETCH_SECONDS = 6;
const SKETCH_FPS = 12;
const SKETCH_SCALE = 0.5;

type CaptureFrameOptions = {
  readonly outputDir: string;
  readonly totalFrames: number;
  readonly resolution: [number, number];
  readonly fps: number;
  readonly warmupFrames: number;
  readonly resScale: number;
  readonly workDir?: string;
};

function evenCeil(value: number): number {
  return Math.max(2, Math.ceil(value / 2) * 2);
}

function computePreviewResolution(resolution: readonly [number, number], scale = 0.5): [number, number] {
  return [evenCeil(resolution[0] * scale), evenCeil(resolution[1] * scale)];
}

function parseWarmupFrames(argv: readonly string[]): number | undefined {
  const warmupIdx = argv.indexOf("--warmup-frames");
  if (warmupIdx === -1) return undefined;
  const raw = argv[warmupIdx + 1];
  if (!raw || raw.startsWith("--")) throw new Error("expected frame count after --warmup-frames");
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) throw new Error("--warmup-frames must be a non-negative integer");
  return value;
}

function sceneNeedsFeedbackWarmup(config: SceneConfig): boolean {
  return config.effects.trails.strength > 0 ||
    config.effects.multipassFeedback.strength > 0 ||
    config.effects.multipassFeedback.reactionDiffusionAmount > 0;
}

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

async function captureFrames(options: CaptureFrameOptions): Promise<void> {
  const { outputDir, totalFrames, resolution, fps, warmupFrames, resScale, workDir } = options;
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
      protocolTimeout: 120000,
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
    const toneMapParam = process.argv.includes("--tonemap")
      ? `&tonemap=${process.argv[process.argv.indexOf("--tonemap") + 1]}`
      : "";
    const resScaleParam = resScale === 1 ? "" : `&resScale=${resScale}`;
    // Work-directory scenes are edited between preview passes. Give their JSON a
    // unique URL so a renderer process cannot reuse a prior pass's scene asset.
    const sceneRevisionParam = workDir
      ? `&scene=${encodeURIComponent(`/scene.json?rev=${Date.now()}`)}`
      : "";
    await page.goto(`http://localhost:${port}/?mode=layered${toneMapParam}${resScaleParam}${sceneRevisionParam}`, {
      waitUntil: "networkidle0",
    });

    await page.waitForFunction("window.__captureReady === true", {
      timeout: 15000,
    });

    console.log(`Starting capture: ${totalFrames} frames @ ${fps}fps...`);
    await page.evaluate(`window.__startCapture(${fps})`);

    if (warmupFrames > 0) {
      const warmupStartFrame = Math.max(0, totalFrames - warmupFrames);
      console.log(`Feedback warmup: ${warmupFrames} frames (${warmupStartFrame}..${totalFrames - 1})`);
      await page.evaluate(`window.__seekFrame(${warmupStartFrame})`);
      for (let i = 0; i < warmupFrames; i++) {
        await page.evaluate("window.__captureFrame()");
        if ((i + 1) % 30 === 0 || i === warmupFrames - 1) {
          process.stdout.write(`\r  warmup ${i + 1}/${warmupFrames}`);
        }
      }
      await page.evaluate("window.__seekFrame(0)");
      console.log("\nWarmup complete; capture starts at frame 0.");
    }

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
  preview: boolean;
  fullRes: boolean;
}

function encodeVideo(inputFramesDir: string, outputPath: string, options: EncodeOptions): Promise<void> {
  const { fps, duration, prores, preview, fullRes } = options;
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
    : preview
      ? [
          "-y",
          "-framerate", String(fps),
          "-i", path.join(inputFramesDir, "frame_%05d.png"),
          "-r", String(fps),
          "-c:v", "libx264",
          "-preset", "veryfast",
          "-crf", "23",
          "-profile:v", "high",
          "-pix_fmt", "yuv420p",
          "-g", String(fps * 2),
          "-movflags", "+faststart",
          outputPath,
        ]
    : fullRes
      ? [
          "-y",
          "-framerate", String(fps),
          "-i", path.join(inputFramesDir, "frame_%05d.png"),
          // yuv420p requires even width/height — odd source dims (e.g. 1121) fail libx264
          "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos:in_range=full:in_color_matrix=bt709:out_range=tv:out_color_matrix=bt709",
          "-r", "30",
          "-c:v", "libx264",
          "-preset", "slow",
          "-crf", "15",
          "-profile:v", "high",
          "-level:v", "5.1",
          "-pix_fmt", "yuv420p",
          "-g", "60",
          "-maxrate", "36M",
          "-bufsize", "72M",
          "-color_range", "tv",
          "-colorspace", "bt709",
          "-color_primaries", "bt709",
          "-color_trc", "iec61966-2-1",
          "-x264-params", "aq-mode=3:aq-strength=0.8",
          "-movflags", "+faststart",
          outputPath,
        ]
    : [
        "-y",
        "-framerate", String(fps),
        "-i", path.join(inputFramesDir, "frame_%05d.png"),
        "-vf", "scale=1080:1920:flags=lanczos:force_original_aspect_ratio=increase:in_range=full:in_color_matrix=bt709:out_range=tv:out_color_matrix=bt709,crop=1080:1920",
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
        "-x264-params", "aq-mode=3:aq-strength=0.8",
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
  const sketch = process.argv.includes("--sketch");
  const preview = process.argv.includes("--preview") || sketch;
  const proresFlag = process.argv.includes("--prores") && !preview;
  const fullResFlag = process.argv.includes("--full-res") && !preview && !proresFlag;
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

  // Load duration from scene.json (from workDir or public/)
  const sourceDir = workDir || path.join(projectRoot, "public");
  const scenePath = path.join(sourceDir, "scene.json");
  if (!fs.existsSync(scenePath)) {
    throw new Error(`scene.json not found at ${scenePath}. Run pipeline-pro first.`);
  }
  const gradeDir = workDir || sourceDir;
  if (fs.existsSync(path.join(gradeDir, "source.png"))) {
    await enforceSessionGrade(path.resolve(gradeDir));
  }
  if (!preview) {
    const gateReportIdx = process.argv.indexOf("--gate-report");
    const gateReportPath = gateReportIdx === -1 ? undefined : process.argv[gateReportIdx + 1];
    if (!gateReportPath || gateReportPath.startsWith("--")) {
      throw new Error("full render requires --gate-report <PASS report from npm run gate:psychedelic>");
    }
    assertPsychedelicFullRenderGate(path.resolve(gateReportPath), scenePath);
  }
  const ctx = createRunContext(projectRoot, title, "layered", archiveDirOverride);
  const sceneJson = JSON.parse(fs.readFileSync(scenePath, "utf-8"));
  // Region-affinity previews require a renderer-equivalent authority audit PASS first.
  // This prevents replaying r209-style "capacity true but field authority collapsed" failures.
  if (preview && sceneUsesRegionAffinity(sceneJson as { layers?: readonly { animation?: { sourceRegionAffinity?: { amount?: number } } }[] })) {
    const authorityIdx = process.argv.indexOf("--authority-report");
    const authorityPath = authorityIdx === -1 ? undefined : process.argv[authorityIdx + 1];
    if (!authorityPath || authorityPath.startsWith("--")) {
      throw new Error(
        "region-affinity preview requires --authority-report <PASS report from region-affinity authority audit>",
      );
    }
    assertRegionAffinityAuthorityAudit(path.resolve(authorityPath), scenePath);
  }
  const config = sceneSchema.parse(sceneJson);
  const DURATION = sketch ? Math.min(config.duration, SKETCH_SECONDS) : config.duration;

  const FPS = sketch ? SKETCH_FPS : preview ? 15 : cliFps ?? config.fps;
  const totalFrames = FPS * DURATION;
  const cliWarmupFrames = parseWarmupFrames(process.argv);
  const defaultWarmupFrames = sceneNeedsFeedbackWarmup(config) ? Math.round(FPS * FEEDBACK_WARMUP_SECONDS) : 0;
  const warmupFrames = Math.min(totalFrames, cliWarmupFrames ?? defaultWarmupFrames);

  const ext = proresFlag ? ".mov" : ".mp4";
  const outputPath = path.join(ctx.archiveDir, preview ? `${title}-${sketch ? "sketch" : "preview"}${ext}` : `${title}${ext}`);

  const captureResolution = sketch
    ? computePreviewResolution(config.resolution, SKETCH_SCALE)
    : preview
      ? computePreviewResolution(config.resolution)
      : config.resolution;
  const resScale = sketch ? SKETCH_SCALE : preview ? 0.5 : 1;
  const [resW, resH] = captureResolution;
  console.log(`Title: ${title}`);
  console.log(`Archive: ${path.relative(projectRoot, ctx.archiveDir)}/`);
  console.log(`Resolution: ${resW}x${resH}${sketch ? " (sketch half-res)" : preview ? " (preview half-res)" : ""}`);
  console.log(`Duration: ${DURATION}s, ${totalFrames} frames @ ${FPS}fps${proresFlag ? " (ProRes 4444)" : sketch ? " (sketch)" : preview ? " (preview)" : fullResFlag ? " (full-res H.264)" : ""}`);
  console.log(`Warmup frames: ${warmupFrames}${cliWarmupFrames === undefined ? " (auto)" : " (CLI)"}`);

  const estimatedMB = (totalFrames * 4.5).toFixed(0);
  console.log(`Estimated disk usage: ~${estimatedMB}MB for ${totalFrames} frames`);

  try {
    await captureFrames({ outputDir: ctx.paths.frames, totalFrames, resolution: captureResolution, fps: FPS, warmupFrames, resScale, workDir });
    await encodeVideo(ctx.paths.frames, outputPath, { fps: FPS, duration: DURATION, prores: proresFlag, preview, fullRes: fullResFlag });
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
