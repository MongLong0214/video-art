/**
 * Trace mask through every pipeline step to find where coverage is lost
 */
import "dotenv/config";
import Replicate from "replicate";
import sharp from "sharp";
import fs from "node:fs";
import { getToken } from "./lib/replicate-utils.js";
import { getSam3Mask } from "./lib/image-decompose.js";
import { fillMaskHoles, applyAlphaMatte } from "./lib/mask-postprocess.js";

const INPUT = "/Users/isaac/Downloads/monglong_studio_a_golden_buddha_statue_floating_in_space_head_r_55d23627-69e6-43a2-94d3-689652dedbbc.PNG";
const replicate = new Replicate({ auth: getToken() });
const origBuf = fs.readFileSync(INPUT);
const origMeta = await sharp(origBuf).metadata();
const W = origMeta.width!, H = origMeta.height!;

const PROMPTS = [
  "golden Buddha statue with robes",
  "blue and orange lotus petal base",
  "large orange circular halo",
  "dark cosmic background with stars",
  "green and orange nebula wisps",
];

const dataUri = `data:image/png;base64,${(await sharp(origBuf).png().toBuffer()).toString("base64")}`;

async function measureCoverage(buf: Buffer, w: number, h: number, label: string): Promise<number> {
  const raw = await sharp(buf).resize(w, h).grayscale().raw().toBuffer();
  let above128 = 0, above0 = 0;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] > 128) above128++;
    if (raw[i] > 0) above0++;
  }
  const pct128 = above128 / (w * h) * 100;
  const pct0 = above0 / (w * h) * 100;
  console.log(`  ${label}: ${pct128.toFixed(1)}% (>128), ${pct0.toFixed(1)}% (>0)`);
  return pct128;
}

console.log(`Image: ${W}x${H}\n`);

for (const prompt of PROMPTS) {
  console.log(`\n═══ "${prompt}" ═══`);

  const mask = await getSam3Mask(replicate, dataUri, prompt, 0.25);
  if (!mask) { console.log("  getSam3Mask → NULL"); continue; }

  const meta = await sharp(mask).metadata();
  console.log(`  SAM3 raw: ${meta.width}x${meta.height} ${meta.channels}ch`);
  await measureCoverage(mask, W, H, "1. raw SAM3 mask");

  // Step: normalize to 1ch binary
  const normalized = await sharp(mask).resize(W, H).grayscale().threshold(128).png().toBuffer();
  await measureCoverage(normalized, W, H, "2. after threshold(128)");

  // Step: fillMaskHoles
  const filled = await fillMaskHoles(normalized, W, H);
  await measureCoverage(filled, W, H, "3. after fillMaskHoles");

  // Step: applyAlphaMatte
  const matted = await applyAlphaMatte(filled, W, H);
  await measureCoverage(matted, W, H, "4. after applyAlphaMatte");

  // Step: what applyMaskToImage would see (threshold 128 on matted)
  const finalGray = await sharp(matted).resize(W, H).grayscale().raw().toBuffer();
  let finalAbove128 = 0;
  for (let i = 0; i < finalGray.length; i++) if (finalGray[i] > 128) finalAbove128++;
  console.log(`  5. applyMaskToImage would see: ${(finalAbove128 / (W * H) * 100).toFixed(1)}% coverage`);
}
