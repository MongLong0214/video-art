import { execFileSync } from "node:child_process";
import * as path from "node:path";
import { validateFilePath } from "./lib/validate-file-path.js";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");

const [ref, synth, outJson] = process.argv.slice(2);
if (!ref || !synth) {
  console.error("Usage: npm run calibrate <reference.wav> <synthesized.wav> [output.json]");
  process.exit(1);
}

if (!validateFilePath(ref, PROJECT_ROOT, [".wav", ".flac"])) {
  console.error("Invalid reference path:", ref);
  process.exit(1);
}
if (!validateFilePath(synth, PROJECT_ROOT, [".wav", ".flac"])) {
  console.error("Invalid synthesized path:", synth);
  process.exit(1);
}

const args = [path.join(PROJECT_ROOT, "audio/analyzer/calibrate.py"), ref, synth];
if (outJson) args.push("--output", outJson);

try {
  const result = execFileSync("python3", args, { cwd: PROJECT_ROOT, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
  console.log(result);
} catch (e: unknown) {
  const err = e as { stderr?: string };
  console.error("Calibration failed:", err.stderr || e);
  process.exit(1);
}
