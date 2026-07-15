import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { analyzeReferenceTexture, type ReferenceTextureMetrics } from "./lib/reference-texture.js";
import {
  evaluatePsychedelicCandidate,
  type CandidateGateHistoryEntry,
  type CandidateGateResult,
  type SourceFidelityMetrics,
} from "./lib/psychedelic-gate.js";
import type { PsychedelicLearningRecord } from "./lib/psychedelic-learning.js";

const GRID_WIDTH = 96;
const GRID_HEIGHT = 171;
const MAX_BUFFER = 1 << 30;
const pathSchema = z.string().trim().min(1);
const rateSchema = z.string().regex(/^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/);

export type PsychedelicGateCli = {
  readonly candidatePath: string;
  readonly sourcePath: string;
  readonly referencePaths: readonly string[];
  readonly workDir: string;
  readonly axis: string;
  readonly primitive: string;
  readonly reportPath?: string;
  readonly ledgerPath?: string;
};

type VideoAnalysis = {
  readonly fps: number;
  readonly data: Buffer;
  readonly metrics: ReferenceTextureMetrics;
};

type GateReport = {
  readonly version: 1;
  readonly createdAt: string;
  readonly status: CandidateGateResult["status"];
  readonly candidate: { readonly path: string; readonly sha256: string };
  readonly source: { readonly path: string; readonly sha256: string };
  readonly scene: { readonly path: string; readonly sha256: string };
  readonly axis: string;
  readonly primitive: string;
  readonly candidateMetrics: ReferenceTextureMetrics;
  readonly sourceFidelity: SourceFidelityMetrics;
  readonly references: readonly { readonly path: string; readonly metrics: ReferenceTextureMetrics }[];
  readonly gate: CandidateGateResult;
};

export class PsychedelicGateCliError extends Error {
  override readonly name = "PsychedelicGateCliError";
}

function requiredValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) throw new PsychedelicGateCliError(`expected value after ${flag}`);
  return pathSchema.parse(value);
}

export function parsePsychedelicGateCli(argv: readonly string[]): PsychedelicGateCli {
  let candidatePath: string | undefined;
  let sourcePath: string | undefined;
  const referencePaths: string[] = [];
  let workDir: string | undefined;
  let axis: string | undefined;
  let primitive: string | undefined;
  let reportPath: string | undefined;
  let ledgerPath: string | undefined;

  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === "--candidate") candidatePath = requiredValue(argv, index++, flag);
    else if (flag === "--source") sourcePath = requiredValue(argv, index++, flag);
    else if (flag === "--reference") referencePaths.push(requiredValue(argv, index++, flag));
    else if (flag === "--work-dir") workDir = requiredValue(argv, index++, flag);
    else if (flag === "--axis") axis = requiredValue(argv, index++, flag);
    else if (flag === "--primitive") primitive = requiredValue(argv, index++, flag);
    else if (flag === "--report") reportPath = requiredValue(argv, index++, flag);
    else if (flag === "--ledger") ledgerPath = requiredValue(argv, index++, flag);
    else throw new PsychedelicGateCliError(`unknown argument: ${flag}`);
  }

  if (candidatePath === undefined || sourcePath === undefined || workDir === undefined || axis === undefined || primitive === undefined) {
    throw new PsychedelicGateCliError("candidate, source, work-dir, axis, and primitive are required");
  }
  if (referencePaths.length < 2) throw new PsychedelicGateCliError("at least two reference videos are required");
  return { candidatePath, sourcePath, referencePaths, workDir, axis, primitive, reportPath, ledgerPath };
}

function readFps(videoPath: string): number {
  const rawRate = execFileSync("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=avg_frame_rate",
    "-of", "default=noprint_wrappers=1:nokey=1",
    videoPath,
  ], { encoding: "utf8" }).trim();
  const [numeratorText, denominatorText] = rateSchema.parse(rawRate).split("/");
  const denominator = Number(denominatorText);
  if (denominator === 0) throw new PsychedelicGateCliError(`invalid frame rate: ${rawRate}`);
  return Number(numeratorText) / denominator;
}

function decodeVideo(videoPath: string): Buffer {
  return execFileSync("ffmpeg", [
    "-v", "error",
    "-i", videoPath,
    "-an",
    "-vf", `scale=${GRID_WIDTH}:${GRID_HEIGHT}:flags=lanczos`,
    "-f", "rawvideo",
    "-pix_fmt", "rgb24",
    "-",
  ], { maxBuffer: MAX_BUFFER });
}

function analyzeVideo(videoPath: string): VideoAnalysis {
  const data = decodeVideo(videoPath);
  const fps = readFps(videoPath);
  return {
    data,
    fps,
    metrics: analyzeReferenceTexture({ data, width: GRID_WIDTH, height: GRID_HEIGHT, fps }),
  };
}

function percentile(values: readonly number[], ratio: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(1, Math.max(0, ratio)) * (sorted.length - 1);
  const low = Math.floor(index);
  const high = Math.ceil(index);
  return low === high ? sorted[low] : sorted[low] * (high - index) + sorted[high] * (index - low);
}

function luma(data: Buffer, offset: number): number {
  return (0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2]) / 255;
}

function edgeMap(data: Buffer, frameOffset: number): Float32Array {
  const result = new Float32Array(GRID_WIDTH * GRID_HEIGHT);
  for (let y = 1; y < GRID_HEIGHT - 1; y++) {
    for (let x = 1; x < GRID_WIDTH - 1; x++) {
      const cell = y * GRID_WIDTH + x;
      const left = frameOffset + (cell - 1) * 3;
      const right = frameOffset + (cell + 1) * 3;
      const up = frameOffset + (cell - GRID_WIDTH) * 3;
      const down = frameOffset + (cell + GRID_WIDTH) * 3;
      result[cell] = Math.hypot(luma(data, right) - luma(data, left), luma(data, down) - luma(data, up));
    }
  }
  return result;
}

function correlation(a: Float32Array, b: Float32Array): number {
  let count = 0;
  let sumA = 0;
  let sumB = 0;
  let sumAA = 0;
  let sumBB = 0;
  let sumAB = 0;
  for (let y = 1; y < GRID_HEIGHT - 1; y++) {
    for (let x = 1; x < GRID_WIDTH - 1; x++) {
      const valueA = a[y * GRID_WIDTH + x];
      const valueB = b[y * GRID_WIDTH + x];
      sumA += valueA;
      sumB += valueB;
      sumAA += valueA * valueA;
      sumBB += valueB * valueB;
      sumAB += valueA * valueB;
      count++;
    }
  }
  const covariance = sumAB - (sumA * sumB) / count;
  const varianceA = sumAA - (sumA * sumA) / count;
  const varianceB = sumBB - (sumB * sumB) / count;
  if (varianceA <= 1e-12 || varianceB <= 1e-12) return 0;
  return covariance / Math.sqrt(varianceA * varianceB);
}

async function readSourceGrid(sourcePath: string): Promise<Buffer> {
  return sharp(sourcePath)
    .resize(GRID_WIDTH, GRID_HEIGHT, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();
}

function sourceFidelity(video: Buffer, source: Buffer): SourceFidelityMetrics {
  const frameBytes = GRID_WIDTH * GRID_HEIGHT * 3;
  const frameCount = Math.floor(video.length / frameBytes);
  if (source.length !== frameBytes || frameCount === 0) throw new PsychedelicGateCliError("source/video grid is incomplete");
  const sourceEdges = edgeMap(source, 0);
  const edgeCorrelations: number[] = [];
  const frameDrifts: number[] = [];
  const localDrifts: number[] = [];
  for (let frame = 0; frame < frameCount; frame++) {
    const offset = frame * frameBytes;
    edgeCorrelations.push(correlation(sourceEdges, edgeMap(video, offset)));
    let frameDrift = 0;
    for (let pixel = 0; pixel < frameBytes; pixel += 3) {
      const drift = Math.hypot(
        (video[offset + pixel] - source[pixel]) / 255,
        (video[offset + pixel + 1] - source[pixel + 1]) / 255,
        (video[offset + pixel + 2] - source[pixel + 2]) / 255,
      ) / Math.sqrt(3);
      frameDrift += drift;
      localDrifts.push(drift);
    }
    frameDrifts.push(frameDrift / (frameBytes / 3));
  }
  return {
    edgeCorrelationP05: percentile(edgeCorrelations, 0.05),
    frameRgbDriftP95: percentile(frameDrifts, 0.95),
    localRgbDriftP95: percentile(localDrifts, 0.95),
  };
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function requireFile(filePath: string, label: string): string {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) throw new PsychedelicGateCliError(`${label} not found: ${resolved}`);
  return resolved;
}

function readHistory(ledgerPath: string): CandidateGateHistoryEntry[] {
  if (!fs.existsSync(ledgerPath)) return [];
  return fs.readFileSync(ledgerPath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const value: unknown = JSON.parse(line);
      const entry = z.object({
        status: z.union([z.literal("PASS"), z.literal("REJECT")]),
        axis: z.string().min(1),
        primitive: z.string().min(1),
      }).parse(value);
      return entry;
    });
}

function learningRecord(report: GateReport): PsychedelicLearningRecord {
  return {
    version: 2,
    createdAt: report.createdAt,
    status: report.status,
    candidate: report.candidate,
    source: report.source,
    scene: report.scene,
    axis: report.axis,
    primitive: report.primitive,
    failures: report.gate.failures.map((failure) => failure.code),
    envelope: report.gate.envelope,
  };
}

function appendLedger(ledgerPath: string, record: PsychedelicLearningRecord): void {
  const candidateHash = record.candidate.sha256;
  const existing = fs.existsSync(ledgerPath) ? fs.readFileSync(ledgerPath, "utf8") : "";
  let replaced = false;
  const lines = existing.split("\n").filter((line) => line.trim().length > 0).map((line) => {
    const value: unknown = JSON.parse(line);
    const priorHash = z.object({ candidate: z.object({ sha256: z.string() }) }).safeParse(value).data?.candidate.sha256;
    if (priorHash !== candidateHash) return line;
    replaced = true;
    return JSON.stringify(record);
  });
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  if (!replaced) lines.push(JSON.stringify(record));
  fs.writeFileSync(ledgerPath, `${lines.join("\n")}\n`);
}

function printGate(report: GateReport): void {
  console.log(`psychedelic-gate: ${report.status}`);
  console.log(`candidate: ${report.candidate.path}`);
  console.log(`axis: ${report.axis} / ${report.primitive}`);
  console.log(`material coverage: ${report.candidateMetrics.activeTextureCoverage.toFixed(4)}; connected: ${report.candidateMetrics.connectedMotionCoverage.toFixed(4)}; coherence: ${report.candidateMetrics.temporalCoherence.toFixed(4)}`);
  console.log(`global chroma share: ${report.candidateMetrics.globalChromaMotionShare.toFixed(4)}; fine motion: ${report.candidateMetrics.fineMotionRatio.toFixed(4)}`);
  console.log(`source edges: ${report.sourceFidelity.edgeCorrelationP05.toFixed(4)}; drift: ${report.sourceFidelity.frameRgbDriftP95.toFixed(4)}/${report.sourceFidelity.localRgbDriftP95.toFixed(4)}`);
  for (const failure of report.gate.failures) {
    console.log(`REJECT ${failure.code}: ${failure.observed.toFixed(4)} (threshold ${failure.threshold.toFixed(4)})`);
  }
  console.log(`next: ${report.gate.nextPolicy.instruction}`);
}

async function run(args: PsychedelicGateCli): Promise<GateReport> {
  const candidatePath = requireFile(args.candidatePath, "candidate");
  const sourcePath = requireFile(args.sourcePath, "source");
  const workDir = requireFile(args.workDir, "work directory");
  const scenePath = requireFile(path.join(workDir, "scene.json"), "scene.json");
  const referencePaths = args.referencePaths.map((referencePath) => requireFile(referencePath, "reference"));
  const candidate = analyzeVideo(candidatePath);
  const references = referencePaths.map((referencePath) => ({ path: referencePath, ...analyzeVideo(referencePath) }));
  const source = await readSourceGrid(sourcePath);
  const fidelity = sourceFidelity(candidate.data, source);
  const ledgerPath = path.resolve(args.ledgerPath ?? path.join("out", "psychedelic-learning-ledger.jsonl"));
  const gate = evaluatePsychedelicCandidate({
    candidate: candidate.metrics,
    references: references.map((reference) => reference.metrics),
    sourceFidelity: fidelity,
    axis: args.axis,
    primitive: args.primitive,
    history: readHistory(ledgerPath),
  });
  const report: GateReport = {
    version: 1,
    createdAt: new Date().toISOString(),
    status: gate.status,
    candidate: { path: candidatePath, sha256: sha256File(candidatePath) },
    source: { path: sourcePath, sha256: sha256File(sourcePath) },
    scene: { path: scenePath, sha256: sha256File(scenePath) },
    axis: args.axis,
    primitive: args.primitive,
    candidateMetrics: candidate.metrics,
    sourceFidelity: fidelity,
    references: references.map((reference) => ({ path: reference.path, metrics: reference.metrics })),
    gate,
  };
  const reportPath = path.resolve(args.reportPath ?? path.join(workDir, "psychedelic-gate.json"));
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  appendLedger(ledgerPath, learningRecord(report));
  printGate(report);
  console.log(`report: ${reportPath}`);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run(parsePsychedelicGateCli(process.argv.slice(2))).then((report) => {
    if (report.status === "REJECT") process.exitCode = 1;
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
