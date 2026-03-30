import fs from "node:fs";
import path from "node:path";

import type { LayerCandidate, LayerRole } from "../../src/lib/scene-schema.js";

// ---------- types ----------

export interface DepthStats {
  min: number;
  max: number;
  mean: number;
  stddev: number;
  count: number;
}

export interface ManifestInput {
  runId: string;
  pipelineVariant: "sam2" | "sam3";
  sourceImage: string;
  preparedImage: string;
  models: {
    sam2?: { model: string; version: string; maskLimit: number };
    depthAnything?: { model: string; version: string; depthConvention: "near-is-high"; status?: "success" | "failed" };
  };
  passes: Array<{
    type:
      | "sam2-segment"
      | "manual-layers";
    candidateCount: number;
    parentId?: string;
  }>;
  retainedLayers: LayerCandidate[];
  droppedCandidates: LayerCandidate[];
  unsafeFlag: boolean;
  productionMode: boolean;
  requestedLayerCount?: number;
  selectedLayerCount: number;
  depthStats?: DepthStats;
  depthRoleWeight?: number;
  roleComparison?: Array<{ id: string; roleWithoutDepth: string; roleWithDepth: string }>;
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
  pipelineVariant: ManifestInput["pipelineVariant"];
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
  depthStats?: DepthStats;
  depthRoleWeight?: number;
  roleComparison?: Array<{ id: string; roleWithoutDepth: string; roleWithDepth: string }>;
}

// ---------- core functions ----------

/**
 * Generate a manifest object from pipeline input data.
 * Throws if any model version is "latest" (exact version required for reproducibility).
 */
export const generateManifest = (input: ManifestInput): ManifestData => {
  // Validate: reject "latest" as version
  const sam2 = input.models.sam2;
  if (sam2 && input.productionMode && sam2.version.toLowerCase() === "latest") {
    throw new Error(
      `Model version must be an exact string, not "latest" in production mode: ${sam2.model}`,
    );
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
    depthStats: input.depthStats,
    depthRoleWeight: input.depthRoleWeight,
    roleComparison: input.roleComparison,
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
