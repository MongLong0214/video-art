import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  buildR10BaseTable,
  greenCompressedHueFor,
  linearToSrgbRgb,
  maxRgbDelta,
  OKLCH_GREEN_BAND,
  oklabHueFromLinearSrgb,
  R10_BASE_SAMPLES,
  rotateDisplayRgbInOklch,
  runDisplayReferredNeutralChain,
  srgbToLinearRgb,
  type Rgb,
} from "./color-engine-harness.js";

const rootDir = resolve(import.meta.dirname, "..");
const r10BasePath = resolve(rootDir, "out/manual-runs/r10-eyestack/layers/base.png");
const layerFrag = readFileSync(resolve(rootDir, "src/shaders/layer.frag"), "utf-8");
const effectComposer = readFileSync(resolve(rootDir, "src/lib/effect-composer.ts"), "utf-8");

describe("color-engine harness — r10-eyestack OKLCH base path", () => {
  it("uses sample bytes taken from the local r10 base PNG when available", async () => {
    if (!existsSync(r10BasePath)) return;

    const { data, info } = await sharp(r10BasePath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    for (const sample of R10_BASE_SAMPLES) {
      const offset = (sample.y * info.width + sample.x) * 4;
      expect([data[offset], data[offset + 1], data[offset + 2]]).toEqual(sample.srgb8);
    }
  });

  it("keeps OKLCH math local while reporting output in display space", () => {
    const rows = buildR10BaseTable(3);

    for (const row of rows) {
      expect(Math.abs(row.oklabLOut - row.oklabLIn)).toBeLessThan(0.001);
      expect(row.outputDisplayY).toBe(row.shaderDisplayY);
      expect(row.localLinearY).toBeLessThanOrEqual(row.sourceDisplayY);
    }
  });
});

describe("color-engine display-referred contract", () => {
  function expectRgbClose(actual: Rgb, expected: Rgb, epsilon: number): void {
    expect(maxRgbDelta(actual, expected)).toBeLessThanOrEqual(epsilon);
  }

  it("passes neutral source bytes through the layered/composer chain within one byte", () => {
    for (const sample of R10_BASE_SAMPLES) {
      const source = {
        r: sample.srgb8[0] / 255,
        g: sample.srgb8[1] / 255,
        b: sample.srgb8[2] / 255,
      };
      expectRgbClose(runDisplayReferredNeutralChain(source), source, 1 / 255);
    }
  });

  it("exact sRGB local adapter round-trips source colors before OKLab math", () => {
    const samples: readonly Rgb[] = [
      { r: 0, g: 0, b: 0 },
      { r: 33 / 255, g: 59 / 255, b: 108 / 255 },
      { r: 0.42, g: 0.45, b: 0.47 },
      { r: 1, g: 1, b: 1 },
    ];

    for (const sample of samples) {
      expectRgbClose(linearToSrgbRgb(srgbToLinearRgb(sample)), sample, 1e-12);
      expectRgbClose(rotateDisplayRgbInOklch(sample, 0), sample, 2e-7);
    }
  });

  it("rotating OKLCH hue by 180 degrees twice returns to the display color", () => {
    const source = { r: 0.42, g: 0.45, b: 0.47 };
    const rotated = rotateDisplayRgbInOklch(source, 0.5);
    expectRgbClose(rotateDisplayRgbInOklch(rotated, 0.5), source, 1e-6);
  });

  it("keeps the known linear-space green band fixture unchanged", () => {
    const pureGreenHue = oklabHueFromLinearSrgb({ r: 0, g: 1, b: 0 });

    expect(OKLCH_GREEN_BAND.lo).toBeCloseTo(0.27769994490592986, 12);
    expect(OKLCH_GREEN_BAND.hi).toBeCloseTo(0.49983187802797546, 12);
    expect(pureGreenHue * 360).toBeCloseTo(142.4953388878, 6);
    expect(greenCompressedHueFor(pureGreenHue, 0)).toBeCloseTo(pureGreenHue, 12);
  });

  it("layer.frag and composer blits do not apply global output conversion", () => {
    expect(layerFrag).not.toContain("#include <colorspace_fragment>");
    expect(layerFrag).not.toContain("#include <tonemapping_fragment>");
    const colorSpaceIncludes = effectComposer.match(/#include\s+<colorspace_fragment>/g) || [];
    const toneMappingIncludes = effectComposer.match(/#include\s+<tonemapping_fragment>/g) || [];
    expect(colorSpaceIncludes.length).toBe(0);
    expect(toneMappingIncludes.length).toBe(0);
    expect(effectComposer).toContain("const linearOutputFragment");
    expect(effectComposer).toContain("const screenBlitFragmentShader");
    expect(effectComposer).toContain("linearBlitMat");
    expect(effectComposer).toContain("screenBlitMat");
  });
});
