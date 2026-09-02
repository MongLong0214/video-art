/**
 * Close an Isaac final into a lock pack (02 §4.2 E–H). Default path after every 풀렌더.
 *
 *   npx tsx scripts/close-lock.ts --slug r346-eye-mandala-sitter \
 *     [--work-dir out/manual-runs/r346-eye-mandala-sitter] [--source-name r346-eye-mandala-sitter.png] \
 *     [--audio "Adhana @5:06"] [--plates "node scripts/locks/r346-build-x.mjs"] [--final out/layered/.../final.mp4] [--notes "..."]
 *
 * Refuses: missing files, gate without permit, gate sha ≠ scene.json sha, approved source name reused
 * for different pixels, unsafe plate commands. Prints the git add list. Never commits.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { buildLockEntry, gatePermits, upsertLockEntry } from "./lib/close-lock.js";
import { assertSafePlateCommand, splitPlateCommands, type ClosedLockManifest } from "./lib/rebuild-closed-lock.js";

const arg = z.string().trim().min(1);

function req(argv: readonly string[], i: number, flag: string): string {
  const v = argv[i + 1];
  if (v === undefined || v.startsWith("--")) throw new Error(`expected value after ${flag}`);
  return arg.parse(v);
}

type Args = { slug: string; workDir: string; sourceName: string; audio: string; plates?: string; final?: string; notes?: string };

function parse(argv: readonly string[]): Args {
  const out: Partial<Args> = {};
  for (let i = 0; i < argv.length; i++) {
    const f = argv[i];
    if (f === "--slug") out.slug = req(argv, i++, f);
    else if (f === "--work-dir") out.workDir = req(argv, i++, f);
    else if (f === "--source-name") out.sourceName = req(argv, i++, f);
    else if (f === "--audio") out.audio = req(argv, i++, f);
    else if (f === "--plates") out.plates = req(argv, i++, f);
    else if (f === "--final") out.final = req(argv, i++, f);
    else if (f === "--notes") out.notes = req(argv, i++, f);
    else throw new Error(`unknown arg: ${f}`);
  }
  if (!out.slug) throw new Error("usage: --slug <rNNN-slug> [--work-dir] [--source-name x.png] [--audio \"Track @m:ss\"] [--plates] [--final] [--notes]");
  return {
    slug: out.slug,
    workDir: out.workDir ?? `out/manual-runs/${out.slug}`,
    sourceName: out.sourceName ?? `${out.slug}.png`,
    audio: out.audio ?? "none",
    plates: out.plates,
    final: out.final,
    notes: out.notes,
  };
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function copyChecked(from: string, to: string): void {
  if (fs.existsSync(to) && sha256File(to) !== sha256File(from)) {
    throw new Error(`${to} exists with different bytes — pick another --source-name / slug instead of overwriting a closed product`);
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function main(): void {
  const args = parse(process.argv.slice(2));
  const cwd = process.cwd();
  const workDir = path.resolve(cwd, args.workDir);
  const sourcePng = path.join(workDir, "source.png");
  const scenePath = path.join(workDir, "scene.json");
  const gatePath = path.join(workDir, "psychedelic-gate.json");
  for (const p of [sourcePng, scenePath, gatePath]) if (!fs.existsSync(p)) throw new Error(`missing ${p}`);

  const gate = JSON.parse(fs.readFileSync(gatePath, "utf8")) as unknown;
  const permit = gatePermits(gate);
  if (!permit.ok) throw new Error(permit.reason);
  const sceneSha = sha256File(scenePath);
  if (permit.sceneSha256 !== sceneSha) {
    throw new Error(`gate scene sha ${permit.sceneSha256?.slice(0, 16)} ≠ scene.json ${sceneSha.slice(0, 16)} — re-run scripts/isaac-pick.ts on the current scene`);
  }
  for (const command of splitPlateCommands(args.plates)) assertSafePlateCommand(command);

  const pickPath = path.join(workDir, "isaac-pick.json");
  const pick = fs.existsSync(pickPath) ? (JSON.parse(fs.readFileSync(pickPath, "utf8")) as { audio?: string; quote?: string }) : undefined;
  const audio = args.audio !== "none" ? args.audio : pick?.audio ?? "none";

  const entryDraft = buildLockEntry({
    slug: args.slug,
    sourceName: args.sourceName,
    sourceSha256: "pending",
    sceneSha256: "pending",
    audio,
    gateStatus: permit.status ?? "REJECT",
    overrideReason: permit.overrideReason,
    plates: args.plates,
    notes: args.notes ?? (pick?.quote ? `Isaac: ${pick.quote}` : undefined),
    finalLocal: args.final,
  });

  copyChecked(sourcePng, path.join(cwd, entryDraft.source));
  copyChecked(scenePath, path.join(cwd, entryDraft.lock));
  copyChecked(gatePath, path.join(cwd, entryDraft.gate));

  const entry = {
    ...entryDraft,
    sourceSha256: sha256File(path.join(cwd, entryDraft.source)),
    sceneSha256: sha256File(path.join(cwd, entryDraft.lock)),
  };
  const manifestPath = path.join(cwd, "recipes/locks/manifest.json");
  const manifest = fs.existsSync(manifestPath)
    ? (JSON.parse(fs.readFileSync(manifestPath, "utf8")) as ClosedLockManifest)
    : { approved: [] };
  fs.writeFileSync(manifestPath, `${JSON.stringify(upsertLockEntry(manifest, entry), null, 2)}\n`);

  process.stdout.write(`closed ${entry.slug} (${permit.reason}) audio=${audio}\n`);
  process.stdout.write(`git add ${entry.source} ${entry.lock} ${entry.gate} recipes/locks/manifest.json docs/video-os/01-CREATE-OS.md\n`);
  process.stdout.write(`verify: npx tsx scripts/rebuild-closed-lock.ts --slug ${entry.slug}\n`);
  process.stdout.write("then append the 01 §9 case row + approved-finals table row. Do not commit MP4/WAV/out.\n");
}

try {
  main();
} catch (error: unknown) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
