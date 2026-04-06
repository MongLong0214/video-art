/**
 * publish.ts — 원커맨드 Instagram Reels 퍼블리시 파이프라인.
 *
 * 이미지 1장 → AI 레이어 분해 → 셰이더 렌더링 → Instagram 최적화 mp4 출력
 * 병렬 실행 안전: 각 실행이 독립 _work/ + 동적 포트를 사용.
 *
 * Usage:
 *   npx tsx scripts/publish.ts <input.png> --title <name> [--audio <path> --audio-start <sec>] [--duration <N>]
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseTitle, createRunContext } from "./lib/archive.js";

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

  // Create isolated RunContext (archive dir with run-id, _work/ auto-created)
  const ctx = createRunContext(projectRoot, title, "layered");
  const workDir = ctx.workDir;

  console.log(`Archive: ${path.relative(projectRoot, ctx.archiveDir)}/`);
  console.log(`Work dir: ${path.relative(projectRoot, workDir)}/`);

  try {
    // Step 1: Pro pipeline → writes to _work/
    const proArgs = ["tsx", "scripts/pipeline-pro.ts", inputPath!, "--work-dir", workDir];
    if (duration) proArgs.push("--duration", duration);
    // Forward motion flags
    if (args.includes("--motion")) proArgs.push("--motion");
    const mmIdx = args.indexOf("--motion-model");
    if (mmIdx !== -1 && mmIdx + 1 < args.length) proArgs.push("--motion-model", args[mmIdx + 1]);
    const miIdx = args.indexOf("--motion-intensity");
    if (miIdx !== -1 && miIdx + 1 < args.length) proArgs.push("--motion-intensity", args[miIdx + 1]);
    if (args.includes("--skip-flow")) proArgs.push("--skip-flow");
    run("npx", proArgs);

    // Step 2: Export → reads from _work/, dynamic port, renders mp4 into same archiveDir
    const exportArgs = ["tsx", "scripts/export-layered.ts", "--title", title, "--work-dir", workDir, "--archive-dir", ctx.archiveDir];
    run("npx", exportArgs);

    // Step 3: Find the exported mp4
    const hiresPath = path.join(ctx.archiveDir, `${title}.mp4`);
    if (!fs.existsSync(hiresPath)) throw new Error(`High-res video not found: ${hiresPath}`);

    // Step 4: Downscale to 1080x1920 30fps + optional audio in one pass
    console.log("\n═══ Instagram Optimization (supersampling downscale) ═══");
    const hasAudio = audioPath && fs.existsSync(audioPath);
    const finalPath = path.join(ctx.archiveDir, `${title}-instagram.mp4`);
    const ffmpegArgs = ["-y", "-i", hiresPath];
    if (hasAudio) ffmpegArgs.push("-ss", audioStart, "-i", audioPath);
    ffmpegArgs.push(
      "-vf", "scale=1080:1920:flags=lanczos,fps=30",
      "-c:v", "libx264", "-profile:v", "high", "-level:v", "4.2",
      "-pix_fmt", "yuv420p",
      "-crf", "15", "-preset", "veryslow",
      "-movflags", "+faststart",
    );
    if (hasAudio) ffmpegArgs.push("-c:a", "aac", "-b:a", "256k", "-shortest");
    ffmpegArgs.push(finalPath);
    run("ffmpeg", ffmpegArgs);

    // Step 6: Cleanup _work/ (success)
    ctx.cleanup();

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
  } catch (err) {
    ctx.skipCleanup();
    console.error(`\n  _work/ preserved for debugging: ${path.relative(projectRoot, workDir)}/`);
    throw err;
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
