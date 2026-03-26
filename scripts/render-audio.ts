#!/usr/bin/env tsx
// render-audio.ts — Full SC NRT rendering pipeline
// Usage: npm run render:audio
// Pipeline: scene.json → BPM → SC config → NRT render → loop crossfade → ffmpeg mixdown

import { existsSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { sceneSchema } from "../src/lib/scene-schema.js";
import {
  checkDependencies,
  generateConfig,
  generateScConfig,
  acquireLock,
  releaseLock,
} from "./lib/render-audio-utils.js";

const execFile = promisify(execFileCb);

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const SCENE_JSON = join(PROJECT_ROOT, "public", "scene.json");
const OUTPUT_DIR = join(PROJECT_ROOT, "out", "audio");
const STEMS_DIR = join(OUTPUT_DIR, "stems");
const MASTER_DIR = join(OUTPUT_DIR, "master");
const LOCK_FILE = join(OUTPUT_DIR, ".render.lock");
const SC_DIR = join(PROJECT_ROOT, "audio", "sc");
const SCLANG = "/Applications/SuperCollider.app/Contents/MacOS/sclang";

const main = async () => {
  console.log("=== Audio Render Pipeline ===\n");

  // 1. Check dependencies
  console.log("[1/6] Checking dependencies...");
  checkDependencies();
  console.log("  OK: sclang, scsynth, ffmpeg, sox found\n");

  // 2. Parse scene.json
  console.log("[2/6] Reading scene.json...");
  if (!existsSync(SCENE_JSON)) {
    throw new Error(`scene.json not found: ${SCENE_JSON}. Run the video pipeline first.`);
  }
  const raw = JSON.parse(readFileSync(SCENE_JSON, "utf-8"));
  const scene = sceneSchema.parse(raw);
  console.log(`  Duration: ${scene.duration}s\n`);

  // 3. Generate config
  console.log("[3/6] Generating audio config...");
  const config = generateConfig(
    { duration: scene.duration, audio: scene.audio },
    STEMS_DIR,
  );
  console.log(`  BPM: ${config.bpm}, Bars: ${config.bars}, Genre: ${config.genre}, Key: ${config.key}\n`);

  // 4. Setup directories + lock
  mkdirSync(OUTPUT_DIR, { recursive: true });
  mkdirSync(STEMS_DIR, { recursive: true });
  mkdirSync(MASTER_DIR, { recursive: true });
  acquireLock(LOCK_FILE);

  const configPath = join(OUTPUT_DIR, `audio-config-${process.pid}.scd`);

  try {
    // 5. Write SC config + run NRT
    console.log("[4/6] Running SC NRT render...");
    generateScConfig(config, configPath);

    const nrtScript = join(SC_DIR, "scores", "render-nrt.scd");
    const { stdout, stderr } = await execFile(
      SCLANG,
      ["-i", "none", nrtScript, configPath],
      { timeout: 120_000 },
    );

    // Check for errors
    if (stdout.includes("ERROR") || stderr.includes("ERROR")) {
      throw new Error(`NRT render failed:\n${stdout}\n${stderr}`);
    }

    const stemFile = join(STEMS_DIR, "stem-master.wav");
    if (!existsSync(stemFile)) {
      throw new Error("NRT render produced no output file");
    }
    console.log("  NRT render OK\n");

    // 6. Loop crossfade
    console.log("[5/6] Loop crossfade...");
    const crossfadeScript = join(PROJECT_ROOT, "audio", "render", "loop-crossfade.sh");
    const crossfadedFile = join(STEMS_DIR, "stem-crossfaded.wav");

    await execFile("bash", [crossfadeScript, stemFile, String(scene.duration), crossfadedFile], {
      timeout: 60_000,
    });
    console.log("  Crossfade OK\n");

    // 7. FFmpeg mixdown → -14 LUFS, peak ≤ -1 dBTP, 48kHz 16-bit WAV
    console.log("[6/6] FFmpeg mixdown...");
    const masterPath = join(MASTER_DIR, "master.wav");
    const inputFile = existsSync(crossfadedFile) ? crossfadedFile : stemFile;

    await execFile("ffmpeg", [
      "-y",
      "-i", inputFile,
      "-af", "loudnorm=I=-14:TP=-1:LRA=11",
      "-ar", "48000",
      "-sample_fmt", "s16",
      "-c:a", "pcm_s16le",
      masterPath,
    ], { timeout: 120_000 });

    if (!existsSync(masterPath)) {
      throw new Error("FFmpeg mixdown produced no output");
    }

    // 8. Verify output
    const { stdout: probeOut } = await execFile("ffprobe", [
      "-v", "quiet",
      "-show_entries", "format=duration",
      "-of", "csv=p=0",
      masterPath,
    ]);
    const outputDuration = parseFloat(probeOut.trim());

    console.log(`  Master: ${masterPath}`);
    console.log(`  Duration: ${outputDuration.toFixed(3)}s (target: ${scene.duration}s)`);
    console.log(`  Format: WAV 48kHz 16-bit, -14 LUFS`);

    console.log("\n=== Audio Render Complete ===");

  } finally {
    // Cleanup
    try { unlinkSync(configPath); } catch { /* ignore */ }
    releaseLock(LOCK_FILE);
  }
};

main().catch((err) => {
  console.error("\nRender failed:", err.message);
  try { releaseLock(LOCK_FILE); } catch { /* ignore */ }
  process.exit(1);
});
