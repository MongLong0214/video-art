import puppeteer, { type Browser } from "puppeteer";
import * as fs from "node:fs";
import * as path from "node:path";
import { parseArgs } from "node:util";

const DEFAULTS = {
  url: "http://localhost:5173",
  frames: 24,
  fps: 60,
  width: 1080,
  height: 1920,
  outDir: "out/captured-frames",
  loopDur: 8.0,
} as const;

const READY_TIMEOUT_MS = 15_000;
const READY_POLL_INTERVAL_MS = 100;

function parseCli() {
  const { values } = parseArgs({
    options: {
      url: { type: "string", default: DEFAULTS.url },
      mode: { type: "string" },
      frames: { type: "string", default: String(DEFAULTS.frames) },
      fps: { type: "string", default: String(DEFAULTS.fps) },
      width: { type: "string", default: String(DEFAULTS.width) },
      height: { type: "string", default: String(DEFAULTS.height) },
      "out-dir": { type: "string", default: DEFAULTS.outDir },
      "loop-dur": { type: "string", default: String(DEFAULTS.loopDur) },
    },
    strict: true,
  });

  if (!values.mode) {
    console.error("Error: --mode is required (sketch name)");
    process.exit(1);
  }

  const frames = parseInt(values.frames!, 10);
  const fps = parseInt(values.fps!, 10);
  const width = parseInt(values.width!, 10);
  const height = parseInt(values.height!, 10);
  const loopDur = parseFloat(values["loop-dur"]!);

  if (isNaN(frames) || frames < 1) throw new Error(`Invalid --frames: ${values.frames}`);
  if (isNaN(fps) || fps < 1) throw new Error(`Invalid --fps: ${values.fps}`);
  if (isNaN(width) || width < 1) throw new Error(`Invalid --width: ${values.width}`);
  if (isNaN(height) || height < 1) throw new Error(`Invalid --height: ${values.height}`);
  if (isNaN(loopDur) || loopDur <= 0) throw new Error(`Invalid --loop-dur: ${values["loop-dur"]}`);

  return {
    url: values.url!,
    mode: values.mode,
    frames,
    fps,
    width,
    height,
    outDir: values["out-dir"]!,
    loopDur,
  };
}

async function main() {
  const opts = parseCli();

  console.log(`Mode:     ${opts.mode}`);
  console.log(`URL:      ${opts.url}?sketch=${opts.mode}`);
  console.log(`Frames:   ${opts.frames}`);
  console.log(`FPS:      ${opts.fps}`);
  console.log(`Size:     ${opts.width}x${opts.height}`);
  console.log(`Loop dur: ${opts.loopDur}s`);
  console.log(`Out dir:  ${opts.outDir}`);

  // Clean & create output directory
  if (fs.existsSync(opts.outDir)) {
    fs.rmSync(opts.outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(opts.outDir, { recursive: true });

  let browser: Browser | null = null;

  // Ensure the browser is closed on any exit (SIGINT, uncaught, process.exit)
  const closeBrowser = () => {
    if (browser) {
      browser.process()?.kill("SIGKILL");
      browser = null;
    }
  };
  process.on("exit", closeBrowser);

  try {
    console.log("\nLaunching browser...");
    browser = await puppeteer.launch({
      headless: true,
      args: [
        `--window-size=${opts.width},${opts.height}`,
        "--no-sandbox",
        "--disable-gpu-sandbox",
        "--use-gl=angle",
        "--use-angle=metal",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: opts.width, height: opts.height });

    // Navigate — catch connection refused (dev server not running)
    try {
      await page.goto(`${opts.url}?sketch=${opts.mode}`, {
        waitUntil: "networkidle0",
        timeout: 15_000,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("ERR_CONNECTION_REFUSED") || msg.includes("net::")) {
        throw new Error(`Could not connect to ${opts.url}. Is the dev server running?`);
      }
      throw err;
    }

    // Wait for __captureReady with polling + timeout
    console.log("Waiting for __captureReady...");
    const readyStart = Date.now();
    while (true) {
      const ready = await page.evaluate("window.__captureReady === true");
      if (ready) break;
      if (Date.now() - readyStart > READY_TIMEOUT_MS) {
        throw new Error(`Timed out waiting for __captureReady after ${READY_TIMEOUT_MS}ms`);
      }
      await new Promise((r) => setTimeout(r, READY_POLL_INTERVAL_MS));
    }

    // Switch to a deterministic recording clock
    await page.evaluate(`window.__startCapture(${opts.fps})`);
    console.log(`\nCapturing ${opts.frames} frames...`);

    for (let i = 0; i < opts.frames; i++) {
      // Inject deterministic time, then capture
      const time = i * (opts.loopDur / opts.frames);
      const result = await page.evaluate(async (t: number) => {
        const win = globalThis as unknown as Record<string, unknown>;
        const clock = win.__clock as { time: number } | undefined;
        if (clock) {
          clock.time = t;
        }
        const captureFrame = win.__captureFrame as (() => Promise<string>) | undefined;
        if (!captureFrame) {
          throw new Error("__captureFrame not available on window");
        }
        return captureFrame();
      }, time);

      if (!result || typeof result !== "string") {
        throw new Error(`Frame ${i} capture returned invalid data`);
      }

      // Strip data:image/png;base64, prefix and save
      const base64Data = result.replace(/^data:image\/png;base64,/, "");
      const framePath = path.join(
        opts.outDir,
        `frame_${String(i).padStart(5, "0")}.png`,
      );
      fs.writeFileSync(framePath, Buffer.from(base64Data, "base64"));

      // Progress every 10% or every frame if few frames
      const progressInterval = Math.max(1, Math.floor(opts.frames / 10));
      if (i % progressInterval === 0 || i === opts.frames - 1) {
        console.log(
          `  ${i + 1}/${opts.frames} (${(((i + 1) / opts.frames) * 100).toFixed(0)}%)`,
        );
      }
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
      browser = null;
    }
    process.removeListener("exit", closeBrowser);
  }

  console.log(
    `\nCaptured ${opts.frames} frames to ${opts.outDir}`,
  );
}

main().catch((err) => {
  console.error("Capture failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
