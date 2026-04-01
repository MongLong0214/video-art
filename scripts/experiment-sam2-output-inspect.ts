/**
 * SAM2 output structure deep inspection
 */
import "dotenv/config";
import Replicate from "replicate";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const INPUT_IMAGE = process.argv[2];
if (!INPUT_IMAGE || !fs.existsSync(INPUT_IMAGE)) {
  console.error("Usage: npx tsx scripts/experiment-sam2-output-inspect.ts <image-path>");
  process.exit(1);
}

const SAM2_MODEL = "meta/sam-2";
const SAM2_VERSION = "fe97b453a6455861e3bac769b441ca1f1086110da7466dbb65cf1eecfd60dc83";
const OUTPUT_DIR = path.join(process.cwd(), "experiment-output", "sam2-inspect");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function main() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) { console.error("REPLICATE_API_TOKEN not set"); process.exit(1); }
  const replicate = new Replicate({ auth: token });

  const buf = await sharp(INPUT_IMAGE).resize(1536, 1536, { fit: "inside" }).png().toBuffer();
  const resized = await sharp(buf).metadata();
  const dataUri = `data:image/png;base64,${buf.toString("base64")}`;
  console.log(`Image: ${resized.width}x${resized.height}`);

  // SAM2 with bbox (Buddha statue area from DINO)
  const bbox = "153,230,776,1179";
  console.log(`\nSAM2 input_box: "${bbox}"`);

  const output = await replicate.run(`${SAM2_MODEL}:${SAM2_VERSION}`, {
    input: { image: dataUri, input_box: bbox },
  }) as Record<string, unknown>;

  // Deep inspect output structure
  console.log(`\nOutput keys: ${Object.keys(output)}`);

  // combined_mask
  const combined = output.combined_mask;
  console.log(`\ncombined_mask type: ${typeof combined}`);
  console.log(`combined_mask constructor: ${combined?.constructor?.name}`);
  if (combined && typeof combined === "object") {
    console.log(`combined_mask keys: ${Object.keys(combined as object)}`);
    // Try to read as URL
    const url = String(combined);
    console.log(`combined_mask toString: ${url.slice(0, 200)}`);
    if (url.startsWith("http")) {
      const resp = await fetch(url);
      const maskBuf = Buffer.from(await resp.arrayBuffer());
      const meta = await sharp(maskBuf).metadata();
      console.log(`combined_mask image: ${meta.width}x${meta.height}, ${meta.channels}ch, ${meta.format}`);
      await sharp(maskBuf).toFile(path.join(OUTPUT_DIR, "combined-mask.png"));
      console.log("Saved combined-mask.png");
    }
  }

  // individual_masks
  const individuals = output.individual_masks as unknown[];
  console.log(`\nindividual_masks count: ${individuals?.length}`);
  if (individuals && individuals.length > 0) {
    const first = individuals[0];
    console.log(`first mask type: ${typeof first}`);
    console.log(`first mask constructor: ${first?.constructor?.name}`);
    if (first && typeof first === "object") {
      console.log(`first mask keys: ${Object.keys(first as object)}`);
    }
    const url = String(first);
    console.log(`first mask toString: ${url.slice(0, 200)}`);
    if (url.startsWith("http")) {
      const resp = await fetch(url);
      const maskBuf = Buffer.from(await resp.arrayBuffer());
      const meta = await sharp(maskBuf).metadata();
      console.log(`first mask image: ${meta.width}x${meta.height}, ${meta.channels}ch, ${meta.format}`);
      await sharp(maskBuf).toFile(path.join(OUTPUT_DIR, "individual-mask-0.png"));
      console.log("Saved individual-mask-0.png");
    }

    // Save first 3 individual masks
    for (let i = 0; i < Math.min(3, individuals.length); i++) {
      const m = individuals[i];
      const mUrl = String(m);
      if (mUrl.startsWith("http")) {
        const resp = await fetch(mUrl);
        const maskBuf = Buffer.from(await resp.arrayBuffer());
        await sharp(maskBuf).toFile(path.join(OUTPUT_DIR, `individual-mask-${i}.png`));
        const meta = await sharp(maskBuf).metadata();
        console.log(`  mask[${i}]: ${meta.width}x${meta.height} ${meta.channels}ch`);
      }
    }
  }

  console.log(`\nSaved to: ${OUTPUT_DIR}/`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
