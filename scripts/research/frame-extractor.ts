import { execFileSync } from "child_process";
import sharp from "sharp";

// ── Types ───────────────────────────────────────────────────

export interface VideoMetadata {
  width: number;
  height: number;
  fps: number;
  duration: number;
}

export interface FrameData {
  data: Buffer;
  width: number;
  height: number;
}

// ── Timestamp Calculation ───────────────────────────────────

export function calcProportionalTimestamps(
  duration: number,
  fps: number = 1,
): number[] {
  if (duration <= 0) return [];
  const interval = 1 / fps;
  const count = Math.floor(duration * fps);
  return Array.from({ length: count }, (_, i) => +(i * interval).toFixed(3));
}

export function calcTemporalPairTimestamps(
  duration: number,
  fps: number = 30,
): [number, number][] {
  const positions = [0.25, 0.5, 0.75];
  const gap = 1 / fps;
  return positions.map((p) => {
    const t = +(duration * p).toFixed(3);
    return [t, +(t + gap).toFixed(3)];
  });
}

// ── FFmpeg Argument Building ────────────────────────────────

export function buildFfmpegExtractArgs(
  inputPath: string,
  outputPath: string,
  timestamp: number,
): string[] {
  return [
    "-ss",
    String(timestamp),
    "-i",
    inputPath,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    "-y",
    outputPath,
  ];
}

// ── Video Metadata Parsing ──────────────────────────────────

export function parseVideoMetadata(ffprobeJson: string): VideoMetadata {
  const data = JSON.parse(ffprobeJson);
  const videoStream = data.streams.find(
    (s: { codec_type: string }) => s.codec_type === "video",
  );
  if (!videoStream) throw new Error("No video stream found");

  const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
  const fps = den ? num / den : num;
  const duration =
    parseFloat(videoStream.duration) ||
    parseFloat(data.format?.duration) ||
    0;

  return {
    width: videoStream.width,
    height: videoStream.height,
    fps,
    duration,
  };
}

// ── Frame Normalization ─────────────────────────────────────

const MAX_DIMENSION = 2048;

export async function normalizeFramePair(
  ref: FrameData,
  gen: FrameData,
): Promise<[FrameData, FrameData]> {
  // Step 1: find shared aspect ratio via center crop
  const refAspect = ref.width / ref.height;
  const genAspect = gen.width / gen.height;

  let refCropped = ref;
  let genCropped = gen;

  if (Math.abs(refAspect - genAspect) > 0.01) {
    // crop to the narrower aspect ratio
    const targetAspect = Math.min(refAspect, genAspect);
    refCropped = await centerCrop(ref, targetAspect);
    genCropped = await centerCrop(gen, targetAspect);
  }

  // Step 2: resize to smaller dimension
  const targetW = Math.min(refCropped.width, genCropped.width, MAX_DIMENSION);
  const targetH = Math.min(refCropped.height, genCropped.height, MAX_DIMENSION);

  const normRef = await resizeFrame(refCropped, targetW, targetH);
  const normGen = await resizeFrame(genCropped, targetW, targetH);

  return [normRef, normGen];
}

async function centerCrop(
  frame: FrameData,
  targetAspect: number,
): Promise<FrameData> {
  const currentAspect = frame.width / frame.height;

  let cropW = frame.width;
  let cropH = frame.height;

  if (currentAspect > targetAspect) {
    cropW = Math.round(frame.height * targetAspect);
  } else {
    cropH = Math.round(frame.width / targetAspect);
  }

  const left = Math.round((frame.width - cropW) / 2);
  const top = Math.round((frame.height - cropH) / 2);

  const result = await sharp(frame.data, {
    raw: { width: frame.width, height: frame.height, channels: 3 },
  })
    .extract({ left, top, width: cropW, height: cropH })
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { data: result.data, width: result.info.width, height: result.info.height };
}

async function resizeFrame(
  frame: FrameData,
  targetW: number,
  targetH: number,
): Promise<FrameData> {
  if (frame.width === targetW && frame.height === targetH) return frame;

  const result = await sharp(frame.data, {
    raw: { width: frame.width, height: frame.height, channels: 3 },
  })
    .resize(targetW, targetH, { kernel: "lanczos3" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { data: result.data, width: result.info.width, height: result.info.height };
}

// ── Frame Extraction (ffmpeg) ───────────────────────────────

export function checkFfmpegAvailable(): boolean {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

export function extractSingleFrame(
  videoPath: string,
  outputPath: string,
  timestamp: number,
): void {
  const args = buildFfmpegExtractArgs(videoPath, outputPath, timestamp);
  execFileSync("ffmpeg", args, { stdio: "pipe" });
}

export function getVideoMetadata(videoPath: string): VideoMetadata {
  const output = execFileSync("ffprobe", [
    "-v", "quiet",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    videoPath,
  ], { encoding: "utf-8" });
  return parseVideoMetadata(output);
}
