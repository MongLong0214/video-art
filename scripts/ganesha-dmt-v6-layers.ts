import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { LayerName, Rgb, Variant } from "./ganesha-dmt-v6-variants.js";

export interface ImageData {
  readonly raw: Buffer;
  readonly width: number;
  readonly height: number;
}

export const sourcePath =
  "/Users/isaac/Downloads/monglong_a_bright_psychedelic_artwork_featuring_ganesha_sitting_8b4cafbd-746f-4c4b-9438-c18a1998ed8a 2.PNG";
export const outputRoot = "out/manual-runs";

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const clamp255 = (value: number): number => Math.min(255, Math.max(0, Math.round(value)));

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

const hueDistance = (a: number, b: number): number => {
  const d = Math.abs(a - b);
  return Math.min(d, 1 - d);
};

function rgbToHsv(r: number, g: number, b: number): readonly [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const sat = max === 0 ? 0 : delta / max;
  if (delta === 0) return [0, sat, max];
  const hue =
    max === rn
      ? ((gn - bn) / delta + (gn < bn ? 6 : 0)) / 6
      : max === gn
        ? ((bn - rn) / delta + 2) / 6
        : ((rn - gn) / delta + 4) / 6;
  return [hue, sat, max];
}

function hsvToRgb(h: number, s: number, v: number): Rgb {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const m = i % 6;
  const rgb = m === 0 ? [v, t, p] : m === 1 ? [q, v, p] : m === 2 ? [p, v, t] : m === 3 ? [p, q, v] : m === 4 ? [t, p, v] : [v, p, q];
  return [clamp255(rgb[0] * 255), clamp255(rgb[1] * 255), clamp255(rgb[2] * 255)];
}

function mixColor(a: Rgb, b: Rgb, t: number): Rgb {
  const k = clamp01(t);
  return [clamp255(a[0] * (1 - k) + b[0] * k), clamp255(a[1] * (1 - k) + b[1] * k), clamp255(a[2] * (1 - k) + b[2] * k)];
}

function spectral(base: Rgb, raw: Buffer, p: number, weight: number): Rgb {
  const r = raw[p];
  const g = raw[p + 1];
  const b = raw[p + 2];
  return [
    clamp255(base[0] * weight + (255 - b) * 0.1 + r * 0.16),
    clamp255(base[1] * weight + (255 - r) * 0.08 + g * 0.16),
    clamp255(base[2] * weight + (255 - g) * 0.09 + b * 0.15),
  ];
}

function writePixel(buffer: Buffer, width: number, height: number, x: number, y: number, color: Rgb, alpha: number): void {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const p = (y * width + x) * 4;
  buffer[p] = color[0];
  buffer[p + 1] = color[1];
  buffer[p + 2] = color[2];
  buffer[p + 3] = clamp255(clamp01(alpha) * 255);
}

function baseColor(raw: Buffer, p: number): Rgb {
  const [h, s, v] = rgbToHsv(raw[p], raw[p + 1], raw[p + 2]);
  const lifted = hsvToRgb(h, clamp01(s * 1.0), clamp01(v * 0.84 + 0.035));
  return mixColor(lifted, [12, 8, 46], smoothstep(0.14, 0.72, 1 - v) * 0.34);
}

export async function loadImage(): Promise<ImageData> {
  const image = sharp(sourcePath).ensureAlpha();
  const metadata = await image.metadata();
  if (metadata.width === undefined || metadata.height === undefined) throw new Error("source image has no dimensions");
  return { raw: await image.raw().toBuffer(), width: metadata.width, height: metadata.height };
}

function makeLuminance(image: ImageData): Float32Array {
  const lum = new Float32Array(image.width * image.height);
  for (let i = 0; i < lum.length; i++) {
    const p = i * 4;
    lum[i] = (0.299 * image.raw[p] + 0.587 * image.raw[p + 1] + 0.114 * image.raw[p + 2]) / 255;
  }
  return lum;
}

function edgeAt(lum: Float32Array, width: number, height: number, x: number, y: number): number {
  const xl = Math.max(0, x - 1);
  const xr = Math.min(width - 1, x + 1);
  const yu = Math.max(0, y - 1);
  const yd = Math.min(height - 1, y + 1);
  return Math.hypot(lum[y * width + xr] - lum[y * width + xl], lum[yd * width + x] - lum[yu * width + x]);
}

function writeMasks(image: ImageData, variant: Variant, base: Buffer, buffers: Record<LayerName, Buffer>): void {
  const lum = makeLuminance(image);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const i = y * image.width + x;
      const p = i * 4;
      const nx = x / (image.width - 1);
      const ny = y / (image.height - 1);
      const [h, s, v] = rgbToHsv(image.raw[p], image.raw[p + 1], image.raw[p + 2]);
      const figureDist = Math.hypot((nx - 0.5) / 0.39, (ny - 0.59) / 0.45);
      const haloDist = Math.hypot((nx - 0.5) / 0.48, (ny - 0.33) / 0.22);
      const figure = 1 - smoothstep(0.82, 1.12, figureDist);
      const bg = clamp01(1 - figure * 0.8);
      const edge = smoothstep(0.018, 0.1, edgeAt(lum, image.width, image.height, x, y)) * (0.35 + s * 0.65);
      const aura = smoothstep(0.7, 0.98, figureDist) * (1 - smoothstep(1.02, 1.24, figureDist));
      const halo = smoothstep(0.42, 0.66, haloDist) * (1 - smoothstep(0.82, 1.04, haloDist));
      const warm = Math.max(1 - hueDistance(h, 0.08) / 0.18, 1 - hueDistance(h, 0.95) / 0.14);
      const cool = Math.max(1 - hueDistance(h, 0.56) / 0.18, 1 - hueDistance(h, 0.67) / 0.16);
      const rose = Math.max(1 - hueDistance(h, 0.86) / 0.16, 1 - hueDistance(h, 0.78) / 0.13);
      const high = smoothstep(0.48, 0.96, v);
      writePixel(base, image.width, image.height, x, y, baseColor(image.raw, p), 1);
      writePixel(buffers.void, image.width, image.height, x, y, spectral(variant.colors.void, image.raw, p, 0.5), bg * (0.1 + (1 - v) * 0.38 + edge * 0.08));
      writePixel(buffers.aura, image.width, image.height, x, y, spectral(variant.colors.aura, image.raw, p, 0.5), aura * (0.28 + s * 0.2) + figure * high * 0.035);
      writePixel(buffers.halo, image.width, image.height, x, y, spectral(variant.colors.halo, image.raw, p, 0.52), (halo * 0.36 + warm * bg * 0.08) * (0.28 + s * 0.46));
      writePixel(buffers.body, image.width, image.height, x, y, spectral(variant.colors.body, image.raw, p, 0.5), figure * (0.08 + high * 0.18 + edge * 0.18));
      writePixel(buffers.gold, image.width, image.height, x, y, spectral(variant.colors.gold, image.raw, p, 0.58), warm * edge * (0.12 + figure * 0.42));
      writePixel(buffers.cyan, image.width, image.height, x + 3, y - 1, spectral(variant.colors.cyan, image.raw, p, 0.54), edge * (0.12 + cool * 0.28 + figure * 0.1));
      writePixel(buffers.magenta, image.width, image.height, x - 3, y + 1, spectral(variant.colors.magenta, image.raw, p, 0.54), edge * (0.12 + rose * 0.3 + figure * 0.1));
      writePixel(buffers.white, image.width, image.height, x, y, variant.colors.white, edge * high * 0.36);
      writePixel(buffers.shadow, image.width, image.height, x, y, spectral(variant.colors.shadow, image.raw, p, 0.52), (1 - v) * s * (0.14 + figure * 0.24 + bg * 0.12));
    }
  }
}

export async function writeLayers(image: ImageData, layersDir: string, variant: Variant): Promise<void> {
  fs.mkdirSync(layersDir, { recursive: true });
  const base = Buffer.alloc(image.raw.length);
  const buffers: Record<LayerName, Buffer> = {
    void: Buffer.alloc(image.raw.length),
    aura: Buffer.alloc(image.raw.length),
    halo: Buffer.alloc(image.raw.length),
    body: Buffer.alloc(image.raw.length),
    gold: Buffer.alloc(image.raw.length),
    cyan: Buffer.alloc(image.raw.length),
    magenta: Buffer.alloc(image.raw.length),
    white: Buffer.alloc(image.raw.length),
    shadow: Buffer.alloc(image.raw.length),
  };
  writeMasks(image, variant, base, buffers);
  const raw = { width: image.width, height: image.height, channels: 4 as const };
  await Promise.all([
    sharp(base, { raw }).png().toFile(path.join(layersDir, "base-presence.png")),
    sharp(buffers.void, { raw }).blur(2.4).png().toFile(path.join(layersDir, "void-field.png")),
    sharp(buffers.aura, { raw }).blur(7.5).png().toFile(path.join(layersDir, "aura-shell.png")),
    sharp(buffers.halo, { raw }).blur(1.1).png().toFile(path.join(layersDir, "halo-threshold.png")),
    sharp(buffers.body, { raw }).blur(0.55).png().toFile(path.join(layersDir, "body-spectrum.png")),
    sharp(buffers.gold, { raw }).blur(0.3).png().toFile(path.join(layersDir, "gold-nerve.png")),
    sharp(buffers.cyan, { raw }).blur(0.3).png().toFile(path.join(layersDir, "cyan-prism.png")),
    sharp(buffers.magenta, { raw }).blur(0.3).png().toFile(path.join(layersDir, "magenta-prism.png")),
    sharp(buffers.white, { raw }).png().toFile(path.join(layersDir, "white-glyph.png")),
    sharp(buffers.shadow, { raw }).blur(1.6).png().toFile(path.join(layersDir, "shadow-charge.png")),
  ]);
}
