/**
 * Pure helpers for close-lock (02 §4.2 E–H as code). An Isaac final is closed when it
 * rebuilds on another machine, not when an MP4 sits in out/. r343–r346 were "final" with no lock pack.
 */
import { z } from "zod";
import type { ClosedLockEntry, ClosedLockManifest } from "./rebuild-closed-lock.js";

export type LockEntry = ClosedLockEntry & {
  readonly audio: string;
  readonly notes: string;
  readonly finalLocal?: string;
  readonly playbookSection: string;
};

export type LockEntryInput = {
  readonly slug: string;
  readonly sourceName: string;
  readonly sourceSha256: string;
  readonly sceneSha256: string;
  readonly audio: string;
  readonly gateStatus: "PASS" | "REJECT";
  readonly overrideReason?: string;
  readonly plates?: string;
  readonly notes?: string;
  readonly finalLocal?: string;
};

const gateSchema = z.object({
  status: z.union([z.literal("PASS"), z.literal("REJECT")]),
  scene: z.object({ sha256: z.string().regex(/^[a-f0-9]{64}$/) }),
  humanOverride: z.object({ approvedBy: z.literal("isaac"), reason: z.string().min(1) }).optional(),
});

export type GatePermit = {
  readonly ok: boolean;
  readonly status?: "PASS" | "REJECT";
  readonly sceneSha256?: string;
  readonly overrideReason?: string;
  readonly reason: string;
};

export function gatePermits(gate: unknown): GatePermit {
  const parsed = gateSchema.safeParse(gate);
  if (!parsed.success) return { ok: false, reason: "gate report is not a PASS/REJECT report with scene.sha256" };
  const { status, scene, humanOverride } = parsed.data;
  if (status === "PASS") return { ok: true, status, sceneSha256: scene.sha256, reason: "gate PASS" };
  if (humanOverride) {
    return { ok: true, status, sceneSha256: scene.sha256, overrideReason: humanOverride.reason, reason: "REJECT + Isaac override" };
  }
  return { ok: false, status, sceneSha256: scene.sha256, reason: "gate REJECT without Isaac override — run scripts/isaac-pick.ts first" };
}

export function buildLockEntry(input: LockEntryInput): LockEntry {
  const slug = input.slug.trim();
  if (!/^r\d{2,4}-[a-z0-9-]+$/.test(slug)) throw new Error(`slug must look like rNNN-topic-variant (got ${slug})`);
  if (!/\.png$/.test(input.sourceName)) throw new Error("sourceName must end with .png");
  const source = `sources/approved/${input.sourceName}`;
  const lock = `recipes/locks/${slug}.json`;
  const gate = `recipes/locks/${slug}.gate.json`;
  const workDir = `out/manual-runs/${slug}`;
  const permit = input.gateStatus === "PASS" ? "Gate PASS." : `Gate REJECT + humanOverride: ${input.overrideReason ?? "(quote missing)"}.`;
  const plateNote = input.plates ? " After scaffold: run plates then cp lock→scene.json." : "";
  return {
    slug,
    source,
    sourceSha256: input.sourceSha256,
    lock,
    sceneSha256: input.sceneSha256,
    gate,
    audio: input.audio,
    ...(input.finalLocal ? { finalLocal: input.finalLocal } : {}),
    scaffold: `npx tsx scripts/scaffold-layered-run.ts --source ${source} --slug ${slug} --recipe ${lock} --work-dir ${workDir}`,
    ...(input.plates ? { plates: input.plates } : {}),
    exportFull: `npx tsx scripts/export-layered.ts --title ${slug}-final --work-dir ${workDir} --full-res --gate-report ${gate}`,
    notes: `${input.notes ? `${input.notes} ` : ""}${permit}${plateNote}`.trim(),
    playbookSection: "docs/video-os/02-REPRO-LOCKS.md §3",
  };
}

export function upsertLockEntry(manifest: ClosedLockManifest, entry: LockEntry): ClosedLockManifest {
  const others = manifest.approved.filter((e) => e.slug !== entry.slug);
  return { ...manifest, approved: [...others, entry] };
}
