import { describe, it, expect } from "vitest";
import { parseCliArgs } from "./pipeline-cli.js";

describe("parseCliArgs — motion flags", () => {
  it("parses --motion flag", () => {
    const args = parseCliArgs(["input.png", "--motion"]);
    expect(args.motion).toBe(true);
  });

  it("defaults motion to false", () => {
    const args = parseCliArgs(["input.png"]);
    expect(args.motion).toBe(false);
  });

  it("parses --motion-model veo-3.1", () => {
    const args = parseCliArgs(["input.png", "--motion", "--motion-model", "veo-3.1"]);
    expect(args.motionModel).toBe("veo-3.1");
  });

  it("parses --motion-model seedance", () => {
    const args = parseCliArgs(["input.png", "--motion", "--motion-model", "seedance"]);
    expect(args.motionModel).toBe("seedance");
  });

  it("defaults motionModel to wan-2.2", () => {
    const args = parseCliArgs(["input.png", "--motion"]);
    expect(args.motionModel).toBe("wan-2.2");
  });

  it("rejects invalid motion model", () => {
    expect(() =>
      parseCliArgs(["input.png", "--motion", "--motion-model", "invalid"]),
    ).toThrow();
  });

  it("parses --motion-intensity low", () => {
    const args = parseCliArgs(["input.png", "--motion", "--motion-intensity", "low"]);
    expect(args.motionIntensity).toBe("low");
  });

  it("defaults motionIntensity to medium", () => {
    const args = parseCliArgs(["input.png", "--motion"]);
    expect(args.motionIntensity).toBe("medium");
  });

  it("parses --skip-flow", () => {
    const args = parseCliArgs(["input.png", "--motion", "--skip-flow"]);
    expect(args.skipFlow).toBe(true);
  });

  it("defaults skipFlow to false", () => {
    const args = parseCliArgs(["input.png", "--motion"]);
    expect(args.skipFlow).toBe(false);
  });

  it("existing flags still work with motion", () => {
    const args = parseCliArgs([
      "input.png",
      "--motion",
      "--duration",
      "20",
      "--fps",
      "60",
      "--production",
    ]);
    expect(args.motion).toBe(true);
    expect(args.duration).toBe(20);
    expect(args.fps).toBe(60);
    expect(args.production).toBe(true);
  });
});
