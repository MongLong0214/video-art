import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  validateAndPrepare,
  detectManualLayers,
  ensureRgba,
} from "./lib/input-validator.js";
import { decomposeHybrid } from "./lib/image-decompose.js";
import { postprocessLayers } from "./lib/postprocess.js";
import { generateSceneJson } from "./lib/scene-generator.js";
import { createWorkDir } from "./lib/archive.js";

function parseDuration(argv: string[]): number | undefined {
  const idx = argv.indexOf("--duration");
  if (idx === -1 || idx + 1 >= argv.length) return undefined;
  const val = parseInt(argv[idx + 1], 10);
  if (Number.isNaN(val) || val < 1 || val > 60) {
    throw new Error(`Invalid --duration value. Must be 1-60 (integer).`);
  }
  return val;
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: npm run pipeline:layers <input.png> [--duration <seconds>]");
    process.exit(1);
  }

  const duration = parseDuration(process.argv.slice(2));
  const method = process.argv.includes("--depth-only")
    ? "depth-only" as const
    : process.argv.includes("--qwen-only")
      ? "qwen-only" as const
      : "hybrid" as const;

  const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  const work = createWorkDir(projectRoot);
  const layersDir = work.paths.layers;
  const publicDir = path.join(projectRoot, "public");
  const publicLayersDir = path.join(publicDir, "layers");

  // --- Step 1: Layer Split ---
  // Manual layers: stable input dir at project root (layers/layer-0.png, ...)
  const manualLayersInput = path.join(projectRoot, "layers");
  const manualLayers = detectManualLayers(manualLayersInput);
  let result;
  let imageWidth: number;
  let imageHeight: number;

  if (manualLayers) {
    console.log(`Found ${manualLayers.length} manual layers in layers/. Skipping API call.`);
    // Read dimensions from first layer
    const meta = await sharp(manualLayers[0]).metadata();
    imageWidth = meta.width || 1080;
    imageHeight = meta.height || 1920;
    console.log(`Layer dimensions: ${imageWidth}x${imageHeight}`);
    // Copy to work dir so originals stay untouched
    fs.mkdirSync(layersDir, { recursive: true });
    for (const src of manualLayers) {
      fs.copyFileSync(src, path.join(layersDir, path.basename(src)));
    }
    const workLayers = manualLayers.map(p => path.join(layersDir, path.basename(p)));
    for (const layerPath of workLayers) {
      await ensureRgba(layerPath);
    }
    console.log("\nPost-processing layers...");
    result = await postprocessLayers(layersDir);
  } else {
    console.log("Validating input...");
    const { filePath, width, height, wasResized } =
      await validateAndPrepare(path.resolve(inputPath));
    imageWidth = width;
    imageHeight = height;
    console.log(`Input: ${width}x${height}${wasResized ? " (resized)" : ""}`);

    console.log(`\nDecomposing image (method: ${method})...`);
    const decomposeResult = await decomposeHybrid(filePath, layersDir, {
      numLayers: 8,
      depthZones: 4,
      method,
    });

    console.log(`\n${decomposeResult.files.length} layers generated (${decomposeResult.method}):`);
    for (let i = 0; i < decomposeResult.files.length; i++) {
      console.log(`  layer-${i}: ${(decomposeResult.coverages[i] * 100).toFixed(1)}%`);
    }

    // Skip aggressive postprocessing for API-generated layers
    result = {
      files: decomposeResult.files,
      order: decomposeResult.files.map((_, i) => i),
      coverages: decomposeResult.coverages,
    };
  }

  console.log(`\nOrdered ${result.files.length} layers by coverage: ${result.coverages.map((c: number) => c.toFixed(2)).join(", ")}`);

  // --- Generate scene.json ---
  const sourceName = inputPath ? path.basename(inputPath) : "manual-input";
  console.log("Generating scene.json...");
  const scene = await generateSceneJson(sourceName, result, [imageWidth, imageHeight], duration);

  const sceneJsonPath = path.join(publicDir, "scene.json");

  // --- Copy to public ---
  fs.mkdirSync(publicLayersDir, { recursive: true });
  // Clean old layers
  for (const f of fs.readdirSync(publicLayersDir)) {
    if (f.startsWith("layer-")) fs.unlinkSync(path.join(publicLayersDir, f));
  }
  for (const file of result.files) {
    fs.copyFileSync(file, path.join(publicLayersDir, path.basename(file)));
  }
  fs.writeFileSync(sceneJsonPath, JSON.stringify(scene, null, 2));
  console.log(`scene.json + layers copied to public/ (${scene.layers.length} layers)`);

  // Work dir auto-cleaned on exit via RunContext
  console.log("\nPipeline complete. Run `npm run dev` then open http://localhost:5173/?mode=layered");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});