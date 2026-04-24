/// <reference types="node" />
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const exportSrc = fs.readFileSync(
  path.join(import.meta.dirname, "export-dmt.ts"),
  "utf-8",
);

describe("export-dmt encoding", () => {
  it("preserves requested fps instead of forcing 30fps", () => {
    expect(exportSrc).toContain('"-r", String(fps)');
  });

  it("uses H.264 level 4.2 for 60fps vertical output", () => {
    expect(exportSrc).toContain('fps > 30 ? "4.2" : "4.0"');
  });
});
