/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve, join } from "path";
import { fileURLToPath } from "url";
import { sceneSchema } from "./scene-schema";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const PRESET_DIR = resolve(__dirname, "..", "..", "public", "presets");

function collectPresets(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...collectPresets(join(dir, entry.name), rel));
    } else if (entry.name.endsWith(".json")) {
      out.push(rel);
    }
  }
  return out;
}
const presetFiles = collectPresets(PRESET_DIR);

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
