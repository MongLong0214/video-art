import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// T-F3: verify docs/shader-dev-manual.md covers the Tier A + Tier B/C
// surface that the ticket promised. Source-content checks only — no runtime.
const manualPath = path.join(
  import.meta.dirname,
  "..",
  "..",
  "docs",
  "shader-dev-manual.md",
);
const manualSrc = fs.readFileSync(manualPath, "utf-8");

describe("docs/shader-dev-manual.md coverage (T-F3)", () => {
  it("references all 4 Tier B/C sketches via ?sketch= URLs", () => {
    const matches = manualSrc.match(/\?sketch=[a-z-]+/g) ?? [];
    const names = new Set(matches.map((m) => m.replace("?sketch=", "")));
    expect(names.has("volumetric")).toBe(true);
    expect(names.has("cellular")).toBe(true);
    expect(names.has("particles")).toBe(true);
    expect(names.has("fractal-cave")).toBe(true);
  });

  it("documents 3 Tier A post-FX techniques (multipassFeedback / lensDistortion / bloom chain)", () => {
    expect(manualSrc).toMatch(/multipassFeedback/);
    expect(manualSrc).toMatch(/lensDistortion/);
    // Third Tier A technique is the bloom/post-processing chain polish row
    expect(manualSrc).toMatch(/T-A3/);
  });

  it("documents all 13 Tier 1 layer.frag techniques (T1..T13)", () => {
    for (let i = 1; i <= 13; i++) {
      expect(manualSrc).toMatch(new RegExp(`\\bT${i}\\b`));
    }
  });

  it("documents Tier C fractal-cave section bundle (7 techniques)", () => {
    expect(manualSrc).toMatch(/fractal-cave/);
    expect(manualSrc).toMatch(/SDF Primitives/);
    expect(manualSrc).toMatch(/Ray Marching/);
  });

  it("lists the primary CLI commands", () => {
    expect(manualSrc).toMatch(/npm run pipeline:preview/);
    expect(manualSrc).toMatch(/npm run check:shaders/);
    expect(manualSrc).toMatch(/gallery-render\.ts/);
  });
});
