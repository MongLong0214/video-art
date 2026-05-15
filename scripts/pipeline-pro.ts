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
import { getToken, withRetry, enforceVersionPin } from "./lib/replicate-utils.js";
import { parseCliArgs } from "./lib/pipeline-cli.js";
import { MIN_RESOLUTION, TONE_PRESETS } from "./lib/scene-presets.js";
import { getValidPeriods } from "../src/lib/scene-schema.js";

const args = parseCliArgs(process.argv.slice(2));
const INPUT = args.inputPath || "input.png";
if (!fs.existsSync(INPUT)) { console.error(`Input not found: ${INPUT}`); process.exit(1); }

const DURATION = args.duration ?? 20;
const FPS = args.fps ?? 30;
const PRODUCTION = args.production;

const OUTPUT_DIR = args.workDir
  ? path.join(args.workDir, "intermediate")
  : path.join(process.cwd(), "out", "pro-pipeline");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function extractUrl(output: unknown): string {
  if (typeof output === "string") return output;
  if (output && typeof output === "object") {
    const str = String(output);
    if (str.startsWith("http")) return str;
    if ("url" in output) {
      const urlVal = (output as Record<string, unknown>).url;
      return typeof urlVal === "function" ? (urlVal as () => string)() : String(urlVal);
    }
  }
  return String(output);
}

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

  let origBuf = await sharp(INPUT).png().toBuffer();
  let meta = await sharp(origBuf).metadata();
  let origW = meta.width!, origH = meta.height!;
  console.log(`Input: ${origW}x${origH}`);

  // Auto-upscale to minimum resolution (lanczos3) to keep export sharp.
  if (origW < MIN_RESOLUTION.width || origH < MIN_RESOLUTION.height) {
    const scale = Math.max(MIN_RESOLUTION.width / origW, MIN_RESOLUTION.height / origH);
    const newW = Math.round(origW * scale);
    const newH = Math.round(origH * scale);
    console.log(`  → upscaling to ${newW}x${newH} (lanczos3, ${scale.toFixed(2)}x)`);
    origBuf = await sharp(origBuf).resize(newW, newH, { kernel: "lanczos3" }).png().toBuffer();
    meta = await sharp(origBuf).metadata();
    origW = meta.width!;
    origH = meta.height!;
  }
  const dataUri = `data:image/png;base64,${origBuf.toString("base64")}`;
  console.log("");

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

  // Split fg by luminance: silhouettes vs. light rays
  const LUM_THRESHOLD = 160;
  const { data: fgRaw } = await sharp(fgLayer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const silBuf = Buffer.alloc(W * H * 4, 0);
  const rayBuf = Buffer.alloc(W * H * 4, 0);
  let silPx = 0, rayPx = 0;
  for (let i = 0; i < W * H; i++) {
    const r = fgRaw[i * 4], g = fgRaw[i * 4 + 1], b = fgRaw[i * 4 + 2], a = fgRaw[i * 4 + 3];
    if (a < 10) continue;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum >= LUM_THRESHOLD) {
      rayBuf[i * 4] = r; rayBuf[i * 4 + 1] = g; rayBuf[i * 4 + 2] = b; rayBuf[i * 4 + 3] = a;
      rayPx++;
    } else {
      silBuf[i * 4] = r; silBuf[i * 4 + 1] = g; silBuf[i * 4 + 2] = b; silBuf[i * 4 + 3] = a;
      silPx++;
    }
  }
  console.log(`  silhouettes: ${silPx} px  light-rays: ${rayPx} px (${(rayPx / (silPx + rayPx) * 100).toFixed(1)}%)`);
  await sharp(silBuf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(layersDir, "layer-1.png"));
  await sharp(rayBuf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(layersDir, "layer-2.png"));
  console.log("  layer-1.png — silhouettes  layer-2.png — light rays");

  await sharp(depthBuf).resize(W, H, { kernel: "lanczos3" }).grayscale().toFile(path.join(layersDir, "depth.png"));

  // ═══ Step 6: Generate scene.json from tone preset ═══
  const preset = TONE_PRESETS[args.tone];
  // Periods must align with shader-validated values (see scene-schema getValidPeriods).
  const periods = getValidPeriods(DURATION);
  const longPeriod = periods[periods.length - 1];
  const midPeriod = periods[Math.max(0, Math.floor(periods.length / 2))];
  const shortPeriod = periods[Math.max(0, Math.floor(periods.length / 4))];

  const layer0Anim = {
    ...preset.layer0,
    colorCycle: { ...preset.layer0.colorCycle, period: longPeriod },
    glow: { ...preset.layer0.glow, period: midPeriod },
    breath: { ...preset.layer0.breath, period: midPeriod },
    ringPeriod: midPeriod,
  };
  const layer1Anim = {
    ...preset.layer1,
    colorCycle: { ...preset.layer1.colorCycle, period: midPeriod },
    glow: { ...preset.layer1.glow, period: shortPeriod },
    breath: { ...preset.layer1.breath, period: shortPeriod },
    ringPeriod: shortPeriod,
  };
  const layer2Anim = {
    ...preset.layer2,
    colorCycle: { ...preset.layer2.colorCycle, period: midPeriod },
    glow: { ...preset.layer2.glow, period: shortPeriod },
    breath: { ...preset.layer2.breath, period: shortPeriod },
    ringPeriod: midPeriod,
  };

  const scene = {
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
        animation: layer0Anim,
      },
      {
        id: "layer-1",
        file: "layers/layer-1.png",
        zIndex: 1,
        opacity: 1,
        blending: "normal",
        role: "subject",
        meanDepth: 180,
        animation: layer1Anim,
      },
      {
        id: "layer-2",
        file: "layers/layer-2.png",
        zIndex: 2,
        opacity: 1,
        blending: "normal",
        role: "light-rays",
        meanDepth: 120,
        animation: layer2Anim,
      },
    ],
    effects: preset.effects,
  };

  fs.writeFileSync(path.join(serveDir, "scene.json"), JSON.stringify(scene, null, 2));
  console.log(`\n  scene.json written (tone: ${args.tone})`);
  console.log("\n═══ Ready to export ═══");
  console.log("Run: npx tsx scripts/export-layered.ts --title pro-pipeline --fps 30");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
