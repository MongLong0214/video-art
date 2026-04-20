import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Source-content tests (matches scripts/export-layered.test.ts pattern).
// gallery-render.ts is a monolithic CLI without exports, so we verify the
// contract through static source analysis rather than runtime invocation.
const gallerySrc = fs.readFileSync(
  path.join(import.meta.dirname, "gallery-render.ts"),
  "utf-8",
);

describe("gallery-render CLI flags (T-F1)", () => {
  it("--tier-a-demo flag is parsed", () => {
    expect(gallerySrc).toContain('"--tier-a-demo"');
    expect(gallerySrc).toMatch(/tierADemoOnly\s*=\s*process\.argv\.includes/);
  });

  it("tier-a-demo defines 4 comparison presets (baseline/mandala × pre/post-A)", () => {
    // TIER_A_DEMO array entries
    expect(gallerySrc).toContain('"baseline-pre-A"');
    expect(gallerySrc).toContain('"baseline-post-A"');
    expect(gallerySrc).toContain('"mandala-pre-A"');
    expect(gallerySrc).toContain('"mandala-post-A"');
  });

  it("--no-demo flag suppresses tier-a-demo in default run", () => {
    expect(gallerySrc).toContain('"--no-demo"');
  });

  it("--sketches-only flag renders sketches without layered presets", () => {
    expect(gallerySrc).toContain('"--sketches-only"');
  });
});

describe("gallery-render sketch dispatch (T-F2)", () => {
  it("sketch URL is built as ?sketch=<name>", () => {
    expect(gallerySrc).toMatch(/\?sketch=\$\{sketch\}/);
  });

  it("sketch list is exactly [volumetric, cellular, particles, fractal-cave]", () => {
    const match = gallerySrc.match(/SKETCH_NAMES\s*=\s*\[([^\]]+)\]/);
    expect(match).not.toBeNull();
    const list = match![1];
    expect(list).toContain('"volumetric"');
    expect(list).toContain('"cellular"');
    expect(list).toContain('"particles"');
    expect(list).toContain('"fractal-cave"');
    const count = (list.match(/"/g) ?? []).length / 2;
    expect(count).toBe(4);
  });

  it("sketch output filename drops legacy 'sketch-' prefix (ticket AC-4.2)", () => {
    // renderSketch must produce `${sketch}.mp4` not `sketch-${sketch}.mp4`.
    expect(gallerySrc).toMatch(/`\$\{sketch\}\.mp4`/);
    expect(gallerySrc).not.toMatch(/`sketch-\$\{sketch\}\.mp4`/);
  });
});

describe("gallery-render failure reporting (H2 fix)", () => {
  it("clears OUT_DIR of stale mp4 before rendering", () => {
    expect(gallerySrc).toMatch(/readdirSync\(OUT_DIR\)/);
    expect(gallerySrc).toMatch(/\.endsWith\("\.mp4"\)/);
  });

  it("tracks per-render failures and sets non-zero exitCode", () => {
    expect(gallerySrc).toMatch(/failures\s*:\s*string\[\]/);
    expect(gallerySrc).toMatch(/process\.exitCode\s*=\s*1/);
  });
});

describe("gallery-render resolution contract", () => {
  it("renders at 720×1280 (9:16 Reels portrait)", () => {
    expect(gallerySrc).toMatch(/GALLERY_WIDTH\s*=\s*720/);
    expect(gallerySrc).toMatch(/GALLERY_HEIGHT\s*=\s*1280/);
  });

  it("defaults to 5s @ 30fps (150 frames)", () => {
    expect(gallerySrc).toMatch(/GALLERY_DURATION\s*=\s*5/);
    expect(gallerySrc).toMatch(/GALLERY_FPS\s*=\s*30/);
  });
});
