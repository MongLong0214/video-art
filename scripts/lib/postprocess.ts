import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

export interface PostProcessResult {
  files: string[];
  order: number[];
  coverages: number[];
}

export async function postprocessLayers(
  layersDir: string,
): Promise<PostProcessResult> {
  const files = fs
    .readdirSync(layersDir)
    .filter((f) => /^layer-\d+\.png$/i.test(f))
    .sort()
    .map((f) => path.join(layersDir, f));

  if (files.length === 0) {
    throw new Error(`No layer files found in ${layersDir}`);
  }

  const coverages: { file: string; coverage: number; index: number }[] = [];

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];

    // Clean alpha edges: blur alpha slightly then threshold
    await cleanAlphaEdges(filePath);

    // Remove small noise islands (< 50px area)
    await removeNoiseIslands(filePath);

    // Alpha dilate (expand edges slightly)
    await alphaDilate(filePath);

    // Calculate alpha coverage
    const coverage = await calculateAlphaCoverage(filePath);
    coverages.push({ file: filePath, coverage, index: i });
  }

  // Sort by coverage descending (highest coverage = background = zIndex 0)
  coverages.sort((a, b) => b.coverage - a.coverage);

  // Rename files to match new order
  const orderedFiles: string[] = [];
  const tempDir = path.join(layersDir, "__temp_reorder__");
  fs.mkdirSync(tempDir, { recursive: true });

  for (let i = 0; i < coverages.length; i++) {
    const tempPath = path.join(tempDir, `layer-${i}.png`);
    fs.copyFileSync(coverages[i].file, tempPath);
  }

  for (let i = 0; i < coverages.length; i++) {
    const finalPath = path.join(layersDir, `layer-${i}.png`);
    fs.copyFileSync(path.join(tempDir, `layer-${i}.png`), finalPath);
    orderedFiles.push(finalPath);
  }

  fs.rmSync(tempDir, { recursive: true, force: true });

  return {
    files: orderedFiles,
    order: coverages.map((c) => c.index),
    coverages: coverages.map((c) => c.coverage),
  };
}

async function cleanAlphaEdges(filePath: string): Promise<void> {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const pixels = new Uint8Array(data);

  // Threshold alpha: < 3 → 0, > 252 → 255 (permissive to preserve soft edges)
  for (let i = 3; i < pixels.length; i += channels) {
    if (pixels[i] < 3) pixels[i] = 0;
    else if (pixels[i] > 252) pixels[i] = 255;
  }

  await sharp(Buffer.from(pixels), { raw: { width, height, channels } })
    .png()
    .toFile(filePath + ".tmp");

  fs.renameSync(filePath + ".tmp", filePath);
}

async function removeNoiseIslands(filePath: string): Promise<void> {
  // Simple approach: blur alpha, threshold, use as mask
  const original = sharp(filePath).ensureAlpha();
  const { data, info } = await original.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const pixels = new Uint8Array(data);

  // Extract alpha channel, blur it, threshold to remove small islands
  const alphaChannel = Buffer.alloc(width * height);
  for (let i = 0; i < width * height; i++) {
    alphaChannel[i] = pixels[i * channels + 3];
  }

  const blurredAlpha = await sharp(alphaChannel, {
    raw: { width, height, channels: 1 },
  })
    .blur(1.5)
    .raw()
    .toBuffer();

  // Apply: where blurred alpha < 8, zero out original alpha (permissive — only remove true noise)
  for (let i = 0; i < width * height; i++) {
    if (blurredAlpha[i] < 8) {
      pixels[i * channels + 3] = 0;
    }
  }

  await sharp(Buffer.from(pixels), { raw: { width, height, channels } })
    .png()
    .toFile(filePath + ".tmp");

  fs.renameSync(filePath + ".tmp", filePath);
}

async function alphaDilate(filePath: string): Promise<void> {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const pixels = new Uint8Array(data);
  const result = new Uint8Array(pixels);

  // Simple 3x3 dilation on alpha channel
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * channels + 3;
      if (pixels[idx] > 0) continue;

      // Check 3x3 neighborhood
      let maxAlpha = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nIdx = ((y + dy) * width + (x + dx)) * channels + 3;
          maxAlpha = Math.max(maxAlpha, pixels[nIdx]);
        }
      }

      if (maxAlpha > 128) {
        result[idx] = Math.floor(maxAlpha * 0.5);
        // Copy color from nearest opaque neighbor
        let found = false;
        for (let dy = -1; dy <= 1 && !found; dy++) {
          for (let dx = -1; dx <= 1 && !found; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * channels;
            if (pixels[nIdx + 3] > 128) {
              result[(y * width + x) * channels] = pixels[nIdx];
              result[(y * width + x) * channels + 1] = pixels[nIdx + 1];
              result[(y * width + x) * channels + 2] = pixels[nIdx + 2];
              found = true;
            }
          }
        }
      }
    }
  }

  await sharp(Buffer.from(result), { raw: { width, height, channels } })
    .png()
    .toFile(filePath + ".tmp");

  fs.renameSync(filePath + ".tmp", filePath);
}

async function calculateAlphaCoverage(filePath: string): Promise<number> {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  let opaquePixels = 0;
  const totalPixels = width * height;

  for (let i = 3; i < data.length; i += channels) {
    if (data[i] > 128) opaquePixels++;
  }

  return opaquePixels / totalPixels;
}

