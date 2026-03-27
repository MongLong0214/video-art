const DUPLICATE_HEAVY_THRESHOLD = 0.02;
const ALL_ROLES = [
  "background-plate",
  "background",
  "midground",
  "subject",
  "detail",
  "foreground-occluder",
] as const;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

interface ManifestLayer {
  uniqueCoverage?: number;
  role?: string;
}

interface ManifestLike {
  finalLayers: ManifestLayer[];
}

export function computeLayerIndependence(
  manifest: ManifestLike | null | undefined,
): number {
  if (!manifest?.finalLayers?.length) return 0;

  const layers = manifest.finalLayers;
  const coverages = layers.map((l) => l.uniqueCoverage ?? 0);
  const mean = coverages.reduce((a, b) => a + b, 0) / coverages.length;
  const duplicateHeavyCount = coverages.filter(
    (c) => c < DUPLICATE_HEAVY_THRESHOLD,
  ).length;
  const duplicateHeavyRatio = duplicateHeavyCount / coverages.length;

  return clamp01(mean * (1 - duplicateHeavyRatio));
}

export function computeRoleCoherence(
  manifest: ManifestLike | null | undefined,
): number {
  if (!manifest?.finalLayers?.length) return 0;

  const layers = manifest.finalLayers;
  const total = layers.length;

  const assignedCount = layers.filter(
    (l) => l.role && l.role.length > 0,
  ).length;
  const assignedRatio = assignedCount / total;

  const hasBgPlate = layers.some((l) => l.role === "background-plate");
  const bgPlateBonus = hasBgPlate ? 1 : 0;

  const uniqueRoles = new Set(
    layers.map((l) => l.role).filter(Boolean),
  ).size;
  const diversityRatio = uniqueRoles / ALL_ROLES.length;

  return clamp01(
    assignedRatio * 0.6 + bgPlateBonus * 0.2 + diversityRatio * 0.2,
  );
}
