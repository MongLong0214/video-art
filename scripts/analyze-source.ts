import fs from "node:fs";
import path from "node:path";
import {
  blurField,
  clamp01,
  loadImageData,
  makeLuminance,
  percentile,
  rgbToHsv,
  sobelVectors,
} from "./lib/image-stats.js";

type HueBin = { readonly hueDeg: number; readonly weightPct: number };

type Analysis = {
  readonly M1: { readonly p5: number; readonly p50: number; readonly p95: number; readonly darkAnchorPct: number; readonly brightAreaPct: number };
  readonly M2: { readonly satMean: number; readonly vividAreaPct: number };
  readonly M3: { readonly dominantHues: readonly HueBin[]; readonly concentration: number; readonly greenRisk: boolean };
  readonly M4: { readonly edgeDensity: number; readonly busyness: number };
  readonly M5: { readonly structType: "line" | "texture" | "smooth"; readonly orientationCoherence: number };
  readonly M6: { readonly focal: readonly [number, number]; readonly radialSym: number; readonly verticalFlow: number };
  readonly M7: { readonly figureAreaPct: number; readonly figureContrast: number; readonly figureCentroid: readonly [number, number] };
  readonly M8: { readonly finishedVivid: number };
};

type Fields = { readonly width: number; readonly height: number; readonly lum: Float32Array; readonly sat: Float32Array; readonly localContrast: Float32Array };

const round4 = (value: number): number => Math.round(value * 10_000) / 10_000;

const mean = (values: Float32Array): number => {
  let sum = 0;
  for (const value of values) sum += value;
  return values.length === 0 ? 0 : sum / values.length;
};

function percentWhere(values: Float32Array, predicate: (value: number) => boolean): number {
  let count = 0;
  for (const value of values) if (predicate(value)) count++;
  return (count / Math.max(1, values.length)) * 100;
}

function buildColorFields(raw: Buffer, total: number): { readonly sat: Float32Array; readonly val: Float32Array; readonly hue: Float32Array } {
  const sat = new Float32Array(total);
  const val = new Float32Array(total);
  const hue = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const p = i * 4;
    const hsv = rgbToHsv([raw[p], raw[p + 1], raw[p + 2]]);
    hue[i] = hsv[0] * 360;
    sat[i] = hsv[1];
    val[i] = hsv[2];
  }
  return { sat, val, hue };
}

function dominantHues(hue: Float32Array, sat: Float32Array, val: Float32Array): { readonly bins: readonly HueBin[]; readonly concentration: number } {
  const bins = Array.from({ length: 36 }, () => 0);
  let sumW = 0;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < hue.length; i++) {
    const weight = sat[i] * val[i];
    if (weight <= 0.02) continue;
    const deg = hue[i];
    bins[Math.min(35, Math.floor(deg / 10))] += weight;
    const rad = (deg / 360) * Math.PI * 2;
    sumX += Math.cos(rad) * weight;
    sumY += Math.sin(rad) * weight;
    sumW += weight;
  }
  const top = bins
    .map((weight, idx) => ({ hueDeg: idx * 10 + 5, weightPct: sumW === 0 ? 0 : round4((weight / sumW) * 100) }))
    .sort((a, b) => b.weightPct - a.weightPct)
    .slice(0, 3);
  return { bins: top, concentration: sumW === 0 ? 0 : clamp01(Math.hypot(sumX, sumY) / sumW) };
}

function hueNear(hueDeg: number, center: number, radius: number): boolean {
  const delta = Math.abs(hueDeg - center);
  return Math.min(delta, 360 - delta) <= radius;
}

function orientationCoherence(edge: Float32Array, gx: Float32Array, gy: Float32Array): number {
  const threshold = percentile(edge, 0.8);
  let sumW = 0;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < edge.length; i++) {
    const weight = edge[i];
    if (weight < threshold || weight <= 1e-5) continue;
    const theta = Math.atan2(gy[i], gx[i]) * 2;
    sumX += Math.cos(theta) * weight;
    sumY += Math.sin(theta) * weight;
    sumW += weight;
  }
  return sumW === 0 ? 0 : clamp01(Math.hypot(sumX, sumY) / sumW);
}

function autoFocal(lumSmooth: Float32Array, width: number): readonly [number, number] {
  let best = -1;
  let bestIndex = 0;
  for (let i = 0; i < lumSmooth.length; i++) {
    if (lumSmooth[i] > best) {
      best = lumSmooth[i];
      bestIndex = i;
    }
  }
  return [bestIndex % width, Math.floor(bestIndex / width)];
}

function radialSymmetry(lum: Float32Array, width: number, height: number, focal: readonly [number, number]): number {
  const bins = 48;
  const sums = new Float64Array(bins);
  const counts = new Uint32Array(bins);
  const maxR = Math.hypot(Math.max(focal[0], width - focal[0]), Math.max(focal[1], height - focal[1]));
  let total = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const bin = Math.min(bins - 1, Math.floor((Math.hypot(x - focal[0], y - focal[1]) / Math.max(1, maxR)) * bins));
      sums[bin] += lum[i];
      counts[bin]++;
      total += lum[i];
    }
  }
  const globalMean = total / Math.max(1, lum.length);
  let totalVar = 0;
  let residualVar = 0;
  for (let i = 0; i < lum.length; i++) totalVar += (lum[i] - globalMean) ** 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const bin = Math.min(bins - 1, Math.floor((Math.hypot(x - focal[0], y - focal[1]) / Math.max(1, maxR)) * bins));
      const radialMean = counts[bin] === 0 ? globalMean : sums[bin] / counts[bin];
      residualVar += (lum[i] - radialMean) ** 2;
    }
  }
  return clamp01(1 - residualVar / Math.max(1e-6, totalVar));
}

function verticalFlow(lum: Float32Array, width: number, height: number): number {
  const rows = new Float64Array(height);
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = 0; x < width; x++) sum += lum[y * width + x];
    rows[y] = sum / width;
  }
  let signed = 0;
  let absolute = 0;
  for (let y = 1; y < height; y++) {
    const delta = rows[y] - rows[y - 1];
    signed += delta;
    absolute += Math.abs(delta);
  }
  return clamp01(Math.abs(signed) / Math.max(1e-6, absolute));
}

async function figureStats(fields: Fields): Promise<{ readonly areaPct: number; readonly contrast: number; readonly centroid: readonly [number, number] }> {
  const satBlur = await blurField(fields.sat, fields.width, fields.height, 8);
  const saliency = new Float32Array(fields.lum.length);
  const cx = (fields.width - 1) / 2;
  const cy = (fields.height - 1) / 2;
  const maxR = Math.hypot(cx, cy);
  for (let y = 0; y < fields.height; y++) {
    for (let x = 0; x < fields.width; x++) {
      const i = y * fields.width + x;
      const centerWeight = 1 - 0.55 * clamp01(Math.hypot(x - cx, y - cy) / Math.max(1, maxR));
      saliency[i] = satBlur[i] * fields.localContrast[i] * centerWeight;
    }
  }
  const threshold = percentile(saliency, 0.6);
  let figureCount = 0;
  let lumIn = 0;
  let lumOut = 0;
  let satIn = 0;
  let satOut = 0;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < saliency.length; i++) {
    if (saliency[i] >= threshold) {
      figureCount++;
      sumX += i % fields.width;
      sumY += Math.floor(i / fields.width);
      lumIn += fields.lum[i];
      satIn += fields.sat[i];
    } else {
      lumOut += fields.lum[i];
      satOut += fields.sat[i];
    }
  }
  const bgCount = Math.max(1, saliency.length - figureCount);
  const contrast = Math.abs(lumIn / Math.max(1, figureCount) - lumOut / bgCount) + 0.5 * Math.abs(satIn / Math.max(1, figureCount) - satOut / bgCount);
  const centroidX = figureCount === 0 ? (fields.width - 1) / 2 : sumX / figureCount;
  const centroidY = figureCount === 0 ? (fields.height - 1) / 2 : sumY / figureCount;
  return { areaPct: (figureCount / Math.max(1, saliency.length)) * 100, contrast: clamp01(contrast), centroid: [round4(centroidX), round4(centroidY)] };
}

function printSummary(analysis: Analysis): void {
  const rows = [
    ["M1", `lum p5/p50/p95 ${analysis.M1.p5}/${analysis.M1.p50}/${analysis.M1.p95}`, `dark ${analysis.M1.darkAnchorPct}% bright ${analysis.M1.brightAreaPct}%`],
    ["M2", `satMean ${analysis.M2.satMean}`, `vivid ${analysis.M2.vividAreaPct}%`],
    ["M3", `hues ${analysis.M3.dominantHues.map((h) => `${h.hueDeg}deg`).join(", ")}`, `conc ${analysis.M3.concentration} greenRisk ${analysis.M3.greenRisk}`],
    ["M4", `edge ${analysis.M4.edgeDensity}`, `busyness ${analysis.M4.busyness}`],
    ["M5", analysis.M5.structType, `coherence ${analysis.M5.orientationCoherence}`],
    ["M6", `focal [${analysis.M6.focal.join(", ")}]`, `radial ${analysis.M6.radialSym} vertical ${analysis.M6.verticalFlow}`],
    ["M7", `figure ${analysis.M7.figureAreaPct}%`, `contrast ${analysis.M7.figureContrast} centroid [${analysis.M7.figureCentroid.join(", ")}]`],
    ["M8", `finishedVivid ${analysis.M8.finishedVivid}`, ""],
  ];
  const widths = [4, 42, 36];
  for (const row of rows) console.log(row.map((cell, i) => cell.padEnd(widths[i])).join("  ").trimEnd());
}

export async function analyzeSource(sourcePath: string): Promise<Analysis> {
  const image = await loadImageData(sourcePath);
  const total = image.width * image.height;
  const lum = makeLuminance(image);
  const { sat, val, hue } = buildColorFields(image.raw, total);
  const lumSmooth = await blurField(lum, image.width, image.height, image.width * 0.02);
  const lumLocal = await blurField(lum, image.width, image.height, 8);
  const localContrast = new Float32Array(total);
  for (let i = 0; i < total; i++) localContrast[i] = Math.abs(lum[i] - lumLocal[i]);
  const sobel = sobelVectors(lum, image.width, image.height);
  const edgeDensity = mean(sobel.magnitude);
  const busyness = mean(localContrast);
  const hueStats = dominantHues(hue, sat, val);
  const topHue = hueStats.bins[0]?.hueDeg ?? 0;
  const greenRisk = hueStats.concentration > 0.22 && (hueNear(topHue, 220, 30) || hueNear(topHue, 45, 20));
  const coherence = orientationCoherence(sobel.magnitude, sobel.gx, sobel.gy);
  const structType = edgeDensity < 0.08 ? "smooth" : coherence >= 0.42 ? "line" : "texture";
  const figure = await figureStats({ width: image.width, height: image.height, lum, sat, localContrast });
  const focal = figure.areaPct >= 20 && figure.areaPct <= 60 ? figure.centroid : autoFocal(lumSmooth, image.width);
  const finishedVivid = clamp01(mean(sat) * 1.4) * clamp01(1 - hueStats.concentration);

  return {
    M1: {
      p5: round4(percentile(lum, 0.05)),
      p50: round4(percentile(lum, 0.5)),
      p95: round4(percentile(lum, 0.95)),
      darkAnchorPct: round4(percentWhere(lum, (value) => value < 0.12)),
      brightAreaPct: round4(percentWhere(lum, (value) => value > 0.75)),
    },
    M2: { satMean: round4(mean(sat)), vividAreaPct: round4(percentWhere(sat, (value) => value > 0.6)) },
    M3: { dominantHues: hueStats.bins, concentration: round4(hueStats.concentration), greenRisk },
    M4: { edgeDensity: round4(edgeDensity), busyness: round4(busyness) },
    M5: { structType, orientationCoherence: round4(coherence) },
    M6: { focal, radialSym: round4(radialSymmetry(lum, image.width, image.height, focal)), verticalFlow: round4(verticalFlow(lum, image.width, image.height)) },
    M7: { figureAreaPct: round4(figure.areaPct), figureContrast: round4(figure.contrast), figureCentroid: figure.centroid },
    M8: { finishedVivid: round4(finishedVivid) },
  };
}

function parseCli(argv: readonly string[]): { readonly sourcePath: string; readonly outPath: string } {
  const sourcePath = argv[0];
  if (!sourcePath) throw new Error("usage: npx tsx scripts/analyze-source.ts <source.png> [--out analysis.json]");
  const outIndex = argv.indexOf("--out");
  const outPath = outIndex === -1 ? "analysis.json" : argv[outIndex + 1];
  if (!outPath) throw new Error("expected path after --out");
  return { sourcePath, outPath };
}

async function main(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
  const args = parseCli(argv);
  const analysis = await analyzeSource(args.sourcePath);
  fs.mkdirSync(path.dirname(path.resolve(args.outPath)), { recursive: true });
  fs.writeFileSync(args.outPath, `${JSON.stringify(analysis, null, 2)}\n`);
  printSummary(analysis);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((code) => process.exit(code)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
