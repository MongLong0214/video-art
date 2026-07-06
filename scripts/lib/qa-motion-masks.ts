import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const GRID_W = 32;
const GRID_H = 57;
const CELL_COUNT = GRID_W * GRID_H;
const FRAME_BYTES = CELL_COUNT * 3;

export type SubjectHoldResult = {
  readonly value?: number;
  readonly mask?: string;
};

async function readRgbaGrid(filePath: string): Promise<Buffer> {
  const { data } = await sharp(filePath).resize(GRID_W, GRID_H, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return data;
}

async function readAlphaGrid(filePath: string): Promise<Float32Array> {
  const rgba = await readRgbaGrid(filePath);
  const alpha = new Float32Array(CELL_COUNT);
  for (let i = 0; i < CELL_COUNT; i++) alpha[i] = rgba[i * 4 + 3] / 255;
  return alpha;
}

function frameLumAt(buf: Buffer, frame: number, cell: number): number {
  const p = frame * FRAME_BYTES + cell * 3;
  return (0.299 * buf[p] + 0.587 * buf[p + 1] + 0.114 * buf[p + 2]) / 255;
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}

function weightedMean(values: readonly number[], weights: Float32Array): number | undefined {
  let sum = 0;
  let weightSum = 0;
  for (let i = 0; i < values.length; i++) {
    const weight = weights[i];
    sum += values[i] * weight;
    weightSum += weight;
  }
  return weightSum <= 1e-6 ? undefined : sum / weightSum;
}

function sourceLumaFromBase(baseRgba: Buffer): readonly number[] {
  const out: number[] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    const p = i * 4;
    out.push((0.299 * baseRgba[p] + 0.587 * baseRgba[p + 1] + 0.114 * baseRgba[p + 2]) / 255);
  }
  return out;
}

export async function hierarchyMetric(buf: Buffer, frameCount: number, masksDir: string): Promise<number | undefined> {
  const maskFiles = ["ornament.png", "edge.png", "highlight.png"].map((name) => path.join(masksDir, name));
  if (!maskFiles.every((file) => fs.existsSync(file))) return undefined;
  const masks = await Promise.all(maskFiles.map(readAlphaGrid));
  const union = new Float32Array(CELL_COUNT);
  for (let i = 0; i < CELL_COUNT; i++) union[i] = Math.max(masks[0][i], masks[1][i], masks[2][i]);
  const topCount = Math.max(1, Math.ceil(CELL_COUNT * 0.05));
  const ratios: number[] = [];
  for (let frame = 0; frame < frameCount; frame++) {
    const cells = Array.from({ length: CELL_COUNT }, (_, cell) => ({ cell, lum: frameLumAt(buf, frame, cell) }));
    cells.sort((a, b) => b.lum - a.lum);
    let covered = 0;
    for (let i = 0; i < topCount; i++) covered += union[cells[i].cell];
    ratios.push(covered / topCount);
  }
  return mean(ratios);
}

export async function subjectHoldMetric(buf: Buffer, frameCount: number, masksDir: string): Promise<SubjectHoldResult> {
  const figurePath = path.join(masksDir, "figure.png");
  const bodyPath = path.join(masksDir, "body.png");
  const maskPath = fs.existsSync(figurePath) ? figurePath : fs.existsSync(bodyPath) ? bodyPath : undefined;
  if (!maskPath) return {};
  const mask = await readAlphaGrid(maskPath);
  const basePath = path.join(masksDir, "base.png");
  const sourceLum = fs.existsSync(basePath)
    ? sourceLumaFromBase(await readRgbaGrid(basePath))
    : Array.from({ length: CELL_COUNT }, (_, cell) => frameLumAt(buf, 0, cell));
  const sourceMean = weightedMean(sourceLum, mask);
  if (sourceMean === undefined || sourceMean <= 1e-6) return { mask: path.basename(maskPath) };
  const frameMeans: number[] = [];
  for (let frame = 0; frame < frameCount; frame++) {
    const luma = Array.from({ length: CELL_COUNT }, (_, cell) => frameLumAt(buf, frame, cell));
    const value = weightedMean(luma, mask);
    if (value !== undefined) frameMeans.push(value);
  }
  const minValue = Math.min(...frameMeans);
  const maxValue = Math.max(...frameMeans);
  return {
    value: Math.max(Math.abs(minValue / sourceMean - 1), Math.abs(maxValue / sourceMean - 1)),
    mask: path.basename(maskPath),
  };
}
