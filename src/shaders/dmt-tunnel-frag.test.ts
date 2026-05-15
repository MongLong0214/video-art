/// <reference types="node" />
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const fragSrc = readFileSync(resolve(__dirname, "dmt-tunnel.frag"), "utf-8");

describe("dmt-tunnel.frag reference anatomy", () => {
  it("uses log-polar coordinates for concentric tunnel rings", () => {
    expect(fragSrc).toMatch(/log\(max\(r,\s*1e-6\)\)/);
    expect(fragSrc).toMatch(/ringFreq\s*=\s*6\.0\s*\*\s*uFoldScale/);
  });

  it("uses triangular angular waves for jagged ring edges", () => {
    expect(fragSrc).toMatch(/float\s+tri\s*\(/);
    expect(fragSrc).toMatch(/theta01\s*\*\s*32\.0/);
    expect(fragSrc).toMatch(/theta01\s*\*\s*16\.0/);
  });

  it("adds polar fbm noise for rough reference texture", () => {
    expect(fragSrc).toMatch(/float\s+fbm2\s*\(/);
    expect(fragSrc).toMatch(/roughUv/);
    expect(fragSrc).toMatch(/grainUv/);
  });

  it("keeps the central eye intentionally dark", () => {
    expect(fragSrc).toMatch(/DARK CENTRAL EYE/);
    expect(fragSrc).toMatch(/pupilCol/);
    expect(fragSrc).toMatch(/coreMask/);
  });
});
