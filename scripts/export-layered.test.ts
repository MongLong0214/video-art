import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Read the source to verify encoding constants
const exportSrc = fs.readFileSync(
  path.join(import.meta.dirname, "export-layered.ts"),
  "utf-8",
);

describe("export-layered encoding defaults (T4)", () => {
  it("default ffmpeg args use CRF 15 and veryslow", () => {
    // Default CRF: fallback is 15
    expect(exportSrc).toContain(": 15;");
    // Default PRESET: "veryslow"
    expect(exportSrc).toContain('"veryslow"');
  });

  it("uses yuv444p as default pix_fmt", () => {
    expect(exportSrc).toContain('"yuv444p"');
  });

  it("logs output size after encoding", () => {
    // encodeVideo .then logs sizeMB
    expect(exportSrc).toContain("Size:");
  });

  it("CRF range validation 0-51", () => {
    expect(exportSrc).toMatch(/rawCrf\s*>=\s*0\s*&&\s*rawCrf\s*<=\s*51/);
  });
});

describe("pipeline-cli flags (T4/T7)", () => {
  // Import parseCliArgs dynamically to test flags
  it("--prores flag parsed", async () => {
    const { parseCliArgs } = await import("./lib/pipeline-cli.js");
    const args = parseCliArgs(["input.png", "--prores"]);
    expect(args.prores).toBe(true);
  });

  it("--fps flag parsed", async () => {
    const { parseCliArgs } = await import("./lib/pipeline-cli.js");
    const args = parseCliArgs(["input.png", "--fps", "60"]);
    expect(args.fps).toBe(60);
  });

  it("--fps rejects invalid values", async () => {
    const { parseCliArgs } = await import("./lib/pipeline-cli.js");
    expect(() => parseCliArgs(["input.png", "--fps", "0"])).toThrow();
    expect(() => parseCliArgs(["input.png", "--fps", "200"])).toThrow();
  });

});