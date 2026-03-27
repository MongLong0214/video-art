/**
 * CLI entry: npm run analyze:track <file.wav>
 * Python analysis → TS preset/pattern/scene generation
 */

import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";
import { validateFilePath } from "./lib/validate-file-path.js";
import { generatePreset, generateTidalPattern, generateSceneAudio } from "./lib/track-analyzer.js";
import { presetSchema } from "./lib/genre-preset.js";

const execFile = promisify(execFileCb);

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const ANALYZER_SCRIPT = path.join(PROJECT_ROOT, "audio", "analyzer", "analyze_track.py");
const LOCK_FILE = path.join(PROJECT_ROOT, "out", "analysis", ".analyze.lock");
const AUDIO_EXTENSIONS = [".wav", ".flac", ".mp3", ".aiff"];
const STALE_LOCK_MS = 10 * 60 * 1000; // 10 minutes

// === Lock management ===
const acquireLock = (): void => {
  // Check stale lock
  if (fs.existsSync(LOCK_FILE)) {
    try {
      const content = fs.readFileSync(LOCK_FILE, "utf-8").trim();
      const lockTime = parseInt(content, 10);
      if (Date.now() - lockTime > STALE_LOCK_MS) {
        console.warn("Removing stale lock (>10min)");
        fs.unlinkSync(LOCK_FILE);
      } else {
        console.error("Another analysis is running. Remove .analyze.lock if stale.");
        process.exit(1);
      }
    } catch {
      fs.unlinkSync(LOCK_FILE);
    }
  }

  fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
  fs.writeFileSync(LOCK_FILE, String(Date.now()));
};

const releaseLock = (): void => {
  try {
    if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
  } catch { /* ignore */ }
};

// Cleanup on exit
process.on("exit", releaseLock);
process.on("SIGINT", () => { releaseLock(); process.exit(130); });
process.on("SIGTERM", () => { releaseLock(); process.exit(143); });

// === Main ===
const main = async () => {
  const inputFile = process.argv[2];

  if (!inputFile) {
    console.error("Usage: npm run analyze:track <audio_file>");
    console.error("Supported: .wav, .flac, .mp3, .aiff");
    process.exit(1);
  }

  const resolvedInput = path.resolve(inputFile);

  // Validate file
  if (!validateFilePath(resolvedInput, PROJECT_ROOT, AUDIO_EXTENSIONS)) {
    console.error(`Invalid file: ${inputFile}`);
    console.error("Must be .wav/.flac/.mp3/.aiff within project directory");
    process.exit(1);
  }

  const filename = path.basename(resolvedInput, path.extname(resolvedInput))
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  const outputDir = path.join(PROJECT_ROOT, "out", "analysis", filename);

  acquireLock();

  try {
    // 1. Python analysis
    console.log(`\nAnalyzing: ${path.basename(resolvedInput)}`);
    const startTime = Date.now();

    const { stdout, stderr } = await execFile(
      "python3", [ANALYZER_SCRIPT, resolvedInput, outputDir],
      { timeout: 300_000, cwd: PROJECT_ROOT },
    ).catch((err: Error & { code?: string }) => {
      if (err.code === "ENOENT") {
        console.error("python3 not found. Install Python 3.9+:");
        console.error("  brew install python3");
        console.error("  pip3 install -r audio/analyzer/requirements.txt");
      }
      throw err;
    });

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    const elapsed = (Date.now() - startTime) / 1000;
    console.log(`Analysis time: ${elapsed.toFixed(1)}s`);
    if (elapsed > 60) console.warn("WARNING: Analysis took >60s (excluding demucs)");

    // 2. Read analysis.json
    const analysisPath = path.join(outputDir, "analysis.json");
    if (!fs.existsSync(analysisPath)) {
      throw new Error("analysis.json not generated");
    }
    const analysis = JSON.parse(fs.readFileSync(analysisPath, "utf-8"));

    // 3. Generate preset
    const preset = generatePreset(analysis, filename);
    const presetValidated = presetSchema.parse(preset);
    const presetPath = path.join(outputDir, "preset.json");
    fs.writeFileSync(presetPath, JSON.stringify(presetValidated, null, 2));
    console.log(`Preset: ${presetPath}`);

    // Copy to audio/presets/generated/
    const generatedDir = path.join(PROJECT_ROOT, "audio", "presets", "generated");
    fs.mkdirSync(generatedDir, { recursive: true });
    fs.copyFileSync(presetPath, path.join(generatedDir, `${filename}.json`));
    console.log(`Preset copied: audio/presets/generated/${filename}.json`);

    // 4. Generate Tidal patterns
    const kickPattern = analysis.kick_pattern
      ? generateTidalPattern(analysis.kick_pattern.positions, analysis.bpm.value)
      : "~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~";
    const hatPattern = analysis.hat_pattern
      ? generateTidalPattern(analysis.hat_pattern.positions, analysis.bpm.value)
      : "~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~";

    const tidalContent = `-- Auto-generated from: ${path.basename(resolvedInput)}
-- BPM: ${analysis.bpm.value} | Key: ${analysis.key}

d1 $ s "kick" # n "${kickPattern}"

d2 $ s "hat" # n "${hatPattern}"
`;
    const tidalPath = path.join(outputDir, "patterns.tidal");
    fs.writeFileSync(tidalPath, tidalContent);
    console.log(`Patterns: ${tidalPath}`);

    // 5. Generate scene-audio.json
    const sceneAudio = generateSceneAudio(analysis, filename);
    const scenePath = path.join(outputDir, "scene-audio.json");
    fs.writeFileSync(scenePath, JSON.stringify(sceneAudio, null, 2));
    console.log(`Scene: ${scenePath}`);

    console.log("\nDone!");
  } finally {
    releaseLock();
  }
};

main().catch((err) => {
  releaseLock();
  console.error("Analysis failed:", err.message || err);
  process.exit(1);
});
