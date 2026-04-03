import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";

import { BufferAllocator } from "./lib/buffer-allocator.js";
import {
  buildReferenceAbstractionAndIR,
} from "./lib/303-compiler.js";
import { buildSamplePlayerV2Params } from "./lib/sample-player-contract.js";
import {
  isSampleBankManifestV2,
  readSampleManifest,
  resolveManifestFilePath,
  type SampleBankEntryV2,
  type SampleBankManifestV2,
} from "./lib/sample-utils.js";

const SCLANG = "/Applications/SuperCollider.app/Contents/MacOS/sclang";
const SCSYNTH = "/Applications/SuperCollider.app/Contents/Resources/scsynth";
const SAMPLE_PLAYER_DEF = path.join(process.cwd(), "audio/sc/compiled/sample_player.scsyndef");
const MASTER_PY = path.join(process.cwd(), "audio/analyzer/master.py");
const TECHNICAL_QC_PY = path.join(process.cwd(), "audio/analyzer/technical_qc.py");
const UV_PYTHON_ARGS = ["run", "--with", "numpy", "--with", "soundfile", "--with", "scipy", "--with", "pyloudnorm", "python"];

const args = process.argv.slice(2);
const analysisDir = args[0];
const dryRun = args.includes("--dry-run");
const stemsMode = args.includes("--stems");
const seedIdx = args.indexOf("--seed");
const bankIdx = args.indexOf("--bank-manifest");
const outIdx = args.indexOf("--out-dir");

if (args.includes("--help") || args.includes("-h")) {
  console.log("Usage: npx tsx scripts/render-303.ts <analysis-dir> [--dry-run] [--seed N] [--bank-manifest path] [--out-dir path] [--stems]");
  process.exit(0);
}

if (!analysisDir) {
  console.error("Usage: npx tsx scripts/render-303.ts <analysis-dir> [--dry-run] [--seed N] [--bank-manifest path] [--out-dir path] [--stems]");
  process.exit(1);
}

const seed = seedIdx >= 0 ? Number(args[seedIdx + 1]) : undefined;
const bankManifestPath = bankIdx >= 0
  ? path.resolve(args[bankIdx + 1])
  : path.resolve(process.cwd(), "audio/samples/303/manifest.json");
const outputDir = outIdx >= 0
  ? path.resolve(args[outIdx + 1])
  : path.resolve(analysisDir, "303");

if (!fs.existsSync(path.join(analysisDir, "analysis.json"))) {
  console.error(`analysis.json not found in ${analysisDir}`);
  process.exit(1);
}

const rawAnalysis = JSON.parse(
  fs.readFileSync(path.join(analysisDir, "analysis.json"), "utf-8"),
);
const { abstraction, ir } = buildReferenceAbstractionAndIR(
  rawAnalysis,
  path.resolve(analysisDir),
  seed !== undefined ? { seed } : {},
);

const manifest = readSampleManifest(bankManifestPath);
if (!manifest || !isSampleBankManifestV2(manifest)) {
  console.error(`303 bank manifest v2 not found or invalid: ${bankManifestPath}`);
  process.exit(1);
}
const bank: SampleBankManifestV2 = manifest;

const ensureDir = (dir: string) => fs.mkdirSync(dir, { recursive: true });
ensureDir(outputDir);

const bankDir = path.dirname(bankManifestPath);
const roleBusMap: Record<string, number> = {
  bass: 0,
  riff: 2,
  pseudo_hat: 4,
  fx: 6,
};

const articulationFallbacks: Record<string, string[]> = {
  slide: ["slide", "accent", "squelch", "normal"],
  accent: ["accent", "normal", "squelch", "stab"],
  stab: ["stab", "accent", "normal", "squelch"],
  squelch: ["squelch", "accent", "normal", "stab"],
  long: ["long", "normal", "accent"],
  normal: ["normal", "accent", "long"],
  hat: ["hat_short", "click", "tick"],
  chirp: ["chirp", "click", "tick"],
  sweep: ["sweep", "zap"],
  zap: ["zap", "sweep"],
};

const hashString = (text: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const midiDistance = (target: number | null, candidate: number) => {
  if (target === null) return 0;
  return Math.abs(target - candidate);
};

const mapRoleToTags = (role: string): string[] => {
  switch (role) {
    case "bass":
      return ["bass"];
    case "riff":
      return ["riff"];
    case "pseudo_hat":
      return ["pseudo_hat", "top"];
    case "fx":
      return ["fx"];
    default:
      return [role];
  }
};

const candidateArticulationsForEvent = (articulation: string) =>
  articulationFallbacks[articulation] ?? [articulation, "normal"];

type SelectedSource = {
  entry: SampleBankEntryV2;
  rate: number;
  fallback: string | null;
};

const selectEntryForEvent = (
  role: string,
  event: CompositionIR["voices"][number]["events"][number],
  eventIndex: number,
): SelectedSource => {
  const roleTags = mapRoleToTags(role);
  const articulationCandidates = candidateArticulationsForEvent(event.articulation);

  const candidates = bank.samples.filter((entry) =>
    entry.role_tags.some((tag) => roleTags.includes(tag)));
  if (candidates.length === 0) {
    throw new Error(`No bank entries for role ${role}`);
  }

  let fallback: string | null = null;
  let filtered = candidates;
  for (const articulation of articulationCandidates) {
    const byArticulation = candidates.filter((entry) => entry.articulation === articulation);
    if (byArticulation.length > 0) {
      filtered = byArticulation;
      if (articulation !== event.articulation) {
        fallback = `articulation:${event.articulation}->${articulation}`;
      }
      break;
    }
  }

  const sorted = [...filtered].sort((a, b) => {
    const byMidi = midiDistance(event.note_midi, a.midi) - midiDistance(event.note_midi, b.midi);
    if (byMidi !== 0) return byMidi;
    return a.id.localeCompare(b.id);
  });
  const closestMidi = event.note_midi === null ? sorted : sorted.filter((entry) =>
    midiDistance(event.note_midi, entry.midi) === midiDistance(event.note_midi, sorted[0].midi));
  const rrIdx = hashString(`${ir.seed}:${role}:${eventIndex}:${event.time}`) % closestMidi.length;
  const entry = closestMidi[rrIdx];

  const rate = event.note_midi === null
    ? 1
    : Number((2 ** ((event.note_midi - entry.midi) / 12)).toFixed(5));
  return { entry, rate, fallback };
};

const allocator = new BufferAllocator();
const uniqueFiles = new Map<string, number>();
const bufferCommands: string[] = [];
const scoreEvents: string[] = [];
const auditEvents: Array<Record<string, unknown>> = [];
let nodeId = 5000;

bufferCommands.push(`[0, [\\d_load, "${SAMPLE_PLAYER_DEF}"]]`);

for (const voice of ir.voices) {
  const outBus = stemsMode ? roleBusMap[voice.role] ?? 0 : 0;
  voice.events.forEach((event, eventIndex) => {
    const selected = selectEntryForEvent(voice.role, event, eventIndex);
    const resolvedPath = resolveManifestFilePath(selected.entry.file, bankDir);
    if (!uniqueFiles.has(selected.entry.file)) {
      const bufNum = allocator.allocate("samples", selected.entry.file);
      uniqueFiles.set(selected.entry.file, bufNum);
      bufferCommands.push(`[0, [\\b_allocRead, ${bufNum}, "${resolvedPath}"]]`);
    }

    const params = buildSamplePlayerV2Params({
      buf: uniqueFiles.get(selected.entry.file)!,
      out: outBus,
      amp: Number((event.velocity * 0.8).toFixed(4)),
      dur: Number(event.duration.toFixed(4)),
      rate: selected.rate,
      attack: voice.role === "pseudo_hat" ? 0.001 : 0.005,
      release: voice.role === "pseudo_hat" ? 0.02 : 0.06,
      hpFreq: voice.role === "pseudo_hat" ? 2000 : 20,
      lpFreq: voice.role === "pseudo_hat" ? 18000 : 20000,
      loopMode: event.duration > (selected.entry.duration_ms / 1000) * 1.2 ? 1 : 0,
      xfade: voice.role === "bass" || voice.role === "riff" ? 0.02 : 0.005,
      sustainLevel: voice.role === "bass" ? 0.9 : 0.85,
      rateLag: event.slide ? 0.03 : 0,
      legato: event.slide ? 1 : 0,
      slide: event.slide ? 1 : 0,
      slideTime: event.slide ? 0.08 : 0.05,
    });

    const paramStr = Object.entries(params)
      .map(([key, value]) => `\\${key}, ${value}`)
      .join(", ");
    scoreEvents.push(
      `[${event.time.toFixed(4)}, [\\s_new, \\sample_player, ${nodeId++}, 0, 0, ${paramStr}]]`,
    );

    auditEvents.push({
      role: voice.role,
      time: event.time,
      requested_articulation: event.articulation,
      selected_id: selected.entry.id,
      selected_file: selected.entry.file,
      fallback: selected.fallback,
      note_midi: event.note_midi,
      selected_midi: selected.entry.midi,
      rate: selected.rate,
      source_strategy: event.source_strategy,
    });
  });
}

const purityAudit = {
  version: 1,
  mode: "303_only",
  seed: ir.seed,
  bank_manifest: bankManifestPath,
  all_within_bank: auditEvents.every((event) =>
    String(event.selected_file).startsWith("audio/samples/303/")),
  selected_source_count: auditEvents.length,
  unique_source_count: uniqueFiles.size,
  stems_mode: stemsMode,
  sources: auditEvents,
};

const scoreLines = [...bufferCommands, ...scoreEvents, `[31.0, [0]]`];
const oscPath = path.join(outputDir, "render-303.osc");
const scPath = path.join(outputDir, "render-303.scd");
const renderedWav = path.join(outputDir, stemsMode ? "render-303-stems.wav" : "render-303-raw.wav");
const finalMasterWav = path.join(outputDir, "master.wav");

const scScript = `(
var score = Score([
${scoreLines.join(",\n")}
]);
score.write("${oscPath}");
"WRITE_DONE".postln;
0.exit;
)`;

fs.writeFileSync(path.join(outputDir, "reference-abstraction.json"), JSON.stringify(abstraction, null, 2));
fs.writeFileSync(path.join(outputDir, "composition-ir.json"), JSON.stringify(ir, null, 2));
fs.writeFileSync(path.join(outputDir, "source-purity-audit.json"), JSON.stringify(purityAudit, null, 2));
fs.writeFileSync(scPath, scScript);

if (dryRun) {
  console.log(`render-303 dry run complete: ${scoreEvents.length} events, ${uniqueFiles.size} unique samples`);
  console.log(`Artifacts: ${outputDir}`);
  process.exit(0);
}

const writeResult = execFileSync(SCLANG, ["-i", "none", scPath], {
  encoding: "utf-8",
  timeout: 60000,
});
if (!writeResult.includes("WRITE_DONE")) {
  console.error("render-303 score compilation failed");
  process.exit(1);
}

const outChannels = stemsMode ? "8" : "2";
execFileSync(SCSYNTH, [
  "-N", oscPath, "_", renderedWav, "44100", "WAV", "float",
  "-o", outChannels, "-u", "0", "-m", "65536",
], { encoding: "utf-8", timeout: 300000 });

let qcTarget = renderedWav;

if (!stemsMode && fs.existsSync(renderedWav) && fs.existsSync(MASTER_PY)) {
  try {
    execFileSync("uv", [
      ...UV_PYTHON_ARGS,
      MASTER_PY,
      renderedWav,
      path.join(analysisDir, "analysis.json"),
      "--output",
      finalMasterWav,
    ], {
      encoding: "utf-8",
      timeout: 120000,
    });
    if (fs.existsSync(finalMasterWav)) {
      qcTarget = finalMasterWav;
    }
  } catch (error) {
    console.warn(`mastering failed: ${error instanceof Error ? error.message : error}`);
  }
}

if (fs.existsSync(qcTarget) && fs.existsSync(TECHNICAL_QC_PY)) {
  const qcPath = path.join(outputDir, "technical-qc.json");
  try {
    execFileSync("uv", [...UV_PYTHON_ARGS, TECHNICAL_QC_PY, qcTarget, qcPath], {
      encoding: "utf-8",
      timeout: 60000,
    });
  } catch (error) {
    console.warn(`technical QC failed: ${error instanceof Error ? error.message : error}`);
  }
}

console.log(`render-303 complete: ${qcTarget}`);
