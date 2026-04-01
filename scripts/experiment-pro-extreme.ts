/**
 * Pro Pipeline EXTREME:
 * - bria: foreground (buddha + lotus)
 * - SAM3: separate halo from background
 * - flux-fill: clean background
 * - 4 layers with EXTREME shader differences + blend modes
 */
import "dotenv/config";
import Replicate from "replicate";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { getToken, withRetry } from "./lib/replicate-utils.js";
import { getSam3Mask, SAM3_MODEL, SAM3_VERSION, DAV2_MODEL, DAV2_VERSION } from "./lib/image-decompose.js";

const INPUT = process.argv[2] ?? "input.png";
const OUTPUT_DIR = path.join(process.cwd(), "experiment-output", "pro-extreme");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function extractUrl(output: unknown): string {
  if (typeof output === "string") return output;
  const str = String(output);
  if (str.startsWith("http")) return str;
  if (output && typeof output === "object" && "url" in output) {
    const urlVal = (output as Record<string, unknown>).url;
    return typeof urlVal === "function" ? (urlVal as () => string)() : String(urlVal);
  }
  return str;
}

async function main() {
  const replicate = new Replicate({ auth: getToken() });
  const origBuf = await sharp(INPUT).resize(1536, 1536, { fit: "inside" }).png().toBuffer();
  const meta = await sharp(origBuf).metadata();
  const W = meta.width!, H = meta.height!;
  const dataUri = `data:image/png;base64,${origBuf.toString("base64")}`;
  console.log(`Input: ${W}x${H}\n`);

  // ═══ Parallel: bria + SAM3(halo) + SAM3(nebula) + SAM3(lotus) + depth ═══
  console.log("═══ Parallel API calls ═══");
  const t0 = Date.now();

  const [briaOut, haloMask, nebulaMask, lotusMask, depthOut] = await Promise.all([
    // bria foreground
    withRetry(() => replicate.run("bria/remove-background", { input: { image: dataUri } })),
    // SAM3 halo
    getSam3Mask(replicate, dataUri, "large orange circular halo disc behind head", 0.25),
    // SAM3 nebula
    getSam3Mask(replicate, dataUri, "green and orange nebula wisps and cosmic clouds", 0.25),
    // SAM3 lotus
    getSam3Mask(replicate, dataUri, "blue and orange lotus flower petal base", 0.25),
    // Depth
    withRetry(() => replicate.run(`${DAV2_MODEL}:${DAV2_VERSION}`, { input: { image: dataUri } })),
  ]);
  console.log(`  All API calls: ${Date.now() - t0}ms\n`);

  // Process bria foreground
  const fgUrl = extractUrl(briaOut);
  const fgBuf = Buffer.from(await (await fetch(fgUrl)).arrayBuffer());
  const fgResized = await sharp(fgBuf).resize(W, H).ensureAlpha().png().toBuffer();
  await sharp(fgResized).toFile(path.join(OUTPUT_DIR, "fg-buddha.png"));
  console.log("  fg-buddha.png — bria alpha matting");

  // Process SAM3 masks → apply to original image
  async function maskToLayer(mask: Buffer | null, name: string): Promise<Buffer | null> {
    if (!mask) { console.log(`  ${name} — SAM3 returned null`); return null; }
    const gray = await sharp(mask).resize(W, H).grayscale().raw().toBuffer();
    const origRaw = await sharp(origBuf).resize(W, H).ensureAlpha().raw().toBuffer();
    const out = Buffer.alloc(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      if (gray[i] > 128) {
        out[i * 4] = origRaw[i * 4];
        out[i * 4 + 1] = origRaw[i * 4 + 1];
        out[i * 4 + 2] = origRaw[i * 4 + 2];
        out[i * 4 + 3] = gray[i]; // use grayscale value as alpha (soft edge)
      }
    }
    const png = await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
    await sharp(png).toFile(path.join(OUTPUT_DIR, `${name}.png`));
    const coverage = Array.from(gray).filter(v => v > 128).length / (W * H);
    console.log(`  ${name}.png — ${(coverage * 100).toFixed(1)}% coverage`);
    return png;
  }

  const haloLayer = await maskToLayer(haloMask, "halo");
  const nebulaLayer = await maskToLayer(nebulaMask, "nebula");
  const lotusLayer = await maskToLayer(lotusMask, "lotus");

  // Inpainting mask: everything that is foreground (bria alpha > 10)
  const fgRaw = await sharp(fgResized).raw().toBuffer();
  const inpaintMask = Buffer.alloc(W * H);
  for (let i = 0; i < W * H; i++) inpaintMask[i] = fgRaw[i * 4 + 3] > 10 ? 255 : 0;
  const maskPng = await sharp(inpaintMask, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer();

  // Flux Fill Pro inpainting
  console.log("\n═══ flux-fill-pro (inpaint) ═══");
  const t2 = Date.now();
  const inpainted = await withRetry(() =>
    replicate.run("black-forest-labs/flux-fill-pro", {
      input: {
        image: `data:image/png;base64,${origBuf.toString("base64")}`,
        mask: `data:image/png;base64,${maskPng.toString("base64")}`,
        prompt: "cosmic dark space with scattered stars, green and orange nebula gas clouds, seamless extension of the surrounding cosmic background, no objects, no figures",
        guidance: 50,
        output_format: "png",
      },
    }),
  );
  const bgUrl = extractUrl(inpainted);
  const bgBuf = Buffer.from(await (await fetch(bgUrl)).arrayBuffer());
  await sharp(bgBuf).resize(W, H).toFile(path.join(OUTPUT_DIR, "bg-inpainted.png"));
  console.log(`  ${Date.now() - t2}ms`);

  // Depth
  const depthResult = depthOut as Record<string, unknown>;
  const greyDepth = depthResult.grey_depth ?? depthResult;
  const depthUrl = String(greyDepth);
  if (depthUrl.startsWith("http")) {
    const depthBuf = Buffer.from(await (await fetch(depthUrl)).arrayBuffer());
    await sharp(depthBuf).resize(W, H).grayscale().toFile(path.join(OUTPUT_DIR, "depth.png"));
  }

  // ═══ Copy layers to public/ ═══
  const layersDir = path.join(process.cwd(), "public", "layers");
  fs.mkdirSync(layersDir, { recursive: true });

  // Layer stack: bg(inpainted) → nebula(screen) → halo(add) → lotus → buddha(foreground)
  const layers: { src: string; dest: string; role: string; blend: string }[] = [
    { src: path.join(OUTPUT_DIR, "bg-inpainted.png"), dest: "layer-0.png", role: "background-plate", blend: "normal" },
  ];
  if (nebulaLayer) layers.push({ src: path.join(OUTPUT_DIR, "nebula.png"), dest: "layer-1.png", role: "background", blend: "screen" });
  if (lotusLayer) layers.push({ src: path.join(OUTPUT_DIR, "lotus.png"), dest: "layer-2.png", role: "midground", blend: "normal" });
  if (haloLayer) layers.push({ src: path.join(OUTPUT_DIR, "halo.png"), dest: "layer-3.png", role: "midground", blend: "add" });
  layers.push({ src: path.join(OUTPUT_DIR, "fg-buddha.png"), dest: `layer-${layers.length}.png`, role: "subject", blend: "normal" });

  for (const l of layers) {
    fs.copyFileSync(l.src, path.join(layersDir, l.dest));
  }

  // ═══ scene.json — EXTREME settings ═══
  const sceneLayers = layers.map((l, i) => ({
    id: `layer-${i}`,
    file: `layers/${l.dest}`,
    zIndex: i,
    opacity: 1,
    blending: l.blend,
    role: l.role,
    meanDepth: [50, 80, 140, 30, 180][i] ?? 100,
    animation: {
      colorCycle: {
        // Extreme speed differences: bg slow dreamy, fg fast vibrant
        speed: [3, 7, 9, 15, 19][i] ?? 9,
        period: [20, 10, 10, 5, 4][i] ?? 10,
        phaseOffset: i * 72,
      },
      glow: {
        // Halo and nebula glow HARD, bg subtle, buddha moderate
        intensity: [0.08, 0.3, 0.15, 0.5, 0.2][i] ?? 0.15,
        pulse: [0.4, 0.8, 0.6, 0.9, 0.7][i] ?? 0.6,
        period: [20, 10, 10, 5, 4][i] ?? 10,
      },
      // Background: low saturation, dreamy. Foreground: punchy, vivid
      saturationBoost: [4.0, 7.0, 6.0, 8.0, 5.5][i] ?? 6.0,
      luminanceKey: [0.6, 1.2, 1.0, 1.5, 0.8][i] ?? 1.0,
      satBlendLow: 0.05,
      satBlendHigh: 0.3,
      satInjectionMul: [0.3, 0.6, 0.5, 0.7, 0.4][i] ?? 0.5,
      glowPulseFloor: [0.2, 0.4, 0.3, 0.5, 0.3][i] ?? 0.3,
      lumExponent: [1.5, 2.0, 1.8, 2.5, 1.6][i] ?? 1.8,
      // HueKey: nebula and halo get extreme hue separation
      hueKey: [1.0, 2.5, 1.5, 3.0, 1.2][i] ?? 1.5,
      hueSpeed: [2.0, 4.0, 3.0, 5.0, 2.5][i] ?? 3.0,
    },
  }));

  const scene = {
    version: 1,
    source: path.basename(INPUT),
    resolution: [W, H],
    duration: 20,
    fps: 30,
    layers: sceneLayers,
    effects: {
      bloom: { strength: 0.8, radius: 0.6, threshold: 0.3 },
      chromaticAberration: { offset: 3.5, modulationOffset: 0.6 },
      parallax: { scale: 0 },
      haze: { intensity: 0 },
      feather: { radius: 0 },
    },
  };

  fs.writeFileSync("public/scene.json", JSON.stringify(scene, null, 2));
  console.log(`\n═══ ${layers.length} layers, scene.json written ═══`);
  console.log("Layers:");
  for (const l of layers) console.log(`  ${l.dest} — ${l.role} (${l.blend})`);
}

main().catch((err) => { console.error("Error:", err.message); process.exit(1); });
