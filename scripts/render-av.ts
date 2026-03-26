#!/usr/bin/env tsx
// render-av.ts — Video + Audio → final MP4
// Usage: npm run render:av

import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCb);

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const OUTPUT_DIR = join(PROJECT_ROOT, "out");
const AUDIO_MASTER = join(OUTPUT_DIR, "audio", "master", "master.wav");
const MERGE_SCRIPT = join(PROJECT_ROOT, "audio", "render", "merge-av.sh");

const findVideoFile = (): string | null => {
  // Look for recent video output
  const candidates = [
    join(OUTPUT_DIR, "video.mp4"),
    join(OUTPUT_DIR, "layered.mp4"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
};

const main = async () => {
  console.log("=== AV Merge Pipeline ===\n");

  // 1. Find video
  const videoPath = findVideoFile();
  if (!videoPath) {
    throw new Error("No video file found in out/. Run: npm run export:layered");
  }
  console.log(`Video: ${videoPath}`);

  // 2. Check audio
  if (!existsSync(AUDIO_MASTER)) {
    throw new Error("No audio master found. Run: npm run render:audio");
  }
  console.log(`Audio: ${AUDIO_MASTER}`);

  // 3. Merge
  const outputPath = join(OUTPUT_DIR, "final.mp4");
  console.log(`Output: ${outputPath}`);

  await execFile("bash", [MERGE_SCRIPT, videoPath, AUDIO_MASTER, outputPath], {
    timeout: 120_000,
  });

  // 4. Verify duration match
  const videoDur = await getStreamDuration(outputPath, "v:0");
  const audioDur = await getStreamDuration(outputPath, "a:0");

  if (videoDur && audioDur) {
    const diff = Math.abs(videoDur - audioDur);
    console.log(`Video duration: ${videoDur.toFixed(3)}s`);
    console.log(`Audio duration: ${audioDur.toFixed(3)}s`);
    console.log(`Diff: ${(diff * 1000).toFixed(1)}ms`);

    if (diff > 0.05) {
      console.warn(`Warning: AV duration diff ${(diff * 1000).toFixed(1)}ms > 50ms`);
    }
  }

  console.log("\n=== AV Merge Complete ===");
};

const getStreamDuration = async (file: string, stream: string): Promise<number | null> => {
  try {
    const { stdout } = await execFile("ffprobe", [
      "-v", "quiet",
      "-select_streams", stream,
      "-show_entries", "stream=duration",
      "-of", "csv=p=0",
      file,
    ]);
    return parseFloat(stdout.trim());
  } catch {
    return null;
  }
};

main().catch((err) => {
  console.error("AV merge failed:", err.message);
  process.exit(1);
});
