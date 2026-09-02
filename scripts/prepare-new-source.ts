/**
 * New-source command of record. A zero-context agent cannot skip hero plates.
 *
 *   npx tsx scripts/prepare-new-source.ts \
 *     --source /path/to.png \
 *     --slug rNNN-descriptive \
 *     --recipe recipes/golden/eye-mirror-phase-advect-r221.json \
 *     --work-dir out/manual-runs/rNNN-descriptive \
 *     [--hero halo@0.50,0.20:130/630 --hero-reason "eye rings are the living part; detector saw form"]
 *
 * `--hero` is the only legal way to disagree with the detector. It is written to hero.json with the
 * source sha, and session-grade judges that hero (not a fresh detect), so the override is enforced.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { applyHeroOverride, detectHero, needsCustomTravel } from "./lib/hero-detect.js";
import { writeSessionPlates } from "./lib/session-plates.js";
import { patchSessionScene, type LooseScene } from "./lib/session-scene.js";
import { enforceSessionGrade } from "./lib/session-grade.js";

const arg = z.string().trim().min(1);
const TARGET: readonly [number, number] = [1632, 2912];

function req(argv: readonly string[], i: number, flag: string): string {
  const v = argv[i + 1];
  if (!v || v.startsWith("--")) throw new Error(`expected value after ${flag}`);
  return arg.parse(v);
}

type Args = {
  source: string;
  slug: string;
  recipe: string;
  workDir: string;
  hero?: string;
  heroReason?: string;
};

function parse(argv: readonly string[]): Args {
  const out: Partial<Args> = {};
  for (let i = 0; i < argv.length; i++) {
    const f = argv[i];
    if (f === "--source") out.source = req(argv, i++, f);
    else if (f === "--slug") out.slug = req(argv, i++, f);
    else if (f === "--recipe") out.recipe = req(argv, i++, f);
    else if (f === "--work-dir") out.workDir = req(argv, i++, f);
    else if (f === "--hero") out.hero = req(argv, i++, f);
    else if (f === "--hero-reason") out.heroReason = req(argv, i++, f);
    else throw new Error(`unknown arg: ${f}`);
  }
  if (!out.source || !out.slug || !out.recipe || !out.workDir) {
    throw new Error(
      "usage: --source <png> --slug <name> --recipe <golden.json> --work-dir <dir> [--hero <kind@cx,cy[:rIn/rOut]> --hero-reason <text>]",
    );
  }
  if (out.hero && !out.heroReason) throw new Error("--hero requires --hero-reason");
  if (out.heroReason && !out.hero) throw new Error("--hero-reason requires --hero");
  return out as Args;
}

async function ensureTargetSize(sourcePath: string, slug: string): Promise<string> {
  const meta = await sharp(sourcePath).metadata();
  if (!meta.width || !meta.height) throw new Error(`source has no dimensions: ${sourcePath}`);
  if (meta.width === TARGET[0] && meta.height === TARGET[1]) return sourcePath;
  const incomingDir = path.resolve("sources/incoming");
  fs.mkdirSync(incomingDir, { recursive: true });
  const dest = path.join(incomingDir, `${slug}.png`);
  await sharp(sourcePath)
    .resize(TARGET[0], TARGET[1], {
      kernel: sharp.kernel.lanczos3,
      fit: "cover",
      position: "centre",
    })
    .png()
    .toFile(dest);
  process.stdout.write(`lanczos ${meta.width}x${meta.height} → ${TARGET[0]}x${TARGET[1]} ${dest}\n`);
  return dest;
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

async function main(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  const args = parse(argv);
  const cwd = process.cwd();
  const workDir = path.resolve(args.workDir);
  const recipe = path.resolve(args.recipe);
  const sized = await ensureTargetSize(path.resolve(args.source), args.slug);

  execFileSync(
    "npx",
    [
      "tsx",
      "scripts/scaffold-layered-run.ts",
      "--source",
      sized,
      "--slug",
      args.slug,
      "--recipe",
      recipe,
      "--work-dir",
      workDir,
    ],
    { stdio: "inherit", cwd },
  );

  const sourcePng = path.join(workDir, "source.png");
  const detected = await detectHero(sourcePng);
  const hero = {
    ...(args.hero ? applyHeroOverride(detected, args.hero, args.heroReason ?? "") : detected),
    sourceSha256: sha256File(sourcePng),
  };
  fs.writeFileSync(path.join(workDir, "hero.json"), `${JSON.stringify(hero, null, 2)}\n`);
  process.stdout.write(
    `hero ${hero.kind} @ ${hero.cxN.toFixed(3)},${hero.cyN.toFixed(3)}${hero.override ? " (override)" : ""} ${hero.reasons.join("; ")}\n`,
  );

  if (needsCustomTravel(hero.kind)) {
    const plates = await writeSessionPlates(path.join(workDir, "layers"), hero);
    process.stdout.write(`plates ${plates.files.join(" ")}\n`);
    if (!plates.holdWallOk) {
      throw new Error(`generated hold has axis-aligned walls:\n${plates.holdWallReasons.join("\n")}`);
    }
    const scenePath = path.join(workDir, "scene.json");
    const scene = JSON.parse(fs.readFileSync(scenePath, "utf8")) as LooseScene;
    const patched = patchSessionScene(scene, hero);
    fs.writeFileSync(scenePath, `${JSON.stringify(patched, null, 2)}\n`);
  }

  const grade = await enforceSessionGrade(workDir, cwd);
  process.stdout.write(`session-grade OK (${grade.job} hero=${hero.kind})\n`);
  const rel = path.relative(cwd, workDir);
  process.stdout.write(
    `next (language sketches, Isaac picks a language): npx tsx scripts/export-layered.ts --title ${args.slug} --work-dir ${rel} --sketch\n` +
      `next (one 1632 preview): npx tsx scripts/export-layered.ts --title ${args.slug} --work-dir ${rel} --preview\n`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
