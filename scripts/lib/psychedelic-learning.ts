import type { SourceRegionCapacity } from "./source-region-capacity.js";

export type PsychedelicLearningRecord = {
  readonly version: 2;
  readonly createdAt: string;
  readonly status: "PASS" | "REJECT";
  readonly candidate: { readonly path: string; readonly sha256: string };
  readonly source: { readonly path: string; readonly sha256: string };
  readonly scene: { readonly path: string; readonly sha256: string };
  readonly axis: string;
  readonly primitive: string;
  readonly failures: readonly string[];
  readonly envelope: {
    readonly materialCoverageFloor: number;
    readonly connectedCoverageFloor: number;
    readonly temporalCoherenceFloor: number;
    readonly fineMotionCeiling: number;
    readonly globalChromaMotionShareCeiling: number;
  };
};

type FailureFamily = "point-residual-motion" | "global-color-carrier" | "anchor-damaging-transform" | "region-affinity-permission-failure";

export type PsychedelicLearningPlan = {
  readonly version: 1;
  readonly source: { readonly path: string; readonly sha256: string };
  readonly evidence: {
    readonly rejectedCandidates: number;
    readonly failureFamilies: readonly FailureFamily[];
    readonly candidateHashes: readonly string[];
    readonly regionCapacity: SourceRegionCapacity;
  };
  readonly decision: {
    readonly mode: "preview" | "diagnostic" | "promote";
    readonly family: string;
    readonly axis: string;
    readonly primitive: string;
    readonly fullRenderAllowed: boolean;
    readonly audioAllowed: boolean;
    readonly blockedFamilies: readonly string[];
    readonly blockedRetunes: readonly string[];
    readonly requiredInvariants: readonly string[];
    readonly requiredEvidence: readonly string[];
    readonly acceptance: PsychedelicLearningRecord["envelope"];
  };
};

export type PsychedelicLearningInput = {
  readonly source: PsychedelicLearningPlan["source"];
  readonly records: readonly PsychedelicLearningRecord[];
  readonly regionCapacity: SourceRegionCapacity;
};

const IN_PLACE_INVARIANTS = [
  "all visible output must be source-derived in-place material",
  "no global hue, saturation, glow, palette, or overlay carrier",
  "no fixed source base behind a decorative effect",
  "eye, hand, silhouette, and dark gaps remain source anchors",
] as const;

const REGION_AFFINITY_FAMILY = "region-affinity-permission-failure";
const REGION_AFFINITY_AXIS = "source-region-affinity";
const REGION_AFFINITY_PRIMITIVE = "region-affinity-coordinate-transport";

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function hasAll(record: PsychedelicLearningRecord, required: readonly string[]): boolean {
  return required.every((failure) => record.failures.includes(failure));
}

function classify(record: PsychedelicLearningRecord): readonly FailureFamily[] {
  const families: FailureFamily[] = [];
  if (hasAll(record, ["material-coverage", "material-connectedness", "temporal-boiling"])) families.push("point-residual-motion");
  if (record.failures.includes("broad-color-spread")) families.push("global-color-carrier");
  if (record.failures.some((failure) => failure === "source-edge-damage" || failure === "source-frame-drift" || failure === "source-local-drift")) {
    families.push("anchor-damaging-transform");
  }
  if (record.axis === REGION_AFFINITY_AXIS || record.primitive === REGION_AFFINITY_PRIMITIVE) {
    families.push("region-affinity-permission-failure");
  }
  return families;
}

function blockedFamilyFor(record: PsychedelicLearningRecord): string | undefined {
  if (record.axis === "source-detail-residual") return "fixed-base-residual";
  if (record.axis === "source-stream-coordinate") return "single-direction-coordinate-trace";
  if (record.axis === REGION_AFFINITY_AXIS || record.primitive === REGION_AFFINITY_PRIMITIVE) return REGION_AFFINITY_FAMILY;
  if (record.failures.includes("broad-color-spread")) return "global-chroma-carrier";
  if (record.failures.some((failure) => failure === "source-edge-damage" || failure === "source-frame-drift" || failure === "source-local-drift")) {
    return "whole-frame-geometry-remap";
  }
  return undefined;
}

function latestEnvelope(records: readonly PsychedelicLearningRecord[]): PsychedelicLearningRecord["envelope"] {
  const latest = records.at(-1);
  if (latest !== undefined) return latest.envelope;
  return {
    materialCoverageFloor: 0.12,
    connectedCoverageFloor: 0.06,
    temporalCoherenceFloor: 0.8,
    fineMotionCeiling: 0.35,
    globalChromaMotionShareCeiling: 0.65,
  };
}

export function buildPsychedelicLearningPlan(input: PsychedelicLearningInput): PsychedelicLearningPlan {
  const sourceRecords = input.records.filter((record) => record.source.sha256 === input.source.sha256);
  const rejected = sourceRecords.filter((record) => record.status === "REJECT");
  const families = unique(rejected.flatMap(classify)) as readonly FailureFamily[];
  const blockedFamilies = unique(rejected.flatMap((record) => {
    const family = blockedFamilyFor(record);
    return family === undefined ? [] : [family];
  }));
  const blockedRetunes = unique(rejected.map((record) => `${record.axis} / ${record.primitive}`));
  const pointResidualCount = rejected.filter((record) => classify(record).includes("point-residual-motion")).length;
  const envelope = latestEnvelope(sourceRecords);
  const regionAffinityBlocked =
    blockedFamilies.includes(REGION_AFFINITY_FAMILY) ||
    blockedRetunes.includes(`${REGION_AFFINITY_AXIS} / ${REGION_AFFINITY_PRIMITIVE}`) ||
    rejected.some((record) => record.axis === REGION_AFFINITY_AXIS);

  if (sourceRecords.some((record) => record.status === "PASS")) {
    return {
      version: 1,
      source: input.source,
      evidence: { rejectedCandidates: rejected.length, failureFamilies: families, candidateHashes: sourceRecords.map((record) => record.candidate.sha256), regionCapacity: input.regionCapacity },
      decision: {
        mode: "promote",
        family: "verified-candidate",
        axis: "gate-pass",
        primitive: "exact-scene-promotion",
        fullRenderAllowed: true,
        audioAllowed: false,
        blockedFamilies,
        blockedRetunes,
        requiredInvariants: IN_PLACE_INVARIANTS,
        requiredEvidence: ["fresh PASS gate report tied to the exact scene SHA", "source and reference contact review"],
        acceptance: envelope,
      },
    };
  }

  // After a failed region-affinity attempt, never re-offer the same primitive as a preview.
  if (regionAffinityBlocked) {
    return {
      version: 1,
      source: input.source,
      evidence: { rejectedCandidates: rejected.length, failureFamilies: families, candidateHashes: sourceRecords.map((record) => record.candidate.sha256), regionCapacity: input.regionCapacity },
      decision: {
        mode: "diagnostic",
        family: REGION_AFFINITY_FAMILY,
        axis: REGION_AFFINITY_AXIS,
        primitive: "region-affinity-permission-audit",
        fullRenderAllowed: false,
        audioAllowed: false,
        blockedFamilies: unique([...blockedFamilies, REGION_AFFINITY_FAMILY]),
        blockedRetunes: unique([...blockedRetunes, `${REGION_AFFINITY_AXIS} / ${REGION_AFFINITY_PRIMITIVE}`]),
        requiredInvariants: IN_PLACE_INVARIANTS,
        requiredEvidence: [
          "renderer-equivalent affinity field coverage + largest connected component",
          "affinity×flow and affinity×flow×stream coverage when those fields exist",
          "machine-readable region-affinity authority audit PASS before any new preview",
        ],
        acceptance: envelope,
      },
    };
  }

  const regionAffinityReady = pointResidualCount >= 2 && input.regionCapacity.canCarryConnectedTransport;
  const diagnosticNeeded = pointResidualCount >= 2 && !input.regionCapacity.canCarryConnectedTransport;
  const mode = regionAffinityReady ? "preview" : "diagnostic";
  const primitive = regionAffinityReady
    ? REGION_AFFINITY_PRIMITIVE
    : diagnosticNeeded
      ? "region-affinity-capacity-probe"
      : "source-contained-causal-probe";
  return {
    version: 1,
    source: input.source,
    evidence: { rejectedCandidates: rejected.length, failureFamilies: families, candidateHashes: sourceRecords.map((record) => record.candidate.sha256), regionCapacity: input.regionCapacity },
    decision: {
      mode,
      family: regionAffinityReady || diagnosticNeeded ? "source-region-affinity" : "causal-diagnostic",
      axis: regionAffinityReady || diagnosticNeeded ? REGION_AFFINITY_AXIS : "source-contained-diagnosis",
      primitive,
      fullRenderAllowed: false,
      audioAllowed: false,
      blockedFamilies,
      blockedRetunes,
      requiredInvariants: IN_PLACE_INVARIANTS,
      requiredEvidence: regionAffinityReady
        ? [
            "region-affinity authority audit PASS on generated invisible fields",
            "one preview only",
            "subsecond source/reference/candidate contact sheet",
            "fresh psychedelic gate report",
          ]
        : ["one diagnostic only", "subsecond source/reference/candidate contact sheet", "amplified difference map", "fresh psychedelic gate report"],
      acceptance: envelope,
    },
  };
}
