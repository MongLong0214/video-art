/**
 * Scaffold a deterministic layered work dir for a new source.
 *
 * Usage:
 *   npx tsx scripts/scaffold-layered-run.ts \
 *     --source /path/to.png \
 *     --slug eye-mirror-test \
 *     --recipe recipes/golden/eye-mirror-phase-advect-r221.json \
 *     --work-dir out/manual-runs/rNNN-eye-mirror-test
 *
 * Then:
 *   npx tsx scripts/export-layered.ts --title <slug> --work-dir <work-dir> --preview
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { z } from "zod";

const arg = z.string().trim().min(1);

function req(argv: readonly string[], i: number, flag: string): string {
  const v = argv[i + 1];
  if (!v || v.startsWith("--")) throw new Error(`expected value after ${flag}`);
  return arg.parse(v);
}

function parse(argv: readonly string[]): {
  source: string;
  slug: string;
  recipe: string;
  workDir: string;
  focal?: string;
} {
  let source: string | undefined;
  let slug: string | undefined;
  let recipe: string | undefined;
  let workDir: string | undefined;
  let focal: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const f = argv[i];
    if (f === "--source") source = req(argv, i++, f);
    else if (f === "--slug") slug = req(argv, i++, f);
    else if (f === "--recipe") recipe = req(argv, i++, f);
    else if (f === "--work-dir") workDir = req(argv, i++, f);
    else if (f === "--focal") focal = req(argv, i++, f);
    else throw new Error(`unknown arg: ${f}`);
  }
  if (!source || !slug || !recipe || !workDir) {
    throw new Error(
      "usage: --source <png> --slug <name> --recipe <golden.json> --work-dir <dir> [--focal x,y]",
    );
  }
  return { source, slug, recipe, workDir, focal };
}

function sha256(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

async function main(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  const args = parse(argv);
  const sourcePath = path.resolve(args.source);
  const recipePath = path.resolve(args.recipe);
  const workDir = path.resolve(args.workDir);
  if (!fs.existsSync(sourcePath)) throw new Error(`source not found: ${sourcePath}`);
  if (!fs.existsSync(recipePath)) throw new Error(`recipe not found: ${recipePath}`);

  const meta = await sharp(sourcePath).metadata();
  if (!meta.width || !meta.height) throw new Error("source has no dimensions");
  const layersDir = path.join(workDir, "layers");
  fs.mkdirSync(layersDir, { recursive: true });
  fs.copyFileSync(sourcePath, path.join(workDir, "source.png"));
  fs.copyFileSync(sourcePath, path.join(layersDir, "source.png"));

  // Phase/flow fields required by sourcePrism / phase recipes.
  const focalArgs = args.focal ? ["--focal", args.focal] : [];
  execFileSync(
    "npx",
    [
      "tsx",
      "scripts/make-phase-field.ts",
      path.join(workDir, "source.png"),
      "--work-dir",
      workDir,
      "--kinds",
      "radial,luminance,edge,detail,vertical,angular,flow",
      ...focalArgs,
    ],
    { stdio: "inherit" },
  );

  // phase-mix = 0.45*luma + 0.35*edge + 0.2*radial (matches r221 operational practice)
  const [L, E, R] = await Promise.all([
    sharp(path.join(layersDir, "phase-luminance.png")).greyscale().raw().toBuffer({ resolveWithObject: true }),
    sharp(path.join(layersDir, "phase-edge.png")).greyscale().raw().toBuffer({ resolveWithObject: true }),
    sharp(path.join(layersDir, "phase-radial.png")).greyscale().raw().toBuffer({ resolveWithObject: true }),
  ]);
  const mix = Buffer.alloc(L.data.length);
  for (let i = 0; i < mix.length; i++) {
    mix[i] = Math.min(255, Math.round(L.data[i] * 0.45 + E.data[i] * 0.35 + R.data[i] * 0.2));
  }
  await sharp(mix, { raw: { width: L.info.width, height: L.info.height, channels: 1 } })
    .png()
    .toFile(path.join(layersDir, "phase-mix.png"));

  // Optional alias used by some woodblock recipes
  if (!fs.existsSync(path.join(layersDir, "phase-luma-hybrid.png"))) {
    fs.copyFileSync(path.join(layersDir, "phase-mix.png"), path.join(layersDir, "phase-luma-hybrid.png"));
  }

  const recipe = JSON.parse(fs.readFileSync(recipePath, "utf8")) as {
    resolution?: [number, number];
    source?: string;
    layers?: Array<{ file?: string; animation?: Record<string, unknown> }>;
    duration?: number;
    fps?: number;
  };
  recipe.source = "layers/source.png";
  recipe.resolution = [meta.width, meta.height];
  recipe.duration = recipe.duration ?? 20;
  recipe.fps = recipe.fps ?? 30;
  if (Array.isArray(recipe.layers) && recipe.layers.length === 1) {
    recipe.layers[0].file = "layers/source.png";
    const anim = recipe.layers[0].animation as { sourcePrism?: { phaseFlowPx?: number } } | undefined;
    if (anim?.sourcePrism && typeof anim.sourcePrism.phaseFlowPx === "number") {
      // Golden recipes are authored for ~1632px width; scale flow px if source width differs.
      if (Math.abs(meta.width - 1632) > 64) {
        anim.sourcePrism.phaseFlowPx = Math.max(1, Math.round(anim.sourcePrism.phaseFlowPx * (meta.width / 1632)));
      }
    }
  }
  fs.writeFileSync(path.join(workDir, "scene.json"), `${JSON.stringify(recipe, null, 2)}\n`);

  // Source analysis snapshot for classification
  try {
    execFileSync(
      "npx",
      ["tsx", "scripts/analyze-source.ts", path.join(workDir, "source.png"), "--out", path.join(workDir, "analysis.json")],
      { stdio: "inherit" },
    );
  } catch {
    // non-fatal: agent can re-run
  }

  const manifest = {
    slug: args.slug,
    sourcePath,
    sourceSha256: sha256(sourcePath),
    recipePath,
    workDir,
    resolution: [meta.width, meta.height],
    createdAt: new Date().toISOString(),
    next: [
      `npx tsx scripts/export-layered.ts --title ${args.slug} --work-dir ${path.relative(process.cwd(), workDir)} --preview`,
      `npx tsx scripts/qa-motion.ts out/layered/*${args.slug}*/${args.slug}-preview.mp4 --source ${path.relative(process.cwd(), workDir)}/source.png --json ${path.relative(process.cwd(), workDir)}/qa-preview.json`,
    ],
  };
  fs.writeFileSync(path.join(workDir, "scaffold-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`scaffold ok: ${workDir}\n`);
  process.stdout.write(`${JSON.stringify(manifest.next, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
