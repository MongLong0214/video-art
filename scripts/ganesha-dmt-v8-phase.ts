import path from "node:path";
import sharp from "sharp";
import type { ImageData } from "./ganesha-dmt-v8-layers.js";

export interface PhaseFields {
  readonly luminance: Buffer;
  readonly edge: Buffer;
  readonly vertical: Buffer;
  readonly width: number;
  readonly height: number;
}

export const phaseFiles = {
  luminance: "layers/phase-luminance.png",
  edge: "layers/phase-edge.png",
  vertical: "layers/phase-vertical.png",
} as const;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const clamp255 = (value: number): number => Math.min(255, Math.max(0, Math.round(value)));

function makeLuminance(image: ImageData): Float32Array {
  const lum = new Float32Array(image.width * image.height);
  for (let i = 0; i < lum.length; i++) {
    const p = i * 4;
    lum[i] = (0.299 * image.raw[p] + 0.587 * image.raw[p + 1] + 0.114 * image.raw[p + 2]) / 255;
  }
  return lum;
}

async function blurField(field: Float32Array, width: number, height: number, sigma: number): Promise<Float32Array> {
  const gray = Buffer.alloc(field.length);
  for (let i = 0; i < field.length; i++) gray[i] = clamp255(field[i] * 255);
  const out = await sharp(gray, { raw: { width, height, channels: 1 } }).blur(sigma).raw().toBuffer();
  return Float32Array.from(out, (value) => value / 255);
}

function sobel(lum: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  const at = (x: number, y: number): number => lum[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
      const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
      out[y * width + x] = Math.hypot(gx, gy);
    }
  }
  return out;
}

function chamferDistance(edge: Float32Array, width: number, height: number): Float32Array {
  const inf = 1_000_000;
  const distance = new Float32Array(width * height);
  for (let i = 0; i < distance.length; i++) distance[i] = edge[i] > 0.045 ? 0 : inf;
  const at = (x: number, y: number): number => (x < 0 || y < 0 || x >= width || y >= height ? inf : distance[y * width + x]);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      distance[i] = Math.min(distance[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414);
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      distance[i] = Math.min(distance[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414);
    }
  }
  return distance;
}

function grayPng(field: Float32Array, width: number, height: number): Promise<Buffer> {
  const gray = Buffer.alloc(field.length);
  for (let i = 0; i < field.length; i++) gray[i] = clamp255(field[i] * 255);
  return sharp(gray, { raw: { width, height, channels: 1 } }).png().toBuffer();
}

export async function buildPhaseFields(image: ImageData): Promise<PhaseFields> {
  const { width, height } = image;
  const lum = makeLuminance(image);
  const lumSmooth = await blurField(lum, width, height, Math.max(0.3, width * 0.018));
  const edge = sobel(lumSmooth, width, height);
  const edgeDistance = chamferDistance(edge, width, height);
  const luminance = new Float32Array(lum.length);
  const vertical = new Float32Array(lum.length);
  const edgePhase = new Float32Array(lum.length);
  const edgeScale = Math.max(32, width * 0.07);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const ny = y / Math.max(1, height - 1);
      luminance[i] = lumSmooth[i];
      edgePhase[i] = clamp01(edgeDistance[i] / edgeScale);
      vertical[i] = clamp01(0.72 * ny + 0.28 * (1 - lumSmooth[i]));
    }
  }
  return {
    luminance: await grayPng(luminance, width, height),
    edge: await grayPng(edgePhase, width, height),
    vertical: await grayPng(vertical, width, height),
    width,
    height,
  };
}

export async function writePhaseFields(fields: PhaseFields, layersDir: string): Promise<void> {
  await Promise.all([
    sharp(fields.luminance).toFile(path.join(layersDir, "phase-luminance.png")),
    sharp(fields.edge).toFile(path.join(layersDir, "phase-edge.png")),
    sharp(fields.vertical).toFile(path.join(layersDir, "phase-vertical.png")),
  ]);
}
