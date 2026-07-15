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

  it("supports configurable feedback warmup frames", () => {
    expect(exportSrc).toContain("FEEDBACK_WARMUP_SECONDS = 2");
    expect(exportSrc).toContain('"--warmup-frames"');
    expect(exportSrc).toMatch(/sceneNeedsFeedbackWarmup\(config\)\s*\?\s*Math\.round\(FPS\s*\*\s*FEEDBACK_WARMUP_SECONDS\)\s*:\s*0/);
    expect(exportSrc).toContain("config.effects.multipassFeedback.reactionDiffusionAmount > 0");
  });

  it("warms feedback from the loop tail before seeking back to frame 0", () => {
    expect(exportSrc).toMatch(/totalFrames\s*-\s*warmupFrames/);
    expect(exportSrc).toContain("window.__seekFrame");
    expect(exportSrc).toContain('window.__captureFrame()');
    expect(exportSrc).toContain('window.__seekFrame(0)');
  });

  it("--preview forces half-resolution capture, 15fps, and preview output name", () => {
    expect(exportSrc).toContain('"--preview"');
    expect(exportSrc).toContain("const FPS = preview ? 15");
    expect(exportSrc).toContain("computePreviewResolution(config.resolution)");
    expect(exportSrc).toContain('`${title}-preview${ext}`');
  });

  it("preview encoding skips final 1080 scale and uses fast x264 settings", () => {
    expect(exportSrc).toContain('"veryfast"');
    expect(exportSrc).toContain('"-crf", "23"');
    expect(exportSrc).toContain("preview");
  });

  it("--full-res preserves source dimensions for final H.264 output", () => {
    expect(exportSrc).toContain('"--full-res"');
    expect(exportSrc).toContain("fullResFlag");
    expect(exportSrc).toContain("scale=iw:ih");
    expect(exportSrc).toContain('"-level:v", "5.1"');
  });

  it("requires a matching psychedelic gate report before a non-preview render", () => {
    expect(exportSrc).toContain('"--gate-report"');
    expect(exportSrc).toContain("assertPsychedelicFullRenderGate");
  });

  it("requires a region-affinity authority audit before a region-affinity preview", () => {
    expect(exportSrc).toContain('"--authority-report"');
    expect(exportSrc).toContain("assertRegionAffinityAuthorityAudit");
    expect(exportSrc).toContain("sceneUsesRegionAffinity");
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
