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
// scoreComplexity no longer needed — SAM3 path doesn't use complexity scoring
import { decomposeImage, DAV2_MODEL, DAV2_VERSION, SAM3_MODEL, SAM3_VERSION, sortCandidatesForOverlap } from "./lib/image-decompose.js";
import { computeMeanDepth, computeDepthStats } from "./lib/depth-computation.js";
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
// SAM_OPACITY_THRESHOLD, SAM_MIN_COVERAGE no longer needed — SAM3 builds candidates directly
import { validateFilePath, IMAGE_EXTENSIONS } from "./lib/validate-file-path.js";
// computeMaskStats no longer needed — SAM3 computes stats internally
import { buildMaskCache } from "./lib/mask-cache.js";
// batchProcess no longer needed — SAM3 builds candidates directly
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
  let depthMapBuffer: Buffer | undefined;
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

    // SAM3 only — no SAM2 path

    // --- SAM3 Replicate + Depth Anything V2 ---
    console.log("\nDecomposing image (SAM3 semantic)...");
    const decomposeResult = await decomposeImage(preparedPath, layersDir, {
      sam3Threshold: pipelineConfig?.sam3Threshold,
      secondPassEnabled: pipelineConfig?.secondPassEnabled,
      secondPassThreshold: pipelineConfig?.secondPassThreshold,
      alphaThreshold: pipelineConfig?.alphaThreshold,
      minCoverage: pipelineConfig?.minCoverage,
      manualPrompts: cliArgs.prompts,
      morphCloseEnabled: pipelineConfig?.morphCloseEnabled,
      morphCloseKernelScale: pipelineConfig?.morphCloseKernelScale,
      alphaMatteEnabled: pipelineConfig?.alphaMatteEnabled,
      alphaMatteRadiusScale: pipelineConfig?.alphaMatteRadiusScale,
    });

    depthMapBuffer = decomposeResult.depthMap;
    console.log(`  ${decomposeResult.files.length} layers generated (${decomposeResult.method})`);
    passes.push({ type: "sam3-semantic", candidateCount: decomposeResult.files.length });

    if (decomposeResult.candidates && decomposeResult.candidates.length > 0) {
      const hasDepth = decomposeResult.candidates.some(c => c.meanDepth !== undefined);
      candidates = sortCandidatesForOverlap(decomposeResult.candidates, hasDepth);
      console.log(`  ${candidates.length} candidates (${hasDepth ? "depth" : "coverage"}-sorted)`);
      candidates = await deduplicateCandidates(candidates, pipelineConfig);
    } else {
      throw new Error("SAM3 produced candidates but no valid layers. This should not happen.");
    }
    selectedLayerCount = candidates.length;
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
  // Debug: show uniqueCoverage per candidate
  for (const c of withOwnership) {
    console.log(`  ${(c.filePath ?? "").split("/").pop()}: coverage=${(c.coverage * 100).toFixed(1)}% unique=${((c.uniqueCoverage ?? 0) * 100).toFixed(1)}%`);
  }

  // --- Step 6.5: Compute meanDepth from depth map ---
  if (depthMapBuffer) {
    console.log("Computing per-candidate meanDepth...");
    const depthRaw = await sharp(depthMapBuffer)
      .resize(imageWidth, imageHeight)
      .grayscale()
      .raw()
      .toBuffer();
    const depthArray = new Uint8Array(depthRaw.buffer, depthRaw.byteOffset, depthRaw.byteLength);

    const depthMap = new Map<string, number>();
    for (const c of candidates.filter((c) => !c.droppedReason)) {
      const mask = maskCache.get(c.id);
      if (mask) {
        depthMap.set(c.id, computeMeanDepth(depthArray, mask, imageWidth, imageHeight));
      }
    }
    candidates = candidates.map((c) =>
      depthMap.has(c.id) ? { ...c, meanDepth: depthMap.get(c.id)! } : c,
    );
    const depths = candidates.filter((c) => !c.droppedReason).map((c) => c.meanDepth ?? 128);
    const depthStats = computeDepthStats(depths);
    console.log(`  Depth stats: min=${depthStats.min.toFixed(0)}, max=${depthStats.max.toFixed(0)}, mean=${depthStats.mean.toFixed(0)}, stddev=${depthStats.stddev.toFixed(1)}`);
  } else {
    console.log("  No depth map available — using default meanDepth=128");
  }

  // --- Step 7: Assign roles (with depth comparison for Phase 2 validation) ---
  console.log("Assigning roles...");
  const forRoles = candidates.filter((c) => !c.droppedReason);

  // Role comparison: heuristic-only baseline vs depth-boosted
  const baselineRoles = assignRoles(forRoles, imageWidth, imageHeight, { ...pipelineConfig, depthRoleWeight: 0 });
  const baselineRoleMap = new Map(baselineRoles.map((c) => [c.id, c.role ?? "midground"]));

  const withRoles = assignRoles(forRoles, imageWidth, imageHeight, pipelineConfig);
  const roleMap = new Map(withRoles.map((c) => [c.id, c]));
  candidates = candidates.map((c) =>
    roleMap.has(c.id) ? roleMap.get(c.id)! : c,
  );

  const roleComparison = forRoles.map((c) => ({
    id: c.id,
    roleWithoutDepth: String(baselineRoleMap.get(c.id) ?? "midground"),
    roleWithDepth: String(roleMap.get(c.id)?.role ?? "midground"),
  }));

  // --- Step 8: Order by role z-ladder ---
  console.log("Ordering by role...");
  const forOrder = candidates.filter((c) => !c.droppedReason);
  const ordered = orderByRole(forOrder);

  // Keep original uniqueCoverage from first ownership pass — no re-resolve
  // (Re-resolving in role order causes background-plate to steal all pixels)

  // --- Step 9: Apply retention rules ---
  // Debug: show post-reorder ownership
  for (const c of candidates.filter(c => !c.droppedReason)) {
    console.log(`  pre-retention: ${(c.filePath ?? "").split("/").pop()} role=${c.role} unique=${((c.uniqueCoverage ?? 0) * 100).toFixed(1)}%`);
  }
  console.log("Applying retention rules...");
  const maxLayers = pipelineConfig?.maxLayers ?? 16;
  candidates = applyRetentionRules(
    candidates,
    maxLayers,
    path.resolve(cliArgs.inputPath),
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
    meanDepth: c.meanDepth,
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
    cliArgs.fps,
  );

  const manifestLayerCount = selectedLayerCount ?? retained.length;

  // --- Step 13: Generate + write manifest ---
  // Compute depthStats for manifest
  const manifestDepthStats = depthMapBuffer ? (() => {
    const depths = retained.map((c) => c.meanDepth).filter((d): d is number => d !== undefined);
    return depths.length > 0 ? computeDepthStats(depths) : undefined;
  })() : undefined;

  const manifestInput: ManifestInput = {
    runId: ctx.runId,
    pipelineVariant: "sam3",
    sourceImage: path.resolve(cliArgs.inputPath),
    preparedImage: preparedPath,
    models: {
      sam3: { model: SAM3_MODEL, version: SAM3_VERSION },
      depthAnything: {
        model: DAV2_MODEL,
        version: DAV2_VERSION,
        depthConvention: "near-is-high" as const,
        status: depthMapBuffer ? "success" : "failed",
      },
    },
    passes,
    retainedLayers: retained,
    droppedCandidates: dropped,
    unsafeFlag: cliArgs.unsafe,
    productionMode: cliArgs.production,
    requestedLayerCount: cliArgs.layerOverride,
    selectedLayerCount: manifestLayerCount,
    depthStats: manifestDepthStats,
    depthRoleWeight: pipelineConfig?.depthRoleWeight,
    roleComparison,
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
  if (depthMapBuffer) {
    const sourceDir = path.join(ctx.archiveDir, "source");
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(path.join(sourceDir, "depth-map.png"), depthMapBuffer);
  }

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
