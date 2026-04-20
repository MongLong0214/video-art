/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { main as pixelRegressionMain, parseArgs } from "./pixel-regression.js";

describe("pixel-regression: CLI + shape", () => {
  it("exports main function", () => {
    expect(typeof pixelRegressionMain).toBe("function");
  });

  it("parseArgs default threshold is 0.995", () => {
    const a = parseArgs([]);
    expect(a.threshold).toBe(0.995);
  });

  it("parseArgs accepts --threshold override", () => {
    const a = parseArgs(["--threshold", "0.99"]);
    expect(a.threshold).toBe(0.99);
  });

  it("parseArgs accepts --preset path", () => {
    const a = parseArgs(["--preset", "solo/T13-baseline"]);
    expect(a.preset).toBe("solo/T13-baseline");
  });

  it("stub-check flag triggers legacy guard error", async () => {
    await expect(pixelRegressionMain(["--stub-check"])).rejects.toThrow(/stub|T-A3/i);
  });
});
