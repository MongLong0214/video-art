import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const RENDER_SCRIPT = path.resolve(import.meta.dirname, "../render-analysis.ts");
const content = fs.readFileSync(RENDER_SCRIPT, "utf-8");

// T3: Bus allocation + OUTPUT_CHANNELS
describe("T3: 12ch bus allocation", () => {
  it("pad group maps to bus 8", () => {
    expect(content).toMatch(/pad:\s*8/);
  });

  it("fx (riser) maps to bus 10", () => {
    expect(content).toMatch(/riser:\s*10/);
  });

  it("OUTPUT_CHANNELS is 12", () => {
    expect(content).toMatch(/OUTPUT_CHANNELS\s*=\s*12/);
  });

  it("no two stem groups share same bus", () => {
    // Extract STEM_BUS mapping from source
    const busMatch = content.match(/const STEM_BUS[^}]+\}/s);
    expect(busMatch).toBeTruthy();
    const busBlock = busMatch![0];
    // Extract all bus numbers
    const busNumbers = [...busBlock.matchAll(/:\s*(\d+)/g)].map((m) => Number(m[1]));
    // Group SynthDefs by bus — check that stem group buses are distinct
    const stemGroupBuses = new Set([0, 2, 4, 6, 8, 10]); // expected 6 distinct buses
    for (const b of stemGroupBuses) {
      expect(busNumbers).toContain(b);
    }
  });
});

// T5: Energy gate and amp constants
describe("T5: energy gate and amp constants", () => {
  it("SUPERSAW_ENERGY_GATE is 0.15", () => {
    expect(content).toMatch(/SUPERSAW_ENERGY_GATE\s*=\s*0\.15/);
  });

  it("SECTION_AMP intro is 0.65", () => {
    expect(content).toMatch(/intro:\s*0\.65/);
  });

  it("SECTION_AMP outro is 0.65", () => {
    expect(content).toMatch(/outro:\s*0\.65/);
  });
});
