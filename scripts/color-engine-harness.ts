export type Rgb = { readonly r: number; readonly g: number; readonly b: number };

export type SourceSample = {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly srgb8: readonly [number, number, number];
};

export type LuminanceRow = {
  readonly sample: string;
  readonly timeSeconds: number;
  readonly sourceDisplayY: number;
  readonly localLinearY: number;
  readonly shaderDisplayY: number;
  readonly outputDisplayY: number;
  readonly oklabLIn: number;
  readonly oklabLOut: number;
  readonly hueShift: number;
  readonly chromaScale: number;
};

type Hsv = { readonly h: number; readonly s: number; readonly v: number };

type Oklab = { readonly l: number; readonly a: number; readonly b: number };

type GreenBand = { readonly lo: number; readonly hi: number };

type GamutResult = { readonly rgb: Rgb; readonly chromaScale: number };

const TAU = Math.PI * 2;
const BASE_PERIOD_SECONDS = 20;
const BASE_SPEED = 2;
const BASE_SATURATION_BOOST = 1.05;
const BASE_LUMINANCE_KEY = 0.6;
const BASE_LUM_EXPONENT = 1;
const BASE_HUE_KEY = 0.3;
const BASE_HUE_SPEED = 1.2;
const BASE_GREEN_COMPRESS = 0.85;
export const OKLCH_GREEN_BAND: GreenBand = {
  lo: 0.27769994490592986,
  hi: 0.49983187802797546,
};

export const R10_BASE_SAMPLES: readonly SourceSample[] = [
  { name: "sky-left", x: 220, y: 520, srgb8: [33, 59, 108] },
  { name: "sky-right", x: 1300, y: 1100, srgb8: [42, 73, 123] },
  { name: "eye-white", x: 635, y: 1000, srgb8: [199, 192, 170] },
  { name: "face-shadow", x: 800, y: 1660, srgb8: [37, 40, 48] },
  { name: "sweater-lit", x: 815, y: 2280, srgb8: [241, 230, 198] },
];

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

function fract(value: number): number {
  return value - Math.floor(value);
}

function mix(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function displayLuminance(rgb: Rgb): number {
  return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
}

export function srgbChannelToLinear(value: number): number {
  return value <= 0.04045
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4);
}

export function linearChannelToSrgb(value: number): number {
  const clamped = clamp(value, 0, 1);
  return clamped <= 0.0031308
    ? clamped * 12.92
    : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

export function srgbToLinearRgb(rgb: Rgb): Rgb {
  return {
    r: srgbChannelToLinear(rgb.r),
    g: srgbChannelToLinear(rgb.g),
    b: srgbChannelToLinear(rgb.b),
  };
}

export function linearToSrgbRgb(rgb: Rgb): Rgb {
  return {
    r: linearChannelToSrgb(rgb.r),
    g: linearChannelToSrgb(rgb.g),
    b: linearChannelToSrgb(rgb.b),
  };
}

function decodeSample(sample: SourceSample): Rgb {
  return srgbToLinearRgb(sourceDisplay(sample));
}

function sourceDisplay(sample: SourceSample): Rgb {
  return {
    r: sample.srgb8[0] / 255,
    g: sample.srgb8[1] / 255,
    b: sample.srgb8[2] / 255,
  };
}

function rgbToHsv(c: Rgb): Hsv {
  const max = Math.max(c.r, c.g, c.b);
  const min = Math.min(c.r, c.g, c.b);
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    if (max === c.r) h = ((c.g - c.b) / d + (c.g < c.b ? 6 : 0)) / 6;
    else if (max === c.g) h = ((c.b - c.r) / d + 2) / 6;
    else h = ((c.r - c.g) / d + 4) / 6;
  }
  return { h, s, v: max };
}

function timelineGreenWarp(hue: number, amount: number, band: GreenBand): number {
  const h = fract(hue);
  const greenStart = band.lo;
  const greenEnd = band.hi;
  const greenOut = greenEnd - greenStart;
  const loOut = greenStart;
  const hiOut = 1 - greenEnd;
  const nonGreenOut = loOut + hiOut;
  const greenIn = greenOut / (1 + 4 * amount);
  const freed = greenOut - greenIn;
  const loIn = loOut + freed * (loOut / nonGreenOut);
  const hiIn = hiOut + freed * (hiOut / nonGreenOut);
  const greenInEnd = loIn + greenIn;
  if (h < loIn) return h * loOut / Math.max(loIn, 1e-6);
  if (h < greenInEnd) return greenStart + (h - loIn) * greenOut / Math.max(greenIn, 1e-6);
  return greenEnd + (h - greenInEnd) * hiOut / Math.max(hiIn, 1e-6);
}

function squeezeOutputGreenArc(hue: number, amount: number, band: GreenBand): number {
  const greenStart = band.lo;
  const greenEnd = band.hi;
  const greenOut = greenEnd - greenStart;
  const targetGreen = greenOut * Math.max(0.0001, 1 - 0.85 * amount);
  const originalCenter = (greenStart + greenEnd) * 0.5;
  const tealCenter = greenEnd - targetGreen * 0.5;
  const targetCenter = mix(originalCenter, tealCenter, smoothstep(0, 1, amount));
  const targetStart = clamp(targetCenter - targetGreen * 0.5, 0, 1 - targetGreen);
  const targetEnd = targetStart + targetGreen;
  if (hue < greenStart) return hue * targetStart / Math.max(greenStart, 1e-6);
  if (hue < greenEnd) return targetStart + (hue - greenStart) * targetGreen / Math.max(greenOut, 1e-6);
  return targetEnd + (hue - greenEnd) * (1 - targetEnd) / Math.max(1 - greenEnd, 1e-6);
}

export function greenCompressedHueFor(
  hue: number,
  amount = BASE_GREEN_COMPRESS,
  band: GreenBand = OKLCH_GREEN_BAND,
): number {
  const compressedAmount = clamp(amount, 0, 1);
  return squeezeOutputGreenArc(
    timelineGreenWarp(hue, compressedAmount, band),
    compressedAmount,
    band,
  );
}

export function linearSrgbToOklab(c: Rgb): Oklab {
  const l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  const m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  const s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  const lRoot = Math.pow(Math.max(l, 0), 1 / 3);
  const mRoot = Math.pow(Math.max(m, 0), 1 / 3);
  const sRoot = Math.pow(Math.max(s, 0), 1 / 3);
  return {
    l: 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot,
    a: 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot,
    b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot,
  };
}

export function oklabToLinearSrgb(c: Oklab): Rgb {
  const lRoot = c.l + 0.3963377774 * c.a + 0.2158037573 * c.b;
  const mRoot = c.l - 0.1055613458 * c.a - 0.0638541728 * c.b;
  const sRoot = c.l - 0.0894841775 * c.a - 1.291485548 * c.b;
  const l = lRoot * lRoot * lRoot;
  const m = mRoot * mRoot * mRoot;
  const s = sRoot * sRoot * sRoot;
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

function inLinearSrgbGamut(rgb: Rgb): boolean {
  return rgb.r >= -1e-5 && rgb.g >= -1e-5 && rgb.b >= -1e-5
    && rgb.r <= 1.00001 && rgb.g <= 1.00001 && rgb.b <= 1.00001;
}

function oklchToLinearSrgb(lightness: number, hue: number, chroma: number): Rgb {
  return oklabToLinearSrgb({
    l: lightness,
    a: Math.cos(hue * TAU) * chroma,
    b: Math.sin(hue * TAU) * chroma,
  });
}

function oklchToLinearSrgbGamutMapped(lightness: number, hue: number, chroma: number): GamutResult {
  const initial = oklchToLinearSrgb(lightness, hue, chroma);
  if (inLinearSrgbGamut(initial)) return { rgb: initial, chromaScale: 1 };
  let lo = 0;
  let hi = Math.max(0, chroma);
  for (let i = 0; i < 6; i += 1) {
    const mid = (lo + hi) * 0.5;
    if (inLinearSrgbGamut(oklchToLinearSrgb(lightness, hue, mid))) lo = mid;
    else hi = mid;
  }
  return {
    rgb: oklchToLinearSrgb(lightness, hue, lo),
    chromaScale: chroma === 0 ? 1 : lo / chroma,
  };
}

export function maxRgbDelta(a: Rgb, b: Rgb): number {
  return Math.max(
    Math.abs(a.r - b.r),
    Math.abs(a.g - b.g),
    Math.abs(a.b - b.b),
  );
}

export function oklabHueFromLinearSrgb(rgb: Rgb): number {
  const lab = linearSrgbToOklab(rgb);
  return fract(Math.atan2(lab.b, lab.a) / TAU);
}

export function rotateDisplayRgbInOklch(rgb: Rgb, hueShift: number): Rgb {
  const lab = linearSrgbToOklab(srgbToLinearRgb(rgb));
  const hue = fract(Math.atan2(lab.b, lab.a) / TAU + hueShift);
  const chroma = Math.hypot(lab.a, lab.b);
  const mapped = oklchToLinearSrgbGamutMapped(lab.l, hue, chroma);
  return linearToSrgbRgb(mapped.rgb);
}

export function runDisplayReferredNeutralChain(rgb: Rgb): Rgb {
  const sourceSample = rgb;
  const layerOutput = sourceSample;
  const composerFinalTexture = layerOutput;
  return composerFinalTexture;
}

function runBaseOklchWithShift(
  sample: SourceSample,
  timeSeconds: number,
  hueShift: number,
): LuminanceRow {
  const sourceRgb = sourceDisplay(sample);
  const texColor = srgbToLinearRgb(sourceRgb);
  const lab = linearSrgbToOklab(texColor);
  const okHue = greenCompressedHueFor(Math.atan2(lab.b, lab.a) / TAU + hueShift);
  const chroma = Math.hypot(lab.a, lab.b) * Math.max(0, BASE_SATURATION_BOOST);
  const mapped = oklchToLinearSrgbGamutMapped(lab.l, okHue, chroma);
  const displayRgb = linearToSrgbRgb(mapped.rgb);
  const outLab = linearSrgbToOklab(srgbToLinearRgb(displayRgb));
  return {
    sample: sample.name,
    timeSeconds,
    sourceDisplayY: displayLuminance(sourceRgb),
    localLinearY: displayLuminance(texColor),
    shaderDisplayY: displayLuminance(displayRgb),
    outputDisplayY: displayLuminance(displayRgb),
    oklabLIn: lab.l,
    oklabLOut: outLab.l,
    hueShift,
    chromaScale: mapped.chromaScale,
  };
}

export function runBaseOklch(sample: SourceSample, timeSeconds: number): LuminanceRow {
  const texColor = decodeSample(sample);
  const hsv = rgbToHsv(texColor);
  const lum = displayLuminance(texColor);
  const lumPhase = Math.pow(1 - lum, BASE_LUM_EXPONENT + BASE_LUMINANCE_KEY);
  const huePhase = hsv.h * BASE_HUE_KEY * BASE_HUE_SPEED;
  const hueShift = fract(timeSeconds / BASE_PERIOD_SECONDS * BASE_SPEED + lumPhase + huePhase);
  return runBaseOklchWithShift(sample, timeSeconds, hueShift);
}

export function runBaseOklchAtHueShift(sample: SourceSample, hueShift: number): LuminanceRow {
  return runBaseOklchWithShift(sample, 3, hueShift);
}

export function buildR10BaseTable(timeSeconds: number): readonly LuminanceRow[] {
  return R10_BASE_SAMPLES.map((sample) => runBaseOklch(sample, timeSeconds));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const row of buildR10BaseTable(Number(process.argv[2] ?? "3"))) {
    console.log(JSON.stringify(row));
  }
}
