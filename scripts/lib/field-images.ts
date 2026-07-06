import sharp from "sharp";
import {
  blurField,
  clamp01,
  clamp255,
  makeLuminance,
  percentile,
  rgbToHsv,
  type ImageData,
} from "./image-stats.js";

export type FieldPoint = readonly [number, number];

export function fieldMean(values: Float32Array): number {
  let sum = 0;
  for (const value of values) sum += value;
  return values.length === 0 ? 0 : sum / values.length;
}

export function fieldCentroid(mask: Float32Array, width: number, height: number): FieldPoint {
  let weight = 0;
  let sumX = 0;
  let sumY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = mask[y * width + x];
      weight += value;
      sumX += x * value;
      sumY += y * value;
    }
  }
  if (weight <= 1e-6) return [(width - 1) / 2, (height - 1) / 2];
  return [sumX / weight, sumY / weight];
}

export async function writeGrayPng(field: Float32Array, width: number, height: number, outPath: string): Promise<void> {
  const gray = Buffer.alloc(field.length);
  for (let i = 0; i < field.length; i++) gray[i] = clamp255(field[i] * 255);
  await sharp(gray, { raw: { width, height, channels: 1 } }).png().toFile(outPath);
}

export async function writeRgbPng(rgb: Buffer, width: number, height: number, outPath: string): Promise<void> {
  await sharp(rgb, { raw: { width, height, channels: 3 } }).png().toFile(outPath);
}

export function blurFloatField(field: Float32Array, width: number, height: number, sigma: number): Float32Array {
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const weights = new Float32Array(radius * 2 + 1);
  let weightSum = 0;
  for (let i = -radius; i <= radius; i++) {
    const weight = Math.exp(-(i * i) / (2 * sigma * sigma));
    weights[i + radius] = weight;
    weightSum += weight;
  }
  for (let i = 0; i < weights.length; i++) weights[i] /= weightSum;
  const temp = new Float32Array(field.length);
  const out = new Float32Array(field.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        const sx = Math.min(width - 1, Math.max(0, x + k));
        sum += field[y * width + sx] * weights[k + radius];
      }
      temp[y * width + x] = sum;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        const sy = Math.min(height - 1, Math.max(0, y + k));
        sum += temp[sy * width + x] * weights[k + radius];
      }
      out[y * width + x] = sum;
    }
  }
  return out;
}

export async function buildSaliencyFigureMask(image: ImageData): Promise<Float32Array> {
  const total = image.width * image.height;
  const lum = makeLuminance(image);
  const lumLocal = await blurField(lum, image.width, image.height, 8);
  const sat = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const p = i * 4;
    sat[i] = rgbToHsv([image.raw[p], image.raw[p + 1], image.raw[p + 2]])[1];
  }
  const satBlur = await blurField(sat, image.width, image.height, 8);
  const saliency = new Float32Array(total);
  const cx = (image.width - 1) / 2;
  const cy = (image.height - 1) / 2;
  const maxR = Math.hypot(cx, cy);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const i = y * image.width + x;
      const centerWeight = 1 - 0.55 * clamp01(Math.hypot(x - cx, y - cy) / Math.max(1, maxR));
      saliency[i] = satBlur[i] * Math.abs(lum[i] - lumLocal[i]) * centerWeight;
    }
  }
  const threshold = percentile(saliency, 0.6);
  const figure = new Float32Array(total);
  for (let i = 0; i < total; i++) figure[i] = saliency[i] >= threshold ? 1 : 0;
  return blurField(figure, image.width, image.height, 8);
}

function binarySeeds(mask: Float32Array, foreground: boolean, threshold: number): Uint8Array {
  const seeds = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) {
    seeds[i] = foreground ? (mask[i] > threshold ? 1 : 0) : (mask[i] <= threshold ? 1 : 0);
  }
  return seeds;
}

function chamferDistance(seeds: Uint8Array, width: number, height: number): Float32Array {
  const inf = 1_000_000;
  const dist = new Float32Array(width * height);
  for (let i = 0; i < dist.length; i++) dist[i] = seeds[i] > 0 ? 0 : inf;
  const at = (x: number, y: number): number => (x < 0 || y < 0 || x >= width || y >= height ? inf : dist[y * width + x]);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      dist[i] = Math.min(dist[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414);
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      dist[i] = Math.min(dist[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414);
    }
  }
  return dist;
}

export function dilateMask(mask: Float32Array, width: number, height: number, radius: number): Float32Array {
  const distance = chamferDistance(binarySeeds(mask, true, 0.25), width, height);
  const out = new Float32Array(mask.length);
  for (let i = 0; i < out.length; i++) out[i] = distance[i] <= radius ? 1 : 0;
  return out;
}

export function erodeMask(mask: Float32Array, width: number, height: number, radius: number): Float32Array {
  const distance = chamferDistance(binarySeeds(mask, false, 0.35), width, height);
  const out = new Float32Array(mask.length);
  for (let i = 0; i < out.length; i++) out[i] = distance[i] > radius ? 1 : 0;
  return out;
}

export function radialBand(width: number, height: number, focal: FieldPoint): Float32Array {
  const out = new Float32Array(width * height);
  const maxR = Math.hypot(Math.max(focal[0], width - 1 - focal[0]), Math.max(focal[1], height - 1 - focal[1]));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const r = Math.hypot(x - focal[0], y - focal[1]) / Math.max(1, maxR);
      const inner = clamp01((r - 0.28) / 0.06);
      const outer = 1 - clamp01((r - 0.49) / 0.06);
      out[y * width + x] = inner * inner * (3 - 2 * inner) * outer * outer * (3 - 2 * outer);
    }
  }
  return out;
}
