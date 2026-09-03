/**
 * Ceiling contract as code (00 §3). r349 shipped golden r221 byte-identical (82 keys, 0 diffs) one day after
 * the ceiling was written as prose — prose is a request, this file is a refusal.
 *
 * - `measureLanguages` counts *shader activations above golden-default thresholds*, not names.
 *   golden r221 already carries glowWave2 0.06 and breath 0.003; those do not count as L4 / L10.
 * - `composeLanguageMap` gives every prepared scene ≥3 composed languages by default (values from r351 v2,
 *   the only scene measured to move pixels: SSIM 0.548 vs its clone). Isaac judges the look; this guarantees
 *   there is a look to judge.
 * - `gradeCeiling` refuses a golden as-is and a same-source replay of another slug's scene (r351 v1),
 *   unless Isaac waived it for that exact scene sha.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { HeroDetect } from "./hero-detect.js";
import type { LooseAnim, LooseLayer, LooseScene } from "./session-scene.js";

export type LanguageId = "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7" | "L8" | "L9" | "L10";

export type LanguageHit = { readonly id: LanguageId; readonly layer: number; readonly evidence: string };

export type LanguageMap = {
  readonly hits: readonly LanguageHit[];
  readonly perLayer: readonly (readonly LanguageId[])[];
  readonly distinct: readonly LanguageId[];
  /** distinct minus the baseline every golden already has (L3). This is what the ceiling counts. */
  readonly composed: readonly LanguageId[];
  /** present but still awaiting Isaac's yes (00 §3.1). They count; they are reported. */
  readonly pending: readonly LanguageId[];
};

export const CEILING = { minComposed: 3, heroMinLanguages: 2 } as const;
const BASELINE: readonly LanguageId[] = ["L3"];
const PENDING: readonly LanguageId[] = ["L6", "L7", "L9"];

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

function nonIntegerRatio(a: number, b: number): boolean {
  if (a === 0 || b === 0) return false;
  const r = Math.max(a, b) / Math.min(a, b);
  return Math.abs(r - Math.round(r)) >= 0.15;
}

export function measureLanguages(scene: LooseScene): LanguageMap {
  const hits: LanguageHit[] = [];
  const layers = scene.layers ?? [];
  const fx = obj(scene.effects);
  const mp = obj(fx.multipassFeedback);
  const cam = obj(fx.cameraDrift);

  layers.forEach((layer, i) => {
    const a = obj(layer.animation) as LooseAnim;
    const adv = obj(a.sourceFlowAdvection);
    const tr = obj(a.sourceFlowTransport);
    const pr = obj(a.sourcePrism);
    const gw = obj(a.glowWave);
    const gw2 = obj(a.glowWave2);
    const cmm = obj(a.colorMotionMask);
    const dis = obj(a.sourceMaterialDissolve);
    const spec = obj(a.sourceSpectralFlow);
    const chr = obj(a.sourceChromaFlow);
    const tan = obj(a.tangentMicroflow);
    const br = obj(a.breath);

    if (num(adv.amount) > 0 && num(adv.maxDisplacementPx) >= 24 && num(adv.fieldAlign) >= 0.5) {
      hits.push({ id: "L1", layer: i, evidence: `advection ${num(adv.maxDisplacementPx)}px fieldAlign ${num(adv.fieldAlign)}` });
    }
    if (/counter/.test(String(a.flowField ?? ""))) hits.push({ id: "L2", layer: i, evidence: String(a.flowField) });
    if (num(pr.amount) > 0 && Math.abs(num(pr.surfaceCycles)) >= 0.5) {
      hits.push({ id: "L3", layer: i, evidence: `prism surface ${num(pr.surfaceCycles)} flow ${num(pr.phaseFlowPx)}px` });
    }
    const waves = num(gw.strength) >= 0.2 && num(gw2.strength) >= 0.12 && nonIntegerRatio(num(gw.speed), num(gw2.speed));
    const warp = num(a.phaseWarpAmount) >= 0.05;
    if (waves || warp) {
      hits.push({
        id: "L4",
        layer: i,
        evidence: [waves ? `glowWave ${num(gw.strength)}/${num(gw.speed)} : ${num(gw2.strength)}/${num(gw2.speed)}` : "", warp ? `phaseWarp ${num(a.phaseWarpAmount)}` : ""]
          .filter(Boolean)
          .join(" + "),
      });
    }
    if (i >= 1 && num(pr.amount) > 0 && Math.abs(num(pr.surfaceCycles)) >= 20 && num(cmm.floor) >= 0.9) {
      hits.push({ id: "L5", layer: i, evidence: `textured hold surface ${num(pr.surfaceCycles)} floor ${num(cmm.floor)}` });
    }
    const mid: string[] = [];
    if (num(dis.amount) >= 0.2 && num(dis.maxDisplacementPx) >= 4) mid.push(`dissolve ${num(dis.amount)}/${num(dis.maxDisplacementPx)}px`);
    if (num(spec.amount) >= 0.2 && num(spec.radiusPx) >= 4) mid.push(`spectral ${num(spec.amount)}/${num(spec.radiusPx)}px`);
    if (num(chr.amount) >= 0.2 && num(chr.maxDisplacementPx) >= 2) mid.push(`chromaFlow ${num(chr.amount)}/${num(chr.maxDisplacementPx)}px`);
    if (num(tan.amount) >= 0.2 && num(tan.maxDisplacementPx) >= 1) mid.push(`tangent ${num(tan.amount)}/${num(tan.maxDisplacementPx)}px`);
    if (num(tr.amount) >= 0.5 && num(tr.macroDisplacementPx) >= 16) mid.push(`transport ${num(tr.amount)}/${num(tr.macroDisplacementPx)}px`);
    if (mid.length > 0) hits.push({ id: "L8", layer: i, evidence: mid.join(", ") });
    if (num(obj(a.colorCycle).speed) !== 0) hits.push({ id: "L9", layer: i, evidence: `colorCycle ${num(obj(a.colorCycle).speed)}` });
    if (num(br.amplitude) >= 0.01) hits.push({ id: "L10", layer: i, evidence: `breath ${num(br.amplitude)} × ${num(br.frequency)}` });
  });

  if (Math.abs(num(mp.zoom) - 1) >= 0.002 && num(mp.zoom) !== 0) hits.push({ id: "L6", layer: -1, evidence: `feedback zoom ${num(mp.zoom)}` });
  if (num(cam.radius) > 0) hits.push({ id: "L6", layer: -1, evidence: `cameraDrift ${num(cam.radius)}` });
  if (num(mp.reactionDiffusionAmount) > 0) hits.push({ id: "L7", layer: -1, evidence: `reactionDiffusion ${num(mp.reactionDiffusionAmount)}` });

  const perLayer = layers.map((_, i) => [...new Set(hits.filter((h) => h.layer === i).map((h) => h.id))]);
  const distinct = [...new Set(hits.map((h) => h.id))].sort((x, y) => Number(x.slice(1)) - Number(y.slice(1)));
  return {
    hits,
    perLayer,
    distinct,
    composed: distinct.filter((id) => !BASELINE.includes(id)),
    pending: distinct.filter((id) => PENDING.includes(id)),
  };
}

/**
 * Default composition on layer 0: L4 (two luma waves 3:5 + phase warp) + L8 (dissolve, spectral, chroma flow) + L10 (macro breath).
 * Prism, colorCycle, plates and hold are untouched (identity + R-042 + 04 stay as they were).
 * L6 / L7 / L9 are deliberately not enabled here — they are Isaac's three open decisions (00 §3.1).
 */
export function composeLanguageMap(scene: LooseScene, _hero?: HeroDetect): LooseScene {
  const layers: LooseLayer[] = (scene.layers ?? []).map((l) => ({ ...l, animation: { ...(l.animation ?? {}) } }));
  if (layers.length === 0) throw new Error("scene has no layers to compose");
  const duration = num(scene.duration) || 20;
  const a = layers[0].animation as LooseAnim;
  a.glowWave = { strength: 0.4, speed: 3, sharpness: 0.22, fieldCycles: 0.9 };
  a.glowWave2 = { strength: 0.26, speed: 5, sharpness: 0.18, fieldCycles: 1.4 };
  a.phaseWarpAmount = 0.12;
  a.sourceMaterialDissolve = { amount: 0.42, maxDisplacementPx: 22, cycles: 3, wavelengthPx: 72, edgePreserve: 0.5, streamPhase: false };
  a.sourceSpectralFlow = { amount: 0.48, radiusPx: 16, cycles: 3, phaseScale: 1.15, normalMix: 0.18 };
  a.sourceChromaFlow = { amount: 0.5, maxDisplacementPx: 6, cycles: 5, phaseScale: 1.2, normalMix: 0.18, detailGain: 2 };
  a.breath = { amplitude: 0.032, frequency: 2, period: duration };
  if (a.flowField === undefined) a.flowField = "layers/flow-field.png"; // dissolve requires a source-derived flow field
  layers[0].animation = a;
  return { ...scene, layers };
}

export type CeilingWaiver = { readonly approvedBy: "isaac"; readonly reason: string; readonly at: string; readonly sceneSha256: string };

export type CeilingOptions = {
  readonly sceneSha256: string;
  readonly sourceSha256: string;
  readonly workDir: string;
  readonly heroTravel: boolean;
  readonly goldenDir: string;
  readonly runsRoot: string;
  readonly waiver?: CeilingWaiver;
};

export type CeilingGrade = { readonly ok: boolean; readonly reasons: readonly string[]; readonly map: LanguageMap; readonly waived: boolean };

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function canonicalSceneHash(scene: unknown): string {
  return createHash("sha256").update(canonical(scene)).digest("hex");
}

function readJson(p: string): unknown | undefined {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as unknown;
  } catch {
    return undefined;
  }
}

export function loadCeilingWaiver(workDir: string): CeilingWaiver | undefined {
  const w = readJson(path.join(workDir, "ceiling-waiver.json")) as Partial<CeilingWaiver> | undefined;
  if (!w || w.approvedBy !== "isaac" || typeof w.reason !== "string" || typeof w.sceneSha256 !== "string") return undefined;
  return w as CeilingWaiver;
}

export function gradeCeiling(scene: LooseScene, opts: CeilingOptions): CeilingGrade {
  const map = measureLanguages(scene);
  if (opts.waiver && opts.waiver.sceneSha256 === opts.sceneSha256) {
    return { ok: true, reasons: [], map, waived: true };
  }
  const reasons: string[] = [];
  const hash = canonicalSceneHash(scene);

  if (fs.existsSync(opts.goldenDir)) {
    for (const f of fs.readdirSync(opts.goldenDir).filter((n) => n.endsWith(".json"))) {
      const g = readJson(path.join(opts.goldenDir, f));
      if (g !== undefined && canonicalSceneHash(g) === hash) {
        reasons.push(
          `scene is golden ${f} as-is — that is the r343/r345/r349 failure, not a first look. prepare-new-source composes by default; a golden-as-is preview needs Isaac's waiver (isaac-pick.ts --ceiling-waive)`,
        );
      }
    }
  }

  if (fs.existsSync(opts.runsRoot)) {
    const self = path.resolve(opts.workDir);
    for (const dir of fs.readdirSync(opts.runsRoot)) {
      const abs = path.join(opts.runsRoot, dir);
      if (path.resolve(abs) === self) continue;
      const hero = readJson(path.join(abs, "hero.json")) as { sourceSha256?: string } | undefined;
      if (hero?.sourceSha256 !== opts.sourceSha256) continue;
      let entries: string[] = [];
      try {
        entries = fs.readdirSync(abs).filter((n) => /^scene.*\.json$/.test(n));
      } catch {
        continue;
      }
      for (const n of entries) {
        const s = readJson(path.join(abs, n));
        if (s !== undefined && canonicalSceneHash(s) === hash) {
          reasons.push(`scene replays ${dir}/${n} on the same source pixels (r351 v1 "결과물이 똑같잖아") — compose a new map or rebuild that slug as a closed lock`);
        }
      }
    }
  }

  if (map.composed.length < CEILING.minComposed) {
    reasons.push(
      `ceiling: ${map.composed.length} composed language(s) [${map.composed.join(", ") || "none"}] < ${CEILING.minComposed}. active=[${map.distinct.join(", ") || "none"}]. baseline L3 and golden-default glowWave2/breath do not count.`,
    );
  }
  if (opts.heroTravel && (map.perLayer[0]?.length ?? 0) < CEILING.heroMinLanguages) {
    reasons.push(`ceiling: hero layer has ${map.perLayer[0]?.length ?? 0} language(s) [${(map.perLayer[0] ?? []).join(", ")}] < ${CEILING.heroMinLanguages}`);
  }
  return { ok: reasons.length === 0, reasons, map, waived: false };
}
