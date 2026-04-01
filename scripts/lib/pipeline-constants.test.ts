import { describe, it, expect } from "vitest";
import {
  ALPHA_THRESHOLD,
  SAM_OPACITY_THRESHOLD,
  MIN_COVERAGE,
  SAM_MIN_COVERAGE,
  UNIQUE_COVERAGE_THRESHOLD,
  IOU_DEDUPE_THRESHOLD,
  MAX_LAYERS,
  MIN_RETAINED_LAYERS,
} from "./pipeline-constants.js";

describe("pipeline-constants", () => {
  it("exports all 8 required constants", () => {
    expect(ALPHA_THRESHOLD).toBeDefined();
    expect(SAM_OPACITY_THRESHOLD).toBeDefined();
    expect(MIN_COVERAGE).toBeDefined();
    expect(SAM_MIN_COVERAGE).toBeDefined();
    expect(UNIQUE_COVERAGE_THRESHOLD).toBeDefined();
    expect(IOU_DEDUPE_THRESHOLD).toBeDefined();
    expect(MAX_LAYERS).toBeDefined();
    expect(MIN_RETAINED_LAYERS).toBeDefined();
  });

  it("SAM vs BFS thresholds are distinct where applicable", () => {
    expect(SAM_OPACITY_THRESHOLD).toBe(ALPHA_THRESHOLD);
    expect(SAM_MIN_COVERAGE).not.toBe(MIN_COVERAGE);
  });

  it("SAM_MIN_COVERAGE < MIN_COVERAGE", () => {
    expect(SAM_MIN_COVERAGE).toBeLessThan(MIN_COVERAGE);
  });

  it("has expected values", () => {
    expect(ALPHA_THRESHOLD).toBe(10);
    expect(SAM_OPACITY_THRESHOLD).toBe(10);
    expect(MIN_COVERAGE).toBe(0.005);
    expect(SAM_MIN_COVERAGE).toBe(0.001);
    expect(UNIQUE_COVERAGE_THRESHOLD).toBe(0.005);
    expect(IOU_DEDUPE_THRESHOLD).toBe(0.92);
    expect(MAX_LAYERS).toBe(16);
    expect(MIN_RETAINED_LAYERS).toBe(6);
  });
});
