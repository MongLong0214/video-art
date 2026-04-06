/**
 * Ping-pong loop generator — creates seamless loops from frame sequences.
 *
 * Input: N frames (forward direction)
 * Output: 2N frames (forward + reverse), with cosine blending at the seam point.
 *
 * The last frame of the output connects seamlessly to the first frame,
 * creating an infinite loop.
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

interface PingPongOptions {
  blendFrames?: number; // Number of frames to blend at each seam (default: 3)
}

interface PingPongResult {
  frameCount: number;
  blendFrames: number;
}

export async function createPingPongLoop(
  inputDir: string,
  outputDir: string,
  options: PingPongOptions = {},
): Promise<PingPongResult> {
  const blendFrames = options.blendFrames ?? 3;

  // Load frame filenames sorted
  const files = fs
    .readdirSync(inputDir)
    .filter((f) => f.endsWith(".png"))
    .sort();

  if (files.length < 4) {
    throw new Error(
      `Ping-pong requires at least 4 frames, got ${files.length}`,
    );
  }

  const n = files.length;

  // Build ping-pong sequence: forward [0..N-1] + reverse [N-1..0]
  // Total: 2N frames. Last frame (reverse[0]) connects to first frame (forward[0]).
  const sequence: string[] = [];

  // Forward pass: all N frames
  for (let i = 0; i < n; i++) {
    sequence.push(files[i]);
  }

  // Reverse pass: N frames (N-1 down to 0)
  for (let i = n - 1; i >= 0; i--) {
    sequence.push(files[i]);
  }

  const totalFrames = sequence.length; // 2N

  // Write frames with cosine blending at seam points
  // Seam 1: forward→reverse transition at index N-1/N
  // Seam 2: reverse→forward transition at index 2N-1/0 (loop point)

  for (let i = 0; i < totalFrames; i++) {
    const srcPath = path.join(inputDir, sequence[i]);
    const outName = `frame_${String(i + 1).padStart(5, "0")}.png`;
    const outPath = path.join(outputDir, outName);

    // Check if this frame is near a seam point
    const distToSeam1 = Math.abs(i - n); // seam at forward→reverse
    const distToSeam2 = Math.min(i, totalFrames - i); // seam at loop point

    if (distToSeam1 <= blendFrames && distToSeam1 > 0) {
      // Blend near seam 1 (forward→reverse transition)
      const t = distToSeam1 / (blendFrames + 1);
      const weight = 0.5 + 0.5 * Math.cos(Math.PI * (1 - t));

      // Blend current frame with its mirror counterpart
      const mirrorIdx =
        i < n ? n + (n - 1 - i) : n - 1 - (i - n);
      if (mirrorIdx >= 0 && mirrorIdx < totalFrames && mirrorIdx !== i) {
        const mirrorPath = path.join(inputDir, sequence[mirrorIdx]);
        const blended = await blendFrames2(srcPath, mirrorPath, weight);
        await sharp(blended.data, {
          raw: { width: blended.width, height: blended.height, channels: 3 },
        })
          .png()
          .toFile(outPath);
        continue;
      }
    }

    if (distToSeam2 <= blendFrames && distToSeam2 > 0 && i > 0) {
      // Blend near seam 2 (loop point: end→start)
      const t = distToSeam2 / (blendFrames + 1);
      const weight = 0.5 + 0.5 * Math.cos(Math.PI * (1 - t));

      const mirrorIdx = i < blendFrames ? totalFrames - blendFrames + i : i - totalFrames + blendFrames;
      if (mirrorIdx >= 0 && mirrorIdx < totalFrames && mirrorIdx !== i) {
        const mirrorPath = path.join(inputDir, sequence[mirrorIdx]);
        const blended = await blendFrames2(srcPath, mirrorPath, weight);
        await sharp(blended.data, {
          raw: { width: blended.width, height: blended.height, channels: 3 },
        })
          .png()
          .toFile(outPath);
        continue;
      }
    }

    // No blending needed — straight copy
    fs.copyFileSync(srcPath, outPath);
  }

  return { frameCount: totalFrames, blendFrames };
}

async function blendFrames2(
  pathA: string,
  pathB: string,
  weightA: number,
): Promise<{ data: Buffer; width: number; height: number }> {
  const [a, b] = await Promise.all([
    sharp(pathA).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(pathB).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);

  const { width, height } = a.info;
  const out = Buffer.alloc(width * height * 3);

  for (let i = 0; i < out.length; i++) {
    out[i] = Math.round(a.data[i] * weightA + b.data[i] * (1 - weightA));
  }

  return { data: out, width, height };
}
