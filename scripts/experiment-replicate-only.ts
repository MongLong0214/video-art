/**
 * Final Strategy Comparison — Replicate ONLY
 *
 * A: Replicate SAM3 text only (current baseline)
 * B: schananas/grounded_sam (DINO+SAM1 single API)
 * C: DINO bbox → crop → Replicate SAM3 text
 */
import "dotenv/config";
import Replicate from "replicate";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { getToken, withRetry, validateReplicateUrl } from "./lib/replicate-utils.js";

const INPUT_IMAGE = process.argv[2];
if (!INPUT_IMAGE || !fs.existsSync(INPUT_IMAGE)) {
  console.error("Usage: npx tsx scripts/experiment-replicate-only.ts <image-path>");
  process.exit(1);
}

const DINO_MODEL = "adirik/grounding-dino";
const DINO_VERSION = "efd10a8ddc57ea28773327e881ce95e20cc1d734c589f7dd01d2036921ed78aa";
const SAM3_MODEL = "mattsays/sam3-image";
const SAM3_VERSION = "d73db077226443ba4fafd34e233b3626b552eac2a433f90c7c32a9ac89bd9e72";
const GROUNDED_SAM_MODEL = "schananas/grounded_sam";
const GROUNDED_SAM_VERSION = "ee871c19efb1941f55f66a3d7d960428c8a5afcb77449547fe8e5a3ab9ebc21c";

const OUTPUT_DIR = path.join(process.cwd(), "experiment-output", "replicate-only");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const PROMPTS = [
  "golden Buddha statue",
  "blue and orange lotus petal base",
  "orange circular halo",
  "dark cosmic background with stars",
  "green nebula wisps",
];

interface MaskResult { label: string; coverage: number; file: string }

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

function extractUrl(output: unknown): string {
  if (typeof output === "string") return output;
  if (output && typeof output === "object") {
    // FileOutput → .toString() gives URL
    const str = String(output);
    if (str.startsWith("http")) return str;
    if ("url" in output) {
      const urlVal = (output as Record<string, unknown>).url;
      return typeof urlVal === "function" ? (urlVal as () => string)() : String(urlVal);
    }
  }
  return String(output);
}

async function downloadMask(url: string): Promise<Buffer> {
  validateReplicateUrl(url);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Mask download failed: HTTP ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

// ═══ Strategy A: Replicate SAM3 text only ═══
async function strategyA(replicate: Replicate, dataUri: string, w: number, h: number): Promise<MaskResult[]> {
  const results: MaskResult[] = [];
  const dir = path.join(OUTPUT_DIR, "A-sam3-text");
  fs.mkdirSync(dir, { recursive: true });

  for (let i = 0; i < PROMPTS.length; i++) {
    const prompt = PROMPTS[i];
    console.log(`  A[${i}]: "${prompt}"...`);
    try {
      const output = await withRetry(() =>
        replicate.run(`${SAM3_MODEL}:${SAM3_VERSION}`, {
          input: { image: dataUri, prompt, threshold: 0.25, mask_only: true, return_zip: false },
        }),
      );
      const url = extractUrl(output);
      const maskBuf = await downloadMask(url);
      await sharp(maskBuf).metadata(); // validate
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

// ═══ Strategy B: schananas/grounded_sam ═══
async function strategyB(replicate: Replicate, dataUri: string, w: number, h: number): Promise<MaskResult[]> {
  const results: MaskResult[] = [];
  const dir = path.join(OUTPUT_DIR, "B-grounded-sam");
  fs.mkdirSync(dir, { recursive: true });

  for (let i = 0; i < PROMPTS.length; i++) {
    const prompt = PROMPTS[i];
    console.log(`  B[${i}]: "${prompt}"...`);
    try {
      const output = await withRetry(() =>
        replicate.run(`${GROUNDED_SAM_MODEL}:${GROUNDED_SAM_VERSION}`, {
          input: { image: dataUri, prompt, adjustment_factor: 0 },
        }),
      );

      // Output is array of FileOutput (mask URLs)
      const masks = output as unknown[];
      if (!masks || !Array.isArray(masks) || masks.length === 0) {
        console.log(`    → no masks returned`);
        results.push({ label: prompt, coverage: 0, file: "" });
        continue;
      }
      const url = extractUrl(masks[0]);
      const maskBuf = await downloadMask(url);
      const outFile = path.join(dir, `mask-${i}.png`);
      const cov = await saveMask(maskBuf, w, h, outFile);
      console.log(`    → ${(cov * 100).toFixed(1)}% (${masks.length} masks)`);
      results.push({ label: prompt, coverage: cov, file: outFile });
    } catch (err) {
      console.log(`    → FAIL: ${err instanceof Error ? err.message : err}`);
      results.push({ label: prompt, coverage: 0, file: "" });
    }
  }
  return results;
}

// ═══ Strategy C: DINO → crop → SAM3 ═══
async function strategyC(replicate: Replicate, imgBuf: Buffer, dataUri: string, w: number, h: number): Promise<MaskResult[]> {
  const results: MaskResult[] = [];
  const dir = path.join(OUTPUT_DIR, "C-dino-crop-sam3");
  fs.mkdirSync(dir, { recursive: true });

  // DINO detection
  console.log(`  C: DINO...`);
  const dinoOut = await withRetry(() =>
    replicate.run(`${DINO_MODEL}:${DINO_VERSION}`, {
      input: { image: dataUri, query: PROMPTS.join(", "), box_threshold: 0.2, text_threshold: 0.2, show_visualisation: false },
    }),
  ) as { detections: { label: string; confidence: number; bbox: number[] }[] };
  console.log(`  C: DINO → ${dinoOut.detections.length} detections`);
  for (const d of dinoOut.detections) {
    console.log(`    "${d.label}" ${(d.confidence * 100).toFixed(0)}% [${d.bbox.map(Math.round).join(",")}]`);
  }

  for (let i = 0; i < PROMPTS.length; i++) {
    const prompt = PROMPTS[i];
    const keywords = prompt.toLowerCase().split(/\s+/);
    const match = dinoOut.detections.find(d =>
      keywords.some(k => k.length > 3 && d.label.toLowerCase().includes(k)),
    );

    if (!match) {
      // No bbox → SAM3 on full image (fallback)
      console.log(`  C[${i}]: "${prompt}" (no bbox → full image)...`);
      try {
        const output = await withRetry(() =>
          replicate.run(`${SAM3_MODEL}:${SAM3_VERSION}`, {
            input: { image: dataUri, prompt, threshold: 0.25, mask_only: true, return_zip: false },
          }),
        );
        const url = extractUrl(output);
        const maskBuf = await downloadMask(url);
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

    // Crop bbox with 20% padding → SAM3
    const [x1, y1, x2, y2] = match.bbox.map(Math.round);
    const bw = x2 - x1, bh = y2 - y1;
    const pad = Math.round(Math.max(bw, bh) * 0.2);
    const cx1 = Math.max(0, x1 - pad), cy1 = Math.max(0, y1 - pad);
    const cx2 = Math.min(w, x2 + pad), cy2 = Math.min(h, y2 + pad);
    const cropW = cx2 - cx1, cropH = cy2 - cy1;

    console.log(`  C[${i}]: "${prompt}" → DINO "${match.label}" → crop [${cx1},${cy1},${cx2},${cy2}]...`);
    try {
      const cropBuf = await sharp(imgBuf).extract({ left: cx1, top: cy1, width: cropW, height: cropH }).png().toBuffer();
      const cropUri = toDataUri(cropBuf);

      const output = await withRetry(() =>
        replicate.run(`${SAM3_MODEL}:${SAM3_VERSION}`, {
          input: { image: cropUri, prompt, threshold: 0.25, mask_only: true, return_zip: false },
        }),
      );
      const url = extractUrl(output);
      const maskBuf = await downloadMask(url);

      // Place crop mask back into full-size canvas
      const cropRaw = await sharp(maskBuf).resize(cropW, cropH).grayscale().raw().toBuffer();
      const fullMask = Buffer.alloc(w * h);
      for (let y = 0; y < cropH; y++) {
        for (let x = 0; x < cropW; x++) {
          const dst = (cy1 + y) * w + (cx1 + x);
          if (dst < w * h) fullMask[dst] = cropRaw[y * cropW + x];
        }
      }
      const fullPng = await sharp(fullMask, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer();
      const outFile = path.join(dir, `mask-${i}.png`);
      const cov = await saveMask(fullPng, w, h, outFile);
      console.log(`    → ${(cov * 100).toFixed(1)}%`);
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
  console.log(`Image: ${width}x${height}\n`);

  const timings: Record<string, number> = {};
  const allResults: Record<string, MaskResult[]> = {};

  console.log("═══ A: Replicate SAM3 text only ═══");
  let t = Date.now();
  allResults.A = await strategyA(replicate, dataUri, width, height);
  timings.A = Date.now() - t;

  console.log("\n═══ B: schananas/grounded_sam (DINO+SAM1) ═══");
  t = Date.now();
  allResults.B = await strategyB(replicate, dataUri, width, height);
  timings.B = Date.now() - t;

  console.log("\n═══ C: DINO → crop → SAM3 ═══");
  t = Date.now();
  allResults.C = await strategyC(replicate, buffer, dataUri, width, height);
  timings.C = Date.now() - t;

  // ═══ Summary ═══
  console.log("\n" + "═".repeat(80));
  const labels = ["A: SAM3 text only", "B: grounded_sam", "C: DINO→crop→SAM3"];
  const keys = ["A", "B", "C"];
  const costsPerCall = [0.0015, 0.069, 0.0015 + 0.0015]; // SAM3, grounded_sam, DINO+SAM3

  for (let k = 0; k < keys.length; k++) {
    const key = keys[k];
    const res = allResults[key];
    console.log(`\n── ${labels[k]} (${(timings[key] / 1000).toFixed(0)}s) ──`);
    for (const r of res) {
      console.log(`  ${r.coverage > 0.005 ? "✓" : "✗"} ${r.label} → ${(r.coverage * 100).toFixed(1)}%`);
    }
  }

  // Per-prompt table
  console.log(`\n${"Prompt".padEnd(40)} ${"A:SAM3".padStart(8)} ${"B:GSAM".padStart(8)} ${"C:crop".padStart(8)}`);
  console.log("-".repeat(66));
  for (let i = 0; i < PROMPTS.length; i++) {
    const p = PROMPTS[i].slice(0, 38).padEnd(40);
    const vals = keys.map(k => {
      const cov = allResults[k][i]?.coverage ?? 0;
      return cov > 0.005 ? `${(cov * 100).toFixed(1)}%` : "  --  ";
    });
    console.log(`${p} ${vals.map(v => v.padStart(8)).join(" ")}`);
  }

  // Verdict
  console.log("\n" + "═".repeat(66));
  console.log(`${"Strategy".padEnd(22)} ${"Valid".padStart(6)} ${"Time".padStart(8)} ${"$/prompt".padStart(8)} ${"$/img".padStart(8)}`);
  console.log("-".repeat(55));
  for (let k = 0; k < keys.length; k++) {
    const key = keys[k];
    const res = allResults[key];
    const valid = res.filter(r => r.coverage > 0.005).length;
    const costImg = key === "C"
      ? 0.0015 + valid * 0.0015 // 1 DINO + N SAM3
      : valid * costsPerCall[k];
    console.log(`${labels[k].padEnd(22)} ${`${valid}/${res.length}`.padStart(6)} ${`${(timings[key] / 1000).toFixed(0)}s`.padStart(8)} ${`$${costsPerCall[k].toFixed(4)}`.padStart(8)} ${`$${costImg.toFixed(3)}`.padStart(8)}`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
