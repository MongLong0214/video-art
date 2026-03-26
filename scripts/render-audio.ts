#!/usr/bin/env tsx
// render-audio.ts — Full SC NRT rendering pipeline
// Usage: npm run render:audio [--title <name>]
// Output: out/audio/{YYYY-MM-DD}_{title}/master.wav

import { existsSync, mkdirSync, readFileSync, unlinkSync, copyFileSync } from "node:fs";
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
import { createRunContext, parseTitle } from "./lib/archive.js";

const execFile = promisify(execFileCb);

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const SCENE_JSON = join(PROJECT_ROOT, "public", "scene.json");
const LOCK_FILE = join(PROJECT_ROOT, "out", "audio", ".render.lock");
const SC_DIR = join(PROJECT_ROOT, "audio", "sc");
const SCLANG = "/Applications/SuperCollider.app/Contents/MacOS/sclang";

const main = async () => {
  console.log("=== Audio Render Pipeline ===\n");

  // 1. Check dependencies
  console.log("[1/7] Checking dependencies...");
  checkDependencies();
  console.log("  OK\n");

  // 2. Parse scene.json
  console.log("[2/7] Reading scene.json...");
  if (!existsSync(SCENE_JSON)) {
    throw new Error(`scene.json not found: ${SCENE_JSON}. Run the video pipeline first.`);
  }
  const raw = JSON.parse(readFileSync(SCENE_JSON, "utf-8"));
  const scene = sceneSchema.parse(raw);
  console.log(`  Duration: ${scene.duration}s\n`);

  // 3. Create archive context
  const title = parseTitle(process.argv.slice(2));
  const ctx = createRunContext(PROJECT_ROOT, title, "audio");
  ctx.skipCleanup(); // audio has no _work/ to clean
  const stemsDir = join(ctx.archiveDir, "stems");
  const masterPath = join(ctx.archiveDir, "master.wav");
  mkdirSync(stemsDir, { recursive: true });

  console.log(`[3/7] Archive: ${ctx.archiveDir}\n`);

  // 4. Generate config
  const config = generateConfig(
    { duration: scene.duration, audio: scene.audio },
    stemsDir,
  );
  console.log(`[4/7] Config: BPM=${config.bpm}, Bars=${config.bars}, Genre=${config.genre}, Key=${config.key}\n`);

  // 5. Acquire lock
  mkdirSync(join(PROJECT_ROOT, "out", "audio"), { recursive: true });
  acquireLock(LOCK_FILE);

  const configPath = join(ctx.archiveDir, `audio-config-${process.pid}.scd`);

  try {
    // 6. Write SC config + run NRT
    console.log("[5/7] SC NRT render...");
    generateScConfig(config, configPath);

    const nrtScript = join(SC_DIR, "scores", "render-nrt.scd");
    const { stdout, stderr } = await execFile(
      SCLANG,
      ["-i", "none", nrtScript, configPath],
      { timeout: 120_000 },
    );

    if (stdout.includes("ERROR") || stderr.includes("ERROR")) {
      throw new Error(`NRT render failed:\n${stdout}\n${stderr}`);
    }

    const stemFile = join(stemsDir, "stem-master.wav");
    if (!existsSync(stemFile)) {
      throw new Error("NRT render produced no output file");
    }
    console.log("  NRT OK\n");

    // 7. Loop crossfade
    console.log("[6/7] Loop crossfade...");
    const crossfadeScript = join(PROJECT_ROOT, "audio", "render", "loop-crossfade.sh");
    const crossfadedFile = join(stemsDir, "stem-crossfaded.wav");

    await execFile("bash", [crossfadeScript, stemFile, String(scene.duration), crossfadedFile], {
      timeout: 60_000,
    });
    console.log("  OK\n");

    // 8. FFmpeg mixdown
    console.log("[7/7] FFmpeg mixdown...");
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

    // Snapshot scene.json into archive
    copyFileSync(SCENE_JSON, join(ctx.archiveDir, "scene.json"));

    // Verify
    const { stdout: probeOut } = await execFile("ffprobe", [
      "-v", "quiet",
      "-show_entries", "format=duration",
      "-of", "csv=p=0",
      masterPath,
    ]);
    const outputDuration = parseFloat(probeOut.trim());

    console.log(`\n  Master: ${masterPath}`);
    console.log(`  Duration: ${outputDuration.toFixed(3)}s (target: ${scene.duration}s)`);
    console.log(`  Format: WAV 48kHz 16-bit, -14 LUFS`);
    console.log(`\n=== Audio Render Complete ===`);
    console.log(`Archive: ${ctx.archiveDir}`);

    // Cleanup config
    try { unlinkSync(configPath); } catch { /* ignore */ }

  } finally {
    releaseLock(LOCK_FILE);
  }
};

main().catch((err) => {
  console.error("\nRender failed:", err.message);
  try { releaseLock(LOCK_FILE); } catch { /* ignore */ }
  process.exit(1);
});
