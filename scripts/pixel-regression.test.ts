/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { main as pixelRegressionMain } from "./pixel-regression.js";

describe("pixel-regression: stub exists", () => {
  it("exports main function", () => {
    expect(typeof pixelRegressionMain).toBe("function");
  });

  it("throws 'not implemented' or returns placeholder for now (stub)", async () => {
    // T0-a ships stub only; T-A3 ticket completes implementation
    await expect(pixelRegressionMain(["--stub-check"])).rejects.toThrow(
      /not implemented|stub|T-A3/i,
    );
  });
});
