import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import {
  validateAndPrepare,
  detectManualLayers,
  ensureRgba,
} from "./lib/input-validator.js";
import { decomposeImage, downloadLayers } from "./lib/image-layered.js";
import { checkDeps } from "./lib/check-deps.js";
import { postprocessLayers } from "./lib/postprocess.js";
import { generateSceneJson } from "./lib/scene-generator.js";

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: npm run pipeline:layers <input.png>");
    process.exit(1);
  }

  const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  const layersDir = path.join(projectRoot, "out", "layers");
  const publicDir = path.join(projectRoot, "public");
  const publicLayersDir = path.join(publicDir, "layers");

  checkDeps();

  // --- Step 1: Layer Split ---
  const manualLayers = detectManualLayers(layersDir);
  if (manualLayers) {
    console.log(`Found ${manualLayers.length} manual layers in layers/. Skipping API call.`);
    for (const layerPath of manualLayers) {
      await ensureRgba(layerPath);
    }
  } else {
    console.log("Validating input...");
    const { filePath, width, height, wasResized } =
      await validateAndPrepare(path.resolve(inputPath));
    console.log(`Input: ${width}x${height}${wasResized ? " (resized)" : ""}`);

    console.log("Decomposing image into layers...");
    const { urls, count } = await decomposeImage(filePath, { numLayers: 4 });
    console.log(`Got ${count} layers from Replicate API.`);

    console.log("Downloading layers...");
    const files = await downloadLayers(urls, layersDir);
    for (const f of files) {
      console.log(`  ${path.basename(f)}`);
    }
  }

  // --- Step 2: Post-Process ---
  console.log("\nPost-processing layers...");
  const result = await postprocessLayers(layersDir);
  console.log(`Ordered ${result.files.length} layers by coverage: ${result.coverages.map((c) => c.toFixed(2)).join(", ")}`);

  // --- Step 2b: Generate scene.json ---
  const sourceName = inputPath ? path.basename(inputPath) : "manual-input";
  console.log("Generating scene.json...");
  const scene = await generateSceneJson(sourceName, result);

  const sceneJsonPath = path.join(publicDir, "scene.json");

  // --- Copy to public for Vite serving ---
  fs.mkdirSync(publicLayersDir, { recursive: true });
  for (const file of result.files) {
    fs.copyFileSync(file, path.join(publicLayersDir, path.basename(file)));
  }
  fs.writeFileSync(sceneJsonPath, JSON.stringify(scene, null, 2));
  console.log(`scene.json + layers copied to public/ (${scene.layers.length} layers)`);

  console.log("\nPipeline complete. Run `npm run dev` then open http://localhost:5173/?mode=layered");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
