/**
 * Diagnose: Why does SAM3 return empty mask in pipeline but 71.6% in experiment?
 *
 * Variables to test:
 * 1. Image resolution: original (1632x2912) vs resized (1536 max) vs 1080 vs 512
 * 2. minCoverage filter: 0.001 (pipeline default) vs 0 (no filter)
 * 3. Prompt text: exact same "golden Buddha statue with robes"
 * 4. threshold: 0.25 (default)
 * 5. Data URI encoding: same method
 * 6. buildSam3Candidate vs raw getSam3Mask
 */
import "dotenv/config";
import Replicate from "replicate";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { getToken, withRetry, validateReplicateUrl } from "./lib/replicate-utils.js";
import { getSam3Mask, buildSam3Candidate, SAM3_MODEL, SAM3_VERSION } from "./lib/image-decompose.js";

const INPUT = "/Users/isaac/Downloads/monglong_studio_a_golden_buddha_statue_floating_in_space_head_r_55d23627-69e6-43a2-94d3-689652dedbbc.PNG";
const PROMPT = "golden Buddha statue with robes";
const THRESHOLD = 0.25;
const OUTPUT_DIR = path.join(process.cwd(), "experiment-output", "diagnose");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function makeDataUri(buf: Buffer): Promise<string> {
  return `data:image/png;base64,${buf.toString("base64")}`;
}

async function testRawSam3(replicate: Replicate, label: string, imgBuf: Buffer, w: number, h: number) {
  const dataUri = await makeDataUri(imgBuf);
  const uriSizeMB = (dataUri.length / 1024 / 1024).toFixed(1);
  console.log(`\n  [${label}] ${w}x${h}, dataUri=${uriSizeMB}MB`);

  const t = Date.now();
  const maskBuf = await getSam3Mask(replicate, dataUri, PROMPT, THRESHOLD);
  const ms = Date.now() - t;

  if (!maskBuf) {
    console.log(`  [${label}] → NULL (${ms}ms) — SAM3 returned no mask`);
    return { label, w, h, maskBuf: null, coverage: 0, ms };
  }

  const maskMeta = await sharp(maskBuf).metadata();
  console.log(`  [${label}] → mask ${maskMeta.width}x${maskMeta.height} ${maskMeta.channels}ch (${ms}ms)`);

  // Compute coverage manually (no buildSam3Candidate filter)
  const raw = await sharp(maskBuf).resize(w, h).grayscale().raw().toBuffer();
  let white = 0;
  for (let i = 0; i < raw.length; i++) if (raw[i] > 128) white++;
  const coverage = white / (w * h);
  console.log(`  [${label}] → raw coverage: ${(coverage * 100).toFixed(1)}%`);

  // Save mask
  await sharp(maskBuf).toFile(path.join(OUTPUT_DIR, `${label}-mask.png`));

  return { label, w, h, maskBuf, coverage, ms };
}

async function testBuildCandidate(replicate: Replicate, label: string, imgBuf: Buffer, w: number, h: number, minCov: number) {
  const dataUri = await makeDataUri(imgBuf);
  console.log(`\n  [${label}] buildSam3Candidate minCoverage=${minCov}`);

  const maskBuf = await getSam3Mask(replicate, dataUri, PROMPT, THRESHOLD);
  if (!maskBuf) {
    console.log(`  [${label}] → SAM3 NULL before buildCandidate`);
    return null;
  }

  const candidate = await buildSam3Candidate(maskBuf, imgBuf, null, w, h, PROMPT, 0, OUTPUT_DIR, minCov);
  if (!candidate) {
    console.log(`  [${label}] → buildCandidate returned NULL (filtered by minCoverage=${minCov})`);
    // Check what coverage was before filter
    const raw = await sharp(maskBuf).resize(w, h).grayscale().raw().toBuffer();
    let white = 0;
    for (let i = 0; i < raw.length; i++) if (raw[i] > 128) white++;
    console.log(`  [${label}] → actual mask coverage was ${(white / (w * h) * 100).toFixed(1)}% but buildCandidate filtered it`);
    return null;
  }

  console.log(`  [${label}] → candidate coverage: ${(candidate.coverage * 100).toFixed(1)}%`);
  return candidate;
}

async function main() {
  const replicate = new Replicate({ auth: getToken() });
  const origBuf = fs.readFileSync(INPUT);
  const origMeta = await sharp(origBuf).metadata();
  console.log(`Original: ${origMeta.width}x${origMeta.height}`);
  console.log(`Prompt: "${PROMPT}"`);
  console.log(`Threshold: ${THRESHOLD}\n`);

  // Prepare different resolutions
  const sizes: { label: string; maxDim: number }[] = [
    { label: "512px", maxDim: 512 },
    { label: "1024px", maxDim: 1024 },
    { label: "1536px", maxDim: 1536 },
    { label: "original", maxDim: 99999 },
  ];

  console.log("═══ Test 1: Raw getSam3Mask at different resolutions ═══");
  const results: { label: string; coverage: number; ms: number }[] = [];

  for (const { label, maxDim } of sizes) {
    const w = origMeta.width!, h = origMeta.height!;
    let buf: Buffer;
    let rw: number, rh: number;
    if (Math.max(w, h) > maxDim) {
      buf = await sharp(origBuf).resize(maxDim, maxDim, { fit: "inside" }).png().toBuffer();
      const m = await sharp(buf).metadata();
      rw = m.width!; rh = m.height!;
    } else {
      buf = await sharp(origBuf).png().toBuffer();
      rw = w; rh = h;
    }
    const r = await testRawSam3(replicate, label, buf, rw, rh);
    results.push({ label: r.label, coverage: r.coverage, ms: r.ms });
  }

  console.log("\n═══ Test 2: buildSam3Candidate filter at 1536px ═══");
  const buf1536 = await sharp(origBuf).resize(1536, 1536, { fit: "inside" }).png().toBuffer();
  const m1536 = await sharp(buf1536).metadata();

  await testBuildCandidate(replicate, "1536-minCov0.001", buf1536, m1536.width!, m1536.height!, 0.001);
  await testBuildCandidate(replicate, "1536-minCov0", buf1536, m1536.width!, m1536.height!, 0);

  console.log("\n═══ Test 3: buildSam3Candidate at original resolution ═══");
  const origPng = await sharp(origBuf).png().toBuffer();
  await testBuildCandidate(replicate, "orig-minCov0.001", origPng, origMeta.width!, origMeta.height!, 0.001);
  await testBuildCandidate(replicate, "orig-minCov0", origPng, origMeta.width!, origMeta.height!, 0);

  console.log("\n═══ Test 4: Multiple prompts at original resolution ═══");
  const extraPrompts = [
    "golden Buddha statue",
    "Buddha statue",
    "seated golden figure",
    "meditating figure with robes",
  ];
  for (const p of extraPrompts) {
    const dataUri = await makeDataUri(origPng);
    console.log(`\n  prompt="${p}" @ ${origMeta.width}x${origMeta.height}`);
    const mask = await getSam3Mask(replicate, dataUri, p, THRESHOLD);
    if (!mask) {
      console.log(`  → NULL`);
    } else {
      const raw = await sharp(mask).resize(origMeta.width!, origMeta.height!).grayscale().raw().toBuffer();
      let white = 0;
      for (let i = 0; i < raw.length; i++) if (raw[i] > 128) white++;
      console.log(`  → ${(white / (origMeta.width! * origMeta.height!) * 100).toFixed(1)}%`);
    }
  }

  // Summary
  console.log("\n" + "═".repeat(60));
  console.log("SUMMARY");
  console.log("═".repeat(60));
  console.log(`\n${"Resolution".padEnd(15)} ${"Coverage".padStart(10)} ${"Time".padStart(8)}`);
  console.log("-".repeat(35));
  for (const r of results) {
    console.log(`${r.label.padEnd(15)} ${r.coverage > 0 ? `${(r.coverage * 100).toFixed(1)}%` : "FAIL"} ${`${r.ms}ms`.padStart(8)}`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
