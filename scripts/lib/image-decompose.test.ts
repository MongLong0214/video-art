import { describe, expect, it } from "vitest";

import {
  buildResidualMask,
  shouldRunLuminanceFallback,
} from "./image-decompose.js";

describe("buildResidualMask", () => {
  it("computes the uncovered residual area across multiple SAM masks", () => {
    const width = 2;
    const height = 2;
    const maskA = Uint8Array.from([1, 0, 0, 0]);
    const maskB = Uint8Array.from([0, 1, 0, 0]);

    const result = buildResidualMask([maskA, maskB], width, height);

    expect(Array.from(result.residualMask)).toEqual([0, 0, 1, 1]);
    expect(result.residualCoverage).toBe(0.5);
  });

  it("returns full residual coverage when SAM produced no masks", () => {
    const result = buildResidualMask([], 2, 2);
    expect(Array.from(result.residualMask)).toEqual([1, 1, 1, 1]);
    expect(result.residualCoverage).toBe(1);
  });
});

describe("shouldRunLuminanceFallback", () => {
  it("does not run when fallback is disabled", () => {
    expect(
      shouldRunLuminanceFallback(0, 1, {
        enabled: false,
        minSamLayers: 3,
        residualCoverageMin: 0,
      }),
    ).toBe(false);
  });

  it("does not run when SAM already met the minimum layer target", () => {
    expect(
      shouldRunLuminanceFallback(3, 0.4, {
        enabled: true,
        minSamLayers: 3,
        residualCoverageMin: 0,
      }),
    ).toBe(false);
  });

  it("requires sufficient residual coverage when a minimum is set", () => {
    expect(
      shouldRunLuminanceFallback(2, 0.04, {
        enabled: true,
        minSamLayers: 4,
        residualCoverageMin: 0.05,
      }),
    ).toBe(false);
    expect(
      shouldRunLuminanceFallback(2, 0.08, {
        enabled: true,
        minSamLayers: 4,
        residualCoverageMin: 0.05,
      }),
    ).toBe(true);
  });
});
