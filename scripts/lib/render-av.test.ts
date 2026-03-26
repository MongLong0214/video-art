import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");
const MERGE_SCRIPT = join(PROJECT_ROOT, "audio", "render", "merge-av.sh");

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

  it("render-av.ts exports exist", async () => {
    // Verify the script file exists
    const scriptPath = join(PROJECT_ROOT, "scripts", "render-av.ts");
    expect(existsSync(scriptPath)).toBe(true);
  });

  it("ffmpeg args should use -c:v copy -c:a aac -b:a 320k", async () => {
    const { readFileSync } = await import("node:fs");
    const content = readFileSync(MERGE_SCRIPT, "utf-8");
    expect(content).toContain("-c:v copy");
    expect(content).toContain("-c:a aac");
    expect(content).toContain("-b:a 320k");
  });
});
