import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  validateAndPrepare,
  detectManualLayers,
  ensureRgba,
} from "./lib/input-validator.js";
import { parseCliArgs } from "./lib/pipeline-cli.js";
import { scoreComplexity } from "./lib/complexity-scoring.js";
import { decomposeImage, SAM2_MODEL, SAM2_VERSION } from "./lib/image-decompose.js";
import { extractCandidates } from "./lib/candidate-extraction.js";
import {
  deduplicateCandidates,
  resolveExclusiveOwnership,
  assignRoles,
  orderByRole,
  applyRetentionRules,
  fillBackgroundPlate,
  buildExclusiveMasks,
} from "./lib/layer-resolve.js";
import { SAM_OPACITY_THRESHOLD, SAM_MIN_COVERAGE } from "./lib/pipeline-constants.js";
import { validateFilePath, IMAGE_EXTENSIONS } from "./lib/validate-file-path.js";
import { computeMaskStats } from "./lib/mask-stats.js";
import { buildMaskCache } from "./lib/mask-cache.js";
import { batchProcess } from "./lib/batch-process.js";
import { generateSceneJson } from "./lib/scene-generator.js";
import type { RetainedLayer } from "./lib/scene-generator.js";
import {
  generateManifest,
  writeManifest,
  copySourceImages,
} from "./lib/decomposition-manifest.js";
import type { ManifestInput } from "./lib/decomposition-manifest.js";
import { createRunContext, parseTitle } from "./lib/archive.js";
import { maskToken } from "./lib/replicate-utils.js";
import type { ResearchConfig } from "./research/research-config.js";
import type { LayerCandidate } from "../src/lib/scene-schema.js";

async function main() {
  // --- Step 0: Parse CLI ---
  const cliArgs = parseCliArgs(process.argv.slice(2));
  if (!cliArgs.inputPath) {
    console.error(
      "Usage: npm run pipeline:layers <input.png> [--layers N] [--description \"text\"] [--unsafe] [--duration N] [--production]",
    );
    process.exit(1);
  }

  // Optional ResearchConfig for threshold overrides (loaded if available)
  let pipelineConfig: (Partial<ResearchConfig> & { numLayers?: number }) | undefined;
  try {
    const { loadConfig } = await import("./research/research-config.js");
    pipelineConfig = loadConfig("scripts/research/research-config.ts");
  } catch {
    // Research config not available — use module defaults
  }

  const replicateToken = process.env.REPLICATE_API_TOKEN ?? "";

  const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  const title = parseTitle(process.argv.slice(2), cliArgs.inputPath);
  const ctx = createRunContext(projectRoot, title, "layered");
  const layersDir = ctx.paths.layers;
  fs.mkdirSync(layersDir, { recursive: true });
  const publicDir = path.join(projectRoot, "public");
  const publicLayersDir = path.join(publicDir, "layers");

  // --- Step 0: Path traversal validation ---
  const resolvedInput = path.resolve(cliArgs.inputPath);
  if (!validateFilePath(resolvedInput, projectRoot, IMAGE_EXTENSIONS)) {
    console.error(`Input path must be within project root: ${resolvedInput}`);
    process.exit(1);
  }

  // --- Step 1: Input validation OR manual layers ---
  const manualLayersInput = path.join(projectRoot, "layers");

  // Validate layers/ directory is within project root (symlinked dir attack)
  let manualLayers: string[] | null = null;
  if (fs.existsSync(manualLayersInput)) {
    try {
      const realLayersDir = fs.realpathSync(manualLayersInput);
      const realProjectRoot = fs.realpathSync(projectRoot);
      if (!realLayersDir.startsWith(realProjectRoot + path.sep) && realLayersDir !== realProjectRoot) {
        console.error(`Layers directory must be within project root: ${realLayersDir}`);
        process.exit(1);
      }
    } catch {
      console.error(`Cannot resolve layers directory: ${manualLayersInput}`);
      process.exit(1);
    }
    manualLayers = detectManualLayers(manualLayersInput);
  }
  let imageWidth: number;
  let imageHeight: number;
  let preparedPath: string;
  let candidates: LayerCandidate[];
  let selectedLayerCount: number | null = null;
  const passes: ManifestInput["passes"] = [];

  if (manualLayers) {
    // Validate each manual layer file before any I/O
    for (const layerFile of manualLayers) {
      if (!validateFilePath(layerFile, projectRoot, IMAGE_EXTENSIONS)) {
        console.error(`Manual layer path must be within project root: ${layerFile}`);
        process.exit(1);
      }
    }

    // Manual layers bypass: copy to work dir, extract candidates, skip API
    console.log(`Found ${manualLayers.length} manual layers in layers/. Skipping API call.`);
    const meta = await sharp(manualLayers[0]).metadata();
    imageWidth = meta.width || 1080;
    imageHeight = meta.height || 1920;
    if (imageWidth > 4096 || imageHeight > 4096) {
      throw new Error(`Manual layer dimensions ${imageWidth}x${imageHeight} exceed 4096px limit. Resize layers first.`);
    }
    preparedPath = manualLayers[0];
    console.log(`Layer dimensions: ${imageWidth}x${imageHeight}`);

    fs.mkdirSync(layersDir, { recursive: true });
    for (const src of manualLayers) {
      fs.copyFileSync(src, path.join(layersDir, path.basename(src)));
    }
    const workLayers = manualLayers.map((p) => path.join(layersDir, path.basename(p)));
    for (const layerPath of workLayers) {
      await ensureRgba(layerPath);
    }

    // Extract candidates from manual layers
    candidates = [];
    for (const layerPath of workLayers) {
      const extracted = await extractCandidates(layerPath, layersDir, pipelineConfig);
      candidates.push(...extracted);
    }
    candidates = await deduplicateCandidates(candidates, pipelineConfig);
    selectedLayerCount = candidates.length;
    passes.push({ type: "manual-layers", candidateCount: candidates.length });
  } else {
    // API-based decomposition
    console.log("Validating input...");
    const prepared = await validateAndPrepare(path.resolve(cliArgs.inputPath), {
      outputDir: path.resolve(".cache/research/inputs"),
    });
    imageWidth = prepared.width;
    imageHeight = prepared.height;
    preparedPath = prepared.filePath;
    console.log(`Input: ${prepared.width}x${prepared.height}${prepared.wasResized ? " (resized)" : ""}`);

    // --- Step 2: Complexity scoring ---
    if (cliArgs.layerOverride) {
      selectedLayerCount = cliArgs.layerOverride;
      console.log(`  Layer count override: ${selectedLayerCount}`);
    } else if (typeof pipelineConfig?.samMaskLimit === "number") {
      selectedLayerCount = pipelineConfig.samMaskLimit;
      console.log(`  Configured SAM 2 mask limit: ${selectedLayerCount}`);
    } else if (typeof pipelineConfig?.numLayers === "number") {
      selectedLayerCount = pipelineConfig.numLayers;
      console.log(`  Legacy config layer count override: ${selectedLayerCount}`);
    } else {
      console.log("\nScoring image complexity...");
      const complexity = await scoreComplexity(preparedPath, pipelineConfig);
      selectedLayerCount = complexity.layerCount;
      console.log(`  Complexity: tier=${complexity.tier}, edgeDensity=${complexity.edgeDensity.toFixed(3)}, colorEntropy=${complexity.colorEntropy.toFixed(3)} → ${selectedLayerCount} layers`);
    }

    // --- Step 3: Decomposition (SAM 2) ---
    console.log(`\nDecomposing image (SAM 2, max layers: ${selectedLayerCount})...`);
    const decomposeResult = await decomposeImage(preparedPath, layersDir, {
      maxLayers: selectedLayerCount,
      alphaThreshold: pipelineConfig?.alphaThreshold,
      minCoverage: pipelineConfig?.minCoverage,
    });

    console.log(`  ${decomposeResult.files.length} raw layers generated (${decomposeResult.method})`);
    const rawPassCounts = decomposeResult.fileMeta.reduce(
      (acc, meta) => {
        acc[meta.source] = (acc[meta.source] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    if ((rawPassCounts["sam2-segment"] ?? 0) > 0) {
      passes.push({
        type: "sam2-segment",
        candidateCount: rawPassCounts["sam2-segment"],
      });
    }
    if ((rawPassCounts["luminance-split"] ?? 0) > 0) {
      passes.push({
        type: "luminance-fallback",
        candidateCount: rawPassCounts["luminance-split"],
      });
    }

    // --- Step 4: Convert SAM masks directly to candidates (batched, concurrency=4) ---
    console.log("\nConverting SAM masks to candidates...");
    const indices = Array.from({ length: decomposeResult.files.length }, (_, i) => i);
    const batchResults = await batchProcess(indices, 4, async (fi) => {
      const file = decomposeResult.files[fi];
      const sourceMeta = decomposeResult.fileMeta[fi];
      const meta = await sharp(file).metadata();
      const { data } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const w = meta.width!;
      const h = meta.height!;
      const rgba = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

      const stats = computeMaskStats(rgba, w, h, SAM_OPACITY_THRESHOLD);
      if (stats.coverage < SAM_MIN_COVERAGE) return null;

      return {
        id: crypto.randomUUID(),
        source: sourceMeta?.source ?? "sam2-segment",
        filePath: file,
        width: w,
        height: h,
        coverage: stats.coverage,
        bbox: stats.bbox,
        centroid: stats.centroid,
        edgeDensity: 0,
        componentCount: 1,
      } as LayerCandidate;
    });
    candidates = batchResults.filter((c): c is LayerCandidate => c !== null);
    console.log(`  ${candidates.length} candidates from SAM masks`);
    candidates = await deduplicateCandidates(candidates, pipelineConfig);
  }

  // --- Step 5.5: Build per-candidate mask cache ---
  const activeCandidates = candidates.filter((c) => !c.droppedReason);
  const maskCache = await buildMaskCache(activeCandidates, imageWidth, imageHeight, pipelineConfig?.alphaThreshold);

  // --- Step 6: Resolve exclusive ownership ---
  console.log("Resolving exclusive pixel ownership...");
  const withOwnership = await resolveExclusiveOwnership(
    activeCandidates,
    imageWidth,
    imageHeight,
    pipelineConfig,
    maskCache,
  );
  // Merge ownership results back
  const ownershipMap = new Map(withOwnership.map((c) => [c.id, c]));
  candidates = candidates.map((c) =>
    ownershipMap.has(c.id) ? ownershipMap.get(c.id)! : c,
  );

  // --- Step 7: Assign roles ---
  console.log("Assigning roles...");
  const forRoles = candidates.filter((c) => !c.droppedReason);
  const withRoles = assignRoles(forRoles, imageWidth, imageHeight, pipelineConfig);
  const roleMap = new Map(withRoles.map((c) => [c.id, c]));
  candidates = candidates.map((c) =>
    roleMap.has(c.id) ? roleMap.get(c.id)! : c,
  );

  // --- Step 8: Order by role z-ladder ---
  console.log("Ordering by role...");
  const forOrder = candidates.filter((c) => !c.droppedReason);
  const ordered = orderByRole(forOrder);

  // Re-resolve exclusive ownership in role order (T5) — reuse mask cache
  const reordered = await resolveExclusiveOwnership(
    ordered,
    imageWidth,
    imageHeight,
    pipelineConfig,
    maskCache,
  );
  const reorderMap = new Map(reordered.map((c) => [c.id, c]));
  candidates = candidates.map((c) =>
    reorderMap.has(c.id) ? reorderMap.get(c.id)! : c,
  );

  // --- Step 9: Apply retention rules ---
  console.log("Applying retention rules...");
  const maxLayers = pipelineConfig?.maxLayers ?? 16;
  candidates = applyRetentionRules(
    candidates,
    maxLayers,
    preparedPath,
    pipelineConfig,
  );

  // Re-sort retained by role z-ladder (handles fallback bg-plate inserted at end)
  let retained = orderByRole(candidates.filter((c) => !c.droppedReason));
  const dropped = candidates.filter((c) => !!c.droppedReason);
  console.log(`  ${retained.length} retained, ${dropped.length} dropped`);

  // --- Step 10: Fill background plate ---
  const bgPlate = retained.find((c) => c.role === "background-plate");
  if (bgPlate) {
    console.log("Filling background plate...");
    const { claimedMask } = await buildExclusiveMasks(
      retained,
      imageWidth,
      imageHeight,
      pipelineConfig?.alphaThreshold,
    );
    const filled = await fillBackgroundPlate(
      bgPlate,
      path.resolve(cliArgs.inputPath),
      claimedMask,
      imageWidth,
      imageHeight,
      layersDir,
    );
    // Update the candidate in the retained list
    const bgIdx = retained.findIndex((c) => c.id === bgPlate.id);
    if (bgIdx !== -1) {
      retained[bgIdx] = filled;
    }
    if (filled.warning) {
      console.log("  WARNING: background plate has >50% unclaimed pixels");
    }
  }

  // --- Step 11: Convert to RetainedLayer[] for scene generation ---
  // Use layer-{i}.png naming to match the copy step (Step 15)
  const retainedLayers: RetainedLayer[] = retained.map((c, i) => ({
    file: `layers/layer-${i}.png`,
    role: c.role ?? "midground",
    coverage: c.coverage,
    uniqueCoverage: c.uniqueCoverage ?? c.coverage,
  }));

  console.log(`\nFinal layer stack (${retainedLayers.length} layers):`);
  for (let i = 0; i < retainedLayers.length; i++) {
    const rl = retainedLayers[i];
    console.log(`  z${i}: ${rl.role} — coverage=${(rl.coverage * 100).toFixed(1)}%, unique=${(rl.uniqueCoverage * 100).toFixed(1)}%`);
  }

  // --- Step 12: Generate scene.json ---
  const sourceName = path.basename(cliArgs.inputPath);
  console.log("\nGenerating scene.json...");
  const scene = await generateSceneJson(
    sourceName,
    retainedLayers,
    [imageWidth, imageHeight],
    cliArgs.duration,
    pipelineConfig,
  );

  const manifestLayerCount = selectedLayerCount ?? retained.length;

  // --- Step 13: Generate + write manifest ---
  const manifestInput: ManifestInput = {
    runId: ctx.runId,
    pipelineVariant: "sam2",
    sourceImage: path.resolve(cliArgs.inputPath),
    preparedImage: preparedPath,
    models: {
      sam2: {
        model: SAM2_MODEL,
        version: SAM2_VERSION,
        maskLimit: manifestLayerCount,
      },
    },
    passes,
    retainedLayers: retained,
    droppedCandidates: dropped,
    unsafeFlag: cliArgs.unsafe,
    productionMode: cliArgs.production,
    requestedLayerCount: cliArgs.layerOverride,
    selectedLayerCount: manifestLayerCount,
  };

  try {
    const manifest = generateManifest(manifestInput);
    writeManifest(manifest, ctx.archiveDir);
    console.log("Manifest written to archive.");
  } catch (manifestErr) {
    // Non-fatal: manifest generation failure should not block pipeline
    const errMsg = manifestErr instanceof Error ? manifestErr.message : String(manifestErr);
    console.warn(`Manifest generation warning: ${maskToken(errMsg, replicateToken)}`);
  }

  // --- Step 14: Copy source images to archive ---
  copySourceImages(path.resolve(cliArgs.inputPath), preparedPath, ctx.archiveDir);

  // --- Step 15: Copy layers + scene.json to public/ ---
  fs.mkdirSync(publicLayersDir, { recursive: true });
  // Clean old layers
  for (const f of fs.readdirSync(publicLayersDir)) {
    if (f.startsWith("layer-")) fs.unlinkSync(path.join(publicLayersDir, f));
  }
  for (let i = 0; i < retained.length; i++) {
    const destName = `layer-${i}.png`;
    fs.copyFileSync(retained[i].filePath, path.join(publicLayersDir, destName));
    // Also copy to archive layers/
    const archiveLayersDir = path.join(ctx.archiveDir, "layers");
    fs.mkdirSync(archiveLayersDir, { recursive: true });
    fs.copyFileSync(retained[i].filePath, path.join(archiveLayersDir, destName));
  }
  const sceneJsonPath = path.join(publicDir, "scene.json");
  fs.writeFileSync(sceneJsonPath, JSON.stringify(scene, null, 2));
  fs.writeFileSync(path.join(ctx.archiveDir, "scene.json"), JSON.stringify(scene, null, 2));
  console.log(`scene.json + ${retained.length} layers copied to public/ and archive`);

  // Cleanup work dir (auto-cleanup also registered on exit)
  ctx.cleanup();

  console.log(`\nPipeline complete. Archive: ${ctx.archiveDir}`);
  console.log("Run `npm run dev` then open http://localhost:5173/?mode=layered");
}

main().catch((err) => {
  const token = process.env.REPLICATE_API_TOKEN ?? "";
  console.error("Error:", maskToken(String(err), token));
  process.exit(1);
});
