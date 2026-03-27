import fs from "node:fs";
import path from "node:path";

import type { LayerCandidate, LayerRole } from "../../src/lib/scene-schema.js";

// ---------- types ----------

export interface ManifestInput {
  runId: string;
  pipelineVariant: "qwen-only" | "qwen-zoedepth";
  sourceImage: string;
  preparedImage: string;
  models: {
    qwenImageLayered: { model: string; version: string; numLayersBase: number };
    zoeDepth?: { model: string; version: string };
  };
  passes: Array<{
    type: "qwen-base" | "qwen-recursive" | "depth-split";
    candidateCount: number;
    parentId?: string;
  }>;
  retainedLayers: LayerCandidate[];
  droppedCandidates: LayerCandidate[];
  unsafeFlag: boolean;
  productionMode: boolean;
  requestedLayerCount?: number;
  selectedLayerCount: number;
}

interface ManifestFinalLayer {
  id: string;
  role?: LayerRole;
  coverage: number;
  uniqueCoverage?: number;
  meanDepth?: number;
}

interface ManifestDroppedCandidate {
  id: string;
  reason: string;
}

export interface ManifestData {
  runId: string;
  pipelineVariant: "qwen-only" | "qwen-zoedepth";
  createdAt: string;
  sourceImage: string;
  preparedImage: string;
  models: ManifestInput["models"];
  passes: ManifestInput["passes"];
  finalLayers: ManifestFinalLayer[];
  droppedCandidates: ManifestDroppedCandidate[];
  unsafeFlag: boolean;
  productionMode: boolean;
  layerCounts: {
    requested: number | null;
    selected: number;
    retained: number;
    dropped: number;
  };
}

// ---------- core functions ----------

/**
 * Generate a manifest object from pipeline input data.
 * Throws if any model version is "latest" (exact version required for reproducibility).
 */
export const generateManifest = (input: ManifestInput): ManifestData => {
  // Validate: reject "latest" as version
  const allVersions: Array<{ model: string; version: string }> = [
    input.models.qwenImageLayered,
  ];
  if (input.models.zoeDepth) {
    allVersions.push(input.models.zoeDepth);
  }
  for (const entry of allVersions) {
    if (input.productionMode && entry.version.toLowerCase() === "latest") {
      throw new Error(
        `Model version must be an exact string, not "latest" in production mode: ${entry.model}`,
      );
    }
  }

  const finalLayers: ManifestFinalLayer[] = input.retainedLayers.map(
    (layer) => ({
      id: layer.id,
      role: layer.role,
      coverage: layer.coverage,
      uniqueCoverage: layer.uniqueCoverage,
      meanDepth: layer.meanDepth,
    }),
  );

  const droppedCandidates: ManifestDroppedCandidate[] =
    input.droppedCandidates.map((cand) => ({
      id: cand.id,
      reason: cand.droppedReason ?? "unknown",
    }));

  return {
    runId: input.runId,
    pipelineVariant: input.pipelineVariant,
    createdAt: new Date().toISOString(),
    sourceImage: input.sourceImage,
    preparedImage: input.preparedImage,
    models: input.models,
    passes: input.passes,
    finalLayers,
    droppedCandidates,
    unsafeFlag: input.unsafeFlag,
    productionMode: input.productionMode,
    layerCounts: {
      requested: input.requestedLayerCount ?? null,
      selected: input.selectedLayerCount,
      retained: input.retainedLayers.length,
      dropped: input.droppedCandidates.length,
    },
  };
};

/**
 * Write the manifest as JSON to archiveDir/decomposition-manifest.json.
 */
export const writeManifest = (
  manifest: ManifestData,
  archiveDir: string,
): void => {
  fs.mkdirSync(archiveDir, { recursive: true });
  const outPath = path.join(archiveDir, "decomposition-manifest.json");
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), "utf-8");
};

/**
 * Copy the original and prepared source images into archiveDir/source/.
 * The original file keeps its extension; prepared is always .png.
 */
export const copySourceImages = (
  originalPath: string,
  preparedPath: string,
  archiveDir: string,
): void => {
  const sourceDir = path.join(archiveDir, "source");
  fs.mkdirSync(sourceDir, { recursive: true });

  const originalExt = path.extname(originalPath);
  fs.copyFileSync(originalPath, path.join(sourceDir, `original${originalExt}`));
  fs.copyFileSync(preparedPath, path.join(sourceDir, "prepared.png"));
};
