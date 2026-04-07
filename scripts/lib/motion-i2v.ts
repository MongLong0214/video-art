/**
 * Motion i2v pipeline — per-layer image-to-video generation via Replicate.
 *
 * Steps:
 * 1. Flatten RGBA to RGB (foreground layers)
 * 2. Call Replicate i2v model
 * 3. Download mp4
 * 4. Extract frames via ffmpeg
 * 5. Normalize duration to target (FILM interpolation or trim)
 * 6. Sync frame counts between layers
 */

import Replicate from "replicate";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getToken, withRetry, extractUrl } from "./replicate-utils.js";
import {
  getMotionModel,
  generateMotionPrompt,
  TARGET_DURATION_SEC,
  TARGET_FPS,
  TARGET_FRAMES,
  type MotionModelConfig,
} from "./motion-models.js";

const execFileAsync = promisify(execFile);

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

interface I2vLayerInput {
  imagePath: string;
  role?: string;
  hasAlpha: boolean;
}

interface I2vResult {
  videoPath: string;
  framesDir: string;
  frameCount: number;
}

interface MotionI2vOptions {
  modelName: string;
  intensity: "low" | "medium" | "high";
  workDir: string;
}

/**
 * Flatten RGBA image to RGB with black background.
 * Returns path to flattened RGB PNG.
 */
export async function flattenRgbaToRgb(
  inputPath: string,
  outputPath: string,
): Promise<string> {
  await sharp(inputPath)
    .flatten({ background: { r: 0, g: 0, b: 0 } })
    .png()
    .toFile(outputPath);
  return outputPath;
}

/**
 * Run i2v for a single layer.
 */
async function runI2v(
  replicate: Replicate,
  modelConfig: MotionModelConfig,
  imagePath: string,
  prompt: string,
  outputVideoPath: string,
): Promise<string> {
  const imageData = fs.readFileSync(imagePath);
  const base64 = imageData.toString("base64");
  const mimeType = "image/png";
  const dataUri = `data:${mimeType};base64,${base64}`;

  const input: Record<string, unknown> = {
    prompt: prompt + modelConfig.promptSuffix,
    [modelConfig.imageInputKey]: dataUri,
    resolution: "720p",
    duration: Math.min(TARGET_DURATION_SEC, modelConfig.defaultDuration),
  };

  if (modelConfig.supportsLastFrame && modelConfig.lastFrameKey) {
    input[modelConfig.lastFrameKey] = dataUri;
  }

  const I2V_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
  const output = await withTimeout(
    withRetry(async () =>
      replicate.run(modelConfig.replicateId as `${string}/${string}`, { input }),
    ),
    I2V_TIMEOUT_MS,
    `i2v timed out after ${I2V_TIMEOUT_MS / 1000}s for model ${modelConfig.replicateId}`,
  );

  // Download video
  const videoUrl = extractUrl(output);
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download i2v video: HTTP ${response.status} from ${videoUrl}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputVideoPath, buffer);

  return outputVideoPath;
}


/**
 * Extract frames from video using ffmpeg.
 */
export async function extractFrames(
  videoPath: string,
  framesDir: string,
  fps: number = TARGET_FPS,
): Promise<number> {
  fs.mkdirSync(framesDir, { recursive: true });

  await execFileAsync("ffmpeg", [
    "-i", videoPath,
    "-vf", `fps=${fps}`,
    "-f", "image2",
    path.join(framesDir, "frame_%05d.png"),
  ]);

  const files = fs.readdirSync(framesDir).filter(f => f.endsWith(".png"));
  return files.length;
}

/**
 * Normalize frame count to target. Trim if too many, keep as-is if close enough.
 * FILM interpolation for significant shortfall deferred to future implementation.
 */
export async function normalizeFrameCount(
  framesDir: string,
  currentCount: number,
  targetCount: number,
): Promise<number> {
  if (currentCount >= targetCount) {
    // Trim: remove excess frames
    const files = fs.readdirSync(framesDir).filter(f => f.endsWith(".png")).sort();
    for (let i = targetCount; i < files.length; i++) {
      fs.unlinkSync(path.join(framesDir, files[i]));
    }
    return targetCount;
  }

  // If significantly short, use ffmpeg fps resampling as fallback
  if (currentCount < targetCount * 0.8) {
    const tmpDir = framesDir + "_tmp";
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      // Move existing frames to tmp
      const files = fs.readdirSync(framesDir).filter(f => f.endsWith(".png")).sort();
      for (const f of files) {
        fs.renameSync(path.join(framesDir, f), path.join(tmpDir, f));
      }

      // Reassemble via ffmpeg with target frame count
      const inputPattern = path.join(tmpDir, "frame_%05d.png");
      const targetFps = targetCount / TARGET_DURATION_SEC;

      await execFileAsync("ffmpeg", [
        "-framerate", String(currentCount / TARGET_DURATION_SEC),
        "-i", inputPattern,
        "-vf", `fps=${targetFps}`,
        "-f", "image2",
        path.join(framesDir, "frame_%05d.png"),
      ]);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    return fs.readdirSync(framesDir).filter(f => f.endsWith(".png")).length;
  }

  // Close enough — keep as-is
  return currentCount;
}

/**
 * Run the full motion i2v pipeline for all layers.
 * All-or-nothing: if any layer fails, motion is disabled for all.
 */
export async function runMotionI2v(
  layers: I2vLayerInput[],
  options: MotionI2vOptions,
): Promise<I2vResult[] | null> {
  const replicate = new Replicate({ auth: getToken() });
  const modelConfig = getMotionModel(options.modelName);

  const results: I2vResult[] = [];

  try {
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const layerDir = path.join(options.workDir, `layer-${i}`);
      fs.mkdirSync(layerDir, { recursive: true });

      // Flatten RGBA if needed
      let inputImage = layer.imagePath;
      if (layer.hasAlpha) {
        const flatPath = path.join(layerDir, "flat.png");
        inputImage = await flattenRgbaToRgb(layer.imagePath, flatPath);
      }

      // Generate prompt
      const prompt = generateMotionPrompt(layer.role, options.intensity);

      // Run i2v
      console.log(`  Layer ${i}: Running ${options.modelName} i2v...`);
      const videoPath = path.join(layerDir, "motion-ref.mp4");
      await runI2v(replicate, modelConfig, inputImage, prompt, videoPath);

      // Extract frames
      console.log(`  Layer ${i}: Extracting frames...`);
      const framesDir = path.join(layerDir, "ref-frames");
      const frameCount = await extractFrames(videoPath, framesDir);
      console.log(`  Layer ${i}: ${frameCount} frames extracted`);

      // Normalize to target
      const normalizedCount = await normalizeFrameCount(framesDir, frameCount, TARGET_FRAMES);
      console.log(`  Layer ${i}: ${normalizedCount} frames after normalization`);

      results.push({ videoPath, framesDir, frameCount: normalizedCount });
    }

    // Sync frame counts (use minimum)
    const minFrames = Math.min(...results.map(r => r.frameCount));
    for (const result of results) {
      if (result.frameCount > minFrames) {
        result.frameCount = await normalizeFrameCount(result.framesDir, result.frameCount, minFrames);
      }
    }

    return results;
  } catch (err) {
    console.error("Motion i2v failed — falling back to static mode:", err);
    return null;
  }
}
