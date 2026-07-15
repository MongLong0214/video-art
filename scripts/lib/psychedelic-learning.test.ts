import { describe, expect, it } from "vitest";
import {
  buildPsychedelicLearningPlan,
  type PsychedelicLearningRecord,
} from "./psychedelic-learning.js";
import type { SourceRegionCapacity } from "./source-region-capacity.js";

function capacity(overrides: Partial<SourceRegionCapacity> = {}): SourceRegionCapacity {
  return {
    analysisWidth: 240,
    analysisHeight: 427,
    sourcePixelsPerCell: 8,
    midBandSupportCoverage: 0.42,
    connectedSupportCoverage: 0.21,
    transportInteriorCoverage: 0.18,
    coarseBoundaryConflict: 0.16,
    affinityActiveCoverage: 0.22,
    affinityConnectedCoverage: 0.18,
    canCarryConnectedTransport: true,
    ...overrides,
  };
}

function rejectedRecord(
  axis: string,
  primitive: string,
  failures = ["material-coverage", "material-connectedness", "temporal-boiling"],
): PsychedelicLearningRecord {
  return {
    version: 2,
    createdAt: "2026-07-15T00:00:00.000Z",
    status: "REJECT",
    candidate: { path: `${primitive}.mp4`, sha256: primitive },
    source: { path: "portrait.png", sha256: "source-hash" },
    scene: { path: `${primitive}.json`, sha256: `${primitive}-scene` },
    axis,
    primitive,
    failures,
    envelope: {
      materialCoverageFloor: 0.12,
      connectedCoverageFloor: 0.067,
      temporalCoherenceFloor: 0.81,
      fineMotionCeiling: 0.34,
      globalChromaMotionShareCeiling: 0.65,
    },
  };
}

describe("psychedelic learning planner", () => {
  it("moves two distinct point-residual failures to one new region-affinity preview family", () => {
    const plan = buildPsychedelicLearningPlan({
      source: { path: "portrait.png", sha256: "source-hash" },
      records: [
        rejectedRecord("source-stream-coordinate", "coarse-field-normal-trace"),
        rejectedRecord("source-detail-residual", "wide-band-detail-travel"),
      ],
      regionCapacity: capacity(),
    });

    expect(plan.decision.mode).toBe("preview");
    expect(plan.decision.family).toBe("source-region-affinity");
    expect(plan.decision.primitive).toBe("region-affinity-coordinate-transport");
    expect(plan.decision.fullRenderAllowed).toBe(false);
    expect(plan.decision.audioAllowed).toBe(false);
    expect(plan.decision.blockedFamilies).toEqual(expect.arrayContaining([
      "fixed-base-residual",
      "single-direction-coordinate-trace",
    ]));
    expect(plan.decision.requiredEvidence).toEqual(expect.arrayContaining([
      "region-affinity authority audit PASS on generated invisible fields",
    ]));
  });

  it("stops for a capacity diagnostic when renderer-equivalent affinity cannot carry transport", () => {
    const plan = buildPsychedelicLearningPlan({
      source: { path: "portrait.png", sha256: "source-hash" },
      records: [
        rejectedRecord("source-stream-coordinate", "coarse-field-normal-trace"),
        rejectedRecord("source-detail-residual", "wide-band-detail-travel"),
      ],
      regionCapacity: capacity({
        canCarryConnectedTransport: false,
        affinityActiveCoverage: 0.02,
        affinityConnectedCoverage: 0.01,
      }),
    });

    expect(plan.decision.mode).toBe("diagnostic");
    expect(plan.decision.primitive).toBe("region-affinity-capacity-probe");
  });

  it("after r207/r208/r209 rejects, forces diagnostic and blocks region-affinity re-preview", () => {
    const plan = buildPsychedelicLearningPlan({
      source: { path: "portrait.png", sha256: "source-hash" },
      records: [
        rejectedRecord("source-stream-coordinate", "coarse-field-normal-trace"),
        rejectedRecord("source-detail-residual", "wide-band-detail-travel"),
        rejectedRecord("source-region-affinity", "region-affinity-coordinate-transport", [
          "material-coverage",
          "material-connectedness",
          "temporal-boiling",
        ]),
      ],
      // Even if binary-era capacity would look ready, a failed affinity attempt must not re-open preview.
      regionCapacity: capacity({ canCarryConnectedTransport: true }),
    });

    expect(plan.decision.mode).toBe("diagnostic");
    expect(plan.decision.primitive).toBe("region-affinity-permission-audit");
    expect(plan.decision.fullRenderAllowed).toBe(false);
    expect(plan.decision.audioAllowed).toBe(false);
    expect(plan.decision.blockedFamilies).toContain("region-affinity-permission-failure");
    expect(plan.decision.blockedRetunes).toContain("source-region-affinity / region-affinity-coordinate-transport");
  });

  it("locks global colour carriers after broad colour spread instead of treating density as success", () => {
    const plan = buildPsychedelicLearningPlan({
      source: { path: "portrait.png", sha256: "source-hash" },
      records: [rejectedRecord("source-prism", "global-phase-colour", ["broad-color-spread"])],
      regionCapacity: capacity(),
    });

    expect(plan.decision.mode).toBe("diagnostic");
    expect(plan.decision.blockedFamilies).toContain("global-chroma-carrier");
    expect(plan.decision.requiredInvariants).toContain("no global hue, saturation, glow, palette, or overlay carrier");
  });
});
