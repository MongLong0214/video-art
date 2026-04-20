/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve, join } from "path";
import { fileURLToPath } from "url";
import { sceneSchema } from "./scene-schema";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const PRESET_DIR = resolve(__dirname, "..", "..", "public", "presets");
const presetFiles = readdirSync(PRESET_DIR).filter((f) => f.endsWith(".json"));

describe("shader-dev presets validate against sceneSchema", () => {
  for (const f of presetFiles) {
    it(`${f} parses successfully`, () => {
      const raw = readFileSync(join(PRESET_DIR, f), "utf-8");
      const data = JSON.parse(raw);
      const result = sceneSchema.safeParse(data);
      if (!result.success) {
        console.error(f, JSON.stringify(result.error.issues, null, 2));
      }
      expect(result.success).toBe(true);
    });
  }
});
