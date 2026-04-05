import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRunContext } from "./archive.js";

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "archive-test-"));
}

describe("generateRunId (via createRunContext)", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs) {
      if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  it("produces 8-char hex run-id", () => {
    const dir = tmpDir();
    dirs.push(dir);
    const ctx = createRunContext(dir, "test", "layered");
    dirs.push(ctx.archiveDir);
    expect(ctx.runId).toMatch(/^[0-9a-f]{8}$/);
    ctx.cleanup();
  });

  it("includes run-id in archive directory name", () => {
    const dir = tmpDir();
    dirs.push(dir);
    const ctx = createRunContext(dir, "test", "layered");
    dirs.push(ctx.archiveDir);
    const dirName = path.basename(ctx.archiveDir);
    expect(dirName).toContain(ctx.runId);
    ctx.cleanup();
  });

  it("concurrent calls with same title produce different directories", () => {
    const dir = tmpDir();
    dirs.push(dir);
    const ctx1 = createRunContext(dir, "same-title", "layered");
    const ctx2 = createRunContext(dir, "same-title", "layered");
    dirs.push(ctx1.archiveDir, ctx2.archiveDir);
    expect(ctx1.archiveDir).not.toBe(ctx2.archiveDir);
    expect(ctx1.runId).not.toBe(ctx2.runId);
    ctx1.cleanup();
    ctx2.cleanup();
  });
});
