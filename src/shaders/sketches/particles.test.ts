/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const sim = readFileSync(resolve(__dirname, "particles-sim.frag"), "utf-8");
const vert = readFileSync(resolve(__dirname, "particles.vert"), "utf-8");
const frag = readFileSync(resolve(__dirname, "particles.frag"), "utf-8");

describe("particles — T-B3 GPU flow field", () => {
  it("sim defines curl function (divergence-free velocity)", () => {
    expect(sim).toMatch(/vec2\s+curl\s*\(/);
  });

  it("sim reads previous position from uPosition", () => {
    expect(sim).toMatch(/texture2D\(\s*uPosition/);
  });

  it("sim wraps positions to keep in bounds", () => {
    expect(sim).toMatch(/mod\(.*\+\s*1\.0.*,\s*2\.0\)/);
  });

  it("vert uses aIndex attribute for position lookup", () => {
    expect(vert).toMatch(/attribute\s+float\s+aIndex/);
  });

  it("vert derives UV from index via TEX_SIZE", () => {
    expect(vert).toMatch(/mod\(aIndex,\s*TEX_SIZE\)/);
  });

  it("frag uses gl_PointCoord for circular sprite", () => {
    expect(frag).toMatch(/gl_PointCoord/);
  });

  it("frag discards outside circle", () => {
    expect(frag).toMatch(/discard/);
  });
});
