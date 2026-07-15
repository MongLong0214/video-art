import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { analyzeReferenceTexture } from "./lib/reference-texture.js";

const GRID_WIDTH = 96;
const GRID_HEIGHT = 171;
const MAX_BUFFER = 1 << 30;
const HELP = "usage: npm run analyze:reference -- <video.mp4> [--json <report.json>]";
const pathSchema = z.string().trim().min(1);
const rateSchema = z.string().regex(/^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/);

type ReferenceCli =
  | { readonly kind: "help" }
  | { readonly kind: "analyze"; readonly videoPath: string; readonly jsonPath?: string };

type ReferenceTextureReport = {
  readonly video: string;
  readonly grid: readonly [number, number];
  readonly fps: number;
  readonly metrics: ReturnType<typeof analyzeReferenceTexture>;
};

export class ReferenceCliError extends Error {
  override readonly name = "ReferenceCliError";
}

export function parseReferenceCli(argv: readonly string[]): ReferenceCli {
  if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h")) return { kind: "help" };
  const videoPath = pathSchema.parse(argv[0]);
  let jsonPath: string | undefined;
  for (let index = 1; index < argv.length; index++) {
    const arg = argv[index];
    if (arg !== "--json") throw new ReferenceCliError(`unknown argument: ${arg}`);
    jsonPath = pathSchema.parse(argv[index + 1]);
    index++;
  }
  return jsonPath === undefined
    ? { kind: "analyze", videoPath }
    : { kind: "analyze", videoPath, jsonPath };
}

function readFps(videoPath: string): number {
  const rawRate = execFileSync("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=avg_frame_rate",
    "-of", "default=noprint_wrappers=1:nokey=1",
    videoPath,
  ], { encoding: "utf8" }).trim();
  const [numeratorText, denominatorText] = rateSchema.parse(rawRate).split("/");
  const denominator = Number(denominatorText);
  if (denominator === 0) throw new ReferenceCliError(`invalid frame rate: ${rawRate}`);
  return Number(numeratorText) / denominator;
}

function decodeVideo(videoPath: string): Buffer {
  return execFileSync("ffmpeg", [
    "-v", "error",
    "-i", videoPath,
    "-an",
    "-vf", `scale=${GRID_WIDTH}:${GRID_HEIGHT}:flags=lanczos`,
    "-f", "rawvideo",
    "-pix_fmt", "rgb24",
    "-",
  ], { maxBuffer: MAX_BUFFER });
}

function printReport(report: ReferenceTextureReport): void {
  console.log(`reference-texture: ${report.video}`);
  console.log(`frames: ${report.metrics.frameCount}  grid: ${report.grid.join("x")}  fps: ${report.fps.toFixed(3)}`);
  for (const [name, value] of Object.entries(report.metrics)) {
    if (name !== "frameCount") console.log(`${name.padEnd(28)} ${value.toFixed(6)}`);
  }
}

function runAnalysis(args: Extract<ReferenceCli, { readonly kind: "analyze" }>): void {
  const videoPath = path.resolve(args.videoPath);
  if (!fs.existsSync(videoPath)) throw new ReferenceCliError(`video not found: ${videoPath}`);
  const fps = readFps(videoPath);
  const metrics = analyzeReferenceTexture({
    data: decodeVideo(videoPath),
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
    fps,
  });
  const report: ReferenceTextureReport = { video: videoPath, grid: [GRID_WIDTH, GRID_HEIGHT], fps, metrics };
  printReport(report);
  if (args.jsonPath !== undefined) {
    const jsonPath = path.resolve(args.jsonPath);
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  }
}

function main(argv: readonly string[] = process.argv.slice(2)): void {
  const args = parseReferenceCli(argv);
  if (args.kind === "help") {
    console.log(HELP);
    return;
  }
  runAnalysis(args);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  Promise.resolve().then(() => main()).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
