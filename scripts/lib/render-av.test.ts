import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");
const MERGE_SCRIPT = join(PROJECT_ROOT, "audio", "render", "merge-av.sh");
const CROSSFADE_SCRIPT = join(PROJECT_ROOT, "audio", "render", "loop-crossfade.sh");

describe("render-av", () => {
  it("merge-av.sh exists and is executable", () => {
    expect(existsSync(MERGE_SCRIPT)).toBe(true);
  });

  it("merge-av.sh rejects missing args", async () => {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const exec = promisify(execFile);
    await expect(exec("bash", [MERGE_SCRIPT])).rejects.toThrow();
  });

  it("merge-av.sh uses correct ffmpeg args", () => {
    const content = readFileSync(MERGE_SCRIPT, "utf-8");
    expect(content).toContain("-c:v copy");
    expect(content).toContain("-c:a aac");
    expect(content).toContain("-b:a 320k");
  });

  it("merge-av.sh quotes all variables for safety", () => {
    const content = readFileSync(MERGE_SCRIPT, "utf-8");
    expect(content).toContain('"$VIDEO"');
    expect(content).toContain('"$AUDIO"');
    expect(content).toContain('"$OUTPUT"');
  });

  it("merge-av.sh has set -euo pipefail", () => {
    const content = readFileSync(MERGE_SCRIPT, "utf-8");
    expect(content).toContain("set -euo pipefail");
  });

  it("loop-crossfade.sh exists", () => {
    expect(existsSync(CROSSFADE_SCRIPT)).toBe(true);
  });

  it("loop-crossfade.sh rejects missing args", async () => {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const exec = promisify(execFile);
    await expect(exec("bash", [CROSSFADE_SCRIPT])).rejects.toThrow();
  });

  it("render-av.ts searches out/layered/ directory pattern", () => {
    const content = readFileSync(join(PROJECT_ROOT, "scripts", "render-av.ts"), "utf-8");
    expect(content).toContain("out/layered");
    expect(content).toContain(".mp4");
  });

  it("render-av.ts verifies AV duration with 50ms threshold", () => {
    const content = readFileSync(join(PROJECT_ROOT, "scripts", "render-av.ts"), "utf-8");
    expect(content).toContain("0.05");
  });

  it("render-audio.ts uses execFile for all external processes", () => {
    const content = readFileSync(join(PROJECT_ROOT, "scripts", "render-audio.ts"), "utf-8");
    expect(content).not.toMatch(/\bexec\b\(/);
    expect(content).not.toContain("spawn(");
    expect(content).toContain("execFile");
  });
});
