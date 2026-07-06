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

describe("layered-psychedelic.ts — glow-wave and green-band uniform bindings", () => {
  it("binds the glow-wave mean from each layer sharpness", () => {
    expect(rendererSrc).toMatch(/uGlowWaveMean:\s*\{\s*value:\s*glowWaveMean\(anim\.glowWave\.sharpness\)\s*\}/);
  });

  it("computes glow-wave mean with the requested 64-sample crest average", () => {
    expect(rendererSrc).toMatch(/const\s+GLOW_WAVE_MEAN_SAMPLES\s*=\s*64/);
    expect(rendererSrc).toMatch(/1\.5\s*\+\s*\(7\.0\s*-\s*1\.5\)\s*\*\s*sharpness/);
    expect(rendererSrc).toMatch(/Math\.pow\(\s*0\.5\s*\+\s*0\.5\s*\*\s*Math\.cos\(TAU\s*\*\s*x\)\s*,\s*exponent\s*\)/);
    expect(rendererSrc).toMatch(/return\s+sum\s*\/\s*GLOW_WAVE_MEAN_SAMPLES/);
  });

  it("binds green-compression bands per hue space", () => {
    expect(rendererSrc).toMatch(/const\s+greenBand\s*=\s*GREEN_BANDS_BY_HUE_SPACE\[anim\.hueSpace\]/);
    expect(rendererSrc).toMatch(/uGreenBandLo:\s*\{\s*value:\s*greenBand\.lo\s*\}/);
    expect(rendererSrc).toMatch(/uGreenBandHi:\s*\{\s*value:\s*greenBand\.hi\s*\}/);
  });

  it("keeps HSV and derived OKLCH green-band constants in renderer code", () => {
    expect(rendererSrc).toMatch(/hsv:\s*\{\s*lo:\s*70\s*\/\s*360,\s*hi:\s*165\s*\/\s*360\s*\}/);
    expect(rendererSrc).toContain("0.27769994490592986");
    expect(rendererSrc).toContain("0.49983187802797546");
    expect(rendererSrc).toContain("pure green maps to 142.4953388878deg");
  });

  it("keeps layer source textures untagged so source bytes stay display-referred", () => {
    expect(rendererSrc).toMatch(/texture\.colorSpace\s*=\s*THREE\.NoColorSpace/);
    expect(rendererSrc).not.toMatch(/texture\.colorSpace\s*=\s*THREE\.SRGBColorSpace/);
  });
});

describe("layered-psychedelic.ts — screen blend opacity wiring", () => {
  it("passes a premultiply-alpha flag only for screen layers", () => {
    expect(rendererSrc).toMatch(/const\s+blending\s*=\s*layerConfig\.blending\s*\?\?\s*"normal"/);
    expect(rendererSrc).toMatch(/uPremultiplyAlpha:\s*\{\s*value:\s*blending\s*===\s*"screen"\s*\?\s*1\s*:\s*0\s*\}/);
  });
});
