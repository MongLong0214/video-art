// prepare.ts — One-time reference preparation
// Extracts 1fps keyframes + 3 temporal pairs from source video

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import {
  calcProportionalTimestamps,
  calcTemporalPairTimestamps,
  getVideoMetadata,
  extractSingleFrame,
  checkFfmpegAvailable,
} from "./frame-extractor.js";

const CACHE_DIR = ".cache/research/reference";

/**
 * Collect all expected frame file paths for a given video metadata.
 */
function collectExpectedFramePaths(
  duration: number,
  fps: number,
): string[] {
  const paths: string[] = [];

  // 1fps keyframes
  const timestamps = calcProportionalTimestamps(duration, 1);
  for (let i = 0; i < timestamps.length; i++) {
    paths.push(
      `${CACHE_DIR}/frame_p${String(Math.round((timestamps[i] / duration) * 100)).padStart(3, "0")}.png`,
    );
  }

  // 3 temporal pairs
  const pairs = calcTemporalPairTimestamps(duration, fps);
  for (let i = 0; i < pairs.length; i++) {
    const pct = [25, 50, 75][i];
    paths.push(`${CACHE_DIR}/temporal_pair_${pct}_a.png`);
    paths.push(`${CACHE_DIR}/temporal_pair_${pct}_b.png`);
  }

  return paths;
}

export function prepareReference(sourcePath: string): void {
  if (!existsSync(sourcePath)) {
    throw new Error(`Source video not found: ${sourcePath}\nProvide path to source.mp4`);
  }

  if (!checkFfmpegAvailable()) {
    throw new Error("ffmpeg not found. Install with: brew install ffmpeg");
  }

  mkdirSync(CACHE_DIR, { recursive: true });

  const meta = getVideoMetadata(sourcePath);
  console.log(`Source: ${meta.width}×${meta.height}, ${meta.fps}fps, ${meta.duration}s`);

  // T1-AC6: Idempotent skip — if metadata.json exists and all frames exist, skip
  const metadataPath = `${CACHE_DIR}/metadata.json`;
  const expectedPaths = collectExpectedFramePaths(meta.duration, meta.fps);

  if (existsSync(metadataPath)) {
    const allFramesExist = expectedPaths.every((p) => existsSync(p));
    if (allFramesExist) {
      // Verify metadata matches current source
      try {
        const existing = JSON.parse(readFileSync(metadataPath, "utf-8"));
        if (existing.sourcePath === sourcePath) {
          console.log("Reference already prepared (idempotent skip).");
          return;
        }
      } catch {
        // Corrupted metadata — fall through to re-extract
      }
    }
  }

  // 1fps keyframes
  const timestamps = calcProportionalTimestamps(meta.duration, 1);
  console.log(`Extracting ${timestamps.length} keyframes...`);
  for (let i = 0; i < timestamps.length; i++) {
    const outPath = `${CACHE_DIR}/frame_p${String(Math.round((timestamps[i] / meta.duration) * 100)).padStart(3, "0")}.png`;
    if (!existsSync(outPath)) {
      extractSingleFrame(sourcePath, outPath, timestamps[i]);
    }
  }

  // 3 temporal pairs
  const pairs = calcTemporalPairTimestamps(meta.duration, meta.fps);
  console.log(`Extracting ${pairs.length} temporal pairs...`);
  for (let i = 0; i < pairs.length; i++) {
    const pct = [25, 50, 75][i];
    const pathA = `${CACHE_DIR}/temporal_pair_${pct}_a.png`;
    const pathB = `${CACHE_DIR}/temporal_pair_${pct}_b.png`;
    if (!existsSync(pathA)) extractSingleFrame(sourcePath, pathA, pairs[i][0]);
    if (!existsSync(pathB)) extractSingleFrame(sourcePath, pathB, pairs[i][1]);
  }

  // T1-AC4: frameCount in metadata.json
  const frameCount = timestamps.length + pairs.length * 2;

  // metadata.json
  writeFileSync(
    metadataPath,
    JSON.stringify(
      { ...meta, sourcePath, frameCount, extractedAt: new Date().toISOString() },
      null,
      2,
    ),
  );

  console.log(`Reference prepared: ${CACHE_DIR}/`);
}

// CLI entry
if (process.argv[1]?.endsWith("prepare.ts")) {
  const source = process.argv[2] ?? process.env.SOURCE_VIDEO;
  if (!source) {
    console.error("Usage: tsx scripts/research/prepare.ts <source.mp4>");
    process.exit(1);
  }
  prepareReference(source);
}
