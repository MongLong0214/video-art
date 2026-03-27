// M4: MS-SSIM in YCbCr (Wang et al. 2003)
// 5-scale, weights [0.0448, 0.2856, 0.3001, 0.2363, 0.1333]
// Channel weighting: 0.8Y + 0.1Cb + 0.1Cr

const SCALE_WEIGHTS = [0.0448, 0.2856, 0.3001, 0.2363, 0.1333];
const C1 = (0.01 * 255) ** 2;
const C2 = (0.03 * 255) ** 2;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// ── YCbCr conversion (BT.601) ──────────────────────────────

export function rgbToYCbCr(r: number, g: number, b: number): [number, number, number] {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return [y, cb, cr];
}

// ── Gaussian Kernel ────────────────────────────────────────

export function gaussianKernel(size: number, sigma: number): number[][] {
  const k: number[][] = [];
  const half = Math.floor(size / 2);
  let sum = 0;
  for (let y = 0; y < size; y++) {
    k[y] = [];
    for (let x = 0; x < size; x++) {
      const dx = x - half, dy = y - half;
      const v = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      k[y][x] = v;
      sum += v;
    }
  }
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      k[y][x] /= sum;
  return k;
}

// ── Convolution ────────────────────────────────────────────

function convolve(
  img: Float64Array, w: number, h: number, kernel: number[][],
): Float64Array {
  const ks = kernel.length;
  const half = Math.floor(ks / 2);
  const out = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let ky = 0; ky < ks; ky++) {
        for (let kx = 0; kx < ks; kx++) {
          const sy = Math.min(Math.max(y + ky - half, 0), h - 1);
          const sx = Math.min(Math.max(x + kx - half, 0), w - 1);
          sum += img[sy * w + sx] * kernel[ky][kx];
        }
      }
      out[y * w + x] = sum;
    }
  }
  return out;
}

// ── Single-scale SSIM ──────────────────────────────────────

const KERNEL = gaussianKernel(11, 1.5);

export function ssimSingleScale(
  a: Float64Array, b: Float64Array, w: number, h: number,
): number {
  const muA = convolve(a, w, h, KERNEL);
  const muB = convolve(b, w, h, KERNEL);

  const ab = new Float64Array(w * h);
  const a2 = new Float64Array(w * h);
  const b2 = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) {
    ab[i] = a[i] * b[i];
    a2[i] = a[i] * a[i];
    b2[i] = b[i] * b[i];
  }

  const sigAB = convolve(ab, w, h, KERNEL);
  const sigA2 = convolve(a2, w, h, KERNEL);
  const sigB2 = convolve(b2, w, h, KERNEL);

  let lumSum = 0, csSum = 0;
  for (let i = 0; i < w * h; i++) {
    const ma = muA[i], mb = muB[i];
    const sa2 = sigA2[i] - ma * ma;
    const sb2 = sigB2[i] - mb * mb;
    const sab = sigAB[i] - ma * mb;

    const lum = (2 * ma * mb + C1) / (ma * ma + mb * mb + C1);
    const cs = (2 * sab + C2) / (sa2 + sb2 + C2);
    lumSum += lum;
    csSum += cs;
  }

  const n = w * h;
  return clamp01((lumSum / n) * (csSum / n));
}

// ── MS-SSIM (5-scale) ──────────────────────────────────────

function downsample2x(img: Float64Array, w: number, h: number): { data: Float64Array; w: number; h: number } {
  const nw = Math.floor(w / 2);
  const nh = Math.floor(h / 2);
  const out = new Float64Array(nw * nh);
  for (let y = 0; y < nh; y++)
    for (let x = 0; x < nw; x++)
      out[y * nw + x] = (
        img[(2 * y) * w + 2 * x] +
        img[(2 * y) * w + 2 * x + 1] +
        img[(2 * y + 1) * w + 2 * x] +
        img[(2 * y + 1) * w + 2 * x + 1]
      ) / 4;
  return { data: out, w: nw, h: nh };
}

export function msssim(
  a: Float64Array, b: Float64Array, w: number, h: number,
): number {
  const scales = Math.min(SCALE_WEIGHTS.length, Math.floor(Math.log2(Math.min(w, h))) - 1);
  if (scales <= 0) return ssimSingleScale(a, b, w, h);

  let curA = a, curB = b, curW = w, curH = h;
  let result = 1;

  for (let s = 0; s < scales; s++) {
    const ssim = ssimSingleScale(curA, curB, curW, curH);

    if (s === scales - 1) {
      // finest scale includes luminance
      result *= ssim ** SCALE_WEIGHTS[s];
    } else {
      // intermediate scales: contrast-structure only (approximate as ssim)
      result *= ssim ** SCALE_WEIGHTS[s];
    }

    if (s < scales - 1) {
      const dA = downsample2x(curA, curW, curH);
      const dB = downsample2x(curB, curW, curH);
      curA = dA.data; curB = dB.data;
      curW = dA.w; curH = dA.h;
    }
  }

  return clamp01(result);
}

// ── M4: YCbCr composite ───────────────────────────────────

export function computeMsssimYCbCr(
  refRgb: Buffer, genRgb: Buffer, w: number, h: number,
): number {
  const n = w * h;
  const refY = new Float64Array(n), refCb = new Float64Array(n), refCr = new Float64Array(n);
  const genY = new Float64Array(n), genCb = new Float64Array(n), genCr = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const ri = i * 3;
    const [ry, rcb, rcr] = rgbToYCbCr(refRgb[ri], refRgb[ri + 1], refRgb[ri + 2]);
    refY[i] = ry; refCb[i] = rcb; refCr[i] = rcr;
    const [gy, gcb, gcr] = rgbToYCbCr(genRgb[ri], genRgb[ri + 1], genRgb[ri + 2]);
    genY[i] = gy; genCb[i] = gcb; genCr[i] = gcr;
  }

  const yScore = msssim(refY, genY, w, h);
  const cbScore = msssim(refCb, genCb, w, h);
  const crScore = msssim(refCr, genCr, w, h);

  return clamp01(0.8 * yScore + 0.1 * cbScore + 0.1 * crScore);
}
