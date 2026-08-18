/**
 * Parse + validate closed-lock rebuild steps (pure — safe to unit test).
 * Custom plates are part of the product. Skipping them is a failed rebuild.
 */
import path from "node:path";

export type ClosedLockEntry = {
  readonly slug: string;
  readonly source: string;
  readonly sourceSha256: string;
  readonly lock: string;
  readonly sceneSha256: string;
  readonly gate: string;
  readonly plates?: string;
  readonly scaffold?: string;
  readonly exportFull?: string;
};

export type ClosedLockManifest = {
  readonly approved: readonly ClosedLockEntry[];
};

export function findClosedLock(manifest: ClosedLockManifest, slugOrPrefix: string): ClosedLockEntry {
  const exact = manifest.approved.find((e) => e.slug === slugOrPrefix);
  if (exact) return exact;
  const hits = manifest.approved.filter(
    (e) => e.slug.startsWith(slugOrPrefix) || e.slug.includes(slugOrPrefix),
  );
  if (hits.length === 1) return hits[0];
  if (hits.length === 0) throw new Error(`no lock matching ${slugOrPrefix}`);
  throw new Error(`ambiguous lock ${slugOrPrefix}: ${hits.map((h) => h.slug).join(", ")}`);
}

export function splitPlateCommands(plates: string | undefined): string[] {
  if (!plates || plates.trim() === "") return [];
  return plates
    .split("&&")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const NODE_PLATE = /^node\s+scripts\/locks\/[A-Za-z0-9._-]+\.mjs$/;
const CP_WORKDIR =
  /^cp\s+out\/manual-runs\/[A-Za-z0-9._\/-]+\s+out\/manual-runs\/[A-Za-z0-9._\/-]+$/;

export function assertSafePlateCommand(command: string): void {
  if (command.includes("|") || command.includes(";") || command.includes("`") || command.includes("$(")) {
    throw new Error(`refusing unsafe plate command: ${command}`);
  }
  if (NODE_PLATE.test(command) || CP_WORKDIR.test(command)) return;
  throw new Error(
    `plate command must be \`node scripts/locks/<file>.mjs\` or workdir \`cp\`: ${command}`,
  );
}

export function resolveLockPaths(entry: ClosedLockEntry, cwd = process.cwd()) {
  return {
    source: path.resolve(cwd, entry.source),
    lock: path.resolve(cwd, entry.lock),
    gate: path.resolve(cwd, entry.gate),
    workDir: path.resolve(cwd, "out/manual-runs", entry.slug),
  };
}
