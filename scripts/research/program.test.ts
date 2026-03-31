import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const programMd = readFileSync(resolve(__dirname, "program.md"), "utf-8");

describe("program.md — depth cinematic axes documentation", () => {
  it("contains depthSpeedInfluence parameter", () => {
    expect(programMd).toMatch(/depthSpeedInfluence/);
  });

  it("contains depthGlowInfluence parameter", () => {
    expect(programMd).toMatch(/depthGlowInfluence/);
  });

  it("contains depthParallaxScale parameter", () => {
    expect(programMd).toMatch(/depthParallaxScale/);
  });

  it("contains hazeIntensity parameter", () => {
    expect(programMd).toMatch(/hazeIntensity/);
  });

  it("contains featherRadius parameter", () => {
    expect(programMd).toMatch(/featherRadius/);
  });

  it("interdependencies: haze vs saturationBoost interaction documented", () => {
    expect(programMd).toMatch(/haze.*saturation|saturation.*haze/i);
  });

  it("interdependencies: feather + parallax interaction documented", () => {
    expect(programMd).toMatch(/feather.*parallax|parallax.*feather/i);
  });

  it("interdependencies: depthSpeed + depthGlow simultaneous warning", () => {
    expect(programMd).toMatch(/depthSpeedInfluence.*depthGlowInfluence|depthGlow.*depthSpeed/i);
  });

  it("strategy guide mentions depth sweep", () => {
    expect(programMd).toMatch(/depth.*sweep|sweep.*depth/i);
  });

  it("documents stddev guard (stddev < 5 disables cinematic axes)", () => {
    expect(programMd).toMatch(/stddev.*5|depth.*variance.*cinematic/i);
  });

  it("contains sam3Threshold parameter", () => {
    expect(programMd).toMatch(/sam3Threshold/);
  });

  it("contains vlmMaxPrompts parameter", () => {
    expect(programMd).toMatch(/vlmMaxPrompts/);
  });

  it("contains useSam3 parameter", () => {
    expect(programMd).toMatch(/useSam3/);
  });
});
