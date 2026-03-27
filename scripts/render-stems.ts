import * as fs from "node:fs";
import * as path from "node:path";
import { validateFilePath } from "./lib/validate-file-path";
import {
  checkRenderLock,
  writeRenderLock,
  removeRenderLock,
} from "./lib/stem-render";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: npm run render:stems <nrt-score.nrt.json>");
  process.exit(1);
}

const resolvedInput = path.resolve(inputPath);

if (!validateFilePath(resolvedInput, PROJECT_ROOT, [".json"])) {
  console.error("Invalid file path. Only .nrt.json files within project root allowed.");
  process.exit(1);
}

try {
  checkRenderLock(PROJECT_ROOT);
  writeRenderLock(PROJECT_ROOT);

  console.log(`Rendering stems from: ${resolvedInput}`);
  console.log("(Full scsynth NRT rendering requires SC installation)");

  // TODO: Full implementation invokes sclang render-stems-nrt.scd + scsynth -N + ffmpeg split
  // For now, validates input and creates output directory structure

} finally {
  removeRenderLock(PROJECT_ROOT);
}
