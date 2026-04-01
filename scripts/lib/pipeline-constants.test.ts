import { describe, it, expect } from "vitest";
import { ALPHA_THRESHOLD } from "./pipeline-constants.js";

describe("pipeline-constants", () => {
  it("exports ALPHA_THRESHOLD", () => {
    expect(ALPHA_THRESHOLD).toBe(10);
  });
});
