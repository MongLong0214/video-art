/**
 * SAM2 bbox prompt debug — input_box가 실제로 사용되는지 확인
 *
 * 테스트:
 * 1. 부처상 bbox → 14 individual masks 중 어느 것이 부처상인지?
 * 2. combined_mask가 bbox를 반영하는지?
 * 3. 다른 bbox(연꽃)로 보내면 다른 결과인지?
 * 4. click_coordinates 방식이 더 나은지?
 */
import "dotenv/config";
import Replicate from "replicate";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const INPUT_IMAGE = process.argv[2];
if (!INPUT_IMAGE || !fs.existsSync(INPUT_IMAGE)) {
  console.error("Usage: npx tsx scripts/experiment-sam2-bbox-debug.ts <image-path>");
  process.exit(1);
}

const SAM2_MODEL = "meta/sam-2";
const SAM2_VERSION = "fe97b453a6455861e3bac769b441ca1f1086110da7466dbb65cf1eecfd60dc83";
const OUTPUT_DIR = path.join(process.cwd(), "experiment-output", "sam2-bbox-debug");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function main() {
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });
  const buf = await sharp(INPUT_IMAGE).resize(1536, 1536, { fit: "inside" }).png().toBuffer();
  const meta = await sharp(buf).metadata();
  const dataUri = `data:image/png;base64,${buf.toString("base64")}`;
  console.log(`Image: ${meta.width}x${meta.height}\n`);

  // ═══ Test 1: Buddha bbox — save ALL 14 individual masks ═══
  console.log("═══ Test 1: ALL individual masks for Buddha bbox ═══");
  const buddhaBbox = "153,230,776,1179";
  const out1 = await replicate.run(`${SAM2_MODEL}:${SAM2_VERSION}`, {
    input: { image: dataUri, input_box: buddhaBbox },
  }) as { combined_mask: { toString(): string }; individual_masks: { toString(): string }[] };

  console.log(`individual_masks count: ${out1.individual_masks.length}`);
  for (let i = 0; i < out1.individual_masks.length; i++) {
    const url = out1.individual_masks[i].toString();
    const resp = await fetch(url);
    const maskBuf = Buffer.from(await resp.arrayBuffer());
    const maskMeta = await sharp(maskBuf).metadata();
    // Count white pixels
    const raw = await sharp(maskBuf).resize(meta.width!, meta.height!).grayscale().raw().toBuffer();
    let white = 0;
    for (let p = 0; p < raw.length; p++) if (raw[p] > 128) white++;
    const coverage = (white / (meta.width! * meta.height!) * 100).toFixed(1);
    console.log(`  mask[${i}]: ${maskMeta.width}x${maskMeta.height} ${maskMeta.channels}ch → ${coverage}% coverage`);
    await sharp(maskBuf).toFile(path.join(OUTPUT_DIR, `buddha-mask-${i}.png`));
  }

  // ═══ Test 2: Lotus bbox — different region ═══
  console.log("\n═══ Test 2: Lotus petal bbox ═══");
  const lotusBbox = "4,496,855,1523";
  const out2 = await replicate.run(`${SAM2_MODEL}:${SAM2_VERSION}`, {
    input: { image: dataUri, input_box: lotusBbox },
  }) as { combined_mask: { toString(): string }; individual_masks: { toString(): string }[] };

  console.log(`individual_masks count: ${out2.individual_masks.length}`);
  for (let i = 0; i < Math.min(5, out2.individual_masks.length); i++) {
    const url = out2.individual_masks[i].toString();
    const resp = await fetch(url);
    const maskBuf = Buffer.from(await resp.arrayBuffer());
    const raw = await sharp(maskBuf).resize(meta.width!, meta.height!).grayscale().raw().toBuffer();
    let white = 0;
    for (let p = 0; p < raw.length; p++) if (raw[p] > 128) white++;
    const coverage = (white / (meta.width! * meta.height!) * 100).toFixed(1);
    console.log(`  mask[${i}]: ${coverage}% coverage`);
    await sharp(maskBuf).toFile(path.join(OUTPUT_DIR, `lotus-mask-${i}.png`));
  }

  // ═══ Test 3: Point click on Buddha center ═══
  console.log("\n═══ Test 3: Point click on Buddha center ═══");
  // Buddha center ≈ (465, 700)
  try {
    const out3 = await replicate.run(`${SAM2_MODEL}:${SAM2_VERSION}`, {
      input: {
        image: dataUri,
        click_coordinates: "465,700",
        click_labels: "1",
      },
    }) as { combined_mask: { toString(): string }; individual_masks: { toString(): string }[] };

    console.log(`individual_masks count: ${out3.individual_masks.length}`);
    for (let i = 0; i < Math.min(5, out3.individual_masks.length); i++) {
      const url = out3.individual_masks[i].toString();
      const resp = await fetch(url);
      const maskBuf = Buffer.from(await resp.arrayBuffer());
      const raw = await sharp(maskBuf).resize(meta.width!, meta.height!).grayscale().raw().toBuffer();
      let white = 0;
      for (let p = 0; p < raw.length; p++) if (raw[p] > 128) white++;
      const coverage = (white / (meta.width! * meta.height!) * 100).toFixed(1);
      console.log(`  mask[${i}]: ${coverage}% coverage`);
      await sharp(maskBuf).toFile(path.join(OUTPUT_DIR, `click-buddha-mask-${i}.png`));
    }
  } catch (err) {
    console.log(`  FAILED: ${err instanceof Error ? err.message : err}`);
  }

  // ═══ Test 4: Are buddha and lotus masks different? ═══
  console.log("\n═══ Test 4: Mask difference check ═══");
  const b0 = await sharp(path.join(OUTPUT_DIR, "buddha-mask-0.png")).resize(meta.width!, meta.height!).grayscale().raw().toBuffer();
  const l0 = await sharp(path.join(OUTPUT_DIR, "lotus-mask-0.png")).resize(meta.width!, meta.height!).grayscale().raw().toBuffer();
  let diffPixels = 0;
  for (let i = 0; i < b0.length; i++) {
    if (Math.abs(b0[i] - l0[i]) > 10) diffPixels++;
  }
  const diffPct = (diffPixels / b0.length * 100).toFixed(1);
  console.log(`Buddha mask[0] vs Lotus mask[0] difference: ${diffPct}% pixels differ`);
  console.log(diffPixels === 0 ? "  ⚠ IDENTICAL — input_box is IGNORED" : "  ✓ Different — input_box IS working");

  console.log(`\nSaved to: ${OUTPUT_DIR}/`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
