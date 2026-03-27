import * as fs from "node:fs";
import * as path from "node:path";
import { parseOscLog, mergeMultiPart, convertToNrt, writeNrtScore, generateSummary } from "./lib/osc-to-nrt";
import { validateFilePath } from "./lib/validate-file-path";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: npm run prod:convert <osclog_path_or_dir>");
  process.exit(1);
}

const resolvedInput = path.resolve(inputPath);

// Determine if input is file or directory
const stat = fs.statSync(resolvedInput);
const isDir = stat.isDirectory();

if (!isDir && !validateFilePath(resolvedInput, PROJECT_ROOT, [".osclog"])) {
  console.error("Invalid file path or extension. Only .osclog files within project root allowed.");
  process.exit(1);
}

console.log(`Converting: ${resolvedInput}`);

const events = isDir ? mergeMultiPart(resolvedInput) : parseOscLog(resolvedInput);
const nrt = convertToNrt(events);

// Check skip threshold
const summary = generateSummary(nrt.metadata.eventCount, nrt.metadata.mapped, nrt.metadata.skipped);
if (summary.warnings.length > 0) {
  for (const w of summary.warnings) console.warn(w);
}

// Output path: same directory as input, .nrt.json extension
const outputDir = isDir ? resolvedInput : path.dirname(resolvedInput);
const outputPath = path.join(outputDir, "nrt-score.nrt.json");
writeNrtScore(nrt, outputPath);

console.log(`\nConversion complete:`);
console.log(`  Events: ${nrt.metadata.mapped}/${nrt.metadata.eventCount} mapped`);
console.log(`  Skipped: ${nrt.metadata.skipped} (${nrt.metadata.skipRate}%)`);
console.log(`  Duration: ${nrt.metadata.duration.toFixed(1)}s`);
console.log(`  Output: ${outputPath}`);
