import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { LayerName, Rgb, Variant } from "./ganesha-dmt-v8-variants.js";

export type ActiveLayerName = LayerName;

export interface ImageData {
  readonly raw: Buffer;
  readonly width: number;
  readonly height: number;
}

interface Canvas {
  readonly buffer: Buffer;
  readonly width: number;
  readonly height: number;
}

interface PixelWrite {
  readonly canvas: Canvas;
  readonly x: number;
  readonly y: number;
  readonly color: Rgb;
  readonly alpha: number;
}

interface Oval {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

export const sourcePath =
  process.env.SOURCE_PATH ??
  "/Users/isaac/Downloads/monglong_a_bright_psychedelic_artwork_featuring_ganesha_sitting_8b4cafbd-746f-4c4b-9438-c18a1998ed8a 2.PNG";
export const outputRoot = process.env.OUTPUT_ROOT ?? "out/manual-runs";

export const layerFiles: Record<ActiveLayerName, string> = {
  void: "layers/void-field.png",
  aura: "layers/aura-current.png",
  body: "layers/body-jewel.png",
  gold: "layers/gold-nerve.png",
  cyan: "layers/cyan-prism.png",
  magenta: "layers/magenta-prism.png",
  white: "layers/white-spark.png",
  shadow: "layers/shadow-color.png",
};

const activeLayers: readonly ActiveLayerName[] = ["void", "aura", "body", "gold", "cyan", "magenta", "white", "shadow"];
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

function rgbAt(raw: Buffer, p: number): Rgb {
  return [raw[p], raw[p + 1], raw[p + 2]];
}

function rgbToHsv(rgb: Rgb): readonly [number, number, number] {
  const rn = rgb[0] / 255;
  const gn = rgb[1] / 255;
  const bn = rgb[2] / 255;
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

function hsvToRgb(hsv: readonly [number, number, number]): Rgb {
  const [h, s, v] = hsv;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const m = i % 6;
  const rgb = m === 0 ? [v, t, p] : m === 1 ? [q, v, p] : m === 2 ? [p, v, t] : m === 3 ? [p, q, v] : m === 4 ? [t, p, v] : [v, p, q];
  return [clamp255(rgb[0] * 255), clamp255(rgb[1] * 255), clamp255(rgb[2] * 255)];
}

function luminance(rgb: Rgb): number {
  return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
}

function liftLuminance(rgb: Rgb, floor: number): Rgb {
  const y = luminance(rgb);
  if (y >= floor) return rgb;
  const t = clamp01((floor - y) / Math.max(0.001, 1 - y));
  return [clamp255(rgb[0] * (1 - t) + 255 * t), clamp255(rgb[1] * (1 - t) + 255 * t), clamp255(rgb[2] * (1 - t) + 255 * t)];
}

function put({ canvas, x, y, color, alpha }: PixelWrite): void {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
  const p = (y * canvas.width + x) * 4;
  canvas.buffer[p] = color[0];
  canvas.buffer[p + 1] = color[1];
  canvas.buffer[p + 2] = color[2];
  canvas.buffer[p + 3] = clamp255(clamp01(alpha) * 255);
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

function edgeSampler(lum: Float32Array, image: ImageData): (x: number, y: number) => number {
  return (x: number, y: number): number => {
    const xl = Math.max(0, x - 1);
    const xr = Math.min(image.width - 1, x + 1);
    const yu = Math.max(0, y - 1);
    const yd = Math.min(image.height - 1, y + 1);
    return Math.hypot(lum[y * image.width + xr] - lum[y * image.width + xl], lum[yd * image.width + x] - lum[yu * image.width + x]);
  };
}

function ovalMask(nx: number, ny: number, oval: Oval): number {
  return 1 - smoothstep(0.9, 1.04, Math.hypot((nx - oval.cx) / oval.rx, (ny - oval.cy) / oval.ry));
}

function figureMask(nx: number, ny: number): number {
  const pieces: readonly Oval[] = [
    { cx: 0.5, cy: 0.225, rx: 0.062, ry: 0.045 },
    { cx: 0.5, cy: 0.295, rx: 0.14, ry: 0.098 },
    { cx: 0.5, cy: 0.385, rx: 0.145, ry: 0.115 },
    { cx: 0.345, cy: 0.43, rx: 0.09, ry: 0.08 },
    { cx: 0.655, cy: 0.43, rx: 0.09, ry: 0.08 },
    { cx: 0.5, cy: 0.52, rx: 0.085, ry: 0.235 },
    { cx: 0.575, cy: 0.62, rx: 0.105, ry: 0.06 },
    { cx: 0.42, cy: 0.62, rx: 0.115, ry: 0.23 },
    { cx: 0.58, cy: 0.62, rx: 0.115, ry: 0.23 },
    { cx: 0.5, cy: 0.69, rx: 0.17, ry: 0.22 },
    { cx: 0.31, cy: 0.835, rx: 0.205, ry: 0.105 },
    { cx: 0.69, cy: 0.835, rx: 0.205, ry: 0.105 },
    { cx: 0.5, cy: 0.905, rx: 0.32, ry: 0.058 },
  ] as const;
  return clamp01(Math.max(...pieces.map((piece) => ovalMask(nx, ny, piece))));
}

function coreMask(nx: number, ny: number): number {
  const pieces: readonly Oval[] = [
    { cx: 0.5, cy: 0.29, rx: 0.105, ry: 0.07 },
    { cx: 0.5, cy: 0.39, rx: 0.115, ry: 0.095 },
    { cx: 0.505, cy: 0.53, rx: 0.068, ry: 0.225 },
    { cx: 0.56, cy: 0.62, rx: 0.09, ry: 0.045 },
    { cx: 0.5, cy: 0.7, rx: 0.145, ry: 0.2 },
    { cx: 0.31, cy: 0.835, rx: 0.18, ry: 0.09 },
    { cx: 0.69, cy: 0.835, rx: 0.18, ry: 0.09 },
  ] as const;
  return clamp01(Math.max(...pieces.map((piece) => ovalMask(nx, ny, piece))));
}

function baseColor(variant: Variant, source: Rgb): Rgb {
  const [h, s, v] = rgbToHsv(source);
  return liftLuminance(
    hsvToRgb([h, clamp01(s * variant.base.sat), clamp01(v * variant.base.value + variant.base.lift)]),
    variant.base.floor,
  );
}

function layerColor(variant: Variant, source: Rgb): Rgb {
  return liftLuminance(source, Math.max(0.28, variant.base.floor));
}

function createBuffers(image: ImageData): Record<ActiveLayerName, Buffer> {
  return {
    void: Buffer.alloc(image.raw.length),
    aura: Buffer.alloc(image.raw.length),
    body: Buffer.alloc(image.raw.length),
    gold: Buffer.alloc(image.raw.length),
    cyan: Buffer.alloc(image.raw.length),
    magenta: Buffer.alloc(image.raw.length),
    white: Buffer.alloc(image.raw.length),
    shadow: Buffer.alloc(image.raw.length),
  };
}

function writeMasks(image: ImageData, variant: Variant, base: Buffer, buffers: Record<ActiveLayerName, Buffer>): void {
  const lum = makeLuminance(image);
  const edgeAt = edgeSampler(lum, image);
  const baseCanvas: Canvas = { buffer: base, width: image.width, height: image.height };
  const canvases: Record<ActiveLayerName, Canvas> = {
    void: { buffer: buffers.void, width: image.width, height: image.height },
    aura: { buffer: buffers.aura, width: image.width, height: image.height },
    body: { buffer: buffers.body, width: image.width, height: image.height },
    gold: { buffer: buffers.gold, width: image.width, height: image.height },
    cyan: { buffer: buffers.cyan, width: image.width, height: image.height },
    magenta: { buffer: buffers.magenta, width: image.width, height: image.height },
    white: { buffer: buffers.white, width: image.width, height: image.height },
    shadow: { buffer: buffers.shadow, width: image.width, height: image.height },
  };
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const p = (y * image.width + x) * 4;
      const nx = x / (image.width - 1);
      const ny = y / (image.height - 1);
      const source = rgbAt(image.raw, p);
      const [h, s, v] = rgbToHsv(source);
      const rawEdge = edgeAt(x, y);
      const coarseFigure = figureMask(nx, ny);
      const subjectTexture = smoothstep(0.01, 0.048, rawEdge);
      const bottomFloor = ny > 0.875 && s > 0.48 && (h < 0.14 || h > 0.92);
      const smoothBackplate = ny < 0.58 && rawEdge < 0.026 && s < 0.62;
      const figure = clamp01(Math.max(coreMask(nx, ny), coarseFigure * subjectTexture * (bottomFloor || smoothBackplate ? 0 : 1)));
      const bg = 1 - figure;
      const edge = smoothstep(0.014, 0.095, rawEdge) * (0.42 + s * 0.68);
      const high = smoothstep(0.5, 0.96, v);
      const warm = Math.max(1 - hueDistance(h, 0.08) / 0.17, 1 - hueDistance(h, 0.94) / 0.14);
      const cool = Math.max(1 - hueDistance(h, 0.55) / 0.18, 1 - hueDistance(h, 0.66) / 0.15);
      const rose = Math.max(1 - hueDistance(h, 0.84) / 0.15, 1 - hueDistance(h, 0.77) / 0.14);
      const liftedSource = layerColor(variant, source);
      put({ canvas: baseCanvas, x, y, color: baseColor(variant, source), alpha: 1 });
      put({ canvas: canvases.void, x, y, color: liftedSource, alpha: bg * (0.48 + (1 - v) * 0.38) * variant.gains.shadow });
      put({ canvas: canvases.aura, x, y, color: liftedSource, alpha: figure * (edge * 0.56 + high * 0.2) * variant.gains.aura });
      put({ canvas: canvases.body, x, y, color: liftedSource, alpha: figure * (high * 0.42 + edge * 0.82) * variant.gains.body });
      put({ canvas: canvases.gold, x, y, color: liftedSource, alpha: warm * edge * figure * 1.48 * variant.gains.edge });
      put({ canvas: canvases.cyan, x: x + 3, y: y - 1, color: liftedSource, alpha: edge * figure * (cool * 0.8 + 0.5) * variant.gains.edge });
      put({ canvas: canvases.magenta, x: x - 3, y: y + 1, color: liftedSource, alpha: edge * figure * (rose * 0.82 + 0.5) * variant.gains.edge });
      put({ canvas: canvases.white, x, y, color: liftedSource, alpha: edge * high * figure * 1.44 });
      put({ canvas: canvases.shadow, x, y, color: liftedSource, alpha: 0 });
    }
  }
}

export async function writeLayers(image: ImageData, layersDir: string, variant: Variant): Promise<void> {
  fs.mkdirSync(layersDir, { recursive: true });
  const base = Buffer.alloc(image.raw.length);
  const buffers = createBuffers(image);
  writeMasks(image, variant, base, buffers);
  const raw = { width: image.width, height: image.height, channels: 4 as const };
  await Promise.all([
    sharp(base, { raw }).png().toFile(path.join(layersDir, "base-presence.png")),
    sharp(buffers.void, { raw }).blur(1.1).png().toFile(path.join(layersDir, "void-field.png")),
    sharp(buffers.aura, { raw }).blur(2.8).png().toFile(path.join(layersDir, "aura-current.png")),
    sharp(buffers.body, { raw }).blur(0.34).png().toFile(path.join(layersDir, "body-jewel.png")),
    sharp(buffers.gold, { raw }).blur(0.3).png().toFile(path.join(layersDir, "gold-nerve.png")),
    sharp(buffers.cyan, { raw }).blur(0.3).png().toFile(path.join(layersDir, "cyan-prism.png")),
    sharp(buffers.magenta, { raw }).blur(0.3).png().toFile(path.join(layersDir, "magenta-prism.png")),
    sharp(buffers.white, { raw }).png().toFile(path.join(layersDir, "white-spark.png")),
    sharp(buffers.shadow, { raw }).blur(0.9).png().toFile(path.join(layersDir, "shadow-color.png")),
  ]);
}
