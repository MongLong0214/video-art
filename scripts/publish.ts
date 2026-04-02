/**
 * publish.ts — 원커맨드 Instagram Reels 퍼블리시 파이프라인.
 *
 * 이미지 1장 → AI 레이어 분해 → 셰이더 렌더링 → Instagram 최적화 mp4 출력
 *
 * Usage:
 *   npx tsx scripts/publish.ts <input.png> --title <name> [--audio <path> --audio-start <sec>] [--duration <N>]
 *
 * Output specs (Instagram Reels optimal):
 *   - 1080x1920 (9:16), H.264 High Profile Level 4.2, yuv420p
 *   - 30fps, CRF 15, veryslow preset
 *   - AAC 256kbps audio (optional)
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseTitle } from "./lib/archive.js";

const args = process.argv.slice(2);
const inputPath = args.find((a) => !a.startsWith("--"));
const title = parseTitle(args, inputPath);

if (!inputPath) {
  console.error("Usage: npm run publish <input.png> --title <name> [--audio <path> --audio-start <sec>] [--duration <N>]");
  process.exit(1);
}

// Parse optional flags
const audioIdx = args.indexOf("--audio");
const audioPath = audioIdx !== -1 && audioIdx + 1 < args.length ? args[audioIdx + 1] : undefined;
const audioStartIdx = args.indexOf("--audio-start");
const audioStart = audioStartIdx !== -1 && audioStartIdx + 1 < args.length ? args[audioStartIdx + 1] : "0";
const durationIdx = args.indexOf("--duration");
const duration = durationIdx !== -1 && durationIdx + 1 < args.length ? args[durationIdx + 1] : undefined;

const projectRoot = process.cwd();

function run(bin: string, runArgs: string[]) {
  console.log(`\n$ ${bin} ${runArgs.join(" ")}\n`);
  execFileSync(bin, runArgs, { cwd: projectRoot, stdio: "inherit" });
}

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║   Instagram Reels Publish Pipeline       ║");
  console.log("║   1080x1920 · 30fps · H.264 · yuv420p   ║");
  console.log("╚══════════════════════════════════════════╝\n");
  console.log(`Input: ${path.resolve(inputPath!)}`);
  console.log(`Title: ${title}`);
  if (audioPath) console.log(`Audio: ${audioPath} (start: ${audioStart}s)`);

  // Step 1: Pro pipeline (AI decompose + ESRGAN upscale)
  const proArgs = ["tsx", "scripts/pipeline-pro.ts", inputPath!];
  if (duration) proArgs.push("--duration", duration);
  run("npx", proArgs);

  // Step 2: Export high-res (original resolution @ 60fps for supersampling)
  const exportArgs = ["tsx", "scripts/export-layered.ts", "--title", title];
  run("npx", exportArgs);

  // Step 3: Find the exported mp4
  const datePrefix = new Date().toISOString().slice(0, 10);
  const archiveDir = fs.readdirSync(path.join(projectRoot, "out", "layered"))
    .filter((d) => d.includes(title) && d.startsWith(datePrefix))
    .sort()
    .pop();
  if (!archiveDir) throw new Error("Could not find archive directory");
  const archivePath = path.join(projectRoot, "out", "layered", archiveDir);
  const hiresPath = path.join(archivePath, `${title}.mp4`);

  if (!fs.existsSync(hiresPath)) throw new Error(`High-res video not found: ${hiresPath}`);

  // Step 4: Downscale to Instagram specs (supersampling → 1080x1920 30fps)
  console.log("\n═══ Instagram Optimization (supersampling downscale) ═══");
  const instagramPath = path.join(archivePath, `${title}-instagram.mp4`);
  const downscaleArgs = [
    "-y",
    "-i", hiresPath,
    "-vf", "scale=1080:1920:flags=lanczos,fps=30",
    "-c:v", "libx264", "-profile:v", "high", "-level:v", "4.2",
    "-pix_fmt", "yuv420p",
    "-crf", "15", "-preset", "veryslow",
    "-movflags", "+faststart",
    instagramPath,
  ];
  run("ffmpeg", downscaleArgs);

  // Step 5: Attach audio (optional)
  let finalPath = instagramPath;
  if (audioPath && fs.existsSync(audioPath)) {
    console.log("\n═══ Audio Merge ═══");
    finalPath = path.join(archivePath, `${title}-final.mp4`);
    const audioArgs = [
      "-y",
      "-i", instagramPath,
      "-ss", audioStart,
      "-i", audioPath,
      "-c:v", "copy", "-c:a", "aac", "-b:a", "256k",
      "-shortest",
      finalPath,
    ];
    run("ffmpeg", audioArgs);
  }

  // Summary
  const stats = fs.statSync(finalPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║            Pipeline Complete              ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`\n  Output: ${path.relative(projectRoot, finalPath)}`);
  console.log(`  Size:   ${sizeMB}MB`);
  console.log(`  Spec:   1080x1920 · 30fps · H.264 High 4.2 · yuv420p`);
  if (audioPath) console.log(`  Audio:  AAC 256kbps (from ${audioStart}s)`);
  console.log(`\n  ✓ Ready for Instagram Reels upload`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
