import "dotenv/config";
import Replicate from "replicate";
import sharp from "sharp";
import fs from "node:fs";
import { getToken } from "./lib/replicate-utils.js";
import { getSam3Mask, buildSam3Candidate } from "./lib/image-decompose.js";
import { fillMaskHoles, applyAlphaMatte } from "./lib/mask-postprocess.js";

const INPUT = "/Users/isaac/Downloads/monglong_studio_a_golden_buddha_statue_floating_in_space_head_r_55d23627-69e6-43a2-94d3-689652dedbbc.PNG";
const replicate = new Replicate({ auth: getToken() });

const origBuf = fs.readFileSync(INPUT);
const origMeta = await sharp(origBuf).metadata();
const W = origMeta.width!, H = origMeta.height!;
console.log(`Original: ${W}x${H}`);

// Resize to 1536 for SAM3 (like experiment did)
const resized = await sharp(origBuf).resize(1536, 1536, { fit: "inside" }).png().toBuffer();
const rMeta = await sharp(resized).metadata();
const rW = rMeta.width!, rH = rMeta.height!;
console.log(`Resized: ${rW}x${rH}`);
const dataUri = `data:image/png;base64,${resized.toString("base64")}`;

const maskBuf = await getSam3Mask(replicate, dataUri, "golden Buddha statue with robes", 0.25);
if (!maskBuf) { console.log("SAM3 returned null"); process.exit(1); }

const maskMeta = await sharp(maskBuf).metadata();
console.log(`SAM3 mask: ${maskMeta.width}x${maskMeta.height} ${maskMeta.channels}ch`);

// Step by step through buildSam3Candidate logic
console.log("\n--- Step 1: fillMaskHoles ---");
const filled = await fillMaskHoles(maskBuf, rW, rH);
const filledMeta = await sharp(filled).metadata();
console.log(`After fillMaskHoles: ${filledMeta.width}x${filledMeta.height} ${filledMeta.channels}ch`);
const filledRaw = await sharp(filled).resize(rW, rH).grayscale().raw().toBuffer();
let filledWhite = 0;
for (let i = 0; i < filledRaw.length; i++) if (filledRaw[i] > 128) filledWhite++;
console.log(`fillMaskHoles coverage: ${(filledWhite / (rW * rH) * 100).toFixed(1)}%`);

console.log("\n--- Step 2: applyAlphaMatte ---");
const matted = await applyAlphaMatte(filled, rW, rH);
const mattedMeta = await sharp(matted).metadata();
console.log(`After applyAlphaMatte: ${mattedMeta.width}x${mattedMeta.height} ${mattedMeta.channels}ch`);
const mattedRaw = await sharp(matted).resize(rW, rH).grayscale().raw().toBuffer();
let mattedWhite = 0;
for (let i = 0; i < mattedRaw.length; i++) if (mattedRaw[i] > 128) mattedWhite++;
console.log(`applyAlphaMatte coverage (>128): ${(mattedWhite / (rW * rH) * 100).toFixed(1)}%`);

console.log("\n--- Step 3: applyMaskToImage simulation ---");
// This is what applyMaskToImage does
const maskGray = await sharp(matted).resize(rW, rH).grayscale().raw().toBuffer();
let aboveThreshold = 0;
for (let i = 0; i < maskGray.length; i++) if (maskGray[i] > 128) aboveThreshold++;
console.log(`Pixels > 128 (alphaThreshold): ${aboveThreshold} / ${rW * rH} = ${(aboveThreshold / (rW * rH) * 100).toFixed(1)}%`);

// Now try buildSam3Candidate with original dimensions (as pipeline does)
console.log("\n--- Step 4: buildSam3Candidate with ORIGINAL dims ---");
const origPng = await sharp(origBuf).png().toBuffer();
const c1 = await buildSam3Candidate(maskBuf, origPng, null, W, H, "buddha", 0, "/tmp/test-candidate", 0);
console.log(`buildSam3Candidate(origDims, minCov=0): ${c1 ? `${(c1.coverage * 100).toFixed(1)}%` : "NULL"}`);

// Try with resized dims
console.log("\n--- Step 5: buildSam3Candidate with RESIZED dims ---");
const c2 = await buildSam3Candidate(maskBuf, resized, null, rW, rH, "buddha", 0, "/tmp/test-candidate2", 0);
console.log(`buildSam3Candidate(resizedDims, minCov=0): ${c2 ? `${(c2.coverage * 100).toFixed(1)}%` : "NULL"}`);
