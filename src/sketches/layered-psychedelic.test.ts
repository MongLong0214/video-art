/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const rendererSrc = readFileSync(resolve(__dirname, "layered-psychedelic.ts"), "utf-8");

describe("layered-psychedelic.ts — parallax uniform bindings", () => {
  it("binds uDepthNorm per-layer", () => {
    expect(rendererSrc).toMatch(/uDepthNorm:\s*\{\s*value:/);
  });

  it("binds uParallaxScale", () => {
    expect(rendererSrc).toMatch(/uParallaxScale:\s*\{\s*value:/);
  });

  it("uDepthNorm fallback is 128/255", () => {
    expect(rendererSrc).toMatch(/meanDepth\s*\?\?\s*128\)\s*\/\s*255/);
  });

  it("sets ClampToEdgeWrapping", () => {
    expect(rendererSrc).toMatch(/ClampToEdgeWrapping/);
  });

  it("binds uHazeIntensity", () => {
    expect(rendererSrc).toMatch(/uHazeIntensity:\s*\{\s*value:/);
  });

  it("binds uFeatherRadius", () => {
    expect(rendererSrc).toMatch(/uFeatherRadius:\s*\{\s*value:/);
  });

  it("uDepthNorm uniform key appears exactly once", () => {
    const matches = rendererSrc.match(/uDepthNorm:\s*\{/g);
    expect(matches).toHaveLength(1);
  });
});
