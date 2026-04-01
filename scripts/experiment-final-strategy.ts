/**
 * Final Strategy Comparison — Real API Tests
 *
 * A: fal.ai SAM3 text only (current baseline)
 * B: DINO bbox → fal.ai SAM3 text + box_prompts (hybrid)
 * C: schananas/grounded_sam (single API, DINO+SAM1 integrated)
 * D: DINO bbox → crop → Replicate SAM3 text (indirect bbox)
 */
import "dotenv/config";
import Replicate from "replicate";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { getToken, withRetry, validateReplicateUrl, getProviderToken } from "./lib/replicate-utils.js";

const INPUT_IMAGE = process.argv[2];
if (!INPUT_IMAGE || !fs.existsSync(INPUT_IMAGE)) {
  console.error("Usage: npx tsx scripts/experiment-final-strategy.ts <image-path>");
  process.exit(1);
}

const DINO_MODEL = "adirik/grounding-dino";
const DINO_VERSION = "efd10a8ddc57ea28773327e881ce95e20cc1d734c589f7dd01d2036921ed78aa";
const SAM3_MODEL = "mattsays/sam3-image";
const SAM3_VERSION = "d73db077226443ba4fafd34e233b3626b552eac2a433f90c7c32a9ac89bd9e72";
const FAL_SAM3_ENDPOINT = "fal-ai/sam-3/image";
const GROUNDED_SAM_MODEL = "schananas/grounded_sam";

const OUTPUT_DIR = path.join(process.cwd(), "experiment-output", "final-strategy");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const PROMPTS = [
  "golden Buddha statue",
  "blue and orange lotus petal base",
  "orange circular halo",
  "dark cosmic background with stars",
  "green nebula wisps",
];

interface MaskResult {
  label: string;
  coverage: number;
  file: string;
}

async function prepareImage(imagePath: string) {
  const MAX_DIM = 1536;
  let buf = await sharp(imagePath).png().toBuffer();
  const meta = await sharp(buf).metadata();
  if ((meta.width ?? 0) > MAX_DIM || (meta.height ?? 0) > MAX_DIM) {
    buf = await sharp(buf).resize(MAX_DIM, MAX_DIM, { fit: "inside" }).png().toBuffer();
  }
  const resized = await sharp(buf).metadata();
  return { width: resized.width!, height: resized.height!, buffer: buf };
}

function toDataUri(buf: Buffer): string {
  return `data:image/png;base64,${buf.toString("base64")}`;
}

async function saveMask(maskBuf: Buffer, w: number, h: number, outPath: string): Promise<number> {
  await sharp(maskBuf).resize(w, h).grayscale().png().toFile(outPath);
  const raw = await sharp(outPath).raw().toBuffer();
  let count = 0;
  for (let i = 0; i < raw.length; i++) if (raw[i] > 128) count++;
  return count / (w * h);
}

function computeUnionCoverage(masks: Buffer[], w: number, h: number): Promise<number> {
  return (async () => {
    const total = w * h;
    const union = new Uint8Array(total);
    for (const m of masks) {
      const raw = await sharp(m).resize(w, h).grayscale().raw().toBuffer();
      for (let i = 0; i < total; i++) if (raw[i] > 128) union[i] = 1;
    }
    let count = 0;
    for (let i = 0; i < total; i++) if (union[i]) count++;
    return count / total;
  })();
}

// ═══ Strategy A: fal.ai SAM3 text only ═══
async function strategyA(dataUri: string, w: number, h: number): Promise<MaskResult[]> {
  const falKey = getProviderToken("fal");
  const results: MaskResult[] = [];
  const dir = path.join(OUTPUT_DIR, "A-fal-sam3-text");
  fs.mkdirSync(dir, { recursive: true });

  for (let i = 0; i < PROMPTS.length; i++) {
    const prompt = PROMPTS[i];
    console.log(`  A[${i}]: "${prompt}"...`);
    try {
      const resp = await withRetry(async () => {
        const r = await fetch(`https://fal.run/${FAL_SAM3_ENDPOINT}`, {
          method: "POST",
          headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: dataUri, prompt, mask_only: true }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Record<string, unknown>>;
      });
      const maskUrl = (resp as Record<string, unknown>).mask_url as string
        ?? ((resp as Record<string, unknown>).output as Record<string, unknown>)?.url as string ?? "";
      if (!maskUrl) { console.log(`    → no mask`); results.push({ label: prompt, coverage: 0, file: "" }); continue; }
      const maskResp = await fetch(maskUrl);
      const maskBuf = Buffer.from(await maskResp.arrayBuffer());
      const outFile = path.join(dir, `mask-${i}.png`);
      const cov = await saveMask(maskBuf, w, h, outFile);
      console.log(`    → ${(cov * 100).toFixed(1)}%`);
      results.push({ label: prompt, coverage: cov, file: outFile });
    } catch (err) {
      console.log(`    → FAIL: ${err instanceof Error ? err.message : err}`);
      results.push({ label: prompt, coverage: 0, file: "" });
    }
  }
  return results;
}

// ═══ Strategy B: DINO bbox → fal.ai SAM3 text + box_prompts ═══
async function strategyB(replicate: Replicate, dataUri: string, w: number, h: number): Promise<MaskResult[]> {
  const falKey = getProviderToken("fal");
  const results: MaskResult[] = [];
  const dir = path.join(OUTPUT_DIR, "B-dino-fal-sam3-box");
  fs.mkdirSync(dir, { recursive: true });

  // Step 1: DINO for all prompts at once
  console.log(`  B: DINO detection...`);
  const dinoQuery = PROMPTS.join(", ");
  const dinoOut = await withRetry(() =>
    replicate.run(`${DINO_MODEL}:${DINO_VERSION}`, {
      input: { image: dataUri, query: dinoQuery, box_threshold: 0.2, text_threshold: 0.2, show_visualisation: false },
    }),
  ) as { detections: { label: string; confidence: number; bbox: number[] }[] };
  console.log(`  B: DINO found ${dinoOut.detections.length} detections`);

  // Step 2: For each prompt, find matching DINO bbox and send to fal SAM3 with box_prompts
  for (let i = 0; i < PROMPTS.length; i++) {
    const prompt = PROMPTS[i];
    // Find best DINO match for this prompt (fuzzy: check if any detection label contains keywords)
    const keywords = prompt.toLowerCase().split(/\s+/);
    const match = dinoOut.detections.find(d =>
      keywords.some(k => d.label.toLowerCase().includes(k)),
    );

    console.log(`  B[${i}]: "${prompt}" ${match ? `+ bbox [${match.bbox.map(Math.round).join(",")}]` : "(no bbox)"}...`);

    try {
      const body: Record<string, unknown> = { image_url: dataUri, prompt, mask_only: true };
      if (match) {
        // Convert DINO pixel xyxy to box_prompts format
        body.box_prompts = [{
          x_min: Math.round(match.bbox[0]),
          y_min: Math.round(match.bbox[1]),
          x_max: Math.round(match.bbox[2]),
          y_max: Math.round(match.bbox[3]),
        }];
      }
      const resp = await withRetry(async () => {
        const r = await fetch(`https://fal.run/${FAL_SAM3_ENDPOINT}`, {
          method: "POST",
          headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Record<string, unknown>>;
      });
      const maskUrl = (resp as Record<string, unknown>).mask_url as string
        ?? ((resp as Record<string, unknown>).output as Record<string, unknown>)?.url as string ?? "";
      if (!maskUrl) { console.log(`    → no mask`); results.push({ label: prompt, coverage: 0, file: "" }); continue; }
      const maskResp = await fetch(maskUrl);
      const maskBuf = Buffer.from(await maskResp.arrayBuffer());
      const outFile = path.join(dir, `mask-${i}.png`);
      const cov = await saveMask(maskBuf, w, h, outFile);
      console.log(`    → ${(cov * 100).toFixed(1)}%`);
      results.push({ label: prompt, coverage: cov, file: outFile });
    } catch (err) {
      console.log(`    → FAIL: ${err instanceof Error ? err.message : err}`);
      results.push({ label: prompt, coverage: 0, file: "" });
    }
  }
  return results;
}

// ═══ Strategy C: schananas/grounded_sam (single API) ═══
async function strategyC(replicate: Replicate, dataUri: string, w: number, h: number): Promise<MaskResult[]> {
  const results: MaskResult[] = [];
  const dir = path.join(OUTPUT_DIR, "C-grounded-sam");
  fs.mkdirSync(dir, { recursive: true });

  for (let i = 0; i < PROMPTS.length; i++) {
    const prompt = PROMPTS[i];
    console.log(`  C[${i}]: "${prompt}"...`);
    try {
      const output = await withRetry(() =>
        replicate.run(GROUNDED_SAM_MODEL, {
          input: { image: dataUri, prompt, adjustment_factor: 0 },
        }),
      );
      // Output is array of mask URLs
      const masks = output as string[] | { toString(): string }[];
      if (!masks || (Array.isArray(masks) && masks.length === 0)) {
        console.log(`    → no masks`);
        results.push({ label: prompt, coverage: 0, file: "" });
        continue;
      }
      const maskUrl = typeof masks[0] === "string" ? masks[0] : masks[0].toString();
      const maskResp = await fetch(maskUrl);
      const maskBuf = Buffer.from(await maskResp.arrayBuffer());
      const outFile = path.join(dir, `mask-${i}.png`);
      const cov = await saveMask(maskBuf, w, h, outFile);
      console.log(`    → ${(cov * 100).toFixed(1)}%`);
      results.push({ label: prompt, coverage: cov, file: outFile });
    } catch (err) {
      console.log(`    → FAIL: ${err instanceof Error ? err.message : err}`);
      results.push({ label: prompt, coverage: 0, file: "" });
    }
  }
  return results;
}

// ═══ Strategy D: DINO → crop → Replicate SAM3 text ═══
async function strategyD(replicate: Replicate, imgBuf: Buffer, dataUri: string, w: number, h: number): Promise<MaskResult[]> {
  const results: MaskResult[] = [];
  const dir = path.join(OUTPUT_DIR, "D-dino-crop-sam3");
  fs.mkdirSync(dir, { recursive: true });

  // DINO
  console.log(`  D: DINO detection...`);
  const dinoQuery = PROMPTS.join(", ");
  const dinoOut = await withRetry(() =>
    replicate.run(`${DINO_MODEL}:${DINO_VERSION}`, {
      input: { image: dataUri, query: dinoQuery, box_threshold: 0.2, text_threshold: 0.2, show_visualisation: false },
    }),
  ) as { detections: { label: string; confidence: number; bbox: number[] }[] };
  console.log(`  D: DINO found ${dinoOut.detections.length} detections`);

  for (let i = 0; i < PROMPTS.length; i++) {
    const prompt = PROMPTS[i];
    const keywords = prompt.toLowerCase().split(/\s+/);
    const match = dinoOut.detections.find(d =>
      keywords.some(k => d.label.toLowerCase().includes(k)),
    );

    if (!match) {
      // No bbox → try full image with SAM3 (fallback)
      console.log(`  D[${i}]: "${prompt}" (no bbox, full image SAM3)...`);
      try {
        const output = await withRetry(() =>
          replicate.run(`${SAM3_MODEL}:${SAM3_VERSION}`, {
            input: { image: dataUri, prompt, threshold: 0.25, mask_only: true, return_zip: false },
          }),
        );
        let url: string;
        if (typeof output === "string") url = output;
        else if (output && typeof output === "object" && "url" in output) {
          url = String((output as Record<string, unknown>).url);
        } else url = String(output);
        validateReplicateUrl(url);
        const resp = await fetch(url);
        const maskBuf = Buffer.from(await resp.arrayBuffer());
        const outFile = path.join(dir, `mask-${i}.png`);
        const cov = await saveMask(maskBuf, w, h, outFile);
        console.log(`    → ${(cov * 100).toFixed(1)}%`);
        results.push({ label: prompt, coverage: cov, file: outFile });
      } catch (err) {
        console.log(`    → FAIL: ${err instanceof Error ? err.message : err}`);
        results.push({ label: prompt, coverage: 0, file: "" });
      }
      continue;
    }

    // Crop to bbox region with 15% padding, then send to SAM3
    const [x1, y1, x2, y2] = match.bbox.map(Math.round);
    const bw = x2 - x1;
    const bh = y2 - y1;
    const pad = Math.round(Math.max(bw, bh) * 0.15);
    const cx1 = Math.max(0, x1 - pad);
    const cy1 = Math.max(0, y1 - pad);
    const cx2 = Math.min(w, x2 + pad);
    const cy2 = Math.min(h, y2 + pad);

    console.log(`  D[${i}]: "${prompt}" crop [${cx1},${cy1},${cx2},${cy2}]...`);
    try {
      const cropBuf = await sharp(imgBuf).extract({ left: cx1, top: cy1, width: cx2 - cx1, height: cy2 - cy1 }).png().toBuffer();
      const cropUri = toDataUri(cropBuf);

      const output = await withRetry(() =>
        replicate.run(`${SAM3_MODEL}:${SAM3_VERSION}`, {
          input: { image: cropUri, prompt, threshold: 0.25, mask_only: true, return_zip: false },
        }),
      );
      let url: string;
      if (typeof output === "string") url = output;
      else if (output && typeof output === "object" && "url" in output) {
        url = String((output as Record<string, unknown>).url);
      } else url = String(output);
      validateReplicateUrl(url);
      const resp = await fetch(url);
      const maskBuf = Buffer.from(await resp.arrayBuffer());

      // Compose mask back to full image size
      const fullMask = Buffer.alloc(w * h);
      const cropRaw = await sharp(maskBuf).resize(cx2 - cx1, cy2 - cy1).grayscale().raw().toBuffer();
      for (let y = 0; y < cy2 - cy1; y++) {
        for (let x = 0; x < cx2 - cx1; x++) {
          const src = y * (cx2 - cx1) + x;
          const dst = (cy1 + y) * w + (cx1 + x);
          if (dst < w * h) fullMask[dst] = cropRaw[src];
        }
      }
      const fullMaskPng = await sharp(fullMask, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer();
      const outFile = path.join(dir, `mask-${i}.png`);
      const cov = await saveMask(fullMaskPng, w, h, outFile);
      console.log(`    → ${(cov * 100).toFixed(1)}% (crop→full)`);
      results.push({ label: prompt, coverage: cov, file: outFile });
    } catch (err) {
      console.log(`    → FAIL: ${err instanceof Error ? err.message : err}`);
      results.push({ label: prompt, coverage: 0, file: "" });
    }
  }
  return results;
}

async function main() {
  const replicate = new Replicate({ auth: getToken() });
  const { width, height, buffer } = await prepareImage(INPUT_IMAGE);
  const dataUri = toDataUri(buffer);
  console.log(`Image: ${width}x${height}, Prompts: ${PROMPTS.length}\n`);

  const timings: Record<string, number> = {};
  const allResults: Record<string, MaskResult[]> = {};

  // ═══ A ═══
  console.log("═══ A: fal.ai SAM3 text only ═══");
  let t = Date.now();
  allResults.A = await strategyA(dataUri, width, height);
  timings.A = Date.now() - t;

  // ═══ B ═══
  console.log("\n═══ B: DINO + fal.ai SAM3 text + box_prompts ═══");
  t = Date.now();
  allResults.B = await strategyB(replicate, dataUri, width, height);
  timings.B = Date.now() - t;

  // ═══ C ═══
  console.log("\n═══ C: schananas/grounded_sam ═══");
  t = Date.now();
  allResults.C = await strategyC(replicate, dataUri, width, height);
  timings.C = Date.now() - t;

  // ═══ D ═══
  console.log("\n═══ D: DINO → crop → SAM3 ═══");
  t = Date.now();
  allResults.D = await strategyD(replicate, buffer, dataUri, width, height);
  timings.D = Date.now() - t;

  // ═══ Summary ═══
  console.log("\n" + "═".repeat(80));
  console.log("FINAL COMPARISON");
  console.log("═".repeat(80));

  const labels = ["A: fal SAM3 text", "B: DINO+fal SAM3 box", "C: grounded_sam", "D: DINO→crop→SAM3"];
  const keys = ["A", "B", "C", "D"];
  const costs = [0.01, 0.012, 0.069, 0.011];

  for (let k = 0; k < keys.length; k++) {
    const key = keys[k];
    const res = allResults[key];
    console.log(`\n── ${labels[k]} (${(timings[key] / 1000).toFixed(0)}s, ~$${costs[k].toFixed(3)}/img) ──`);
    for (const r of res) {
      console.log(`  ${r.coverage > 0.005 ? "✓" : "✗"} ${r.label} → ${(r.coverage * 100).toFixed(1)}%`);
    }
    const valid = res.filter(r => r.coverage > 0.005).length;
    const sumCov = res.reduce((s, r) => s + r.coverage, 0);
    console.log(`  Valid: ${valid}/${res.length}, Sum coverage: ${(sumCov * 100).toFixed(1)}%`);
  }

  // Per-prompt comparison table
  console.log("\n── Per-Prompt Comparison ──");
  console.log(`${"Prompt".padEnd(40)} ${"A".padStart(7)} ${"B".padStart(7)} ${"C".padStart(7)} ${"D".padStart(7)}`);
  console.log("-".repeat(70));
  for (let i = 0; i < PROMPTS.length; i++) {
    const p = PROMPTS[i].slice(0, 38).padEnd(40);
    const vals = keys.map(k => {
      const cov = allResults[k][i]?.coverage ?? 0;
      return cov > 0.005 ? `${(cov * 100).toFixed(1)}%` : "  --  ";
    });
    console.log(`${p} ${vals.map(v => v.padStart(7)).join(" ")}`);
  }

  // Final verdict
  console.log("\n" + "═".repeat(80));
  console.log("VERDICT TABLE");
  console.log("═".repeat(80));
  console.log(`\n${"Strategy".padEnd(25)} ${"Valid".padStart(6)} ${"Sum%".padStart(8)} ${"Cost".padStart(8)} ${"Time".padStart(8)}`);
  console.log("-".repeat(60));
  for (let k = 0; k < keys.length; k++) {
    const key = keys[k];
    const res = allResults[key];
    const valid = res.filter(r => r.coverage > 0.005).length;
    const sumCov = res.reduce((s, r) => s + r.coverage, 0);
    console.log(`${labels[k].padEnd(25)} ${`${valid}/${res.length}`.padStart(6)} ${`${(sumCov * 100).toFixed(1)}%`.padStart(8)} ${`$${costs[k].toFixed(3)}`.padStart(8)} ${`${(timings[key] / 1000).toFixed(0)}s`.padStart(8)}`);
  }

  console.log(`\nOutput: ${OUTPUT_DIR}/`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
