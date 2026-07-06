import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { sceneSchema } from "../../src/lib/scene-schema.js";
import { loadImageData } from "./image-stats.js";
import { addTrace, deriveParameters, readAnalysis, type Intent } from "./master-derivation.js";
import { DEFAULT_MOTION_TIER } from "./master-motion.js";
import { buildScene } from "./master-scene.js";
import { phaseOutputKinds, writeSceneVariants } from "./master-scene-variants.js";
import type { MotionTier } from "./master-motion.js";

type CliArgs = {
  readonly sourcePath: string;
  readonly focal?: readonly [number, number];
  readonly intent?: Intent;
  readonly motionTier: MotionTier;
  readonly title: string;
  readonly workDir: string;
  readonly render: boolean;
  readonly preview: boolean;
};

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\-_]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "untitled";
}

function parseFocal(value: string): readonly [number, number] {
  const [xRaw, yRaw] = value.split(",");
  const x = Number(xRaw);
  const y = Number(yRaw);
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error("expected --focal x,y");
  return [x, y];
}

function parseIntent(value: string | undefined): Intent {
  if (!value) return "vivid";
  if (value === "vivid" || value === "meditative" || value === "preserve") return value;
  throw new Error("expected --intent vivid|meditative|preserve");
}

function parseMotion(value: string | undefined): MotionTier {
  if (!value) return DEFAULT_MOTION_TIER;
  if (value === "calm" || value === "extreme") return value;
  throw new Error("expected --motion calm|extreme");
}

function parseCli(argv: readonly string[]): CliArgs {
  const sourcePath = argv[0];
  if (!sourcePath) throw new Error("usage: npx tsx scripts/master-pipeline.ts <source.png> [--focal x,y] [--intent vivid|meditative|preserve] [--motion calm|extreme] [--title name] [--work-dir <dir>] [--preview] [--no-render]");
  let focal: readonly [number, number] | undefined;
  let intent: Intent | undefined;
  let motionTier: MotionTier = DEFAULT_MOTION_TIER;
  let title = slugify(path.basename(sourcePath, path.extname(sourcePath)));
  let workDir: string | undefined;
  let render = true;
  let preview = false;
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--focal") {
      const value = argv[i + 1];
      if (!value) throw new Error("expected x,y after --focal");
      focal = parseFocal(value);
      i++;
    } else if (arg === "--intent") {
      intent = parseIntent(argv[i + 1]);
      i++;
    } else if (arg === "--motion") {
      const value = argv[i + 1];
      if (!value) throw new Error("expected calm|extreme after --motion");
      motionTier = parseMotion(value);
      i++;
    } else if (arg === "--title") {
      const value = argv[i + 1];
      if (!value) throw new Error("expected name after --title");
      title = slugify(value);
      i++;
    } else if (arg === "--work-dir") {
      const value = argv[i + 1];
      if (!value) throw new Error("expected directory after --work-dir");
      workDir = value;
      i++;
    } else if (arg === "--no-render") {
      render = false;
    } else if (arg === "--preview") {
      preview = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return { sourcePath, focal, intent, motionTier, title, workDir: path.resolve(workDir ?? path.join("out", "manual-runs", title)), render, preview };
}

function runRequired(label: string, command: string, args: readonly string[]): string {
  console.log(`${label}: ${command} ${args.join(" ")}`);
  const result = spawnSync(command, [...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) throw new Error(`${label} failed with exit ${result.status ?? "signal"}`);
  return result.stdout;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function printOperatorCommands(title: string, workDir: string, preview: boolean): void {
  const renderArgs = preview
    ? ["npx", "tsx", "scripts/export-layered.ts", "--title", title, "--work-dir", workDir, "--preview"]
    : ["npx", "tsx", "scripts/export-layered.ts", "--title", title, "--work-dir", workDir, "--fps", "30"];
  const render = renderArgs.map(shellQuote).join(" ");
  const videoName = preview ? `${title}-preview.mp4` : `${title}.mp4`;
  const qa = `MP4=$(find out/layered -name ${shellQuote(videoName)} -print | sort | tail -n 1)\nnpx tsx scripts/qa-motion.ts "$MP4" --masks ${shellQuote(path.join(workDir, "layers"))} --json ${shellQuote(path.join(workDir, "qa-report.json"))}`;
  console.log("Run these commands from the repo root:");
  console.log(render);
  console.log(qa);
}

function newestMp4(title: string, preview: boolean): string | undefined {
  const root = path.resolve("out", "layered");
  const videoName = preview ? `${title}-preview.mp4` : `${title}.mp4`;
  if (!fs.existsSync(root)) return undefined;
  const candidates: { readonly file: string; readonly mtime: number }[] = [];
  const visit = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      if (entry.isFile() && entry.name === videoName) candidates.push({ file: full, mtime: fs.statSync(full).mtimeMs });
    }
  };
  visit(root);
  return candidates.sort((a, b) => b.mtime - a.mtime)[0]?.file;
}

function runRendererAndQa(args: CliArgs): number {
  const exportArgs = args.preview
    ? ["tsx", "scripts/export-layered.ts", "--title", args.title, "--work-dir", args.workDir, "--preview"]
    : ["tsx", "scripts/export-layered.ts", "--title", args.title, "--work-dir", args.workDir, "--fps", "30"];
  const result = spawnSync("npx", exportArgs, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    if (combined.includes("EPERM") && combined.toLowerCase().includes("listen")) {
      console.log("Renderer could not bind the dev server in this sandbox; prep artifacts are complete.");
      printOperatorCommands(args.title, args.workDir, args.preview);
      return 0;
    }
    throw new Error(`export-layered failed with exit ${result.status ?? "signal"}`);
  }
  const matches = [...combined.matchAll(/Output:\s+(.+?\.mp4)/g)];
  const parsed = matches[matches.length - 1]?.[1]?.trim();
  const mp4 = parsed ? path.resolve(parsed) : newestMp4(args.title, args.preview);
  if (!mp4) throw new Error("export-layered completed but no output mp4 path was found");
  const qa = spawnSync("npx", ["tsx", "scripts/qa-motion.ts", mp4, "--masks", path.join(args.workDir, "layers"), "--json", path.join(args.workDir, "qa-report.json")], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (qa.stdout) process.stdout.write(qa.stdout);
  if (qa.stderr) process.stderr.write(qa.stderr);
  return qa.status ?? 1;
}

export async function runMasterPipeline(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
  const args = parseCli(argv);
  fs.mkdirSync(args.workDir, { recursive: true });
  const analysisPath = path.join(args.workDir, "analysis.json");
  runRequired("analyze-source", process.execPath, ["--import", "tsx", "scripts/analyze-source.ts", args.sourcePath, "--out", analysisPath]);
  const analysis = readAnalysis(analysisPath);
  if (analysis.M2.satMean < 0.08) {
    const ruleTrace = [{ parameter: "abort", value: analysis.M2.satMean, rule: "E-5.satMean<0.08", reason: "achromatic sources are outside the accepted derivation domain" }];
    writeJson(path.join(args.workDir, "derivation-report.json"), { aborted: true, reason: "achromatic source", motionTier: args.motionTier, M: analysis, ruleTrace });
    console.error(`Abort: achromatic source satMean=${analysis.M2.satMean} < 0.08. Report written to ${path.join(args.workDir, "derivation-report.json")}`);
    return 1;
  }
  runRequired("make-optical-layers", process.execPath, ["--import", "tsx", "scripts/make-optical-layers.ts", args.sourcePath, "--work-dir", args.workDir]);
  const derived = deriveParameters(analysis, { manualFocal: args.focal, requestedIntent: args.intent, motionTier: args.motionTier });
  const phaseArgs = ["--import", "tsx", "scripts/make-phase-field.ts", args.sourcePath, "--work-dir", args.workDir, "--kinds", phaseOutputKinds(derived.phaseKinds, derived.structureFlow).join(","), "--focal", `${derived.focal[0]},${derived.focal[1]}`];
  if (derived.structureFlow.strength > 0) phaseArgs.push("--figure-mask", path.join(args.workDir, "layers", "figure.png"));
  runRequired("make-phase-field", process.execPath, phaseArgs);
  const image = await loadImageData(args.sourcePath);
  const scene = buildScene(args.sourcePath, [image.width, image.height], analysis, derived);
  sceneSchema.parse(scene);
  addTrace(derived.ruleTrace, "schemaValidation", "pass", "E-2.step6.schema-validate", "sceneSchema.parse accepted generated scene.json");
  writeJson(path.join(args.workDir, "scene.json"), scene);
  const sceneVariants = writeSceneVariants({ workDir: args.workDir, scene, cameraDrift: derived.cameraDrift, structureFlow: derived.structureFlow, portalFeedback: derived.portalFeedback, motionTier: derived.motionTier });
  writeJson(path.join(args.workDir, "derivation-report.json"), { source: args.sourcePath, requestedIntent: args.intent ?? null, motionTier: derived.motionTier, intent: derived.resolvedIntent, title: args.title, workDir: args.workDir, preview: args.preview, sceneVariants, M: analysis, edgeCases: derived.edgeCases, derived: { colorPath: derived.colorPath, phaseWeights: derived.phaseWeights, phaseKinds: derived.phaseKinds, phaseOutputKinds: phaseOutputKinds(derived.phaseKinds, derived.structureFlow), focal: derived.focal, paletteName: derived.paletteName, paletteAmount: derived.paletteAmount, speeds: derived.speeds, phaseAmounts: derived.phaseAmounts, layerPhaseAmounts: derived.layerPhaseAmounts ?? null, greenRiskColorRoute: derived.greenRiskColorRoute, cameraDrift: derived.cameraDrift, structureFlow: derived.structureFlow, portalFeedback: derived.portalFeedback }, ruleTrace: derived.ruleTrace });
  console.log(`scene.json: ${path.join(args.workDir, "scene.json")}`);
  console.log(`scene variants: ${sceneVariants.map((fileName) => path.join(args.workDir, fileName)).join(", ")}`);
  console.log(`derivation-report.json: ${path.join(args.workDir, "derivation-report.json")}`);
  if (!args.render) {
    console.log("--no-render set; prep-only mode complete.");
    printOperatorCommands(args.title, args.workDir, args.preview);
    return 0;
  }
  return runRendererAndQa(args);
}
