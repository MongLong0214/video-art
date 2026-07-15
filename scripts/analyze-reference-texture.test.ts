import { describe, expect, it } from "vitest";
import { parseReferenceCli } from "./analyze-reference-texture.js";

describe("reference texture CLI", () => {
  it("parses a video and optional JSON destination", () => {
    expect(parseReferenceCli(["clip.mp4", "--json", "report.json"])).toEqual({
      kind: "analyze",
      videoPath: "clip.mp4",
      jsonPath: "report.json",
    });
  });

  it("recognizes help without requiring a video", () => {
    expect(parseReferenceCli(["--help"])).toEqual({ kind: "help" });
  });

  it("rejects unknown flags", () => {
    expect(() => parseReferenceCli(["clip.mp4", "--wat"])).toThrow("unknown argument");
  });
});
