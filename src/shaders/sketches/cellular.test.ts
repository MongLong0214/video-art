/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const simSrc = readFileSync(resolve(__dirname, "cellular-sim.frag"), "utf-8");
const displaySrc = readFileSync(resolve(__dirname, "cellular.frag"), "utf-8");

describe("cellular — T-B1 Gray-Scott RD", () => {
  it("sim shader declares Gray-Scott uniforms (uFeed, uKill, uDiffA, uDiffB)", () => {
    expect(simSrc).toMatch(/uniform\s+float\s+uFeed/);
    expect(simSrc).toMatch(/uniform\s+float\s+uKill/);
    expect(simSrc).toMatch(/uniform\s+float\s+uDiffA/);
    expect(simSrc).toMatch(/uniform\s+float\s+uDiffB/);
  });

  it("sim shader uses u*v*v reaction term", () => {
    expect(simSrc).toMatch(/u\s*\*\s*v\s*\*\s*v/);
  });

  it("sim shader uses 9-tap Laplacian", () => {
    expect(simSrc).toMatch(/vec2\s+laplacian\s*\(/);
  });

  it("sim shader clamps state 0..1", () => {
    // Matches clamp(..., 0.0, 1.0) allowing nested commas
    expect(simSrc).toMatch(/clamp\([\s\S]*?,\s*0\.0\s*,\s*1\.0\)/);
  });

  it("display shader samples state texture", () => {
    expect(displaySrc).toMatch(/texture2D\(\s*uState/);
  });

  it("display shader uses cosine palette", () => {
    expect(displaySrc).toMatch(/cos\(\s*TAU/);
  });
});
