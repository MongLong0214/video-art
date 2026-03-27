import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";
import { validateFilePath } from "./lib/validate-file-path";
import {
  checkRenderLock,
  writeRenderLock,
  removeRenderLock,
  generateNrtScoreEntries,
  writeScoreConfig,
  buildSplitCommands,
  stemOutputPath,
  DEFAULT_STEMS,
} from "./lib/stem-render";
import type { NrtScore } from "./lib/osc-to-nrt";

const execFileAsync = promisify(execFile);

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const RENDER_STEMS_SCD = path.join(
  PROJECT_ROOT, "audio", "sc", "scores", "render-stems-nrt.scd",
);

const inputPath = process.argv[2];
const titleArg = process.argv.find((a) => a.startsWith("--title="))?.split("=")[1] ?? "session";
const presetArg = process.argv.find((a) => a.startsWith("--preset="))?.split("=")[1];

if (!inputPath) {
  console.error("Usage: npm run render:stems <nrt-score.nrt.json> [--title=name] [--preset=name]");
  process.exit(1);
}

const resolvedInput = path.resolve(inputPath);

if (!validateFilePath(resolvedInput, PROJECT_ROOT, [".json"])) {
  console.error("Invalid file path. Only .nrt.json files within project root allowed.");
  process.exit(1);
}

const run = async () => {
  checkRenderLock(PROJECT_ROOT);
  writeRenderLock(PROJECT_ROOT);

  try {
    console.log(`Reading NRT score: ${resolvedInput}`);
    const nrtScore: NrtScore = JSON.parse(fs.readFileSync(resolvedInput, "utf-8"));

    // Generate score entries with FX nodes + bus routing
    const entries = generateNrtScoreEntries(nrtScore);
    console.log(`Score entries: ${entries.length} (${nrtScore.events.length} instruments + FX)`);

    // Write score config for sclang
    const configPath = resolvedInput.replace(".nrt.json", ".score-config.json");
    writeScoreConfig(entries, resolvedInput, configPath);

    // Output directory
    const outDir = stemOutputPath(PROJECT_ROOT, titleArg);
    fs.mkdirSync(outDir, { recursive: true });
    const multiChPath = path.join(outDir, "render-8ch.wav");

    // Step 1: sclang render-stems-nrt.scd → 8ch WAV
    console.log("Step 1: NRT render (sclang → scsynth -N)...");
    try {
      await execFileAsync("sclang", [RENDER_STEMS_SCD, configPath, multiChPath]);
      console.log(`  8ch WAV: ${multiChPath}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("ENOENT")) {
        console.error("sclang not found. Install SuperCollider: brew install --cask supercollider");
      } else {
        console.error(`sclang failed: ${msg}`);
      }
      process.exit(1);
    }

    // Step 2: ffmpeg split 8ch → 4x 2ch stems
    console.log("Step 2: Splitting 8ch → 4 stems...");
    const splitCmds = buildSplitCommands(multiChPath, outDir, DEFAULT_STEMS);

    for (const { args, outputFile } of splitCmds) {
      try {
        await execFileAsync("ffmpeg", args);
        console.log(`  ${path.basename(outputFile)}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("ENOENT")) {
          console.error("ffmpeg not found. Install: brew install ffmpeg");
        } else {
          console.error(`ffmpeg split failed: ${msg}`);
        }
        process.exit(1);
      }
    }

    if (presetArg) {
      console.log(`Preset: ${presetArg}`);
    }

    console.log(`\nStems rendered to: ${outDir}`);
    console.log(`  ${splitCmds.map((c) => path.basename(c.outputFile)).join(", ")}`);
  } finally {
    removeRenderLock(PROJECT_ROOT);
  }
};

run().catch((err) => {
  removeRenderLock(PROJECT_ROOT);
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
