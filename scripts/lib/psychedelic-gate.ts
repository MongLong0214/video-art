import type { ReferenceTextureMetrics } from "./reference-texture.js";

export type SourceFidelityMetrics = {
  readonly edgeCorrelationP05: number;
  readonly frameRgbDriftP95: number;
  readonly localRgbDriftP95: number;
};

export type CandidateGateHistoryEntry = {
  readonly status: "PASS" | "REJECT";
  readonly axis: string;
  readonly primitive: string;
};

export type CandidateGateInput = {
  readonly candidate: ReferenceTextureMetrics;
  readonly references: readonly ReferenceTextureMetrics[];
  readonly sourceFidelity: SourceFidelityMetrics;
  readonly axis: string;
  readonly primitive: string;
  readonly history: readonly CandidateGateHistoryEntry[];
};

export type CandidateGateFailureCode =
  | "material-coverage"
  | "material-connectedness"
  | "temporal-boiling"
  | "broad-color-spread"
  | "source-edge-damage"
  | "source-frame-drift"
  | "source-local-drift"
  | "repeated-failed-primitive";

export type CandidateGateFailure = {
  readonly code: CandidateGateFailureCode;
  readonly observed: number;
  readonly threshold: number;
  readonly requirement: string;
};

export type CandidateGateResult = {
  readonly status: "PASS" | "REJECT";
  readonly failures: readonly CandidateGateFailure[];
  readonly envelope: {
    readonly materialCoverageFloor: number;
    readonly connectedCoverageFloor: number;
    readonly temporalCoherenceFloor: number;
    readonly fineMotionCeiling: number;
    readonly globalChromaMotionShareCeiling: number;
  };
  readonly nextPolicy: {
    readonly fullRenderAllowed: boolean;
    readonly blockedPrimitive: boolean;
    readonly instruction: string;
  };
};

function minMetric(references: readonly ReferenceTextureMetrics[], key: keyof ReferenceTextureMetrics): number {
  return Math.min(...references.map((reference) => reference[key] as number));
}

function maxMetric(references: readonly ReferenceTextureMetrics[], key: keyof ReferenceTextureMetrics): number {
  return Math.max(...references.map((reference) => reference[key] as number));
}

function instructionFor(failures: readonly CandidateGateFailure[], repeated: boolean): string {
  if (repeated) return "same axis and primitive are blocked; choose a new source-contained transformation primitive";
  if (failures.some((failure) => failure.code === "broad-color-spread")) {
    return "do not increase hue or saturation; remove the global chroma carrier and retain only source-contained material travel";
  }
  if (failures.some((failure) => failure.code === "source-edge-damage" || failure.code === "source-frame-drift" || failure.code === "source-local-drift")) {
    return "preserve the source anchor before increasing motion; do not add an overlay or a fixed source base";
  }
  if (failures.some((failure) => failure.code === "temporal-boiling")) {
    return "do not tune amplitude or cadence on this primitive; replace pointwise residual motion with a new connected source-material primitive";
  }
  return "increase connected source-material travel without introducing a global color carrier";
}

export function evaluatePsychedelicCandidate(input: CandidateGateInput): CandidateGateResult {
  if (input.references.length === 0) throw new Error("at least one reference profile is required");

  const materialCoverageFloor = Math.max(0.05, minMetric(input.references, "activeTextureCoverage") * 0.25);
  const connectedCoverageFloor = Math.max(0.04, minMetric(input.references, "connectedMotionCoverage") * 0.25);
  const temporalCoherenceFloor = Math.max(0.75, minMetric(input.references, "temporalCoherence") * 0.85);
  const fineMotionCeiling = Math.min(0.45, Math.max(0.34, maxMetric(input.references, "fineMotionRatio") * 1.25));
  const globalChromaMotionShareCeiling = Math.min(0.65, maxMetric(input.references, "globalChromaMotionShare") + 0.12);
  const failures: CandidateGateFailure[] = [];

  if (input.candidate.activeTextureCoverage < materialCoverageFloor) {
    failures.push({
      code: "material-coverage",
      observed: input.candidate.activeTextureCoverage,
      threshold: materialCoverageFloor,
      requirement: "connected source material must animate across enough of the image",
    });
  }
  if (input.candidate.connectedMotionCoverage < connectedCoverageFloor) {
    failures.push({
      code: "material-connectedness",
      observed: input.candidate.connectedMotionCoverage,
      threshold: connectedCoverageFloor,
      requirement: "motion must form connected source-material regions, not isolated residuals",
    });
  }
  if (input.candidate.temporalCoherence < temporalCoherenceFloor || input.candidate.fineMotionRatio > fineMotionCeiling) {
    failures.push({
      code: "temporal-boiling",
      observed: input.candidate.temporalCoherence < temporalCoherenceFloor
        ? input.candidate.temporalCoherence
        : input.candidate.fineMotionRatio,
      threshold: input.candidate.temporalCoherence < temporalCoherenceFloor ? temporalCoherenceFloor : fineMotionCeiling,
      requirement: "motion must travel coherently rather than flicker as pointwise boil",
    });
  }
  if (input.candidate.globalChromaMotionShare > globalChromaMotionShareCeiling) {
    failures.push({
      code: "broad-color-spread",
      observed: input.candidate.globalChromaMotionShare,
      threshold: globalChromaMotionShareCeiling,
      requirement: "global chroma motion must remain below the reference material-travel envelope",
    });
  }
  if (input.sourceFidelity.edgeCorrelationP05 < 0.84) {
    failures.push({
      code: "source-edge-damage",
      observed: input.sourceFidelity.edgeCorrelationP05,
      threshold: 0.84,
      requirement: "source structure and anchor edges must remain stable",
    });
  }
  if (input.sourceFidelity.frameRgbDriftP95 > 0.18) {
    failures.push({
      code: "source-frame-drift",
      observed: input.sourceFidelity.frameRgbDriftP95,
      threshold: 0.18,
      requirement: "frame-wide source drift must remain bounded",
    });
  }
  if (input.sourceFidelity.localRgbDriftP95 > 0.3) {
    failures.push({
      code: "source-local-drift",
      observed: input.sourceFidelity.localRgbDriftP95,
      threshold: 0.3,
      requirement: "local source detail must remain recognizable",
    });
  }

  const repeatedFailures = input.history.filter((entry) =>
    entry.status === "REJECT" && entry.axis === input.axis && entry.primitive === input.primitive,
  ).length;
  const blockedPrimitive = repeatedFailures >= 2;
  if (blockedPrimitive) {
    failures.push({
      code: "repeated-failed-primitive",
      observed: repeatedFailures,
      threshold: 2,
      requirement: "a failed source-motion primitive cannot be retried without a new mechanism",
    });
  }

  return {
    status: failures.length === 0 ? "PASS" : "REJECT",
    failures,
    envelope: {
      materialCoverageFloor,
      connectedCoverageFloor,
      temporalCoherenceFloor,
      fineMotionCeiling,
      globalChromaMotionShareCeiling,
    },
    nextPolicy: {
      fullRenderAllowed: failures.length === 0,
      blockedPrimitive,
      instruction: instructionFor(failures, blockedPrimitive),
    },
  };
}
