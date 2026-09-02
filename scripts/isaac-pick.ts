/**
 * Record Isaac's pick as the full-render permit (00 §2 · replaces hand-editing humanOverride).
 *
 *   npx tsx scripts/isaac-pick.ts --work-dir out/manual-runs/<slug> \
 *     --quote "이게 젤 나아 풀버전으로" [--preview out/layered/.../<slug>-v8b-preview.mp4] [--audio "Mama India @6:27"]
 *
 * Writes <work-dir>/psychedelic-gate.json (existing gate + humanOverride, or a REJECT+override stub)
 * and <work-dir>/isaac-pick.json (quote, time, scene sha, preview, audio). Then:
 *   npx tsx scripts/export-layered.ts --title <slug>-final --work-dir <work-dir> --full-res --gate-report <work-dir>/psychedelic-gate.json
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { buildPickRecord, buildPickReport } from "./lib/isaac-pick.js";

const arg = z.string().trim().min(1);

function req(argv: readonly string[], i: number, flag: string): string {
  const v = argv[i + 1];
  if (v === undefined || (v.startsWith("--") && flag !== "--quote")) throw new Error(`expected value after ${flag}`);
  return arg.parse(v);
}

function parse(argv: readonly string[]): { workDir: string; quote: string; preview?: string; audio?: string } {
  let workDir: string | undefined;
  let quote: string | undefined;
  let preview: string | undefined;
  let audio: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const f = argv[i];
    if (f === "--work-dir") workDir = req(argv, i++, f);
    else if (f === "--quote") quote = req(argv, i++, f);
    else if (f === "--preview") preview = req(argv, i++, f);
    else if (f === "--audio") audio = req(argv, i++, f);
    else throw new Error(`unknown arg: ${f}`);
  }
  if (!workDir || !quote) throw new Error('usage: --work-dir <dir> --quote "<Isaac verbatim>" [--preview <mp4>] [--audio "<track @m:ss>|none"]');
  return { workDir, quote, preview, audio };
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function main(): void {
  const args = parse(process.argv.slice(2));
  const workDir = path.resolve(args.workDir);
  const scenePath = path.join(workDir, "scene.json");
  if (!fs.existsSync(scenePath)) throw new Error(`missing ${scenePath}`);
  if (args.preview && !fs.existsSync(path.resolve(args.preview))) throw new Error(`preview not found: ${args.preview}`);

  const sceneSha = sha256File(scenePath);
  const reportPath = path.join(workDir, "psychedelic-gate.json");
  const existing = fs.existsSync(reportPath)
    ? (JSON.parse(fs.readFileSync(reportPath, "utf8")) as Record<string, unknown>)
    : undefined;
  const at = new Date().toISOString();
  const report = buildPickReport(existing, sceneSha, args.quote, at);
  const record = buildPickRecord({ quote: args.quote, at, sceneSha256: sceneSha, preview: args.preview, audio: args.audio });

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(workDir, "isaac-pick.json"), `${JSON.stringify(record, null, 2)}\n`);

  const rel = path.relative(process.cwd(), workDir);
  const slug = path.basename(workDir);
  process.stdout.write(`pick recorded: "${record.quote}" scene=${sceneSha.slice(0, 16)} gate=${report.status}+override\n`);
  process.stdout.write(
    `next: npx tsx scripts/export-layered.ts --title ${slug}-final --work-dir ${rel} --full-res --gate-report ${path.join(rel, "psychedelic-gate.json")}\n`,
  );
  if (!record.audio) process.stdout.write("audio: none recorded — do not mux until Isaac names track + start (R-043/R-059)\n");
}

try {
  main();
} catch (error: unknown) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
