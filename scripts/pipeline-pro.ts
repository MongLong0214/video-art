/**
 * Pro Pipeline — 2-layer bria + flux-fill-pro architecture.
 *
 * 1. bria/remove-background → clean foreground with alpha matting
 * 2. flux-fill-pro → inpaint background (fill holes left by foreground)
 * 3. depth-anything-v2 → depth map
 * 4. Generate scene.json (2 layers, hueKey shader settings)
 * 5. Copy to public/
 */
import "dotenv/config";
import Replicate from "replicate";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { getToken, withRetry, enforceVersionPin, extractUrl } from "./lib/replicate-utils.js";
import { parseCliArgs } from "./lib/pipeline-cli.js";
import { getValidPeriods } from "../src/lib/scene-schema.js";
import { checkPythonDeps, runPython, parsePythonOutput } from "./lib/python-bridge.js";
import { runMotionI2v } from "./lib/motion-i2v.js";
import { createPingPongLoop } from "./lib/pingpong.js";
import { TARGET_FPS } from "./lib/motion-models.js";

const args = parseCliArgs(process.argv.slice(2));
const INPUT = args.inputPath || "input.png";
if (!fs.existsSync(INPUT)) { console.error(`Input not found: ${INPUT}`); process.exit(1); }

const MOTION = args.motion;
const MOTION_DURATION = 16; // 8s i2v × ping-pong = 16s
const DURATION = MOTION ? MOTION_DURATION : (args.duration ?? 20);
if (MOTION && args.duration) {
  console.warn("WARNING: --motion mode uses fixed duration=16. --duration ignored.");
}
const FPS = args.fps ?? 30;
const PRODUCTION = args.production;

const OUTPUT_DIR = args.workDir
  ? path.join(args.workDir, "intermediate")
  : path.join(process.cwd(), "out", "pro-pipeline");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });


const BRIA_MODEL = "bria/remove-background";
const FLUX_FILL_MODEL = "black-forest-labs/flux-fill-pro";
const DAV2_MODEL = "chenxwh/depth-anything-v2";
const DAV2_VERSION = "b239ea33cff32bb7abb5db39ffe9a09c14cbc2894331d1ef66fe096eed88ebd4";
const ESRGAN_MODEL = "nightmareai/real-esrgan";

async function main() {
  if (PRODUCTION) {
    enforceVersionPin(DAV2_VERSION, true);
  }

  const replicate = new Replicate({ auth: getToken() });

  const origBuf = await sharp(INPUT).png().toBuffer();
  const meta = await sharp(origBuf).metadata();
  const origW = meta.width!, origH = meta.height!;
  const dataUri = `data:image/png;base64,${origBuf.toString("base64")}`;
  console.log(`Input: ${origW}x${origH}\n`);

  // ═══ Step 1: bria/remove-background ═══
  console.log("═══ Step 1: bria/remove-background ═══");
  const t1 = Date.now();
  const bgRemoved = await withRetry(() =>
    replicate.run(BRIA_MODEL, { input: { image: dataUri } }),
  );
  const fgUrl = extractUrl(bgRemoved);
  const fgResp = await fetch(fgUrl);
  let fgBuf = Buffer.from(await fgResp.arrayBuffer());
  const fgMeta = await sharp(fgBuf).metadata();
  console.log(`  Foreground: ${fgMeta.width}x${fgMeta.height} ${fgMeta.channels}ch (${fgMeta.hasAlpha ? "has alpha" : "NO alpha"})`);
  console.log(`  ${Date.now() - t1}ms`);
  await sharp(fgBuf).toFile(path.join(OUTPUT_DIR, "01-foreground-raw.png"));

  // ═══ Step 1b: Upscale foreground (Real-ESRGAN 2x) ═══
  console.log("═══ Step 1b: Real-ESRGAN 2x upscale ═══");
  const t1b = Date.now();
  const fgDataUri = `data:image/png;base64,${fgBuf.toString("base64")}`;
  const upscaled = await withRetry(() =>
    replicate.run(ESRGAN_MODEL, { input: { image: fgDataUri, scale: 2, face_enhance: false } }),
  );
  const upUrl = extractUrl(upscaled);
  const upResp = await fetch(upUrl);
  fgBuf = Buffer.from(await upResp.arrayBuffer());
  const upMeta = await sharp(fgBuf).metadata();
  console.log(`  Upscaled: ${fgMeta.width}x${fgMeta.height} → ${upMeta.width}x${upMeta.height}`);
  console.log(`  ${Date.now() - t1b}ms`);
  await sharp(fgBuf).toFile(path.join(OUTPUT_DIR, "01-foreground.png"));

  // Compute foreground coverage at original resolution for mask
  const fgRgba = await sharp(fgBuf).resize(origW, origH).ensureAlpha().raw().toBuffer();
  let fgPixels = 0;
  for (let i = 0; i < origW * origH; i++) if (fgRgba[i * 4 + 3] > 10) fgPixels++;
  console.log(`  Foreground coverage: ${(fgPixels / (origW * origH) * 100).toFixed(1)}%\n`);

  // ═══ Step 2: Create mask for inpainting (foreground area = white) ═══
  console.log("═══ Step 2: Create inpainting mask ═══");
  const maskBuf = Buffer.alloc(origW * origH);
  for (let i = 0; i < origW * origH; i++) {
    maskBuf[i] = fgRgba[i * 4 + 3] > 10 ? 255 : 0;
  }
  const maskPng = await sharp(maskBuf, { raw: { width: origW, height: origH, channels: 1 } }).png().toBuffer();
  await sharp(maskPng).toFile(path.join(OUTPUT_DIR, "02-inpaint-mask.png"));
  console.log(`  Mask saved\n`);

  // ═══ Step 3: flux-fill-pro → inpaint background ═══
  console.log("═══ Step 3: flux-fill-pro (inpaint background) ═══");
  const t3 = Date.now();
  const maskDataUri = `data:image/png;base64,${maskPng.toString("base64")}`;
  const origDataUri = dataUri;

  const inpainted = await withRetry(() =>
    replicate.run(FLUX_FILL_MODEL, {
      input: {
        image: origDataUri,
        mask: maskDataUri,
        prompt: "cosmic space background with stars, nebula, orange and green aurora, dark sky, seamless continuation of surrounding area",
        guidance: 30,
        output_format: "png",
      },
    }),
  );
  const bgUrl = extractUrl(inpainted);
  const bgResp = await fetch(bgUrl);
  let bgBuf = Buffer.from(await bgResp.arrayBuffer());
  let bgMeta = await sharp(bgBuf).metadata();
  console.log(`  Background: ${bgMeta.width}x${bgMeta.height}`);
  console.log(`  ${Date.now() - t3}ms`);
  await sharp(bgBuf).toFile(path.join(OUTPUT_DIR, "03-background-inpainted.png"));

  // ═══ Step 3b: Upscale background (Real-ESRGAN 2x) ═══
  console.log("═══ Step 3b: Real-ESRGAN 2x background upscale ═══");
  const t3b = Date.now();
  const bgDataUri = `data:image/png;base64,${bgBuf.toString("base64")}`;
  const bgUpscaled = await withRetry(() =>
    replicate.run(ESRGAN_MODEL, { input: { image: bgDataUri, scale: 2, face_enhance: false } }),
  );
  const bgUpUrl = extractUrl(bgUpscaled);
  const bgUpResp = await fetch(bgUpUrl);
  bgBuf = Buffer.from(await bgUpResp.arrayBuffer());
  bgMeta = await sharp(bgBuf).metadata();
  console.log(`  Upscaled: ${bgMeta.width}x${bgMeta.height}`);
  console.log(`  ${Date.now() - t3b}ms`);
  await sharp(bgBuf).toFile(path.join(OUTPUT_DIR, "03-background-upscaled.png"));

  // ═══ Step 4: depth-anything-v2 ═══
  console.log("\n═══ Step 4: depth-anything-v2 ═══");
  const t4 = Date.now();
  const depthOut = await withRetry(() =>
    replicate.run(`${DAV2_MODEL}:${DAV2_VERSION}`, {
      input: { image: dataUri },
    }),
  );
  const depthResult = depthOut as Record<string, unknown>;
  const greyDepth = depthResult.grey_depth ?? depthResult.gray_depth ?? depthResult;
  const depthUrl = String(greyDepth);
  const depthResp = await fetch(depthUrl);
  const depthBuf = Buffer.from(await depthResp.arrayBuffer());
  console.log(`  ${Date.now() - t4}ms`);
  await sharp(depthBuf).grayscale().toFile(path.join(OUTPUT_DIR, "04-depth.png"));

  // ═══ Step 5: Compose layers at ORIGINAL resolution ═══
  const W = origW, H = origH;
  console.log(`\n═══ Step 5: Compose layers (${W}x${H} — original resolution) ═══`);
  console.log(`  Background API output: ${bgMeta.width}x${bgMeta.height} → upscale to ${W}x${H}`);

  const bgPlate = await sharp(bgBuf).resize(W, H, { kernel: "lanczos3" }).ensureAlpha().png().toBuffer();
  await sharp(bgPlate).toFile(path.join(OUTPUT_DIR, "layer-bg.png"));
  console.log("  layer-bg.png — AI-inpainted background (upscaled to original)");

  const fgLayer = await sharp(fgBuf).resize(W, H, { kernel: "lanczos3" }).ensureAlpha().png().toBuffer();
  await sharp(fgLayer).toFile(path.join(OUTPUT_DIR, "layer-fg.png"));
  console.log(`  layer-fg.png — AI-matted foreground (ESRGAN ${(await sharp(fgBuf).metadata()).width}x${(await sharp(fgBuf).metadata()).height} → ${W}x${H})`);

  const serveDir = args.workDir || path.join(process.cwd(), "public");
  const layersDir = path.join(serveDir, "layers");
  if (fs.existsSync(layersDir)) {
    for (const f of fs.readdirSync(layersDir)) fs.rmSync(path.join(layersDir, f), { force: true });
  }
  fs.mkdirSync(layersDir, { recursive: true });

  // Background: light blur only (ESRGAN already cleaned noise; heavy denoising destroys detail)
  const bgSmoothed = await sharp(bgPlate).blur(1.2).png().toBuffer();
  await sharp(bgSmoothed).toFile(path.join(layersDir, "layer-0.png"));
  console.log("  layer-0.png — background (ESRGAN upscaled, light blur)");

  fs.copyFileSync(path.join(OUTPUT_DIR, "layer-fg.png"), path.join(layersDir, "layer-1.png"));
  await sharp(depthBuf).resize(W, H, { kernel: "lanczos3" }).grayscale().toFile(path.join(layersDir, "depth.png"));

  // ═══ Step 6: Generate scene.json ═══
  const periods = getValidPeriods(DURATION);
  const longPeriod = periods[periods.length - 1]; // DURATION itself
  const midPeriod = periods[Math.max(0, Math.floor(periods.length / 2))];
  const shortPeriod = periods[Math.max(0, Math.floor(periods.length / 4))];

  interface SceneLayer {
    id: string;
    file: string;
    zIndex: number;
    opacity: number;
    blending: string;
    role: string;
    meanDepth: number;
    animation: {
      colorCycle: { speed: number; period: number; phaseOffset: number };
      glow: { intensity: number; pulse: number; period: number };
      saturationBoost: number;
      luminanceKey: number;
      satBlendLow: number;
      satBlendHigh: number;
      satInjectionMul: number;
      glowPulseFloor: number;
      lumExponent: number;
      hueKey: number;
      hueSpeed: number;
    };
    motion?: {
      enabled: boolean;
      framesDir: string;
      frameCount: number;
      fps: number;
      model: string;
      intensity: string;
    };
  }

  const scene: {
    version: number;
    source: string;
    resolution: number[];
    duration: number;
    fps: number;
    layers: SceneLayer[];
    effects: Record<string, Record<string, number>>;
  } = {
    version: 1,
    source: path.basename(INPUT),
    resolution: [W, H],
    duration: DURATION,
    fps: FPS,
    layers: [
      {
        id: "layer-0",
        file: "layers/layer-0.png",
        zIndex: 0,
        opacity: 1,
        blending: "normal",
        role: "background-plate",
        meanDepth: 50,
        animation: {
          colorCycle: { speed: 5, period: longPeriod, phaseOffset: 0 },
          glow: { intensity: 0.12, pulse: 0.6, period: midPeriod },
          saturationBoost: 6.0,
          luminanceKey: 1.0,
          satBlendLow: 0.05,
          satBlendHigh: 0.3,
          satInjectionMul: 0.5,
          glowPulseFloor: 0.3,
          lumExponent: 1.8,
          hueKey: 1.5,
          hueSpeed: 3.0,
        },
      },
      {
        id: "layer-1",
        file: "layers/layer-1.png",
        zIndex: 1,
        opacity: 1,
        blending: "normal",
        role: "subject",
        meanDepth: 180,
        animation: {
          colorCycle: { speed: 11, period: midPeriod, phaseOffset: 180 },
          glow: { intensity: 0.2, pulse: 0.7, period: shortPeriod },
          saturationBoost: 6.0,
          luminanceKey: 1.0,
          satBlendLow: 0.05,
          satBlendHigh: 0.3,
          satInjectionMul: 0.5,
          glowPulseFloor: 0.3,
          lumExponent: 1.8,
          hueKey: 1.5,
          hueSpeed: 3.0,
        },
      },
    ],
    effects: {
      bloom: { strength: 0.5, radius: 0.4, threshold: 0.45 },
      chromaticAberration: { offset: 2.0, modulationOffset: 0.4 },
      parallax: { scale: 0 },
      haze: { intensity: 0 },
      feather: { radius: 0 },
    },
  };

  fs.writeFileSync(path.join(serveDir, "scene.json"), JSON.stringify(scene, null, 2));
  console.log("\n  scene.json written (no parallax, no haze, pure shader)");

  // ═══ Motion Pipeline (--motion flag) ═══
  if (MOTION) {
    console.log("\n═══ Motion Pipeline ═══");
    const motionStart = Date.now();
    const intermediateDir = path.join(serveDir, "intermediate");

    // Clean previous intermediate artifacts
    if (fs.existsSync(intermediateDir)) {
      fs.rmSync(intermediateDir, { recursive: true, force: true });
    }
    fs.mkdirSync(intermediateDir, { recursive: true });

    // ── Step M1: Per-Layer i2v ──
    console.log("\n── Step M1: Per-Layer i2v ──");
    const tM1 = Date.now();

    const i2vResults = await runMotionI2v(
      [
        { imagePath: path.join(layersDir, "layer-0.png"), role: "background-plate", hasAlpha: false },
        { imagePath: path.join(layersDir, "layer-1.png"), role: "subject", hasAlpha: true },
      ],
      {
        modelName: args.motionModel,
        intensity: args.motionIntensity,
        workDir: intermediateDir,
      },
    );

    if (!i2vResults) {
      console.warn("  Motion i2v failed — continuing without motion.");
      console.log("\n═══ Ready to export (static mode) ═══");
      return;
    }
    console.log(`  Step M1: ${Date.now() - tM1}ms`);

    // ── Step M3: Optical Flow (RAFT) ──
    let skipFlow = args.skipFlow;

    if (!skipFlow) {
      const pythonCheck = await checkPythonDeps();
      if (!pythonCheck.available) {
        console.warn(`  WARNING: ${pythonCheck.error}`);
        console.warn("  Auto-enabling --skip-flow. hueKey color preservation NOT guaranteed.");
        skipFlow = true;
      }
    }

    const layerFrameDirs: string[] = [];

    if (!skipFlow) {
      console.log("\n── Step M3: Optical Flow (RAFT) ──");

      for (let i = 0; i < i2vResults.length; i++) {
        const tM3 = Date.now();
        const flowDir = path.join(intermediateDir, `layer-${i}`, "flow");
        fs.mkdirSync(flowDir, { recursive: true });

        console.log(`  Layer ${i}: Extracting RAFT optical flow...`);
        const flowResult = await runPython(
          "scripts/motion/extract_flow.py",
          [i2vResults[i].framesDir, flowDir],
        );
        const flowMeta = parsePythonOutput<{ flow_count: number; device: string; elapsed_sec: number }>(flowResult.stdout);
        console.log(`  Layer ${i}: ${flowMeta.flow_count} flows (${flowMeta.device}, ${flowMeta.elapsed_sec}s)`);
        console.log(`  ${Date.now() - tM3}ms`);

        // ── Step M4: Original Pixel Warping ──
        console.log(`\n── Step M4: Warp original pixels (layer ${i}) ──`);
        const tM4 = Date.now();
        const warpedDir = path.join(intermediateDir, `layer-${i}`, "warped");

        const warpArgs = [
          path.join(layersDir, `layer-${i}.png`),
          flowDir,
          warpedDir,
          "--ref-frames-dir", i2vResults[i].framesDir,
        ];
        if (i === 1) warpArgs.push("--has-alpha"); // foreground has alpha

        const warpResult = await runPython("scripts/motion/warp_pixels.py", warpArgs);
        const warpMeta = parsePythonOutput<{ frame_count: number; disocclusion_ratio_avg: number }>(warpResult.stdout);
        console.log(`  Layer ${i}: ${warpMeta.frame_count} warped frames (disocclusion: ${(warpMeta.disocclusion_ratio_avg * 100).toFixed(1)}%)`);
        console.log(`  ${Date.now() - tM4}ms`);

        layerFrameDirs.push(warpedDir);
      }
    } else {
      // --skip-flow: use AI ref frames directly (no color preservation guarantee)
      console.log("\n── Step M3-M4: SKIPPED (--skip-flow) ──");
      console.warn("  WARNING: Using AI video frames directly. hueKey color preservation NOT guaranteed.");
      for (const result of i2vResults) {
        layerFrameDirs.push(result.framesDir);
      }
    }

    // ── Step M5: Ping-Pong Loop ──
    console.log("\n── Step M5: Ping-Pong Loop ──");
    const finalFrameDirs: string[] = [];

    for (let i = 0; i < layerFrameDirs.length; i++) {
      const tM5 = Date.now();
      const loopDir = path.join(layersDir, i === 0 ? "bg-frames" : "fg-frames");

      // Clean previous frames
      if (fs.existsSync(loopDir)) fs.rmSync(loopDir, { recursive: true, force: true });
      fs.mkdirSync(loopDir, { recursive: true });

      const result = await createPingPongLoop(layerFrameDirs[i], loopDir, { blendFrames: 3 });
      console.log(`  Layer ${i}: ${result.frameCount} loop frames (${Date.now() - tM5}ms)`);
      finalFrameDirs.push(loopDir);
    }

    // ── Step M6: Update scene.json with motion ──
    console.log("\n── Step M6: Update scene.json ──");
    const loopFrameCount = fs.readdirSync(finalFrameDirs[0]).filter(f => f.endsWith(".png")).length;

    // Update scene with motion fields
    scene.duration = MOTION_DURATION;

    // Recalculate periods for duration=16
    const motionPeriods = getValidPeriods(MOTION_DURATION);
    const motionLong = motionPeriods[motionPeriods.length - 1];
    const motionMid = motionPeriods[Math.max(0, Math.floor(motionPeriods.length / 2))];
    const motionShort = motionPeriods[Math.max(0, Math.floor(motionPeriods.length / 4))];

    for (const layer of scene.layers) {
      layer.animation.colorCycle.period = layer.role === "background-plate" ? motionLong : motionMid;
      layer.animation.glow.period = layer.role === "background-plate" ? motionMid : motionShort;
    }

    // Add motion fields
    const motionField = (dir: string) => ({
      enabled: true,
      framesDir: path.relative(serveDir, dir) + "/",
      frameCount: loopFrameCount,
      fps: TARGET_FPS,
      model: args.motionModel,
      intensity: args.motionIntensity,
    });

    scene.layers[0].motion = motionField(finalFrameDirs[0]);
    scene.layers[1].motion = motionField(finalFrameDirs[1]);

    fs.writeFileSync(path.join(serveDir, "scene.json"), JSON.stringify(scene, null, 2));
    console.log(`  scene.json updated: duration=${MOTION_DURATION}, motion enabled, periods=[${motionPeriods.join(",")}]`);

    // Cleanup intermediate (keep only final frame dirs)
    console.log("\n  Cleaning intermediate artifacts...");
    fs.rmSync(intermediateDir, { recursive: true, force: true });

    console.log(`\n═══ Motion Pipeline Complete (${Date.now() - motionStart}ms) ═══`);
  }

  console.log("\n═══ Ready to export ═══");
  console.log("Run: npx tsx scripts/export-layered.ts --title pro-pipeline --fps 30");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
