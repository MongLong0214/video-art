/**
 * Experiment: SAM3 prompt quality comparison
 *
 * (A) SAM3 + VLM auto-prompts (current pipeline baseline)
 * (B) SAM3 + hand-crafted specific prompts
 *
 * Measures: per-mask coverage %, total union coverage, mask count
 */
import "dotenv/config";
import Replicate from "replicate";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const INPUT_IMAGE = process.argv[2];
if (!INPUT_IMAGE || !fs.existsSync(INPUT_IMAGE)) {
  console.error("Usage: npx tsx scripts/experiment-sam3-prompts.ts <image-path>");
  process.exit(1);
}

const OUTPUT_DIR = path.join(process.cwd(), "experiment-output");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Import pipeline functions
import { getVlmPrompts, getSam3Mask, buildSam3Candidate } from "./lib/image-decompose.js";
import { getToken, withRetry } from "./lib/replicate-utils.js";

async function prepareImage(imagePath: string): Promise<{ dataUri: string; width: number; height: number; buffer: Buffer }> {
  const meta = await sharp(imagePath).metadata();
  const width = meta.width!;
  const height = meta.height!;

  // Resize if too large (Replicate limit)
  const MAX_DIM = 1536;
  let buf: Buffer;
  if (width > MAX_DIM || height > MAX_DIM) {
    buf = await sharp(imagePath).resize(MAX_DIM, MAX_DIM, { fit: "inside" }).png().toBuffer();
  } else {
    buf = await sharp(imagePath).png().toBuffer();
  }
  const resized = await sharp(buf).metadata();
  const dataUri = `data:image/png;base64,${buf.toString("base64")}`;
  return { dataUri, width: resized.width!, height: resized.height!, buffer: buf };
}

async function runSam3WithPrompts(
  replicate: Replicate,
  dataUri: string,
  originalImage: Buffer,
  width: number,
  height: number,
  prompts: string[],
  label: string,
): Promise<{ prompt: string; coverage: number; file: string }[]> {
  const results: { prompt: string; coverage: number; file: string }[] = [];
  const outDir = path.join(OUTPUT_DIR, label);
  fs.mkdirSync(outDir, { recursive: true });

  // Depth map (shared)
  let depthGray: Uint8Array | null = null;

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    console.log(`  [${label}] SAM3[${i}]: "${prompt}"...`);

    const maskBuf = await getSam3Mask(replicate, dataUri, prompt, 0.25);
    if (!maskBuf) {
      console.log(`    → SKIP (mask failed)`);
      results.push({ prompt, coverage: 0, file: "" });
      continue;
    }

    const candidate = await buildSam3Candidate(
      maskBuf, originalImage, depthGray, width, height,
      prompt, i, outDir, 0.001,
    );

    if (!candidate) {
      console.log(`    → SKIP (empty mask)`);
      results.push({ prompt, coverage: 0, file: "" });
      continue;
    }

    console.log(`    → ${(candidate.coverage * 100).toFixed(1)}% coverage`);
    results.push({ prompt, coverage: candidate.coverage, file: candidate.filePath });
  }

  // Compute union coverage
  const unionMask = new Uint8Array(width * height);
  for (const r of results) {
    if (!r.file) continue;
    try {
      const rgba = await sharp(r.file).ensureAlpha().resize(width, height).raw().toBuffer();
      for (let p = 0; p < width * height; p++) {
        if (rgba[p * 4 + 3] > 0) unionMask[p] = 1;
      }
    } catch { /* skip */ }
  }
  let unionPixels = 0;
  for (let p = 0; p < unionMask.length; p++) if (unionMask[p]) unionPixels++;
  const unionCoverage = unionPixels / (width * height);

  console.log(`\n  [${label}] Union coverage: ${(unionCoverage * 100).toFixed(1)}%`);
  console.log(`  [${label}] Valid masks: ${results.filter(r => r.coverage > 0).length}/${prompts.length}`);

  return results;
}

async function main() {
  const token = getToken();
  const replicate = new Replicate({ auth: token });

  console.log(`\nPreparing image: ${INPUT_IMAGE}`);
  const { dataUri, width, height, buffer } = await prepareImage(INPUT_IMAGE);
  console.log(`Image: ${width}x${height}\n`);

  // ── (A) VLM auto-prompts (current pipeline) ──
  console.log("═══ (A) SAM3 + VLM auto-prompts ═══");
  const vlmPrompts = await getVlmPrompts(replicate, INPUT_IMAGE, { vlmMaxPrompts: 6 });
  console.log(`VLM prompts: ${JSON.stringify(vlmPrompts)}\n`);
  const resultsA = await runSam3WithPrompts(replicate, dataUri, buffer, width, height, vlmPrompts, "A-vlm");

  // ── (B) Hand-crafted specific prompts ──
  console.log("\n═══ (B) SAM3 + hand-crafted prompts ═══");
  const handPrompts = [
    "golden Buddha statue with robes",
    "blue and orange lotus petal base",
    "large orange circular halo disc",
    "dark cosmic background with stars",
    "green and orange nebula wisps",
    "Buddha head and curled hair",
  ];
  console.log(`Hand prompts: ${JSON.stringify(handPrompts)}\n`);
  const resultsB = await runSam3WithPrompts(replicate, dataUri, buffer, width, height, handPrompts, "B-hand");

  // ── Summary ──
  console.log("\n" + "═".repeat(60));
  console.log("EXPERIMENT SUMMARY");
  console.log("═".repeat(60));

  console.log("\n(A) VLM auto-prompts:");
  for (const r of resultsA) {
    console.log(`  ${r.coverage > 0 ? "✓" : "✗"} ${r.prompt} → ${(r.coverage * 100).toFixed(1)}%`);
  }

  console.log("\n(B) Hand-crafted prompts:");
  for (const r of resultsB) {
    console.log(`  ${r.coverage > 0 ? "✓" : "✗"} ${r.prompt} → ${(r.coverage * 100).toFixed(1)}%`);
  }

  const totalA = resultsA.filter(r => r.coverage > 0).length;
  const totalB = resultsB.filter(r => r.coverage > 0).length;
  const unionA = resultsA.reduce((sum, r) => sum + r.coverage, 0);
  const unionB = resultsB.reduce((sum, r) => sum + r.coverage, 0);

  console.log(`\n┌─────────────────────┬──────────────┬──────────────┐`);
  console.log(`│ Metric              │ (A) VLM      │ (B) Hand     │`);
  console.log(`├─────────────────────┼──────────────┼──────────────┤`);
  console.log(`│ Valid masks         │ ${String(totalA).padStart(5)}/${resultsA.length}     │ ${String(totalB).padStart(5)}/${resultsB.length}     │`);
  console.log(`│ Sum coverage        │ ${(unionA * 100).toFixed(1).padStart(8)}%   │ ${(unionB * 100).toFixed(1).padStart(8)}%   │`);
  console.log(`│ Cost (est)          │   ~$${(resultsA.length * 0.0015).toFixed(3)}    │   ~$${(resultsB.length * 0.0015).toFixed(3)}    │`);
  console.log(`└─────────────────────┴──────────────┴──────────────┘`);

  console.log(`\nOutput saved to: ${OUTPUT_DIR}/`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
