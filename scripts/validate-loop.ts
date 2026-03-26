import "dotenv/config";
import puppeteer from "puppeteer";
import { exec } from "node:child_process";
import { sceneSchema, getValidPeriods } from "../src/lib/scene-schema.js";
import fs from "node:fs";
import path from "node:path";

const FPS = 60;
const RMSE_THRESHOLD = 2.0;

async function waitForServer(url: string, maxWait = 15000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not start within ${maxWait}ms`);
}

function loadSceneConfig() {
  const scenePath = path.join(process.cwd(), "public", "scene.json");
  if (!fs.existsSync(scenePath)) {
    throw new Error("public/scene.json not found. Run pipeline:layers first.");
  }
  const sceneJson = JSON.parse(fs.readFileSync(scenePath, "utf-8"));
  return sceneSchema.parse(sceneJson);
}

function validatePeriods(): boolean {
  const config = loadSceneConfig();
  const validPeriods = getValidPeriods(config.duration);
  let allValid = true;

  for (const layer of config.layers) {
    const anim = layer.animation;
    const periods: { name: string; value: number }[] = [];
    if (anim.colorCycle) periods.push({ name: "colorCycle", value: anim.colorCycle.period });
    if (anim.wave) periods.push({ name: "wave", value: anim.wave.period });
    if (anim.glow) periods.push({ name: "glow", value: anim.glow.period });

    for (const { name, value } of periods) {
      if (!validPeriods.includes(value)) {
        console.error(`FAIL: ${layer.id}.${name}.period = ${value} is not a divisor of ${config.duration}`);
        allValid = false;
      }
    }
  }

  if (allValid) console.log(`PASS: All animation periods are divisors of ${config.duration}`);
  return allValid;
}

async function validatePixelLoop(): Promise<boolean> {
  const config = loadSceneConfig();
  const LOOP_DURATION = config.duration;
  const TOTAL_FRAMES = LOOP_DURATION * FPS;

  console.log(`Duration: ${LOOP_DURATION}s, ${TOTAL_FRAMES} frames @ ${FPS}fps`);
  console.log("Starting Vite dev server...");
  const viteProcess = exec("npx vite --port 5199");

  try {
    await waitForServer("http://localhost:5199");
    console.log("Vite server ready.");

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--use-gl=angle"],
    });

    const page = await browser.newPage();
    const [vpW, vpH] = config.resolution;
    await page.setViewport({ width: vpW, height: vpH });
    await page.goto("http://localhost:5199/?mode=layered", { waitUntil: "networkidle0" });

    // Wait for sketch to initialize
    await page.waitForFunction("window.__captureReady === true", { timeout: 10000 });

    // Start capture mode at 30fps
    await page.evaluate(`window.__startCapture(${FPS})`);

    // Capture frame 0
    console.log("Capturing frame 0...");
    const frame0DataUrl = await page.evaluate("window.__captureFrame()") as string;

    // Advance to frame 599 (capture 598 more frames, each advances clock by 1/30s)
    console.log(`Advancing ${TOTAL_FRAMES - 1} frames...`);
    for (let i = 1; i < TOTAL_FRAMES; i++) {
      await page.evaluate("window.__captureFrame()");
      if (i % 100 === 0) process.stdout.write(`  frame ${i}/${TOTAL_FRAMES}\n`);
    }

    // Capture frame 600 (= frame 0 of next loop)
    console.log("Capturing frame at loop boundary...");
    const frameEndDataUrl = await page.evaluate("window.__captureFrame()") as string;

    await browser.close();

    // Compare frames
    console.log("Comparing frames...");
    const sharp = (await import("sharp")).default;

    const buf0 = Buffer.from(frame0DataUrl.split(",")[1], "base64");
    const bufEnd = Buffer.from(frameEndDataUrl.split(",")[1], "base64");

    const raw0 = await sharp(buf0).raw().toBuffer();
    const rawEnd = await sharp(bufEnd).raw().toBuffer();

    if (raw0.length !== rawEnd.length) {
      console.error("FAIL: Frame buffer sizes differ");
      return false;
    }

    let sumSqDiff = 0;
    for (let i = 0; i < raw0.length; i++) {
      const diff = raw0[i] - rawEnd[i];
      sumSqDiff += diff * diff;
    }
    const rmse = Math.sqrt(sumSqDiff / raw0.length);

    console.log(`Pixel RMSE: ${rmse.toFixed(4)} (threshold: ${RMSE_THRESHOLD})`);

    if (rmse < RMSE_THRESHOLD) {
      console.log("PASS: Seamless loop verified");
      return true;
    } else {
      console.error("FAIL: Loop seam detected — RMSE exceeds threshold");
      return false;
    }
  } finally {
    viteProcess.kill();
  }
}

async function main() {
  console.log("=== Seamless Loop Validation ===\n");

  console.log("1. Validating scene.json periods...");
  const periodsOk = validatePeriods();

  console.log("\n2. Validating pixel-level loop continuity...");
  const pixelOk = await validatePixelLoop();

  console.log("\n=== Results ===");
  console.log(`Period validation: ${periodsOk ? "PASS" : "FAIL"}`);
  console.log(`Pixel RMSE validation: ${pixelOk ? "PASS" : "FAIL"}`);

  if (!periodsOk || !pixelOk) process.exit(1);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
