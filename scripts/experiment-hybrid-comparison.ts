/**
 * Deep Comparison: SAM3 vs DINO+SAM2 vs Hybrid
 *
 * Tests:
 * 1. DINO+SAM2: per-bbox mask quality, coverage, overlap
 * 2. SAM3 with object-focused + abstract prompts
 * 3. Hybrid: DINO+SAM2 (objects) + SAM3 (abstract regions)
 * 4. Union coverage comparison across all strategies
 */
import "dotenv/config";
import Replicate from "replicate";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { getSam3Mask, buildSam3Candidate } from "./lib/image-decompose.js";
import { withRetry, validateReplicateUrl } from "./lib/replicate-utils.js";

const INPUT_IMAGE = process.argv[2];
if (!INPUT_IMAGE || !fs.existsSync(INPUT_IMAGE)) {
  console.error("Usage: npx tsx scripts/experiment-hybrid-comparison.ts <image-path>");
  process.exit(1);
}

const DINO_MODEL = "adirik/grounding-dino";
const DINO_VERSION = "efd10a8ddc57ea28773327e881ce95e20cc1d734c589f7dd01d2036921ed78aa";
const SAM2_MODEL = "meta/sam-2";
const SAM2_VERSION = "fe97b453a6455861e3bac769b441ca1f1086110da7466dbb65cf1eecfd60dc83";

const OUTPUT_DIR = path.join(process.cwd(), "experiment-output", "hybrid-comparison");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

interface MaskResult {
  label: string;
  source: "sam3" | "dino+sam2";
  coverage: number;
  file: string;
  pixels: Uint8Array;
}

async function prepareImage(imagePath: string) {
  const MAX_DIM = 1536;
  let buf = await sharp(imagePath).png().toBuffer();
  const meta = await sharp(buf).metadata();
  if ((meta.width ?? 0) > MAX_DIM || (meta.height ?? 0) > MAX_DIM) {
    buf = await sharp(buf).resize(MAX_DIM, MAX_DIM, { fit: "inside" }).png().toBuffer();
  }
  const resized = await sharp(buf).metadata();
  const w = resized.width!;
  const h = resized.height!;
  const dataUri = `data:image/png;base64,${buf.toString("base64")}`;
  return { dataUri, width: w, height: h, buffer: buf };
}

async function computeMaskPixels(maskFile: string, width: number, height: number): Promise<{ pixels: Uint8Array; coverage: number }> {
  const raw = await sharp(maskFile).resize(width, height).grayscale().raw().toBuffer();
  const pixels = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
  let count = 0;
  for (let i = 0; i < pixels.length; i++) if (pixels[i] > 128) count++;
  return { pixels, coverage: count / (width * height) };
}

function computeUnion(masks: Uint8Array[], size: number): { unionPixels: number; coverage: number } {
  let count = 0;
  for (let i = 0; i < size; i++) {
    for (const m of masks) {
      if (m[i] > 128) { count++; break; }
    }
  }
  return { unionPixels: count, coverage: count / size };
}

function computeIoU(a: Uint8Array, b: Uint8Array, size: number): number {
  let inter = 0, union = 0;
  for (let i = 0; i < size; i++) {
    const aa = a[i] > 128, bb = b[i] > 128;
    if (aa && bb) inter++;
    if (aa || bb) union++;
  }
  return union === 0 ? 0 : inter / union;
}

async function runDinoSam2(
  replicate: Replicate, dataUri: string, width: number, height: number, query: string,
): Promise<MaskResult[]> {
  console.log(`\n  DINO query: "${query}"`);
  const dinoStart = Date.now();
  const dinoOutput = await withRetry(() =>
    replicate.run(`${DINO_MODEL}:${DINO_VERSION}`, {
      input: { image: dataUri, query, box_threshold: 0.25, text_threshold: 0.25, show_visualisation: false },
    }),
  ) as { detections: { label: string; confidence: number; bbox: number[] }[] };
  console.log(`  DINO: ${dinoOutput.detections.length} detections (${Date.now() - dinoStart}ms)`);

  const results: MaskResult[] = [];
  const sorted = [...dinoOutput.detections].sort((a, b) => b.confidence - a.confidence).slice(0, 6);

  for (const det of sorted) {
    const bboxStr = det.bbox.map(Math.round).join(",");
    console.log(`  SAM2 "${det.label}" (${(det.confidence * 100).toFixed(0)}%) bbox=[${bboxStr}]...`);

    try {
      const sam2Start = Date.now();
      const output = await withRetry(() =>
        replicate.run(`${SAM2_MODEL}:${SAM2_VERSION}`, {
          input: { image: dataUri, input_box: bboxStr },
        }),
      ) as { combined_mask: { toString(): string }; individual_masks: { toString(): string }[] };
      console.log(`    SAM2: ${output.individual_masks.length} masks (${Date.now() - sam2Start}ms)`);

      // Use first individual mask (best IoU with bbox)
      const maskUrl = output.individual_masks[0].toString();
      validateReplicateUrl(maskUrl);
      const resp = await fetch(maskUrl);
      const maskBuf = Buffer.from(await resp.arrayBuffer());

      const outFile = path.join(OUTPUT_DIR, `dino-sam2-${det.label.replace(/\s+/g, "-")}.png`);
      await sharp(maskBuf).resize(width, height).grayscale().png().toFile(outFile);

      const { pixels, coverage } = await computeMaskPixels(outFile, width, height);
      console.log(`    → ${(coverage * 100).toFixed(1)}% coverage`);
      results.push({ label: det.label, source: "dino+sam2", coverage, file: outFile, pixels });
    } catch (err) {
      console.log(`    ✗ FAILED: ${err instanceof Error ? err.message : err}`);
    }
  }
  return results;
}

async function runSam3(
  replicate: Replicate, dataUri: string, originalImage: Buffer, width: number, height: number, prompts: string[],
): Promise<MaskResult[]> {
  const results: MaskResult[] = [];
  const outDir = path.join(OUTPUT_DIR, "sam3");
  fs.mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < prompts.length; i++) {
    console.log(`  SAM3[${i}]: "${prompts[i]}"...`);
    const maskBuf = await getSam3Mask(replicate, dataUri, prompts[i], 0.25);
    if (!maskBuf) { console.log(`    → SKIP`); continue; }

    const candidate = await buildSam3Candidate(maskBuf, originalImage, null, width, height, prompts[i], i, outDir, 0.001);
    if (!candidate) { console.log(`    → SKIP (empty)`); continue; }

    const { pixels, coverage } = await computeMaskPixels(candidate.filePath, width, height);
    console.log(`    → ${(coverage * 100).toFixed(1)}% coverage`);
    results.push({ label: prompts[i], source: "sam3", coverage, file: candidate.filePath, pixels });
  }
  return results;
}

async function main() {
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });
  const { dataUri, width, height, buffer } = await prepareImage(INPUT_IMAGE);
  const totalPixels = width * height;
  console.log(`Image: ${width}x${height}\n`);

  // ═══ Strategy A: DINO+SAM2 (objects only) ═══
  console.log("═══ Strategy A: DINO+SAM2 ═══");
  const dinoPrompts = "golden Buddha statue, blue lotus petal base, orange circular halo, green nebula wisps, cosmic starfield background";
  const dinoResults = await runDinoSam2(replicate, dataUri, width, height, dinoPrompts);

  // ═══ Strategy B: SAM3 (mixed prompts — best hand-crafted from earlier) ═══
  console.log("\n═══ Strategy B: SAM3 (hand-crafted) ═══");
  const sam3Prompts = [
    "golden Buddha statue with robes",
    "blue and orange lotus petal base",
    "large orange circular halo disc",
    "dark cosmic background with stars",
    "green and orange nebula wisps",
  ];
  const sam3Results = await runSam3(replicate, dataUri, buffer, width, height, sam3Prompts);

  // ═══ Strategy C: Hybrid (DINO+SAM2 objects + SAM3 abstract) ═══
  console.log("\n═══ Strategy C: Hybrid ═══");
  const sam3AbstractPrompts = [
    "dark cosmic background with stars",
    "green and orange nebula wisps",
  ];
  const sam3AbstractResults = await runSam3(replicate, dataUri, buffer, width, height, sam3AbstractPrompts);
  const hybridResults = [...dinoResults, ...sam3AbstractResults];

  // ═══ Analysis ═══
  console.log("\n" + "═".repeat(70));
  console.log("DETAILED COMPARISON");
  console.log("═".repeat(70));

  const strategies: [string, MaskResult[]][] = [
    ["A: DINO+SAM2", dinoResults],
    ["B: SAM3", sam3Results],
    ["C: Hybrid", hybridResults],
  ];

  for (const [name, results] of strategies) {
    console.log(`\n── ${name} ──`);
    for (const r of results) {
      console.log(`  ${r.coverage > 0.01 ? "✓" : "~"} [${r.source.padEnd(9)}] ${r.label} → ${(r.coverage * 100).toFixed(1)}%`);
    }
    const allPixels = results.filter(r => r.coverage > 0).map(r => r.pixels);
    const union = computeUnion(allPixels, totalPixels);
    const validCount = results.filter(r => r.coverage > 0.01).length;
    console.log(`  Union coverage: ${(union.coverage * 100).toFixed(1)}%`);
    console.log(`  Valid masks: ${validCount}/${results.length}`);
    console.log(`  API calls: ${results.length} (${name.includes("DINO") ? `+${results.filter(r => r.source === "dino+sam2").length} DINO` : ""})`);
  }

  // Cross-strategy overlap
  console.log("\n── Overlap Analysis ──");
  if (dinoResults.length > 0 && sam3Results.length > 0) {
    for (const d of dinoResults) {
      for (const s of sam3Results) {
        const iou = computeIoU(d.pixels, s.pixels, totalPixels);
        if (iou > 0.05) {
          console.log(`  IoU: DINO "${d.label}" ↔ SAM3 "${s.label}" = ${(iou * 100).toFixed(1)}%`);
        }
      }
    }
  }

  // Coverage gap analysis
  console.log("\n── Gap Analysis ──");
  const dinoPixels = dinoResults.filter(r => r.coverage > 0).map(r => r.pixels);
  const sam3Pixels = sam3Results.filter(r => r.coverage > 0).map(r => r.pixels);

  let dinoOnly = 0, sam3Only = 0, both = 0, neither = 0;
  for (let i = 0; i < totalPixels; i++) {
    const inDino = dinoPixels.some(p => p[i] > 128);
    const inSam3 = sam3Pixels.some(p => p[i] > 128);
    if (inDino && inSam3) both++;
    else if (inDino) dinoOnly++;
    else if (inSam3) sam3Only++;
    else neither++;
  }
  console.log(`  DINO+SAM2 only: ${(dinoOnly / totalPixels * 100).toFixed(1)}%`);
  console.log(`  SAM3 only:      ${(sam3Only / totalPixels * 100).toFixed(1)}%`);
  console.log(`  Both:           ${(both / totalPixels * 100).toFixed(1)}%`);
  console.log(`  Neither:        ${(neither / totalPixels * 100).toFixed(1)}%`);

  // Cost comparison
  console.log("\n── Cost Comparison ──");
  const dinoCallCount = 1; // single DINO call for all prompts
  const sam2CallCount = dinoResults.filter(r => r.source === "dino+sam2").length;
  const costA = dinoCallCount * 0.0015 + sam2CallCount * 0.026;
  const costB = sam3Results.length * 0.0015;
  const costC = costA + sam3AbstractResults.length * 0.0015;
  console.log(`  A (DINO+SAM2):  $${costA.toFixed(3)} (${dinoCallCount} DINO + ${sam2CallCount} SAM2)`);
  console.log(`  B (SAM3):       $${costB.toFixed(3)} (${sam3Results.length} SAM3)`);
  console.log(`  C (Hybrid):     $${costC.toFixed(3)} (${dinoCallCount} DINO + ${sam2CallCount} SAM2 + ${sam3AbstractResults.length} SAM3)`);

  // Final verdict table
  console.log("\n" + "═".repeat(70));
  console.log("VERDICT");
  console.log("═".repeat(70));
  const unionA = computeUnion(dinoPixels, totalPixels);
  const unionB = computeUnion(sam3Pixels, totalPixels);
  const hybridPixels = hybridResults.filter(r => r.coverage > 0).map(r => r.pixels);
  const unionC = computeUnion(hybridPixels, totalPixels);

  console.log(`\n┌───────────────────┬────────────┬─────────┬──────────┬──────────┐`);
  console.log(`│ Strategy          │ Union Cov  │ Masks   │ Cost     │ Time(est)│`);
  console.log(`├───────────────────┼────────────┼─────────┼──────────┼──────────┤`);
  console.log(`│ A: DINO+SAM2      │ ${(unionA.coverage * 100).toFixed(1).padStart(7)}%  │ ${String(dinoResults.filter(r => r.coverage > 0.01).length).padStart(3)}/${dinoResults.length}   │ $${costA.toFixed(3).padStart(5)}  │ ~${Math.ceil(3 + sam2CallCount * 27)}s     │`);
  console.log(`│ B: SAM3           │ ${(unionB.coverage * 100).toFixed(1).padStart(7)}%  │ ${String(sam3Results.filter(r => r.coverage > 0.01).length).padStart(3)}/${sam3Results.length}   │ $${costB.toFixed(3).padStart(5)}  │ ~${Math.ceil(sam3Results.length * 5)}s     │`);
  console.log(`│ C: Hybrid         │ ${(unionC.coverage * 100).toFixed(1).padStart(7)}%  │ ${String(hybridResults.filter(r => r.coverage > 0.01).length).padStart(3)}/${hybridResults.length}   │ $${costC.toFixed(3).padStart(5)}  │ ~${Math.ceil(3 + sam2CallCount * 27 + sam3AbstractResults.length * 5)}s     │`);
  console.log(`└───────────────────┴────────────┴─────────┴──────────┴──────────┘`);

  console.log(`\nOutput saved to: ${OUTPUT_DIR}/`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
