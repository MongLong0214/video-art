import puppeteer, { type Browser } from "puppeteer";
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import {
  parseTitle,
  createArchiveDir,
  framesDir,
  cleanFrames,
} from "./lib/archive.js";

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 60;
const LOOP_DUR = 8.0;
const TOTAL_FRAMES = FPS * LOOP_DUR;

function parseSketch(argv: string[]): string {
  const idx = argv.indexOf("--sketch");
  if (idx !== -1 && argv[idx + 1] && !argv[idx + 1].startsWith("--")) {
    return argv[idx + 1];
  }
  return "psychedelic";
}

async function main() {
  const args = process.argv.slice(2);
  const sketch = parseSketch(args);
  const title = parseTitle(args) === "untitled" ? sketch : parseTitle(args);
  const projectRoot = process.cwd();
  const archiveDir = createArchiveDir(projectRoot, title);
  const tempFrames = framesDir(projectRoot);
  const outputPath = path.join(archiveDir, `${title}.mp4`);

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
  console.log(`Archive: ${path.relative(projectRoot, archiveDir)}/`);

  // clean & create temp frames dir
  if (fs.existsSync(tempFrames)) fs.rmSync(tempFrames, { recursive: true });
  fs.mkdirSync(tempFrames, { recursive: true });

  let browser: Browser | null = null;

  try {
    console.log("Launching browser...");
    browser = await puppeteer.launch({
      headless: true,
      args: [
        `--window-size=${WIDTH},${HEIGHT}`,
        "--no-sandbox",
        "--disable-gpu-sandbox",
        "--use-gl=angle",
        "--use-angle=metal",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT });
    await page.goto(`http://localhost:5173/?sketch=${sketch}`, {
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
      await page.evaluate("window.__captureFrame()");

      const framePath = path.join(
        tempFrames,
        `frame_${String(f).padStart(5, "0")}.png`,
      );
      await canvas.screenshot({ path: framePath, type: "png" });

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
    "-i", path.join(tempFrames, "frame_%05d.png"),
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    outputPath,
  ], { stdio: "inherit" });

  // Snapshot shader source into archive
  fs.copyFileSync(fragPath, path.join(archiveDir, `${sketch}.frag`));

  console.log(`\nOutput: ${path.relative(projectRoot, outputPath)}`);
  console.log(`  ${WIDTH}x${HEIGHT} @ ${FPS}fps, ${LOOP_DUR}s seamless loop`);

  // List archive contents
  console.log(`\nArchive contents:`);
  for (const f of fs.readdirSync(archiveDir)) {
    console.log(`  ${f}`);
  }

  cleanFrames(projectRoot);
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
