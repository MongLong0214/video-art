import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import {
  buildPsychedelicLearningPlan,
  type PsychedelicLearningPlan,
  type PsychedelicLearningRecord,
} from "./lib/psychedelic-learning.js";
import { analyzeSourceRegionCapacity } from "./lib/source-region-capacity.js";

const pathSchema = z.string().trim().min(1);
const statusSchema = z.union([z.literal("PASS"), z.literal("REJECT")]);
const envelopeSchema = z.object({
  materialCoverageFloor: z.number(),
  connectedCoverageFloor: z.number(),
  temporalCoherenceFloor: z.number(),
  fineMotionCeiling: z.number(),
  globalChromaMotionShareCeiling: z.number(),
});
const reportSchema = z.object({
  status: statusSchema,
  createdAt: z.string(),
  candidate: z.object({ path: z.string(), sha256: z.string() }),
  source: z.object({ path: z.string() }),
  scene: z.object({ path: z.string(), sha256: z.string() }),
  axis: z.string().min(1),
  primitive: z.string().min(1),
  gate: z.object({
    failures: z.array(z.object({ code: z.string() })),
    envelope: envelopeSchema,
  }),
});
const ledgerRecordSchema = z.object({
  version: z.literal(2),
  createdAt: z.string(),
  status: statusSchema,
  candidate: z.object({ path: z.string(), sha256: z.string() }),
  source: z.object({ path: z.string(), sha256: z.string() }),
  scene: z.object({ path: z.string(), sha256: z.string() }),
  axis: z.string().min(1),
  primitive: z.string().min(1),
  failures: z.array(z.string()),
  envelope: envelopeSchema,
});

export type PsychedelicNextPlanCli = {
  readonly sourcePath: string;
  readonly reportPaths: readonly string[];
  readonly ledgerPath?: string;
  readonly outputPath?: string;
};

export class PsychedelicNextPlanCliError extends Error {
  override readonly name = "PsychedelicNextPlanCliError";
}

function requiredValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) throw new PsychedelicNextPlanCliError(`expected value after ${flag}`);
  return pathSchema.parse(value);
}

export function parsePsychedelicNextPlanCli(argv: readonly string[]): PsychedelicNextPlanCli {
  let sourcePath: string | undefined;
  const reportPaths: string[] = [];
  let ledgerPath: string | undefined;
  let outputPath: string | undefined;
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === "--source") sourcePath = requiredValue(argv, index++, flag);
    else if (flag === "--report") reportPaths.push(requiredValue(argv, index++, flag));
    else if (flag === "--ledger") ledgerPath = requiredValue(argv, index++, flag);
    else if (flag === "--output") outputPath = requiredValue(argv, index++, flag);
    else throw new PsychedelicNextPlanCliError(`unknown argument: ${flag}`);
  }
  if (sourcePath === undefined) throw new PsychedelicNextPlanCliError("source is required");
  if (reportPaths.length === 0 && ledgerPath === undefined) throw new PsychedelicNextPlanCliError("at least one report or ledger is required");
  return { sourcePath, reportPaths, ledgerPath, outputPath };
}

function requireFile(filePath: string, label: string): string {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) throw new PsychedelicNextPlanCliError(`${label} not found: ${resolved}`);
  return resolved;
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function recordFromReport(reportPath: string, source: PsychedelicLearningRecord["source"]): PsychedelicLearningRecord {
  const report = reportSchema.parse(JSON.parse(fs.readFileSync(reportPath, "utf8")));
  if (path.resolve(report.source.path) !== source.path) {
    throw new PsychedelicNextPlanCliError(`report source does not match --source: ${reportPath}`);
  }
  return {
    version: 2,
    createdAt: report.createdAt,
    status: report.status,
    candidate: report.candidate,
    source,
    scene: report.scene,
    axis: report.axis,
    primitive: report.primitive,
    failures: report.gate.failures.map((failure) => failure.code),
    envelope: report.gate.envelope,
  };
}

function recordsFromLedger(ledgerPath: string): readonly PsychedelicLearningRecord[] {
  return fs.readFileSync(ledgerPath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => ledgerRecordSchema.parse(JSON.parse(line)));
}

function deduplicateRecords(records: readonly PsychedelicLearningRecord[]): readonly PsychedelicLearningRecord[] {
  const byCandidate = new Map<string, PsychedelicLearningRecord>();
  for (const record of records) byCandidate.set(record.candidate.sha256, record);
  return [...byCandidate.values()];
}

async function sourceRegionCapacity(sourcePath: string) {
  const image = sharp(sourcePath);
  const metadata = await image.metadata();
  if (metadata.width === undefined || metadata.height === undefined) throw new PsychedelicNextPlanCliError(`source has no dimensions: ${sourcePath}`);
  const targetWidth = Math.min(240, metadata.width);
  const targetHeight = Math.max(2, Math.round((metadata.height / metadata.width) * targetWidth));
  const { data, info } = await image.resize(targetWidth, targetHeight, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const luma = new Float32Array(info.width * info.height);
  for (let cell = 0; cell < luma.length; cell++) {
    const offset = cell * info.channels;
    luma[cell] = (0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2]) / 255;
  }
  return analyzeSourceRegionCapacity({
    luma,
    width: info.width,
    height: info.height,
    sourcePixelsPerCell: (metadata.width / info.width + metadata.height / info.height) * 0.5,
  });
}

export async function runPsychedelicNextPlan(args: PsychedelicNextPlanCli): Promise<PsychedelicLearningPlan> {
  const sourcePath = requireFile(args.sourcePath, "source");
  const source = { path: sourcePath, sha256: sha256File(sourcePath) };
  const reportRecords = args.reportPaths.map((reportPath) => recordFromReport(requireFile(reportPath, "report"), source));
  const ledgerRecords = args.ledgerPath === undefined ? [] : recordsFromLedger(requireFile(args.ledgerPath, "ledger"));
  const records = deduplicateRecords([...ledgerRecords, ...reportRecords]);
  const plan = buildPsychedelicLearningPlan({ source, records, regionCapacity: await sourceRegionCapacity(sourcePath) });
  const outputPath = path.resolve(args.outputPath ?? path.join("out", "psychedelic-next-experiment.json"));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`);
  console.log(`psychedelic learning plan: ${plan.decision.mode}`);
  console.log(`next: ${plan.decision.axis} / ${plan.decision.primitive}`);
  console.log(`blocked: ${plan.decision.blockedFamilies.join(", ") || "none"}`);
  console.log(`output: ${outputPath}`);
  return plan;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPsychedelicNextPlan(parsePsychedelicNextPlanCli(process.argv.slice(2))).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
