import * as path from "node:path";
import { listPresets } from "./lib/genre-preset";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const GENRES_DIR = path.join(PROJECT_ROOT, "audio", "presets", "genres");
const USER_DIR = path.join(PROJECT_ROOT, "audio", "presets", "user");

const presets = listPresets(GENRES_DIR, USER_DIR);

console.log("Available presets:\n");
for (const p of presets) {
  const tag = p.source === "genre" ? "[built-in]" : "[user]";
  console.log(`  ${tag} ${p.name}`);
}
console.log(`\nTotal: ${presets.length} presets`);
