/// <reference types="node" />
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const mainSrc = readFileSync(resolve(__dirname, "main.ts"), "utf-8");

describe("main.ts — layered/dmt display-referred tone mapping", () => {
  it("defaults layered/dmt rendering to NoToneMapping", () => {
    expect(mainSrc).toMatch(/TONEMAP_OVERRIDE\s*===\s*"aces"\s*\?\s*THREE\.ACESFilmicToneMapping\s*:\s*THREE\.NoToneMapping/);
  });

  it("keeps aces as an explicit opt-in tonemap override", () => {
    expect(mainSrc).toContain('TONEMAP_OVERRIDE === "aces"');
    expect(mainSrc).toMatch(/IS_LAYERED\s*\|\|\s*IS_DMT\s*\?\s*layeredToneMapping\s*:\s*getToneMapping\(sketchConfig\)/);
  });
});
