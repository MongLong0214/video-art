import * as path from "node:path";
import { validateFilePath } from "./lib/validate-file-path";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: npm run render:prod <osclog_path_or_dir>");
  console.error("  Full pipeline: OSC convert → stem render → mastering");
  process.exit(1);
}

const resolvedInput = path.resolve(inputPath);

if (!validateFilePath(resolvedInput, PROJECT_ROOT, [".osclog"])) {
  console.error("Invalid file path. Only .osclog files within project root allowed.");
  process.exit(1);
}

console.log(`B-PROD Pipeline: ${resolvedInput}`);
console.log("Step 1: OSC → NRT conversion");
console.log("Step 2: Multi-stem NRT render");
console.log("Step 3: Mastering + DAW output");
console.log("(Full implementation requires SC + ffmpeg)");
