/**
 * Rebuild a closed lock on a clean machine.
 *
 *   npx tsx scripts/rebuild-closed-lock.ts --slug r342-cosmic-buddha-eye-fall
 *   npx tsx scripts/rebuild-closed-lock.ts --slug r342 --preview
 *   npx tsx scripts/rebuild-closed-lock.ts --slug r325 --full
 *
 * Always: verify shas → scaffold → plates (if any) → cp lock → verify scene/gate.
 * Export only with --preview or --full (full still needs Isaac for new work;
 * here it is a closed product so --full is allowed when the gate permits).
 */
import { createHash } from "node:crypto";
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  assertSafePlateCommand,
  findClosedLock,
  resolveLockPaths,
  splitPlateCommands,
  type ClosedLockManifest,
} from "./lib/rebuild-closed-lock.js";

const arg = z.string().trim().min(1);

function parse(argv: readonly string[]): { slug: string; preview: boolean; full: boolean } {
  let slug: string | undefined;
  let preview = false;
  let full = false;
  for (let i = 0; i < argv.length; i++) {
    const f = argv[i];
    if (f === "--slug") {
      const v = argv[i + 1];
      if (!v || v.startsWith("--")) throw new Error("expected value after --slug");
      slug = arg.parse(v);
      i += 1;
    } else if (f === "--preview") preview = true;
    else if (f === "--full") full = true;
    else throw new Error(`unknown arg: ${f}`);
  }
  if (!slug) throw new Error("--slug is required");
  if (preview && full) throw new Error("use only one of --preview or --full");
  return { slug, preview, full };
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function main(): void {
  const { slug, preview, full } = parse(process.argv.slice(2));
  const cwd = process.cwd();
  const manifest = JSON.parse(
    fs.readFileSync(path.join(cwd, "recipes/locks/manifest.json"), "utf8"),
  ) as ClosedLockManifest;
  const entry = findClosedLock(manifest, slug);
  const paths = resolveLockPaths(entry, cwd);

  if (!fs.existsSync(paths.source)) throw new Error(`missing source ${paths.source}`);
  if (!fs.existsSync(paths.lock)) throw new Error(`missing lock ${paths.lock}`);
  if (!fs.existsSync(paths.gate)) throw new Error(`missing gate ${paths.gate}`);

  const sourceSha = sha256File(paths.source);
  const lockSha = sha256File(paths.lock);
  if (sourceSha !== entry.sourceSha256) {
    throw new Error(`source sha mismatch ${sourceSha} != ${entry.sourceSha256}`);
  }
  if (lockSha !== entry.sceneSha256) {
    throw new Error(`lock sha mismatch ${lockSha} != ${entry.sceneSha256}`);
  }
  console.log("source+lock sha OK", entry.slug);

  execFileSync(
    "npx",
    [
      "tsx",
      "scripts/scaffold-layered-run.ts",
      "--source",
      paths.source,
      "--slug",
      entry.slug,
      "--recipe",
      paths.lock,
      "--work-dir",
      paths.workDir,
    ],
    { stdio: "inherit", cwd },
  );

  const plateCmds = splitPlateCommands(entry.plates);
  if (plateCmds.length === 0) {
    console.log("no custom plates (golden layers only)");
  } else {
    for (const cmd of plateCmds) {
      assertSafePlateCommand(cmd);
      console.log("plates:", cmd);
      execSync(cmd, { stdio: "inherit", cwd });
    }
  }

  fs.copyFileSync(paths.lock, path.join(paths.workDir, "scene.json"));
  const sceneSha = sha256File(path.join(paths.workDir, "scene.json"));
  const gate = JSON.parse(fs.readFileSync(paths.gate, "utf8")) as {
    status: string;
    scene: { sha256: string };
    humanOverride?: { approvedBy?: string };
  };
  if (sceneSha !== gate.scene.sha256) {
    throw new Error(`scene sha ${sceneSha} != gate ${gate.scene.sha256}`);
  }
  const permitted =
    gate.status === "PASS" ||
    (gate.status === "REJECT" && gate.humanOverride?.approvedBy === "isaac");
  if (!permitted) throw new Error(`gate does not permit full: ${gate.status}`);
  console.log("scene sha matches gate; permit", gate.status);

  if (preview) {
    execFileSync(
      "npx",
      ["tsx", "scripts/export-layered.ts", "--title", entry.slug, "--work-dir", paths.workDir, "--preview"],
      { stdio: "inherit", cwd },
    );
  } else if (full) {
    execFileSync(
      "npx",
      [
        "tsx",
        "scripts/export-layered.ts",
        "--title",
        `${entry.slug}-final`,
        "--work-dir",
        paths.workDir,
        "--full-res",
        "--gate-report",
        paths.gate,
      ],
      { stdio: "inherit", cwd },
    );
  } else {
    console.log("rebuild ready (no export). --preview or --full to render.");
  }
}

main();
