#!/usr/bin/env tsx
// render-av.ts — Video + Audio → final MP4
// Usage: npm run render:av
// Pipeline: find latest video → ensure audio master → ffmpeg merge

import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCb);

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const AUDIO_MASTER = join(PROJECT_ROOT, "out", "audio", "master", "master.wav");
const MERGE_SCRIPT = join(PROJECT_ROOT, "audio", "render", "merge-av.sh");

const findLatestVideo = (): string | null => {
  // Search in out/layered/{date}_{title}/*.mp4 (export-layered output)
  const layeredDir = join(PROJECT_ROOT, "out", "layered");
  if (existsSync(layeredDir)) {
    const dirs = readdirSync(layeredDir)
      .filter((d) => statSync(join(layeredDir, d)).isDirectory())
      .sort()
      .reverse();

    for (const dir of dirs) {
      const dirPath = join(layeredDir, dir);
      const mp4s = readdirSync(dirPath).filter((f) => f.endsWith(".mp4"));
      if (mp4s.length > 0) {
        return join(dirPath, mp4s[0]);
      }
    }
  }

  // Fallback: check common paths
  const fallbacks = [
    join(PROJECT_ROOT, "out", "video.mp4"),
    join(PROJECT_ROOT, "out", "layered.mp4"),
  ];
  for (const f of fallbacks) {
    if (existsSync(f)) return f;
  }

  return null;
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
    const val = parseFloat(stdout.trim());
    return isNaN(val) ? null : val;
  } catch {
    console.warn(`Warning: Could not probe ${stream} duration from ${file}`);
    return null;
  }
};

const main = async () => {
  console.log("=== AV Merge Pipeline ===\n");

  // 1. Find video
  const videoPath = findLatestVideo();
  if (!videoPath) {
    throw new Error(
      "No video file found.\n" +
      "  Expected: out/layered/{date}_{title}/*.mp4\n" +
      "  Run first: npm run export:layered",
    );
  }
  console.log(`Video: ${videoPath}`);

  // 2. Check audio
  if (!existsSync(AUDIO_MASTER)) {
    throw new Error(
      "No audio master found.\n" +
      "  Expected: out/audio/master/master.wav\n" +
      "  Run first: npm run render:audio",
    );
  }
  console.log(`Audio: ${AUDIO_MASTER}`);

  // 3. Merge
  const outputPath = join(PROJECT_ROOT, "out", "final.mp4");
  console.log(`Output: ${outputPath}\n`);

  await execFile("bash", [MERGE_SCRIPT, videoPath, AUDIO_MASTER, outputPath], {
    timeout: 120_000,
  });

  // 4. Verify duration match
  const videoDur = await getStreamDuration(outputPath, "v:0");
  const audioDur = await getStreamDuration(outputPath, "a:0");

  if (videoDur !== null && audioDur !== null) {
    const diff = Math.abs(videoDur - audioDur);
    console.log(`\nVideo duration: ${videoDur.toFixed(3)}s`);
    console.log(`Audio duration: ${audioDur.toFixed(3)}s`);
    console.log(`Diff: ${(diff * 1000).toFixed(1)}ms`);

    if (diff > 0.05) {
      console.warn(`Warning: AV duration diff ${(diff * 1000).toFixed(1)}ms > 50ms threshold`);
    } else {
      console.log("AV sync: OK (< 50ms)");
    }
  } else {
    console.warn("Warning: Could not verify AV duration match (ffprobe unavailable or no duration metadata)");
  }

  console.log("\n=== AV Merge Complete ===");
  console.log(`Output: ${outputPath}`);
};

main().catch((err) => {
  console.error("AV merge failed:", err.message);
  process.exit(1);
});
