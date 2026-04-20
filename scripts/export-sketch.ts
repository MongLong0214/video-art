import puppeteer, { type Browser } from "puppeteer";
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import {
  parseTitle,
  createRunContext,
} from "./lib/archive.js";
import { getSketchConfig } from "../src/lib/sketch-configs.js";

function parseArg(argv: string[], flag: string, fallback: string): string {
  const idx = argv.indexOf(flag);
  if (idx !== -1 && argv[idx + 1] && !argv[idx + 1].startsWith("--")) {
    return argv[idx + 1];
  }
  return fallback;
}

// --url must be a local dev server. We disable Chromium sandbox so allowing
// arbitrary origins would give any caller a browser with weakened isolation.
const DEV_HOST_ALLOWLIST = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

function validateDevUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`--url must be a valid URL, got: ${url}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`--url protocol must be http/https, got: ${parsed.protocol}`);
  }
  if (!DEV_HOST_ALLOWLIST.has(parsed.hostname)) {
    throw new Error(
      `--url host must be local dev (localhost/127.0.0.1), got: ${parsed.hostname}`,
    );
  }
  return url;
}

// Sketches whose state is not phase-locked to the loop duration.
// Disclosed in src/sketches/{cellular,particles}.ts headers.
const NON_LOOPABLE_SKETCHES = new Set(["cellular", "particles"]);

async function main() {
  const args = process.argv.slice(2);
  const sketch = parseArg(args, "--sketch", "psychedelic");
  const devUrl = validateDevUrl(parseArg(args, "--url", "http://localhost:5173"));
  const cfg = getSketchConfig(sketch);
  const WIDTH = cfg.width;
  const HEIGHT = cfg.height;
  const FPS = cfg.fps;
  const LOOP_DUR = cfg.loopDuration;
  const TOTAL_FRAMES = Math.round(FPS * LOOP_DUR);
  const parsed = parseTitle(args);
  const title = parsed === "untitled" ? sketch : parsed;
  const projectRoot = process.cwd();
  const ctx = createRunContext(projectRoot, title, "blueprint");
  const outputPath = path.join(ctx.archiveDir, `${title}.mp4`);

  // Verify sketch exists
  const fragPath = path.join(projectRoot, "src", "shaders", "sketches", `${sketch}.frag`);
  if (!fs.existsSync(fragPath)) {
    const available = fs.readdirSync(path.join(projectRoot, "src", "shaders", "sketches"))
      .filter((f) => f.endsWith(".frag"))
      .map((f) => f.replace(".frag", ""));
    console.error(`Sketch "${sketch}" not found. Available: ${available.join(", ")}`);
    process.exit(1);
  }

  console.log(`Sketch: ${sketch}`);
  console.log(`Title: ${title}`);
  console.log(`Archive: ${path.relative(projectRoot, ctx.archiveDir)}/`);

  // Use RunContext frames dir for temp frames
  fs.mkdirSync(ctx.paths.frames, { recursive: true });

  let browser: Browser | null = null;

  try {
    console.log("Launching browser...");
    browser = await puppeteer.launch({
      headless: true,
      args: [
        `--window-size=${WIDTH},${HEIGHT}`,
        "--no-sandbox",
        "--use-gl=angle",
        "--use-angle=metal",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT });
    await page.goto(`${devUrl}/?sketch=${sketch}`, {
      waitUntil: "networkidle0",
    });

    await page.waitForFunction("window.__captureReady === true", {
      timeout: 10000,
    });

    await page.evaluate(`window.__startCapture(${FPS})`);

    const canvas = await page.$("canvas");
    if (!canvas) throw new Error("Canvas not found");

    console.log(
      `Capturing ${TOTAL_FRAMES} frames at ${FPS}fps (${LOOP_DUR}s loop)...`,
    );

    for (let f = 0; f < TOTAL_FRAMES; f++) {
      const dataUrl = (await page.evaluate(
        "window.__captureFrame()",
      )) as string;

      const framePath = path.join(
        ctx.paths.frames,
        `frame_${String(f).padStart(5, "0")}.png`,
      );
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync(framePath, Buffer.from(base64, "base64"));

      if (f % FPS === 0) {
        console.log(
          `  ${f}/${TOTAL_FRAMES} (${((f / TOTAL_FRAMES) * 100).toFixed(0)}%)`,
        );
      }
    }

    console.log(`  ${TOTAL_FRAMES}/${TOTAL_FRAMES} (100%)`);
  } finally {
    if (browser) await browser.close();
  }

  console.log("\nEncoding MP4...");
  execFileSync("ffmpeg", [
    "-y",
    "-framerate", String(FPS),
    "-i", path.join(ctx.paths.frames, "frame_%05d.png"),
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    outputPath,
  ], { stdio: "inherit" });

  // Snapshot shader source into archive
  fs.copyFileSync(fragPath, path.join(ctx.archiveDir, `${sketch}.frag`));

  console.log(`\nOutput: ${path.relative(projectRoot, outputPath)}`);
  const loopLabel = NON_LOOPABLE_SKETCHES.has(sketch)
    ? "non-loopable (stateful simulation — frame[0] ≠ frame[last])"
    : "seamless loop";
  console.log(`  ${WIDTH}x${HEIGHT} @ ${FPS}fps, ${LOOP_DUR}s ${loopLabel}`);

  // Cleanup _work/ before listing
  ctx.cleanup();

  console.log(`\nArchive contents:`);
  for (const f of fs.readdirSync(ctx.archiveDir)) {
    console.log(`  ${f}`);
  }
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});