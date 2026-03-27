import * as path from "node:path";
import { loadPreset, savePreset } from "./lib/genre-preset";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const GENRES_DIR = path.join(PROJECT_ROOT, "audio", "presets", "genres");
const USER_DIR = path.join(PROJECT_ROOT, "audio", "presets", "user");

const name = process.argv[2];
const force = process.argv.includes("--force");

if (!name) {
  console.error("Usage: npm run preset:save <name> [--force]");
  process.exit(1);
}

try {
  // Use hard_techno as default base if no active preset
  const base = loadPreset("hard_techno", GENRES_DIR);
  savePreset(name, base, USER_DIR, force);
  console.log(`Preset saved: audio/presets/user/${name}.json`);
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
