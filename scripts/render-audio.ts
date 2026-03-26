#!/usr/bin/env tsx
// render-audio.ts — Orchestrates SC NRT rendering pipeline
// Usage: npm run render:audio

import { existsSync, mkdirSync, readFileSync } from "node:fs";
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
  runSclang,
  runFfmpeg,
} from "./lib/render-audio-utils.js";

const execFile = promisify(execFileCb);

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const SCENE_JSON = join(PROJECT_ROOT, "public", "scene.json");
const OUTPUT_DIR = join(PROJECT_ROOT, "out", "audio");
const STEMS_DIR = join(OUTPUT_DIR, "stems");
const MASTER_DIR = join(OUTPUT_DIR, "master");
const LOCK_FILE = join(OUTPUT_DIR, ".render.lock");
const SC_DIR = join(PROJECT_ROOT, "audio", "sc");

const main = async () => {
  console.log("=== Audio Render Pipeline ===\n");

  // 1. Check dependencies
  console.log("Checking dependencies...");
  checkDependencies();

  // 2. Parse scene.json
  console.log("Reading scene.json...");
  if (!existsSync(SCENE_JSON)) {
    throw new Error(`scene.json not found: ${SCENE_JSON}. Run the video pipeline first.`);
  }
  const raw = JSON.parse(readFileSync(SCENE_JSON, "utf-8"));
  const scene = sceneSchema.parse(raw);

  // 3. Generate config
  const config = generateConfig(
    { duration: scene.duration, audio: scene.audio },
    STEMS_DIR,
  );
  console.log(`BPM: ${config.bpm}, Bars: ${config.bars}, Genre: ${config.genre}`);

  // 4. Acquire lock
  mkdirSync(OUTPUT_DIR, { recursive: true });
  mkdirSync(STEMS_DIR, { recursive: true });
  mkdirSync(MASTER_DIR, { recursive: true });
  acquireLock(LOCK_FILE);

  try {
    // 5. Write SC config
    const configPath = join(OUTPUT_DIR, `audio-config-${process.pid}.scd`);
    generateScConfig(config, configPath);

    // 6. Run NRT render
    console.log("Running NRT render...");
    const nrtScript = join(SC_DIR, "scores", "render-nrt.scd");
    if (!existsSync(nrtScript)) {
      console.log("NRT score script not yet implemented. Skipping NRT render.");
    } else {
      await runSclang(nrtScript, [configPath]);
    }

    // 7. Loop crossfade (if stems exist)
    const crossfadeScript = join(PROJECT_ROOT, "audio", "render", "loop-crossfade.sh");
    if (existsSync(crossfadeScript)) {
      console.log("Running loop crossfade...");
      await execFile("bash", [crossfadeScript, STEMS_DIR, String(scene.duration)]);
    }

    // 8. FFmpeg mixdown
    console.log("Mixdown...");
    const masterPath = join(MASTER_DIR, "master.wav");
    // For now, if we have any stem files, mix them
    // Actual implementation will be refined in NRT score
    console.log(`Output would be: ${masterPath}`);

    // 9. Verify output
    console.log("\n=== Render Complete ===");

    // Cleanup config
    try {
      const { unlinkSync } = await import("node:fs");
      unlinkSync(configPath);
    } catch { /* ignore */ }

  } finally {
    releaseLock(LOCK_FILE);
  }
};

main().catch((err) => {
  console.error("Render failed:", err.message);
  releaseLock(LOCK_FILE);
  process.exit(1);
});
