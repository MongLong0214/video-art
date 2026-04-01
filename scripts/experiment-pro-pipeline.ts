/**
 * Pro Pipeline Test:
 * 1. bria/remove-background → clean foreground with alpha matting
 * 2. flux-fill-pro → inpaint background (fill holes left by foreground)
 * 3. depth-anything-v2 → depth map
 * 4. SAM3 → additional object separation within foreground (optional)
 *
 * Then render with F-version shader settings (no parallax, no haze, pure shader)
 */
import "dotenv/config";
import Replicate from "replicate";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { getToken, withRetry, validateReplicateUrl } from "./lib/replicate-utils.js";

const INPUT = process.argv[2] ?? "input.png";
if (!fs.existsSync(INPUT)) { console.error(`Input not found: ${INPUT}`); process.exit(1); }

const OUTPUT_DIR = path.join(process.cwd(), "experiment-output", "pro-pipeline");
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

async function main() {
  const replicate = new Replicate({ auth: getToken() });

  // Prepare input
  const origBuf = await sharp(INPUT).resize(1536, 1536, { fit: "inside" }).png().toBuffer();
  const meta = await sharp(origBuf).metadata();
  const W = meta.width!, H = meta.height!;
  const dataUri = `data:image/png;base64,${origBuf.toString("base64")}`;
  console.log(`Input: ${W}x${H}\n`);

  // ═══ Step 1: bria/remove-background ═══
  console.log("═══ Step 1: bria/remove-background ═══");
  const t1 = Date.now();
  const bgRemoved = await withRetry(() =>
    replicate.run("bria/remove-background", { input: { image: dataUri } }),
  );
  const fgUrl = extractUrl(bgRemoved);
  console.log(`  URL: ${fgUrl.slice(0, 80)}...`);
  const fgResp = await fetch(fgUrl);
  const fgBuf = Buffer.from(await fgResp.arrayBuffer());
  const fgMeta = await sharp(fgBuf).metadata();
  console.log(`  Foreground: ${fgMeta.width}x${fgMeta.height} ${fgMeta.channels}ch (${fgMeta.hasAlpha ? "has alpha" : "NO alpha"})`);
  console.log(`  ${Date.now() - t1}ms`);
  await sharp(fgBuf).toFile(path.join(OUTPUT_DIR, "01-foreground.png"));

  // Compute foreground coverage
  const fgRgba = await sharp(fgBuf).resize(W, H).ensureAlpha().raw().toBuffer();
  let fgPixels = 0;
  for (let i = 0; i < W * H; i++) if (fgRgba[i * 4 + 3] > 10) fgPixels++;
  console.log(`  Foreground coverage: ${(fgPixels / (W * H) * 100).toFixed(1)}%\n`);

  // ═══ Step 2: Create mask for inpainting (foreground area = white) ═══
  console.log("═══ Step 2: Create inpainting mask ═══");
  const maskBuf = Buffer.alloc(W * H);
  for (let i = 0; i < W * H; i++) {
    maskBuf[i] = fgRgba[i * 4 + 3] > 10 ? 255 : 0;
  }
  const maskPng = await sharp(maskBuf, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer();
  await sharp(maskPng).toFile(path.join(OUTPUT_DIR, "02-inpaint-mask.png"));
  console.log(`  Mask saved\n`);

  // ═══ Step 3: flux-fill-pro → inpaint background ═══
  console.log("═══ Step 3: flux-fill-pro (inpaint background) ═══");
  const t3 = Date.now();
  const maskDataUri = `data:image/png;base64,${maskPng.toString("base64")}`;
  const origDataUri = `data:image/png;base64,${origBuf.toString("base64")}`;

  const inpainted = await withRetry(() =>
    replicate.run("black-forest-labs/flux-fill-pro", {
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
  console.log(`  URL: ${bgUrl.slice(0, 80)}...`);
  const bgResp = await fetch(bgUrl);
  const bgBuf = Buffer.from(await bgResp.arrayBuffer());
  const bgMeta = await sharp(bgBuf).metadata();
  console.log(`  Background: ${bgMeta.width}x${bgMeta.height}`);
  console.log(`  ${Date.now() - t3}ms`);
  await sharp(bgBuf).resize(W, H).toFile(path.join(OUTPUT_DIR, "03-background-inpainted.png"));

  // ═══ Step 4: depth-anything-v2 ═══
  console.log("\n═══ Step 4: depth-anything-v2 ═══");
  const t4 = Date.now();
  const depthOut = await withRetry(() =>
    replicate.run("chenxwh/depth-anything-v2:b239ea33cff32bb7abb5db39ffe9a09c14cbc2894331d1ef66fe096eed88ebd4", {
      input: { image: dataUri },
    }),
  );
  // DA V2 returns { grey_depth: FileOutput, color_depth: FileOutput }
  const depthResult = depthOut as Record<string, unknown>;
  const greyDepth = depthResult.grey_depth ?? depthResult.gray_depth ?? depthResult;
  const depthUrl = String(greyDepth);
  console.log(`  URL: ${depthUrl.slice(0, 80)}...`);
  const depthResp = await fetch(depthUrl);
  const depthBuf = Buffer.from(await depthResp.arrayBuffer());
  console.log(`  ${Date.now() - t4}ms`);
  await sharp(depthBuf).resize(W, H).grayscale().toFile(path.join(OUTPUT_DIR, "04-depth.png"));

  // ═══ Step 5: Compose final layers ═══
  console.log("\n═══ Step 5: Compose layers ═══");

  // Layer 0: AI-inpainted background (full opaque, no holes)
  const bgPlate = await sharp(bgBuf).resize(W, H).ensureAlpha().png().toBuffer();
  await sharp(bgPlate).toFile(path.join(OUTPUT_DIR, "layer-bg.png"));
  console.log("  layer-bg.png — AI-inpainted clean background");

  // Layer 1: Foreground (bria alpha matting)
  const fgLayer = await sharp(fgBuf).resize(W, H).ensureAlpha().png().toBuffer();
  await sharp(fgLayer).toFile(path.join(OUTPUT_DIR, "layer-fg.png"));
  console.log("  layer-fg.png — AI-matted foreground");

  // Copy to public/layers for rendering
  const layersDir = path.join(process.cwd(), "public", "layers");
  fs.mkdirSync(layersDir, { recursive: true });
  fs.copyFileSync(path.join(OUTPUT_DIR, "layer-bg.png"), path.join(layersDir, "layer-0.png"));
  fs.copyFileSync(path.join(OUTPUT_DIR, "layer-fg.png"), path.join(layersDir, "layer-1.png"));
  fs.copyFileSync(path.join(OUTPUT_DIR, "04-depth.png"), path.join(layersDir, "depth.png"));

  // ═══ Step 6: Generate scene.json ═══
  const scene = {
    version: 1,
    source: path.basename(INPUT),
    resolution: [W, H],
    duration: 20,
    fps: 30,
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
          colorCycle: { speed: 5, period: 20, phaseOffset: 0 },
          glow: { intensity: 0.12, pulse: 0.6, period: 10 },
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
          colorCycle: { speed: 11, period: 10, phaseOffset: 180 },
          glow: { intensity: 0.2, pulse: 0.7, period: 5 },
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
      bloom: { strength: 0.7, radius: 0.5, threshold: 0.35 },
      chromaticAberration: { offset: 3.0, modulationOffset: 0.5 },
      parallax: { scale: 0 },
      haze: { intensity: 0 },
      feather: { radius: 0 },
    },
  };

  fs.writeFileSync("public/scene.json", JSON.stringify(scene, null, 2));
  console.log("\n  scene.json written (no parallax, no haze, pure shader)");
  console.log("\n═══ Ready to export ═══");
  console.log("Run: npx tsx scripts/export-layered.ts --title pro-pipeline --fps 30");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
