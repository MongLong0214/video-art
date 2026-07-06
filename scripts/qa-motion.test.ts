import { describe, expect, it } from "vitest";
import { parseCli } from "./qa-motion.js";

describe("qa-motion CLI", () => {
  it("accepts explicit source override alongside masks and json output", () => {
    expect(parseCli(["out.mp4", "--masks", "work/layers", "--source", "source.png", "--json", "qa-report.json"])).toEqual({
      videoPath: "out.mp4",
      masksDir: "work/layers",
      sourcePath: "source.png",
      jsonPath: "qa-report.json",
    });
  });
});
