import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { hierarchyMetric, subjectHoldMetric } from "./qa-motion-masks.js";

const GRID_W = 32;
const GRID_H = 57;
const CELL_COUNT = GRID_W * GRID_H;
const FRAME_BYTES = CELL_COUNT * 3;
const MAX_BUFFER = 1 << 28;
const TAU = Math.PI * 2;

const THRESH = {
  lumFlicker: 0.015,
  oliveDwell: 0.05,
  oliveDwellSourceMultiplier: 1.5,
  oliveDwellCap: 0.2,
  bleachDwell: 0.05,
  bleachDwellSourceMultiplier: 2,
  darkDwell: 0.1,
  seamRatio: 1.5,
  staticZone: 0.15,
  hierarchy: 0.6,
  subjectHold: 0.25,
} as const;

export const QA_FRAME_BYTES = FRAME_BYTES;

type Hsv = readonly [number, number, number];

type CliArgs = {
  readonly videoPath: string;
  readonly masksDir?: string;
  readonly sourcePath?: string;
  readonly jsonPath?: string;
};

type Metrics = {
  readonly lumFlicker: number;
  readonly hueJump95: number;
  readonly hueJumpThreshold: number;
  readonly oliveDwell: number;
  readonly bleachDwell: number;
  readonly darkDwell: number;
  readonly seamRatio: number;
  readonly staticZone: number;
  readonly hierarchy?: number;
  readonly subjectHold?: number;
  readonly subjectHoldMask?: string;
};

type MetricRow = {
  readonly metric: string;
  readonly value: number | undefined;
  readonly threshold: string;
  readonly className: "FAIL" | "WARN";
  readonly status: "PASS" | "WARN" | "FAIL" | "SKIP";
  readonly note?: string;
};

type ColorDwellMetrics = {
  readonly oliveDwell: number;
  readonly bleachDwell: number;
};

type QaSourceBaseline = ColorDwellMetrics & {
  readonly path: string;
};

type RelativeThresholdInput = {
  readonly floor: number;
  readonly sourceValue?: number;
  readonly sourceMultiplier: number;
  readonly cap?: number;
};

const derivationReportSchema = z.object({
  source: z.string().min(1).optional(),
}).passthrough();

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function extractFrames(videoPath: string): Buffer {
  const cmd = `ffmpeg -v error -i ${shellQuote(videoPath)} -vf "scale=${GRID_W}:${GRID_H}" -f rawvideo -pix_fmt rgb24 -`;
  return execSync(cmd, { maxBuffer: MAX_BUFFER });
}

function rgbToHsv(r: number, g: number, b: number): Hsv {
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
  return [hue * 360, sat, max];
}

function circularDiff(a: number, b: number): number {
  const delta = Math.abs(a - b) % 360;
  return Math.min(delta, 360 - delta);
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}

function percentile(values: readonly number[], pct: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(1, Math.max(0, pct)) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] * (1 - (idx - lo)) + sorted[hi] * (idx - lo);
}

function frameDiff(buf: Buffer, a: number, b: number): number {
  const offA = a * FRAME_BYTES;
  const offB = b * FRAME_BYTES;
  let sum = 0;
  for (let i = 0; i < FRAME_BYTES; i += 3) {
    const dr = (buf[offA + i] - buf[offB + i]) / 255;
    const dg = (buf[offA + i + 1] - buf[offB + i + 1]) / 255;
    const db = (buf[offA + i + 2] - buf[offB + i + 2]) / 255;
    sum += Math.hypot(dr, dg, db) / Math.sqrt(3);
  }
  return sum / CELL_COUNT;
}

function circularStdDeg(hues: readonly number[]): number {
  if (hues.length === 0) return 0;
  let sumX = 0;
  let sumY = 0;
  for (const hue of hues) {
    const rad = (hue / 360) * TAU;
    sumX += Math.cos(rad);
    sumY += Math.sin(rad);
  }
  const r = Math.min(1, Math.hypot(sumX / hues.length, sumY / hues.length));
  return Math.sqrt(Math.max(0, -2 * Math.log(Math.max(1e-12, r)))) * (180 / Math.PI);
}

function frameLumAt(buf: Buffer, frame: number, cell: number): number {
  const p = frame * FRAME_BYTES + cell * 3;
  return (0.299 * buf[p] + 0.587 * buf[p + 1] + 0.114 * buf[p + 2]) / 255;
}

function isOliveHue(hue: number, sat: number, value: number): boolean {
  return hue >= 60 && hue <= 110 && (sat < 0.65 || value < 0.5);
}

function colorDwellMetrics(buf: Buffer, frameCount: number): ColorDwellMetrics {
  let oliveShareSum = 0;
  let bleachShareSum = 0;
  for (let frame = 0; frame < frameCount; frame++) {
    let olive = 0;
    let bleach = 0;
    for (let cell = 0; cell < CELL_COUNT; cell++) {
      const p = frame * FRAME_BYTES + cell * 3;
      const [h, s, v] = rgbToHsv(buf[p], buf[p + 1], buf[p + 2]);
      const lum = frameLumAt(buf, frame, cell);
      if (isOliveHue(h, s, v)) olive++;
      if (lum > 0.6 && s < 0.15) bleach++;
    }
    oliveShareSum += olive / CELL_COUNT;
    bleachShareSum += bleach / CELL_COUNT;
  }
  return {
    oliveDwell: oliveShareSum / frameCount,
    bleachDwell: bleachShareSum / frameCount,
  };
}

export function resolveQaSourcePath(args: CliArgs): string | undefined {
  if (args.sourcePath) {
    const explicit = path.resolve(args.sourcePath);
    return fs.existsSync(explicit) ? explicit : undefined;
  }
  if (!args.masksDir) return undefined;

  const layersDir = path.resolve(args.masksDir);
  if (path.basename(layersDir) !== "layers") return undefined;

  const workDir = path.dirname(layersDir);
  const reportPath = path.join(workDir, "derivation-report.json");
  if (!fs.existsSync(reportPath)) return undefined;

  const parsed = derivationReportSchema.safeParse(JSON.parse(fs.readFileSync(reportPath, "utf8")));
  if (!parsed.success || !parsed.data.source) return undefined;

  const candidate = path.isAbsolute(parsed.data.source)
    ? parsed.data.source
    : path.resolve(workDir, parsed.data.source);
  return fs.existsSync(candidate) ? candidate : undefined;
}

async function readSourceBaseline(sourcePath: string | undefined): Promise<QaSourceBaseline | undefined> {
  if (!sourcePath) return undefined;
  const { data } = await sharp(sourcePath)
    .resize(GRID_W, GRID_H, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    path: sourcePath,
    ...colorDwellMetrics(data, 1),
  };
}

export async function analyzeFrameBuffer(buf: Buffer, masksDir?: string): Promise<{ readonly frameCount: number; readonly metrics: Metrics }> {
  const frameCount = Math.floor(buf.length / FRAME_BYTES);
  if (frameCount < 1) throw new Error("ffmpeg produced no complete frames");
  const meanY: number[] = [];
  const hueFrames: Float32Array[] = [];
  const colorDwell = colorDwellMetrics(buf, frameCount);

  for (let frame = 0; frame < frameCount; frame++) {
    const hues = new Float32Array(CELL_COUNT);
    let lumSum = 0;
    for (let cell = 0; cell < CELL_COUNT; cell++) {
      const p = frame * FRAME_BYTES + cell * 3;
      const [h] = rgbToHsv(buf[p], buf[p + 1], buf[p + 2]);
      const lum = frameLumAt(buf, frame, cell);
      hues[cell] = h;
      lumSum += lum;
    }
    hueFrames.push(hues);
    meanY.push(lumSum / CELL_COUNT);
  }

  const lumDeltas: number[] = [];
  const hueDiffs: number[] = [];
  const frameHueRates: number[] = [];
  const adjacentFrameDiffs: number[] = [];
  for (let frame = 1; frame < frameCount; frame++) {
    lumDeltas.push(Math.abs(meanY[frame] - meanY[frame - 1]));
    let frameHueSum = 0;
    for (let cell = 0; cell < CELL_COUNT; cell++) {
      const diff = circularDiff(hueFrames[frame][cell], hueFrames[frame - 1][cell]);
      hueDiffs.push(diff);
      frameHueSum += diff;
    }
    frameHueRates.push(frameHueSum / CELL_COUNT);
    adjacentFrameDiffs.push(frameDiff(buf, frame - 1, frame));
  }

  let staticCells = 0;
  for (let cell = 0; cell < CELL_COUNT; cell++) {
    const hues = hueFrames.map((frame) => frame[cell]);
    if (circularStdDeg(hues) < 2) staticCells++;
  }

  const adjacentMedian = percentile(adjacentFrameDiffs, 0.5);
  const seamDiff = frameCount > 1 ? frameDiff(buf, frameCount - 1, 0) : 0;
  const subject = masksDir ? await subjectHoldMetric(buf, frameCount, masksDir) : {};
  return {
    frameCount,
    metrics: {
      lumFlicker: mean(lumDeltas),
      hueJump95: percentile(hueDiffs, 0.95),
      hueJumpThreshold: frameCount > 1 ? mean(frameHueRates) * 3 : Number.POSITIVE_INFINITY,
      oliveDwell: colorDwell.oliveDwell,
      bleachDwell: colorDwell.bleachDwell,
      darkDwell: meanY.filter((value) => value < 0.28).length / frameCount,
      seamRatio: adjacentMedian <= 1e-9 ? (seamDiff <= 1e-9 ? 0 : 9999) : seamDiff / adjacentMedian,
      staticZone: staticCells / CELL_COUNT,
      hierarchy: masksDir ? await hierarchyMetric(buf, frameCount, masksDir) : undefined,
      subjectHold: subject.value,
      subjectHoldMask: subject.mask,
    },
  };
}

function formatValue(value: number | undefined): string {
  if (value === undefined) return "-";
  if (!Number.isFinite(value)) return "inf";
  return value.toFixed(4);
}

function row(metric: string, value: number | undefined, thresholdValue: number, threshold: string, className: "FAIL" | "WARN", direction: "max" | "min" = "max", note?: string): MetricRow {
  if (value === undefined) return { metric, value, threshold, className, status: "SKIP", note };
  const exceeded = direction === "max" ? value > thresholdValue : value < thresholdValue;
  return { metric, value, threshold, className, status: exceeded ? className : "PASS", note };
}

function relativeThreshold(input: RelativeThresholdInput): number {
  const relative = input.sourceValue === undefined
    ? input.floor
    : Math.max(input.floor, input.sourceValue * input.sourceMultiplier);
  return input.cap === undefined ? relative : Math.min(input.cap, relative);
}

function sourceNote(value: number | undefined): string {
  return value === undefined ? "(abs)" : `source=${formatValue(value)}`;
}

export function buildMetricRows(metrics: Metrics, source?: QaSourceBaseline): readonly MetricRow[] {
  const oliveThreshold = relativeThreshold({
    floor: THRESH.oliveDwell,
    sourceValue: source?.oliveDwell,
    sourceMultiplier: THRESH.oliveDwellSourceMultiplier,
    cap: THRESH.oliveDwellCap,
  });
  const bleachThreshold = relativeThreshold({
    floor: THRESH.bleachDwell,
    sourceValue: source?.bleachDwell,
    sourceMultiplier: THRESH.bleachDwellSourceMultiplier,
  });
  return [
    row("lumFlicker", metrics.lumFlicker, THRESH.lumFlicker, "<= 0.015", "WARN"),
    row("hueJump95", metrics.hueJump95, metrics.hueJumpThreshold, `<= ${formatValue(metrics.hueJumpThreshold)} deg`, "WARN"),
    row("oliveDwell", metrics.oliveDwell, oliveThreshold, `<= ${formatValue(oliveThreshold)}`, "FAIL", "max", sourceNote(source?.oliveDwell)),
    row("bleachDwell", metrics.bleachDwell, bleachThreshold, `<= ${formatValue(bleachThreshold)}`, "FAIL", "max", sourceNote(source?.bleachDwell)),
    row("darkDwell", metrics.darkDwell, THRESH.darkDwell, "<= 0.10", "WARN"),
    row("seamRatio", metrics.seamRatio, THRESH.seamRatio, "<= 1.5", "FAIL"),
    row("staticZone", metrics.staticZone, THRESH.staticZone, "<= 0.15", "WARN"),
    row("hierarchy", metrics.hierarchy, THRESH.hierarchy, ">= 0.60", "WARN", "min"),
    row("subjectHold", metrics.subjectHold, THRESH.subjectHold, "<= 0.25", "WARN", "max", metrics.subjectHoldMask ? `mask=${metrics.subjectHoldMask}` : undefined),
  ];
}

function printTable(videoPath: string, frameCount: number, rows: readonly MetricRow[]): void {
  console.log(`qa-motion: ${videoPath}`);
  console.log(`frames: ${frameCount}  grid: ${GRID_W}x${GRID_H}`);
  console.log(["metric".padEnd(14), "value".padStart(10), "threshold".padStart(14), "class".padStart(7), "status".padStart(7), "note"].join("  "));
  for (const item of rows) {
    console.log([item.metric.padEnd(14), formatValue(item.value).padStart(10), item.threshold.padStart(14), item.className.padStart(7), item.status.padStart(7), item.note ?? ""].join(" ").trimEnd());
  }
  const failures = rows.filter((item) => item.status === "FAIL").map((item) => item.metric);
  const warnings = rows.filter((item) => item.status === "WARN").map((item) => item.metric);
  const verdict = failures.length > 0 ? `FAIL ${failures.join(", ")}` : warnings.length > 0 ? `PASS with warnings ${warnings.join(", ")}` : "PASS";
  console.log(`verdict: ${verdict}`);
}

export async function runQaMotion(args: CliArgs): Promise<number> {
  const source = await readSourceBaseline(resolveQaSourcePath(args));
  const result = await analyzeFrameBuffer(extractFrames(args.videoPath), args.masksDir);
  const rows = buildMetricRows(result.metrics, source);
  printTable(args.videoPath, result.frameCount, rows);
  if (args.jsonPath) {
    fs.mkdirSync(path.dirname(path.resolve(args.jsonPath)), { recursive: true });
    fs.writeFileSync(args.jsonPath, `${JSON.stringify({ video: args.videoPath, source: source ?? null, frameCount: result.frameCount, grid: [GRID_W, GRID_H], thresholds: THRESH, metrics: result.metrics, rows }, null, 2)}\n`);
  }
  return rows.some((item) => item.status === "FAIL") ? 1 : 0;
}
