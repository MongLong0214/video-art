import { describe, expect, it } from "vitest";
import { evaluatePsychedelicCandidate, type CandidateGateInput } from "./psychedelic-gate.js";
import type { ReferenceTextureMetrics } from "./reference-texture.js";

function texture(overrides: Partial<ReferenceTextureMetrics> = {}): ReferenceTextureMetrics {
  return {
    frameCount: 300,
    adjacentLumaMotion: 0.01,
    adjacentChromaMotion: 0.03,
    chromaToLumaMotion: 3,
    hueStep95: 6,
    hueDegreesPerSecond95: 180,
    activeTextureCoverage: 0.6,
    connectedMotionCoverage: 0.32,
    globalChromaMotionShare: 0.18,
    edgeMotionRatio: 1.1,
    edgePersistence: 0.94,
    temporalCoherence: 0.95,
    fineMotionRatio: 0.22,
    loopClosureRatio: 0.1,
    ...overrides,
  };
}

function input(overrides: Partial<CandidateGateInput> = {}): CandidateGateInput {
  return {
    candidate: texture(),
    references: [texture(), texture({ activeTextureCoverage: 0.48, connectedMotionCoverage: 0.2, fineMotionRatio: 0.28 })],
    sourceFidelity: {
      edgeCorrelationP05: 0.92,
      frameRgbDriftP95: 0.08,
      localRgbDriftP95: 0.16,
    },
    axis: "source-detail-residual",
    primitive: "wide-band-detail-travel",
    history: [],
    ...overrides,
  };
}

describe("psychedelic candidate gate", () => {
  it("rejects static, disconnected point residuals even when color spread is absent", () => {
    const result = evaluatePsychedelicCandidate(input({
      candidate: texture({
        activeTextureCoverage: 0.006,
        connectedMotionCoverage: 0.003,
        temporalCoherence: 0.42,
        fineMotionRatio: 0.76,
        globalChromaMotionShare: 0.09,
      }),
    }));

    expect(result.status).toBe("REJECT");
    expect(result.failures.map((failure) => failure.code)).toEqual(expect.arrayContaining([
      "material-coverage",
      "material-connectedness",
      "temporal-boiling",
    ]));
  });

  it("rejects a broad global chroma sheet even when motion is dense", () => {
    const result = evaluatePsychedelicCandidate(input({
      candidate: texture({
        activeTextureCoverage: 0.91,
        connectedMotionCoverage: 0.83,
        globalChromaMotionShare: 0.91,
        temporalCoherence: 0.96,
        fineMotionRatio: 0.12,
      }),
    }));

    expect(result.status).toBe("REJECT");
    expect(result.failures.map((failure) => failure.code)).toContain("broad-color-spread");
  });

  it("rejects source damage separately from movement quality", () => {
    const result = evaluatePsychedelicCandidate(input({
      sourceFidelity: {
        edgeCorrelationP05: 0.61,
        frameRgbDriftP95: 0.24,
        localRgbDriftP95: 0.41,
      },
    }));

    expect(result.status).toBe("REJECT");
    expect(result.failures.map((failure) => failure.code)).toEqual(expect.arrayContaining([
      "source-edge-damage",
      "source-frame-drift",
      "source-local-drift",
    ]));
  });

  it("blocks a primitive after repeated failures on the same axis", () => {
    const result = evaluatePsychedelicCandidate(input({
      history: [
        { status: "REJECT", axis: "source-stream", primitive: "normal-trace" },
        { status: "REJECT", axis: "source-stream", primitive: "normal-trace" },
      ],
      axis: "source-stream",
      primitive: "normal-trace",
    }));

    expect(result.status).toBe("REJECT");
    expect(result.failures.map((failure) => failure.code)).toContain("repeated-failed-primitive");
    expect(result.nextPolicy.blockedPrimitive).toBe(true);
  });

  it("passes only a coherent, source-contained candidate near the reference envelope", () => {
    const result = evaluatePsychedelicCandidate(input());

    expect(result.status).toBe("PASS");
    expect(result.failures).toEqual([]);
    expect(result.nextPolicy.fullRenderAllowed).toBe(true);
  });
});
