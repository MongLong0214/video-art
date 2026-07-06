import sharp from "sharp";

export type Rgb = readonly [number, number, number];
export type Hsv = readonly [number, number, number];

export type ImageData = {
  readonly raw: Buffer;
  readonly width: number;
  readonly height: number;
};

export type SobelVectors = {
  readonly magnitude: Float32Array;
  readonly gx: Float32Array;
  readonly gy: Float32Array;
};

export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
export const clamp255 = (value: number): number => Math.min(255, Math.max(0, Math.round(value)));

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

export function rgbToHsv(rgb: Rgb): Hsv {
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

export function hsvToRgb(hsv: Hsv): Rgb {
  const [h, s, v] = hsv;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const m = i % 6;
  const rgb =
    m === 0
      ? [v, t, p]
      : m === 1
        ? [q, v, p]
        : m === 2
          ? [p, v, t]
          : m === 3
            ? [p, q, v]
            : m === 4
              ? [t, p, v]
              : [v, p, q];
  return [clamp255(rgb[0] * 255), clamp255(rgb[1] * 255), clamp255(rgb[2] * 255)];
}

export async function loadImageData(sourcePath: string): Promise<ImageData> {
  const { data, info } = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { raw: data, width: info.width, height: info.height };
}

export function makeLuminance(image: ImageData): Float32Array {
  const lum = new Float32Array(image.width * image.height);
  for (let i = 0; i < lum.length; i++) {
    const p = i * 4;
    lum[i] = (0.299 * image.raw[p] + 0.587 * image.raw[p + 1] + 0.114 * image.raw[p + 2]) / 255;
  }
  return lum;
}

export function edgeSampler(lum: Float32Array, image: Pick<ImageData, "width" | "height">): (x: number, y: number) => number {
  return (x: number, y: number): number => {
    const xl = Math.max(0, x - 1);
    const xr = Math.min(image.width - 1, x + 1);
    const yu = Math.max(0, y - 1);
    const yd = Math.min(image.height - 1, y + 1);
    return Math.hypot(lum[y * image.width + xr] - lum[y * image.width + xl], lum[yd * image.width + x] - lum[yu * image.width + x]);
  };
}

export function sobelVectors(lum: Float32Array, width: number, height: number): SobelVectors {
  const magnitude = new Float32Array(width * height);
  const gxField = new Float32Array(width * height);
  const gyField = new Float32Array(width * height);
  const at = (x: number, y: number): number => lum[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
      const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
      const i = y * width + x;
      gxField[i] = gx;
      gyField[i] = gy;
      magnitude[i] = Math.hypot(gx, gy);
    }
  }
  return { magnitude, gx: gxField, gy: gyField };
}

export function sobelField(lum: Float32Array, width: number, height: number): Float32Array {
  return sobelVectors(lum, width, height).magnitude;
}

export async function blurField(field: Float32Array, width: number, height: number, sigma: number): Promise<Float32Array> {
  const expectedPixels = width * height;
  if (field.length !== expectedPixels) throw new Error(`blurField expected ${expectedPixels} input values, received ${field.length}`);
  const gray = Buffer.alloc(field.length);
  for (let i = 0; i < field.length; i++) gray[i] = clamp255(clamp01(field[i]) * 255);
  const { data, info } = await sharp(gray, { raw: { width, height, channels: 1 } })
    .blur(Math.max(0.3, sigma))
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (data.length !== expectedPixels * info.channels) {
    throw new Error(`blurField raw output expected ${expectedPixels * info.channels} bytes, received ${data.length}`);
  }
  const out = new Float32Array(expectedPixels);
  for (let i = 0; i < out.length; i++) out[i] = data[i * info.channels] / 255;
  if (out.length !== expectedPixels) throw new Error(`blurField expected ${expectedPixels} output values, received ${out.length}`);
  return out;
}

export function percentile(values: Float32Array | readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const q = p > 1 ? p / 100 : p;
  const sorted = Array.from(values).sort((a, b) => a - b);
  const idx = clamp01(q) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const t = idx - lo;
  return sorted[lo] * (1 - t) + sorted[hi] * t;
}

export function normalizePercentile(values: Float32Array, lo: number, hi: number): Float32Array {
  const low = percentile(values, lo);
  const high = percentile(values, hi);
  const span = Math.max(1e-6, high - low);
  const out = new Float32Array(values.length);
  for (let i = 0; i < values.length; i++) out[i] = clamp01((values[i] - low) / span);
  return out;
}
