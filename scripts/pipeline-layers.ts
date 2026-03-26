import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import Replicate from "replicate";
import {
  validateAndPrepare,
  detectManualLayers,
  ensureRgba,
} from "./lib/input-validator.js";
import { parseCliArgs } from "./lib/pipeline-cli.js";
import { scoreComplexity } from "./lib/complexity-scoring.js";
import { decomposeHybrid } from "./lib/image-decompose.js";
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
import {
  computeDepthStats,
  selectiveDepthSplit,
  runVariantB,
} from "./lib/depth-utils.js";
import { shouldRecurse, recursiveDecompose } from "./lib/image-decompose.js";
import { generateSceneJson } from "./lib/scene-generator.js";
import type { RetainedLayer } from "./lib/scene-generator.js";
import {
  generateManifest,
  writeManifest,
  copySourceImages,
} from "./lib/decomposition-manifest.js";
import type { ManifestInput } from "./lib/decomposition-manifest.js";
import { createRunContext, parseTitle } from "./lib/archive.js";
import { postprocessLayers } from "./lib/postprocess.js";
import type { LayerCandidate } from "../src/lib/scene-schema.js";

async function main() {
  // --- Step 0: Parse CLI ---
  const cliArgs = parseCliArgs(process.argv.slice(2));
  if (!cliArgs.inputPath) {
    console.error(
      "Usage: npm run pipeline:layers <input.png> [--variant qwen-only|qwen-zoedepth] [--layers N] [--unsafe] [--duration N] [--production]",
    );
    process.exit(1);
  }

  const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  const title = parseTitle(process.argv.slice(2), cliArgs.inputPath);
  const ctx = createRunContext(projectRoot, title, "layered");
  const layersDir = ctx.paths.layers;
  fs.mkdirSync(layersDir, { recursive: true });
  const publicDir = path.join(projectRoot, "public");
  const publicLayersDir = path.join(publicDir, "layers");

  // --- Step 1: Input validation OR manual layers ---
  const manualLayersInput = path.join(projectRoot, "layers");
  const manualLayers = detectManualLayers(manualLayersInput);
  let imageWidth: number;
  let imageHeight: number;
  let preparedPath: string;
  let candidates: LayerCandidate[];
  const passes: ManifestInput["passes"] = [];

  if (manualLayers) {
    // Manual layers bypass: copy to work dir, extract candidates, skip API
    console.log(`Found ${manualLayers.length} manual layers in layers/. Skipping API call.`);
    const meta = await sharp(manualLayers[0]).metadata();
    imageWidth = meta.width || 1080;
    imageHeight = meta.height || 1920;
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
      const extracted = await extractCandidates(layerPath, layersDir);
      candidates.push(...extracted);
    }
    passes.push({ type: "qwen-base", candidateCount: candidates.length });
  } else {
    // API-based decomposition
    console.log("Validating input...");
    const prepared = await validateAndPrepare(path.resolve(cliArgs.inputPath));
    imageWidth = prepared.width;
    imageHeight = prepared.height;
    preparedPath = prepared.filePath;
    console.log(`Input: ${prepared.width}x${prepared.height}${prepared.wasResized ? " (resized)" : ""}`);

    // --- Step 2: Complexity scoring (when --layers not specified) ---
    const numLayers = cliArgs.layerOverride ?? (() => {
      console.log("\nScoring image complexity...");
      // scoreComplexity is async but we need sync layer count decision
      // Use default 8 here; actual scoring happens below for the manifest
      return 8;
    })();

    // If --layers not specified, use complexity scoring to determine layer count
    let selectedLayerCount = numLayers;
    if (!cliArgs.layerOverride) {
      const complexity = await scoreComplexity(preparedPath);
      selectedLayerCount = complexity.layerCount;
      console.log(`  Complexity: tier=${complexity.tier}, edgeDensity=${complexity.edgeDensity.toFixed(3)}, colorEntropy=${complexity.colorEntropy.toFixed(3)} → ${selectedLayerCount} layers`);
    } else {
      console.log(`  Layer count override: ${selectedLayerCount}`);
    }

    // --- Step 3: Qwen semantic decomposition ---
    console.log(`\nDecomposing image (variant: ${cliArgs.variant}, layers: ${selectedLayerCount})...`);
    const decomposeResult = await decomposeHybrid(preparedPath, layersDir, {
      numLayers: selectedLayerCount,
      depthZones: 4,
      method: cliArgs.variant === "qwen-zoedepth" ? "hybrid" : "qwen-only",
    });

    console.log(`  ${decomposeResult.files.length} raw layers generated (${decomposeResult.method})`);

    // --- Step 4: Extract candidates from each RGBA layer ---
    console.log("\nExtracting candidates from layers...");
    candidates = [];
    for (const file of decomposeResult.files) {
      const extracted = await extractCandidates(file, layersDir);
      candidates.push(...extracted);
    }
    console.log(`  ${candidates.length} candidates extracted`);
    passes.push({ type: "qwen-base", candidateCount: candidates.length });

    // --- Step 4b: Selective recursive decomposition (T9) ---
    const apiCallCount = { current: 0 };
    const maxRecursiveCalls = 3;
    const recursiveChildren: LayerCandidate[] = [];

    for (const c of candidates) {
      if (shouldRecurse(c)) {
        console.log(`  Candidate ${c.id.slice(0, 8)} triggers recursive decompose (coverage=${(c.coverage * 100).toFixed(1)}%, components=${c.componentCount})`);
        const children = await recursiveDecompose(c, {
          outputDir: layersDir,
          apiCallCount,
          maxRecursiveCalls,
        });
        if (children.length > 0) {
          recursiveChildren.push(...children);
          passes.push({
            type: "qwen-recursive",
            candidateCount: children.length,
            parentId: c.id,
          });
        }
      }
    }

    // Reintegrate: replace parents with children
    if (recursiveChildren.length > 0) {
      const parentIds = new Set(recursiveChildren.map((c) => c.parentId));
      candidates = [
        ...candidates.filter((c) => !parentIds.has(c.id)),
        ...recursiveChildren,
      ];
      console.log(`  After recursive reintegration: ${candidates.length} candidates`);
    }
  }

  // --- Step 5: Deduplicate candidates ---
  console.log("\nDeduplicating candidates...");
  candidates = await deduplicateCandidates(candidates);
  const activeAfterDedup = candidates.filter((c) => !c.droppedReason);
  console.log(`  ${activeAfterDedup.length} candidates after dedup (${candidates.length - activeAfterDedup.length} dropped)`);

  // --- Step 6: Resolve exclusive ownership ---
  console.log("Resolving exclusive pixel ownership...");
  const activeCandidates = candidates.filter((c) => !c.droppedReason);
  const withOwnership = await resolveExclusiveOwnership(activeCandidates, imageWidth, imageHeight);
  // Merge ownership results back
  const ownershipMap = new Map(withOwnership.map((c) => [c.id, c]));
  candidates = candidates.map((c) =>
    ownershipMap.has(c.id) ? ownershipMap.get(c.id)! : c,
  );

  // --- Step 7: Assign roles ---
  console.log("Assigning roles...");
  const forRoles = candidates.filter((c) => !c.droppedReason);
  const withRoles = assignRoles(forRoles, imageWidth, imageHeight);
  const roleMap = new Map(withRoles.map((c) => [c.id, c]));
  candidates = candidates.map((c) =>
    roleMap.has(c.id) ? roleMap.get(c.id)! : c,
  );

  // --- Step 8: Order by role z-ladder ---
  console.log("Ordering by role...");
  const forOrder = candidates.filter((c) => !c.droppedReason);
  const ordered = orderByRole(forOrder);

  // Re-resolve exclusive ownership in role order (T5)
  const reordered = await resolveExclusiveOwnership(ordered, imageWidth, imageHeight);
  const reorderMap = new Map(reordered.map((c) => [c.id, c]));
  candidates = candidates.map((c) =>
    reorderMap.has(c.id) ? reorderMap.get(c.id)! : c,
  );

  // --- Step 9: Apply retention rules ---
  console.log("Applying retention rules...");
  const maxLayers = 8;
  candidates = applyRetentionRules(candidates, maxLayers, path.resolve(cliArgs.inputPath));

  const retained = candidates.filter((c) => !c.droppedReason);
  const dropped = candidates.filter((c) => !!c.droppedReason);
  console.log(`  ${retained.length} retained, ${dropped.length} dropped`);

  // --- Step 10: Fill background plate ---
  const bgPlate = retained.find((c) => c.role === "background-plate");
  if (bgPlate) {
    console.log("Filling background plate...");
    const { claimedMask } = await buildExclusiveMasks(retained, imageWidth, imageHeight);
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
  );

  // --- Step 13: Generate + write manifest ---
  const manifestInput: ManifestInput = {
    runId: ctx.runId,
    pipelineVariant: cliArgs.variant,
    sourceImage: path.resolve(cliArgs.inputPath),
    preparedImage: preparedPath,
    models: {
      qwenImageLayered: {
        model: "qwen/qwen-image-layered",
        version: "latest",
        numLayersBase: cliArgs.layerOverride ?? 8,
      },
      ...(cliArgs.variant === "qwen-zoedepth"
        ? {
            zoeDepth: {
              model: "cjwbw/zoedepth",
              version: "6375723d97400d3ac7b88e3022b738bf6f433ae165c4a2acd1955eaa6b8fcb62",
            },
          }
        : {}),
    },
    passes,
    retainedLayers: retained,
    droppedCandidates: dropped,
    unsafeFlag: cliArgs.unsafe,
    productionMode: cliArgs.production,
    requestedLayerCount: cliArgs.layerOverride,
    selectedLayerCount: retained.length,
  };

  try {
    const manifest = generateManifest(manifestInput);
    writeManifest(manifest, ctx.archiveDir);
    console.log("Manifest written to archive.");
  } catch (manifestErr) {
    // Non-fatal: manifest generation failure should not block pipeline
    console.warn(`Manifest generation warning: ${manifestErr instanceof Error ? manifestErr.message : String(manifestErr)}`);
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
  console.error("Error:", err.message);
  process.exit(1);
});
