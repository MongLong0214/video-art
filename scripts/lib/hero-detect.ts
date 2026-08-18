/**
 * Measure the one hero that must travel (04-QUALITY-CONTRACT §2).
 * Scaffold-only r221 on halo/pour/beam is a known miss — this file names the kind
 * so plates + session-grade can refuse a frozen-hero preview.
 */
import path from "node:path";
import sharp from "sharp";
import { clamp01, rgbToHsv } from "./image-stats.js";

export type HeroKind = "halo" | "pour" | "beam" | "sheet" | "form";

export type HeroDetect = {
  readonly kind: HeroKind;
  readonly cx: number;
  readonly cy: number;
  readonly cxN: number;
  readonly cyN: number;
  readonly width: number;
  readonly height: number;
  readonly rInner: number;
  readonly rOuter: number;
  readonly waterNy: number;
  readonly angularCoverage: number;
  readonly haloScore: number;
  readonly pourScore: number;
  readonly beamScore: number;
  readonly highSatPct: number;
  readonly peakCount: number;
  readonly streamWidthFrac: number;
  readonly flankContrast: number;
  readonly hueBins: number;
  readonly irisScore: number;
  readonly confidence: number;
  readonly reasons: readonly string[];
};

const DETECT_WIDTH = 400;
const ANGLE_BINS = 36;
const RADIAL_BINS = 40;

const round4 = (value: number): number => Math.round(value * 10_000) / 10_000;

type Packed = {
  readonly width: number;
  readonly height: number;
  readonly sat: Float32Array;
  readonly val: Float32Array;
  readonly hue: Float32Array;
};

function pack(raw: Buffer, width: number, height: number): Packed {
  const n = width * height;
  const sat = new Float32Array(n);
  const val = new Float32Array(n);
  const hue = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    const hsv = rgbToHsv([raw[p], raw[p + 1], raw[p + 2]]);
    hue[i] = hsv[0] * 360;
    sat[i] = hsv[1];
    val[i] = hsv[2];
  }
  return { width, height, sat, val, hue };
}

async function loadDetectImage(sourcePath: string): Promise<{
  readonly packed: Packed;
  readonly fullWidth: number;
  readonly fullHeight: number;
  readonly scaleX: number;
  readonly scaleY: number;
}> {
  const meta = await sharp(sourcePath).metadata();
  if (!meta.width || !meta.height) throw new Error(`source has no dimensions: ${sourcePath}`);
  const width = Math.min(DETECT_WIDTH, meta.width);
  const height = Math.max(1, Math.round(meta.height * (width / meta.width)));
  const { data } = await sharp(sourcePath)
    .resize(width, height, { kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    packed: pack(data, width, height),
    fullWidth: meta.width,
    fullHeight: meta.height,
    scaleX: meta.width / width,
    scaleY: meta.height / height,
  };
}

function at(field: Float32Array, width: number, height: number, x: number, y: number): number {
  return field[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))];
}

type HaloFit = {
  readonly cx: number;
  readonly cy: number;
  readonly inner: number;
  readonly outer: number;
  readonly peaks: number;
  readonly coverage: number;
  readonly score: number;
};

function measureHalo(packed: Packed, cx: number, cy: number): HaloFit {
  const { width, height, sat, val } = packed;
  const maxR = Math.min(width, height) * 0.48;
  const satSum = new Float64Array(RADIAL_BINS);
  const cnt = new Uint32Array(RADIAL_BINS);
  const angles = new Uint8Array(ANGLE_BINS);
  let angleHits = 0;
  const y1 = Math.floor(height * 0.56);
  for (let y = Math.floor(height * 0.04); y < y1; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy);
      if (r <= 1 || r >= maxR) continue;
      const bin = Math.min(RADIAL_BINS - 1, Math.floor((r / maxR) * RADIAL_BINS));
      satSum[bin] += sat[i] * val[i];
      cnt[bin] += 1;
      if (sat[i] > 0.8 && val[i] > 0.35) {
        const abin = Math.min(ANGLE_BINS - 1, Math.floor(((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)) * ANGLE_BINS));
        if (angles[abin] === 0) {
          angles[abin] = 1;
          angleHits += 1;
        }
      }
    }
  }
  const profile = new Float64Array(RADIAL_BINS);
  for (let i = 0; i < RADIAL_BINS; i++) profile[i] = cnt[i] === 0 ? 0 : satSum[i] / cnt[i];
  // 3-tap smooth
  const smooth = new Float64Array(RADIAL_BINS);
  for (let i = 0; i < RADIAL_BINS; i++) {
    const a = profile[Math.max(0, i - 1)];
    const b = profile[i];
    const c = profile[Math.min(RADIAL_BINS - 1, i + 1)];
    smooth[i] = (a + b + c) / 3;
  }
  const peakBins: number[] = [];
  for (let i = 2; i < RADIAL_BINS - 2; i++) {
    if (smooth[i] >= 0.58 && smooth[i] >= smooth[i - 1] && smooth[i] >= smooth[i + 1] && smooth[i] > smooth[i - 2] && smooth[i] > smooth[i + 2]) {
      if (peakBins.length === 0 || i - peakBins[peakBins.length - 1] >= 2) peakBins.push(i);
    }
  }
  const first = peakBins[0] ?? 0;
  const last = peakBins[peakBins.length - 1] ?? 0;
  const inner = (first / RADIAL_BINS) * maxR;
  const outer = (last / RADIAL_BINS) * maxR;
  const coverage = angleHits / ANGLE_BINS;
  const size = clamp01((outer / width - 0.15) / 0.2);
  const peakScore = clamp01((peakBins.length - 2) / 5);
  const centerBias = 1 - Math.min(1, Math.abs(cx / width - 0.5) / 0.16);
  const score = peakScore * 0.42 + coverage * 0.26 + size * 0.22 + centerBias * 0.1;
  return { cx, cy, inner, outer, peaks: peakBins.length, coverage, score };
}

function fitHalo(packed: Packed): HaloFit {
  let best = measureHalo(packed, packed.width * 0.5, packed.height * 0.32);
  for (let cy = Math.floor(packed.height * 0.22); cy <= Math.floor(packed.height * 0.4); cy += 4) {
    for (let cx = Math.floor(packed.width * 0.4); cx <= Math.floor(packed.width * 0.6); cx += 3) {
      const fit = measureHalo(packed, cx, cy);
      if (fit.score > best.score || (fit.score === best.score && fit.peaks > best.peaks)) best = fit;
    }
  }
  for (let dy = -3; dy <= 3; dy += 1) {
    for (let dx = -3; dx <= 3; dx += 1) {
      const fit = measureHalo(packed, best.cx + dx, best.cy + dy);
      if (fit.score > best.score || (fit.score === best.score && fit.peaks > best.peaks)) best = fit;
    }
  }
  return best;
}

type StreamFit = {
  readonly cx: number;
  readonly cy: number;
  readonly score: number;
  readonly waterNy: number;
  readonly spanNy: number;
  readonly widthFrac: number;
  readonly darkHole: number;
  readonly occupancy: number;
  readonly flankContrast: number;
  readonly flankVal: number;
  readonly irisScore: number;
  readonly hueBins: number;
  readonly vividSpan: number;
  readonly vividHues: number;
};

function findWaterNy(packed: Packed, originY: number): number {
  const { width, height, sat, val } = packed;
  let bestNy = 0.7;
  let best = -1;
  const y0 = Math.max(Math.floor(originY + height * 0.14), Math.floor(height * 0.5));
  const y1 = Math.floor(height * 0.84);
  for (let y = y0; y < y1; y += 2) {
    let hits = 0;
    let total = 0;
    for (let x = Math.floor(width * 0.1); x < Math.floor(width * 0.9); x += 2) {
      total += 1;
      const i = y * width + x;
      if (sat[i] > 0.5 && val[i] > 0.3) hits += 1;
    }
    const spread = hits / Math.max(1, total);
    if (spread > best) {
      best = spread;
      bestNy = y / height;
    }
  }
  return best > 0.22 ? bestNy : 0.72;
}

function streamFrom(packed: Packed, cx: number, cy: number, waterY: number): {
  readonly mass: number;
  readonly span: number;
  readonly widthFrac: number;
  readonly occupancy: number;
  readonly flankContrast: number;
  readonly flankVal: number;
  readonly hueBins: number;
  readonly vividSpan: number;
  readonly vividHues: number;
} {
  const { width, height, sat, val } = packed;
  let mass = 0;
  let widthSum = 0;
  let occSum = 0;
  let contrastSum = 0;
  let flankValSum = 0;
  let rows = 0;
  const hues = new Uint8Array(12);
  let hueHits = 0;
  const vividHues = new Uint8Array(12);
  let vividHueHits = 0;
  let vividFirst = -1;
  let vividLast = -1;
  let first = -1;
  let last = -1;
  const yEnd = Math.min(height - 1, Math.floor(waterY));
  for (let y = Math.floor(cy); y <= yEnd; y += 1) {
    const t = (y - cy) / Math.max(8, waterY - cy);
    const half = 7 + t * width * 0.18;
    let xMin = width;
    let xMax = 0;
    let rowHits = 0;
    let inSat = 0;
    let inN = 0;
    const x0 = Math.max(0, Math.floor(cx - half));
    const x1 = Math.min(width - 1, Math.ceil(cx + half));
    for (let x = x0; x <= x1; x++) {
      const i = y * width + x;
      inSat += sat[i];
      inN += 1;
      if (sat[i] > 0.55 && val[i] > 0.32) {
        mass += 1;
        rowHits += 1;
        if (x < xMin) xMin = x;
        if (x > xMax) xMax = x;
        const hbin = Math.min(11, Math.floor((packed.hue[i] / 360) * 12));
        if (hues[hbin] === 0) {
          hues[hbin] = 1;
          hueHits += 1;
        }
      }
    }
    let outSat = 0;
    let outVal = 0;
    let outN = 0;
    const left0 = Math.max(0, Math.floor(cx - half * 1.55));
    const right1 = Math.min(width - 1, Math.ceil(cx + half * 1.55));
    for (let x = left0; x < x0; x++) {
      outSat += sat[y * width + x];
      outVal += val[y * width + x];
      outN += 1;
    }
    for (let x = x1 + 1; x <= right1; x++) {
      outSat += sat[y * width + x];
      outVal += val[y * width + x];
      outN += 1;
    }
    let vividHits = 0;
    const tight = Math.max(6, width * 0.09);
    for (let x = Math.max(0, Math.floor(cx - tight)); x <= Math.min(width - 1, Math.ceil(cx + tight)); x++) {
      const i = y * width + x;
      if (sat[i] > 0.72 && val[i] > 0.35) {
        vividHits += 1;
        const hbin = Math.min(11, Math.floor((packed.hue[i] / 360) * 12));
        if (vividHues[hbin] === 0) {
          vividHues[hbin] = 1;
          vividHueHits += 1;
        }
      }
    }
    if (vividHits >= 4) {
      if (vividFirst < 0) vividFirst = y;
      vividLast = y;
    }
    if (rowHits >= 4) {
      rows += 1;
      widthSum += (xMax - xMin) / width;
      occSum += rowHits / Math.max(1, x1 - x0 + 1);
      const flank = outN === 0 ? 0 : inSat / Math.max(1, inN) - outSat / outN;
      contrastSum += flank;
      flankValSum += outN === 0 ? 0 : outVal / outN;
      if (first < 0) first = y;
      last = y;
    }
  }
  return {
    mass,
    span: first < 0 ? 0 : (last - first) / height,
    widthFrac: rows === 0 ? 1 : widthSum / rows,
    occupancy: rows === 0 ? 0 : occSum / rows,
    flankContrast: rows === 0 ? 0 : contrastSum / rows,
    flankVal: rows === 0 ? 1 : flankValSum / rows,
    hueBins: hueHits,
    vividSpan: vividFirst < 0 ? 0 : (vividLast - vividFirst) / height,
    vividHues: vividHueHits,
  };
}

function diskMean(field: Float32Array, width: number, height: number, cx: number, cy: number, radius: number): number {
  let sum = 0;
  let n = 0;
  const r2 = radius * radius;
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > r2) continue;
      sum += field[y * width + x];
      n += 1;
    }
  }
  return n === 0 ? 0 : sum / n;
}

function insideBigSilhouette(packed: Packed, x: number, y: number): boolean {
  return diskMean(packed.val, packed.width, packed.height, x, y, 22) < 0.18;
}

function satBelow(packed: Packed, x: number, y: number): number {
  let sum = 0;
  let n = 0;
  for (let yy = y + 3; yy <= y + 18; yy++) {
    for (let xx = x - 8; xx <= x + 8; xx++) {
      if (xx < 0 || yy < 0 || xx >= packed.width || yy >= packed.height) continue;
      sum += packed.sat[yy * packed.width + xx];
      n += 1;
    }
  }
  return n === 0 ? 0 : sum / n;
}

function scoreNexus(packed: Packed, x: number, y: number): { readonly iris: number; readonly bright: number; readonly darkHole: number } {
  const { width, height, sat, val } = packed;
  const v = at(val, width, height, x, y);
  const satHere = at(sat, width, height, x, y);
  const satL = at(sat, width, height, x - 6, y);
  const satR = at(sat, width, height, x + 6, y);
  const satU = at(sat, width, height, x, y - 5);
  const satD = at(sat, width, height, x, y + 5);
  const ringSat = (satL + satR + satU + satD) / 4;
  const ringBal = Math.min(satL, satR, satU, satD);
  const surroundVal =
    (at(val, width, height, x - 5, y) + at(val, width, height, x + 5, y) + at(val, width, height, x, y - 4) + at(val, width, height, x, y + 4)) / 4;
  const darkHole = clamp01((surroundVal - v) * 2.8);
  const horiz = Math.min(satL, satR);
  const iris = horiz >= 0.42 ? (1 - v) * horiz : 0;
  const bright = satHere > 0.45 && v > 0.42 ? clamp01(satHere * v) * clamp01(1 - surroundVal) : 0;
  return { iris, bright, darkHole };
}

function evaluateStream(packed: Packed, x: number, y: number, origin: number, darkHole: number): StreamFit {
  const waterNy = findWaterNy(packed, y);
  const stream = streamFrom(packed, x, y, waterNy * packed.height);
  const narrow = clamp01((0.32 - stream.widthFrac) / 0.32);
  const contrast = clamp01(stream.flankContrast / 0.22);
  const score = origin * 0.4 + clamp01(stream.span / 0.28) * 0.24 + narrow * 0.14 + contrast * 0.22;
  return {
    cx: x,
    cy: y,
    score,
    waterNy,
    spanNy: stream.span,
    widthFrac: stream.widthFrac,
    darkHole,
    occupancy: stream.occupancy,
    flankContrast: stream.flankContrast,
    flankVal: stream.flankVal,
    irisScore: origin,
    hueBins: stream.hueBins,
    vividSpan: stream.vividSpan,
    vividHues: stream.vividHues,
  };
}

function fitStream(packed: Packed): StreamFit {
  const { width, height } = packed;
  const empty: StreamFit = {
    cx: width * 0.5,
    cy: height * 0.28,
    score: 0,
    waterNy: 0.72,
    spanNy: 0,
    widthFrac: 1,
    darkHole: 0,
    occupancy: 0,
    flankContrast: 0,
    flankVal: 1,
    irisScore: 0,
    hueBins: 0,
    vividSpan: 0,
    vividHues: 0,
  };
  const y0 = Math.floor(height * 0.12);
  const y1 = Math.floor(height * 0.4);
  const x0 = Math.floor(width * 0.22);
  const x1 = Math.floor(width * 0.78);

  let iris = { x: width * 0.5, y: height * 0.28, score: 0, darkHole: 0 };
  let bright = { x: width * 0.5, y: height * 0.28, score: 0, darkHole: 0 };
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const nexus = scoreNexus(packed, x, y);
      if (nexus.iris > iris.score && !insideBigSilhouette(packed, x, y) && satBelow(packed, x, y) >= 0.5) {
        iris = { x, y, score: nexus.iris, darkHole: nexus.darkHole };
      }
      if (nexus.bright > bright.score) bright = { x, y, score: nexus.bright, darkHole: nexus.darkHole };
    }
  }

  if (iris.score >= 0.35) return evaluateStream(packed, iris.x, iris.y, iris.score, iris.darkHole);
  if (bright.score >= 0.28) {
    const cand = evaluateStream(packed, bright.x, bright.y, bright.score * 0.8, bright.darkHole);
    if (cand.flankVal <= 0.32) return cand;
  }
  return empty;
}

function classify(
  halo: HaloFit,
  stream: StreamFit,
  width: number,
  height: number,
  highPct: number,
  darkPct: number,
): {
  readonly kind: HeroKind;
  readonly confidence: number;
  readonly reasons: string[];
} {
  const reasons: string[] = [];
  const haloOk = halo.peaks >= 3 && halo.outer / width >= 0.18 && halo.coverage >= 0.48 && halo.score >= 0.42;
  const pourOk =
    stream.irisScore >= 0.35 &&
    stream.vividSpan >= 0.16 &&
    stream.vividHues >= 5 &&
    stream.widthFrac <= 0.32 &&
    stream.waterNy <= 0.76 &&
    highPct >= 0.18 &&
    stream.cy / height >= 0.18 &&
    stream.cy / height <= 0.36;
  const beamOk =
    stream.score >= 0.5 &&
    stream.spanNy >= 0.16 &&
    stream.widthFrac <= 0.32 &&
    stream.flankContrast >= 0.13 &&
    stream.flankVal <= 0.3 &&
    stream.darkHole < 0.22;

  if (haloOk) {
    reasons.push(`halo peaks=${halo.peaks} rOuter/w=${(halo.outer / width).toFixed(2)} cov=${halo.coverage.toFixed(2)}`);
    return { kind: "halo", confidence: clamp01(halo.score), reasons };
  }
  if (pourOk) {
      reasons.push(
      `pour iris=${stream.irisScore.toFixed(2)} vivid=${stream.vividSpan.toFixed(2)} hues=${stream.vividHues} waterNy=${stream.waterNy.toFixed(2)}`,
    );
    return { kind: "pour", confidence: clamp01(stream.score), reasons };
  }
  if (beamOk || (darkPct >= 0.22 && stream.spanNy >= 0.16 && stream.score >= 0.4 && !haloOk && !pourOk)) {
    reasons.push(
      `beam span=${stream.spanNy.toFixed(2)} dark=${darkPct.toFixed(2)} score=${stream.score.toFixed(2)}`,
    );
    return { kind: "beam", confidence: clamp01(stream.score), reasons };
  }
  if (highPct >= 0.42 && halo.coverage < 0.5 && halo.peaks < 3) {
    reasons.push(`sheet highSat=${highPct.toFixed(2)} cov=${halo.coverage.toFixed(2)}`);
    return { kind: "sheet", confidence: clamp01(highPct), reasons };
  }
  reasons.push(
    `form (peaks=${halo.peaks} vivid=${stream.vividSpan.toFixed(2)} vh=${stream.vividHues} iris=${stream.irisScore.toFixed(2)})`,
  );
  return { kind: "form", confidence: 0.62, reasons };
}

export async function detectHero(sourcePath: string): Promise<HeroDetect> {
  const loaded = await loadDetectImage(sourcePath);
  const { packed, fullWidth, fullHeight, scaleX, scaleY } = loaded;
  let high = 0;
  for (let i = 0; i < packed.sat.length; i++) {
    if (packed.sat[i] > 0.78 && packed.val[i] > 0.34) high += 1;
  }
  const highPct = high / Math.max(1, packed.sat.length);
  let dark = 0;
  for (let i = 0; i < packed.val.length; i++) {
    if (packed.val[i] < 0.12) dark += 1;
  }
  const darkPct = dark / Math.max(1, packed.val.length);
  const halo = fitHalo(packed);
  const stream = fitStream(packed);
  const decided = classify(halo, stream, packed.width, packed.height, highPct, darkPct);
  const useStream = decided.kind === "pour" || decided.kind === "beam" || (decided.kind === "form" && stream.irisScore >= 0.35);
  const cx = Math.round((useStream ? stream.cx : halo.cx) * scaleX);
  const cy = Math.round((useStream ? stream.cy : halo.cy) * scaleY);
  return {
    kind: decided.kind,
    cx,
    cy,
    cxN: round4(cx / fullWidth),
    cyN: round4(cy / fullHeight),
    width: fullWidth,
    height: fullHeight,
    rInner: Math.round((useStream ? 10 : halo.inner) * scaleX),
    rOuter: Math.round((useStream ? 48 : halo.outer) * scaleX),
    waterNy: round4(useStream ? stream.waterNy : 0.72),
    angularCoverage: round4(halo.coverage),
    haloScore: round4(halo.score),
    pourScore: round4(stream.score),
    beamScore: round4(decided.kind === "beam" ? stream.score : 0),
    highSatPct: round4(high / Math.max(1, packed.sat.length)),
    peakCount: halo.peaks,
    streamWidthFrac: round4(stream.widthFrac),
    flankContrast: round4(stream.flankContrast),
    hueBins: stream.hueBins,
    irisScore: round4(stream.irisScore),
    confidence: round4(decided.confidence),
    reasons: decided.reasons,
  };
}

export function needsCustomTravel(kind: HeroKind): boolean {
  return kind === "halo" || kind === "pour" || kind === "beam";
}

async function main(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  const sourcePath = argv[0];
  if (!sourcePath) throw new Error("usage: npx tsx scripts/lib/hero-detect.ts <source.png>");
  const hero = await detectHero(path.resolve(sourcePath));
  process.stdout.write(`${JSON.stringify(hero, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
