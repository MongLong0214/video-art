import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Read the source to verify encoding constants
const exportSrc = fs.readFileSync(
  path.join(import.meta.dirname, "export-layered.ts"),
  "utf-8",
);

describe("export-layered encoding defaults (T4)", () => {
  it("default ffmpeg args use CRF 15 and preset slow (Reels quality target)", () => {
    // CRF 15 passed literally in ffmpeg args
    expect(exportSrc).toContain('"-crf", "15"');
    expect(exportSrc).toContain('"-preset", "slow"');
  });

  it("uses yuv420p for web/Reels compatibility", () => {
    // yuv420p chosen for broad player compat (Instagram Reels, TikTok, YouTube Shorts)
    expect(exportSrc).toContain('"yuv420p"');
  });

  it("logs output size after encoding", () => {
    expect(exportSrc).toContain("Size:");
  });

  it("FPS CLI input is validated to range 1..120", () => {
    expect(exportSrc).toMatch(/val\s*>=\s*1\s*&&\s*val\s*<=\s*120/);
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