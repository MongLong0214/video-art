import sharp from "sharp";

const HUE_BINS = 360;
const MIN_SAT = 0.15;
const MIN_VAL = 0.10;
const SMOOTH_WINDOW = 7;
const DEFAULT_COUNT = 6;

function rgb2hsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === rn) h = ((gn - bn) / d + 6) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h /= 6;
  }
  const s = max > 0 ? d / max : 0;
  return [h, s, max];
}

function smoothHistogram(hist: number[]): number[] {
  const out = new Array(hist.length).fill(0);
  const half = Math.floor(SMOOTH_WINDOW / 2);
  for (let i = 0; i < hist.length; i++) {
    let sum = 0;
    for (let j = -half; j <= half; j++) {
      sum += hist[(i + j + hist.length) % hist.length];
    }
    out[i] = sum / SMOOTH_WINDOW;
  }
  return out;
}

function findPeaks(hist: number[], count: number): number[] {
  const peaks: { bin: number; val: number }[] = [];
  for (let i = 0; i < hist.length; i++) {
    const prev = hist[(i - 1 + hist.length) % hist.length];
    const next = hist[(i + 1) % hist.length];
    if (hist[i] > prev && hist[i] > next && hist[i] > 0) {
      peaks.push({ bin: i, val: hist[i] });
    }
  }
  peaks.sort((a, b) => b.val - a.val);

  // Merge peaks that are too close (within 15 degrees)
  const merged: { bin: number; val: number }[] = [];
  for (const p of peaks) {
    const tooClose = merged.some((m) => {
      const d = Math.abs(p.bin - m.bin);
      return Math.min(d, HUE_BINS - d) < 15;
    });
    if (!tooClose) merged.push(p);
    if (merged.length >= count) break;
  }
  return merged.map((p) => p.bin / HUE_BINS);
}

export async function extractPalette(
  imagePath: string,
  count = DEFAULT_COUNT,
): Promise<number[]> {
  const { data, info } = await sharp(imagePath)
    .resize(256, 256, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const histogram = new Array(HUE_BINS).fill(0);
  const pixels = info.width * info.height;

  for (let i = 0; i < pixels; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const [h, s, v] = rgb2hsv(r, g, b);
    if (s >= MIN_SAT && v >= MIN_VAL) {
      histogram[Math.floor(h * (HUE_BINS - 1))] += 1;
    }
  }

  const smoothed = smoothHistogram(histogram);
  const hues = findPeaks(smoothed, count);

  if (hues.length < 2) return [];
  return hues.sort((a, b) => a - b);
}
