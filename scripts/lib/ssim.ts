/**
 * Lightweight SSIM / RMSE for pixel regression.
 * Uses sharp to decode images to raw RGBA buffers.
 */
import sharp from "sharp";

export interface ImageBuffer {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
}

export async function loadImage(path: string): Promise<ImageBuffer> {
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    data,
    width: info.width,
    height: info.height,
    channels: info.channels,
  };
}

export function rmse(a: ImageBuffer, b: ImageBuffer): number {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`size mismatch: ${a.width}x${a.height} vs ${b.width}x${b.height}`);
  }
  const n = a.data.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const d = a.data[i] - b.data[i];
    sum += d * d;
  }
  return Math.sqrt(sum / n) / 255.0; // normalized 0..1
}

/** 1 = identical, <1 more different. Computed as 1 - rmse. Lower bound clamp at 0. */
export function imageSimilarity(a: ImageBuffer, b: ImageBuffer): number {
  return Math.max(0, 1 - rmse(a, b));
}

/**
 * SSIM-lite (single 11x11 sliding window, luminance only, 4x4 strided — fast approximation)
 * Full SSIM would use gaussian window + CCIR-601 luminance.
 */
export function ssimLite(a: ImageBuffer, b: ImageBuffer): number {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error("size mismatch");
  }
  const W = a.width;
  const H = a.height;
  const C = a.channels;
  const win = 11;
  const stride = 4;
  const C1 = (0.01 * 255) ** 2;
  const C2 = (0.03 * 255) ** 2;
  let sumSsim = 0;
  let count = 0;

  const lum = (buf: Buffer, i: number) => {
    // ITU-R BT.601 luminance
    return 0.299 * buf[i] + 0.587 * buf[i + 1] + 0.114 * buf[i + 2];
  };

  for (let y = 0; y <= H - win; y += stride) {
    for (let x = 0; x <= W - win; x += stride) {
      let mA = 0, mB = 0;
      const N = win * win;
      for (let wy = 0; wy < win; wy++) {
        for (let wx = 0; wx < win; wx++) {
          const i = ((y + wy) * W + (x + wx)) * C;
          mA += lum(a.data, i);
          mB += lum(b.data, i);
        }
      }
      mA /= N; mB /= N;
      let varA = 0, varB = 0, cov = 0;
      for (let wy = 0; wy < win; wy++) {
        for (let wx = 0; wx < win; wx++) {
          const i = ((y + wy) * W + (x + wx)) * C;
          const la = lum(a.data, i) - mA;
          const lb = lum(b.data, i) - mB;
          varA += la * la;
          varB += lb * lb;
          cov += la * lb;
        }
      }
      varA /= N; varB /= N; cov /= N;
      const s =
        ((2 * mA * mB + C1) * (2 * cov + C2)) /
        ((mA * mA + mB * mB + C1) * (varA + varB + C2));
      sumSsim += s;
      count++;
    }
  }
  return count > 0 ? sumSsim / count : 1.0;
}
