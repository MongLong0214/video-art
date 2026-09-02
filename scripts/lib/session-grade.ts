/**
 * Pre-Isaac execution bar. Export must refuse a frozen-hero / box-hold / spin preview.
 *
 * Closed locks (source+scene sha match manifest): layer files exist and match
 * source size. Do not re-litigate Isaac-approved holds or 0.002 rotate.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { detectHero, needsCustomTravel, type HeroDetect } from "./hero-detect.js";
import { assertFigureVividLegal } from "./figure-vivid-legal.js";
import { loadHoldAlpha, scanHoldPng } from "./hold-walls.js";
import { plateNamesFor, sceneNeedsTravelPlates, type LooseScene } from "./session-scene.js";
import type { ClosedLockManifest } from "./rebuild-closed-lock.js";

export type SessionGrade = {
  readonly ok: boolean;
  readonly job: "closed-lock" | "new-source";
  readonly reasons: string[];
  readonly hero?: HeroDetect;
  readonly slug?: string;
};

const TARGET = { width: 1632, height: 2912 };

function sha256File(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function loadManifest(cwd: string): ClosedLockManifest {
  const p = path.join(cwd, "recipes/locks/manifest.json");
  if (!fs.existsSync(p)) return { approved: [] };
  return JSON.parse(fs.readFileSync(p, "utf8")) as ClosedLockManifest;
}

/**
 * prepare-new-source writes hero.json (detector result or `--hero` override) tagged with the source sha.
 * Grade that hero so an Isaac/agent override is enforced instead of silently re-detected away (r346/r348).
 * A stale hero.json from another source (sha mismatch) is ignored.
 */
async function loadPreparedHero(workDir: string, sourcePath: string, sourceSha: string): Promise<HeroDetect> {
  const heroPath = path.join(workDir, "hero.json");
  if (fs.existsSync(heroPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(heroPath, "utf8")) as Partial<HeroDetect>;
      if (parsed.sourceSha256 === sourceSha && typeof parsed.kind === "string" && typeof parsed.cx === "number") {
        return parsed as HeroDetect;
      }
    } catch {
      // fall through to a fresh detect
    }
  }
  return detectHero(sourcePath);
}

function layerFiles(scene: LooseScene): string[] {
  return (scene.layers ?? []).map((layer) => layer.file).filter((file): file is string => typeof file === "string");
}

function isHoldFile(file: string): boolean {
  const base = path.basename(file);
  return base !== "source.png" && (base.includes("hold") || base.includes("deity") || base === "figure-hold.png");
}

function sceneUsesPrism(scene: LooseScene): boolean {
  const prism = scene.layers?.[0]?.animation?.sourcePrism as { amount?: number } | null | undefined;
  return Boolean(prism && Number(prism.amount) > 0);
}

function sheetRecipeOk(scene: LooseScene): boolean {
  const id = `${scene.layers?.[0]?.id ?? ""}`;
  const phase = `${scene.layers?.[0]?.animation?.phaseField ?? ""}`;
  return /oil|paint|slick|smear/i.test(id) || /phase-vertical/.test(phase);
}

export function collectSpinReasons(scene: LooseScene): string[] {
  const reasons: string[] = [];
  for (const layer of scene.layers ?? []) {
    const anim = (layer.animation ?? {}) as Record<string, unknown>;
    const phase = `${anim.phaseField ?? ""}${anim.phaseField2 ?? ""}`;
    if (phase.includes("angular")) reasons.push("phase-angular is banned (R-060)");
    if (Number(anim.polarTwist ?? 0) !== 0) reasons.push(`polarTwist must be 0 (got ${anim.polarTwist})`);
    if (Number(anim.rotateSpeed ?? 0) !== 0) reasons.push(`rotateSpeed must be 0 (got ${anim.rotateSpeed})`);
  }
  const effects = (scene.effects ?? {}) as {
    multipassFeedback?: { rotate?: number };
    kaleidoscope?: { segments?: number };
  };
  const rotate = effects.multipassFeedback?.rotate ?? 0;
  if (rotate !== 0) reasons.push(`multipassFeedback.rotate must be 0 (got ${rotate})`);
  const segments = effects.kaleidoscope?.segments ?? 0;
  if (segments !== 0) reasons.push(`kaleidoscope.segments must be 0 (got ${segments})`);
  return reasons;
}

async function assertLayerSizes(
  workDir: string,
  files: readonly string[],
  sourceW: number,
  sourceH: number,
  reasons: string[],
): Promise<void> {
  for (const rel of files) {
    const abs = path.join(workDir, rel);
    if (!fs.existsSync(abs)) {
      reasons.push(`missing layer ${rel}`);
      continue;
    }
    const meta = await sharp(abs).metadata();
    if (!meta.width || !meta.height) {
      reasons.push(`${rel} has no dimensions`);
      continue;
    }
    if (meta.width !== sourceW || meta.height !== sourceH) {
      reasons.push(`${rel} is ${meta.width}x${meta.height}, source is ${sourceW}x${sourceH}`);
    }
  }
}

async function assertNewSourceHolds(workDir: string, files: readonly string[], hero: HeroDetect, reasons: string[]): Promise<void> {
  for (const rel of files) {
    const abs = path.join(workDir, rel);
    if (!fs.existsSync(abs) || !isHoldFile(rel)) continue;
    const walls = await scanHoldPng(abs);
    if (!walls.ok) reasons.push(...walls.reasons.map((r) => `${rel}: ${r}`));
    if (!needsCustomTravel(hero.kind)) continue;
    const { alpha, width, height } = await loadHoldAlpha(abs);
    const x = Math.min(width - 1, Math.max(0, hero.cx));
    const y = Math.min(height - 1, Math.max(0, hero.cy));
    const a = alpha[y * width + x] ?? 0;
    if (a > 0.28) {
      reasons.push(`${rel} holds the hero (alpha ${a.toFixed(2)} at ${hero.cxN.toFixed(2)},${hero.cyN.toFixed(2)})`);
    }
  }
}

export async function gradeSession(workDir: string, cwd = process.cwd()): Promise<SessionGrade> {
  const reasons: string[] = [];
  const sourcePath = path.join(workDir, "source.png");
  const scenePath = path.join(workDir, "scene.json");
  if (!fs.existsSync(sourcePath)) return { ok: false, job: "new-source", reasons: ["missing source.png"] };
  if (!fs.existsSync(scenePath)) return { ok: false, job: "new-source", reasons: ["missing scene.json"] };

  let scene: LooseScene;
  try {
    scene = JSON.parse(fs.readFileSync(scenePath, "utf8")) as LooseScene;
  } catch {
    return { ok: false, job: "new-source", reasons: ["scene.json is not valid JSON"] };
  }

  const sourceMeta = await sharp(sourcePath).metadata();
  const sourceW = sourceMeta.width ?? 0;
  const sourceH = sourceMeta.height ?? 0;
  const sourceSha = sha256File(sourcePath);
  const sceneSha = sha256File(scenePath);
  const manifest = loadManifest(cwd);
  const closed = manifest.approved.find((entry) => entry.sourceSha256 === sourceSha && entry.sceneSha256 === sceneSha);
  const files = layerFiles(scene);

  if (closed) {
    await assertLayerSizes(workDir, files, sourceW, sourceH, reasons);
    return { ok: reasons.length === 0, job: "closed-lock", reasons, slug: closed.slug };
  }

  if (sourceW !== TARGET.width || sourceH !== TARGET.height) {
    reasons.push(
      `source must be ${TARGET.width}x${TARGET.height} (got ${sourceW}x${sourceH}) — lanczos via prepare-new-source`,
    );
  }

  reasons.push(...collectSpinReasons(scene));

  const hero = await loadPreparedHero(workDir, sourcePath, sourceSha);

  if (sceneUsesPrism(scene)) {
    const legal = assertFigureVividLegal(scene);
    if (!legal.ok) reasons.push(...legal.reasons);
  }

  if (needsCustomTravel(hero.kind)) {
    if (!sceneNeedsTravelPlates(scene)) {
      reasons.push(
        `hero=${hero.kind} requires custom flow/phase + sourceFlowAdvection (fieldAlign≥0.5, throw≥24px). Scaffold-only r221 is a miss.`,
      );
    }
    const names = plateNamesFor(hero.kind);
    for (const rel of [names.flow, names.phase, names.hold]) {
      if (!fs.existsSync(path.join(workDir, rel))) reasons.push(`missing ${rel}`);
    }
    const adv = scene.layers?.[0]?.animation?.sourceFlowAdvection as
      | { forwardBias?: number; fieldAlign?: number }
      | undefined;
    if (hero.kind === "pour" && Number(adv?.forwardBias ?? 0) < 0.35) {
      reasons.push(`pour requires sourceFlowAdvection.forwardBias ≥ 0.35 (got ${adv?.forwardBias ?? 0})`);
    }
    if (Number(adv?.fieldAlign ?? 0) < 0.5) {
      reasons.push(`hero travel requires fieldAlign ≥ 0.5 (got ${adv?.fieldAlign ?? 0})`);
    }
  }

  if (hero.kind === "sheet" && !sheetRecipeOk(scene)) {
    reasons.push("hero=sheet requires oil-slick-macro-bands or paint-smear-multipass, not an r221 river");
  }

  await assertLayerSizes(workDir, files, sourceW, sourceH, reasons);
  await assertNewSourceHolds(workDir, files, hero, reasons);

  return { ok: reasons.length === 0, job: "new-source", reasons, hero };
}

export async function enforceSessionGrade(workDir: string, cwd = process.cwd()): Promise<SessionGrade> {
  const grade = await gradeSession(workDir, cwd);
  const out = path.join(workDir, "session-grade.json");
  fs.writeFileSync(out, `${JSON.stringify(grade, null, 2)}\n`);
  if (!grade.ok) {
    throw new Error(
      `session-grade FAIL (${grade.job}${grade.hero ? ` hero=${grade.hero.kind}` : ""}):\n` +
        grade.reasons.map((r) => `  - ${r}`).join("\n") +
        `\nRun: npx tsx scripts/prepare-new-source.ts --source <png> --slug <slug> --recipe recipes/golden/<file>.json --work-dir ${workDir}`,
    );
  }
  return grade;
}
