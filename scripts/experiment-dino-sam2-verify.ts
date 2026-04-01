/**
 * P0 Blocker Verification: GroundingDINO + SAM2 실제 API 호출
 *
 * 확인 대상:
 * 1. DINO bbox 좌표 포맷 (pixel xyxy int? normalized?)
 * 2. SAM2 input_box 포맷 (string? array? 어떤 좌표계?)
 * 3. SAM2 multi-mask 응답 구조 (단일 URL? 배열?)
 * 4. cold-start 소요 시간
 */
import "dotenv/config";
import Replicate from "replicate";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const INPUT_IMAGE = process.argv[2];
if (!INPUT_IMAGE || !fs.existsSync(INPUT_IMAGE)) {
  console.error("Usage: npx tsx scripts/experiment-dino-sam2-verify.ts <image-path>");
  process.exit(1);
}

const DINO_MODEL = "adirik/grounding-dino";
const DINO_VERSION = "efd10a8ddc57ea28773327e881ce95e20cc1d734c589f7dd01d2036921ed78aa";
const SAM2_MODEL = "meta/sam-2";
const SAM2_VERSION = "fe97b453a6455861e3bac769b441ca1f1086110da7466dbb65cf1eecfd60dc83";

const OUTPUT_DIR = path.join(process.cwd(), "experiment-output", "dino-sam2-verify");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function main() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) { console.error("REPLICATE_API_TOKEN not set"); process.exit(1); }
  const replicate = new Replicate({ auth: token });

  // Prepare image
  const meta = await sharp(INPUT_IMAGE).metadata();
  console.log(`Image: ${meta.width}x${meta.height}`);

  const MAX_DIM = 1536;
  let buf: Buffer;
  if ((meta.width ?? 0) > MAX_DIM || (meta.height ?? 0) > MAX_DIM) {
    buf = await sharp(INPUT_IMAGE).resize(MAX_DIM, MAX_DIM, { fit: "inside" }).png().toBuffer();
  } else {
    buf = await sharp(INPUT_IMAGE).png().toBuffer();
  }
  const resized = await sharp(buf).metadata();
  const dataUri = `data:image/png;base64,${buf.toString("base64")}`;
  console.log(`Resized: ${resized.width}x${resized.height}\n`);

  // ═══ Step 1: GroundingDINO ═══
  console.log("═══ GroundingDINO ═══");
  const dinoStart = Date.now();
  const dinoOutput = await replicate.run(`${DINO_MODEL}:${DINO_VERSION}`, {
    input: {
      image: dataUri,
      query: "Buddha statue, lotus petals, orange circle, cosmic background",
      box_threshold: 0.25,
      text_threshold: 0.25,
      show_visualisation: false,
    },
  });
  const dinoMs = Date.now() - dinoStart;
  console.log(`DINO latency: ${dinoMs}ms`);
  console.log(`DINO raw output type: ${typeof dinoOutput}`);
  console.log(`DINO raw output:\n${JSON.stringify(dinoOutput, null, 2)}\n`);

  // Parse detections
  const result = dinoOutput as { detections?: Array<{ label: string; confidence: number; bbox: number[] }> };
  const detections = result.detections ?? [];
  console.log(`Detections: ${detections.length}`);
  for (const d of detections) {
    console.log(`  label="${d.label}" conf=${d.confidence?.toFixed(3)} bbox=[${d.bbox?.join(", ")}] (${typeof d.bbox?.[0]})`);
  }

  if (detections.length === 0) {
    console.log("\nNo detections — cannot test SAM2. Try different query.");
    return;
  }

  // ═══ Step 2: SAM2 with bbox ═══
  const bestDet = detections[0];
  const bbox = bestDet.bbox;
  console.log(`\n═══ SAM2 (bbox=[${bbox.join(",")}]) ═══`);

  // Try different input_box formats to find what works
  const formats = [
    { name: "comma-string", value: bbox.join(",") },
    { name: "space-string", value: bbox.join(" ") },
    { name: "array", value: bbox },
  ];

  for (const fmt of formats) {
    console.log(`\nTrying input_box format: ${fmt.name} → ${JSON.stringify(fmt.value)}`);
    const sam2Start = Date.now();
    try {
      const sam2Output = await replicate.run(`${SAM2_MODEL}:${SAM2_VERSION}`, {
        input: {
          image: dataUri,
          input_box: fmt.value,
        },
      });
      const sam2Ms = Date.now() - sam2Start;
      console.log(`  SAM2 latency: ${sam2Ms}ms`);
      console.log(`  SAM2 output type: ${typeof sam2Output}`);
      console.log(`  SAM2 output: ${JSON.stringify(sam2Output, null, 2).slice(0, 500)}`);

      // Check if it's a URL, array of URLs, or object
      if (typeof sam2Output === "string") {
        console.log(`  → Single URL string`);
        const resp = await fetch(sam2Output);
        const maskBuf = Buffer.from(await resp.arrayBuffer());
        const maskMeta = await sharp(maskBuf).metadata();
        console.log(`  → Mask: ${maskMeta.width}x${maskMeta.height}, ${maskMeta.channels}ch, ${maskMeta.format}`);
        await sharp(maskBuf).toFile(path.join(OUTPUT_DIR, `sam2-mask-${fmt.name}.png`));
      } else if (Array.isArray(sam2Output)) {
        console.log(`  → Array of ${sam2Output.length} items`);
        for (let i = 0; i < Math.min(sam2Output.length, 3); i++) {
          const item = sam2Output[i];
          console.log(`  [${i}]: ${typeof item} → ${String(item).slice(0, 200)}`);
          if (typeof item === "string" && item.startsWith("http")) {
            const resp = await fetch(item);
            const maskBuf = Buffer.from(await resp.arrayBuffer());
            const maskMeta = await sharp(maskBuf).metadata();
            console.log(`    Mask: ${maskMeta.width}x${maskMeta.height}, ${maskMeta.channels}ch, ${maskMeta.format}`);
            await sharp(maskBuf).toFile(path.join(OUTPUT_DIR, `sam2-mask-${fmt.name}-${i}.png`));
          }
        }
      } else if (sam2Output && typeof sam2Output === "object") {
        console.log(`  → Object with keys: ${Object.keys(sam2Output as Record<string, unknown>).join(", ")}`);
      }

      console.log(`  ✓ Format "${fmt.name}" WORKS`);
      break; // Stop after first successful format
    } catch (err) {
      const sam2Ms = Date.now() - sam2Start;
      console.log(`  ✗ Format "${fmt.name}" FAILED (${sam2Ms}ms): ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\nOutput saved to: ${OUTPUT_DIR}/`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
