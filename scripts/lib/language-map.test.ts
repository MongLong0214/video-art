import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { sceneSchema } from "../../src/lib/scene-schema.js";
import { CEILING, canonicalSceneHash, composeLanguageMap, gradeCeiling, measureLanguages } from "./language-map.js";
import type { LooseScene } from "./session-scene.js";

const golden = (): LooseScene => JSON.parse(fs.readFileSync("recipes/golden/eye-mirror-phase-advect-r221.json", "utf8")) as LooseScene;

const holdLayer = () => ({
  id: "figure-hold",
  file: "layers/figure-hold.png",
  animation: {
    sourcePrism: { amount: 1, surfaceCycles: 27, phaseFlowPx: 32 },
    colorMotionMask: { floor: 1 },
    glowWave: { strength: 0.58, speed: 12 },
    glowWave2: { strength: 0.36, speed: 22 },
    breath: { amplitude: 0.004 },
  },
});

describe("measureLanguages — counts shader activations, not names", () => {
  it("golden r221 as-is has only baseline L3 (gw2 0.06 and breath 0.003 do not count)", () => {
    const m = measureLanguages(golden());
    expect(m.distinct).toEqual(["L3"]);
    expect(m.composed).toEqual([]);
  });

  it("r346 v11-shaped scene: travel + counterflow + interference + textured hold + transport", () => {
    const g = golden();
    const a = g.layers![0].animation!;
    a.flowField = "layers/flow-halo-counter.png";
    a.sourceFlowAdvection = { amount: 1, maxDisplacementPx: 48, fieldAlign: 0.92 };
    a.sourceFlowTransport = { amount: 0.8, macroDisplacementPx: 34 };
    a.glowWave = { strength: 0.5, speed: 11 };
    a.glowWave2 = { strength: 0.3, speed: 22 }; // 2:1 = integer ratio → not interference by itself
    const m = measureLanguages({ ...g, layers: [g.layers![0], holdLayer()] });
    expect(m.perLayer[0]).toEqual(["L1", "L2", "L3", "L8"]);
    expect(m.perLayer[1]).toEqual(["L3", "L4", "L5", "L10"].filter((id) => id !== "L10")); // hold breath 0.004 < 0.01
    expect(m.composed).toEqual(expect.arrayContaining(["L1", "L2", "L4", "L5", "L8"]));
  });

  it("reports pending languages (L7/L9) but still counts them; L6 counts and is not pending", () => {
    const g = golden();
    g.effects = { ...g.effects, multipassFeedback: { ...(g.effects?.multipassFeedback ?? {}), zoom: 1.004, reactionDiffusionAmount: 0.3 } };
    const m = measureLanguages(g);
    expect(m.pending).toEqual(["L7"]);
    expect(m.composed).toEqual(["L6", "L7"]);
  });
});

describe("composeLanguageMap", () => {
  it("turns golden r221 into a macro-moving scene (L1 travel + L6 vection) and stays schema-valid", () => {
    const composed = composeLanguageMap(golden());
    const m = measureLanguages(composed);
    expect(m.composed.length).toBeGreaterThanOrEqual(CEILING.minComposed);
    expect(m.composed).toEqual(expect.arrayContaining(["L1", "L4", "L6", "L8", "L10"]));
    expect(m.pending).toEqual([]); // L7/L9 are Isaac's decisions, never auto-enabled
    const parsed = sceneSchema.safeParse(composed);
    expect(parsed.success, JSON.stringify(parsed.success ? "" : parsed.error.issues.slice(0, 3))).toBe(true);
    // identity / melt drivers untouched; hues now sweep (chromaCycles 3, r346 v11 ✓)
    const a = composed.layers![0].animation!;
    const gp = golden().layers![0].animation!.sourcePrism as Record<string, number>;
    const cp = a.sourcePrism as Record<string, number>;
    expect(cp.phaseFlowPx).toBe(gp.phaseFlowPx);
    expect(cp.surfaceCycles).toBe(gp.surfaceCycles);
    expect(cp.chromaCycles).toBe(3);
    expect((a.colorCycle as { speed: number }).speed).toBe(0);
    expect((composed.effects?.multipassFeedback as { rotate: number }).rotate).toBe(0);
  });

  it("does not add plate-style advection on a travel hero (plates already carry L1)", () => {
    const hero = { kind: "halo" } as unknown as import("./hero-detect.js").HeroDetect;
    const composed = composeLanguageMap(golden(), hero);
    expect(composed.layers![0].animation!.sourceFlowAdvection).toBeUndefined();
  });

  it("changes the canonical hash (a composed scene is never a golden clone)", () => {
    expect(canonicalSceneHash(composeLanguageMap(golden()))).not.toBe(canonicalSceneHash(golden()));
  });
});

describe("gradeCeiling", () => {
  const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "ceiling-"));
  const base = (workDir: string, runsRoot: string, sceneSha = "a".repeat(64)) => ({
    sceneSha256: sceneSha,
    sourceSha256: "s".repeat(64),
    workDir,
    heroTravel: false,
    goldenDir: "recipes/golden",
    runsRoot,
  });

  it("refuses golden as-is (r349) and names the golden", () => {
    const root = tmp();
    const wd = path.join(root, "r999-x");
    fs.mkdirSync(wd);
    const g = gradeCeiling(golden(), base(wd, root));
    expect(g.ok).toBe(false);
    expect(g.reasons.some((r) => /golden eye-mirror-phase-advect-r221\.json as-is/.test(r))).toBe(true);
    expect(g.reasons.some((r) => /composed language/.test(r))).toBe(true);
    expect(g.reasons.some((r) => /no macro language/.test(r))).toBe(true);
  });

  it("refuses ≥3 composed languages when none of them is macro (garnish only)", () => {
    const root = tmp();
    const wd = path.join(root, "r999-x");
    fs.mkdirSync(wd);
    const g = golden();
    const a = g.layers![0].animation!;
    a.phaseWarpAmount = 0.2;
    a.sourceMaterialDissolve = { amount: 0.42, maxDisplacementPx: 22 };
    a.breath = { amplitude: 0.032, frequency: 2, period: 20 };
    const grade = gradeCeiling(g, base(wd, root));
    expect(measureLanguages(g).composed).toEqual(["L4", "L8", "L10"]);
    expect(grade.ok).toBe(false);
    expect(grade.reasons).toEqual([expect.stringMatching(/no macro language/)]);
  });

  it("passes a composed scene", () => {
    const root = tmp();
    const wd = path.join(root, "r999-x");
    fs.mkdirSync(wd);
    const g = gradeCeiling(composeLanguageMap(golden()), base(wd, root));
    expect(g.ok).toBe(true);
    expect(g.reasons).toEqual([]);
  });

  it("refuses a same-source replay of another slug's scene (r351 v1), allows it on a different source", () => {
    const root = tmp();
    const other = path.join(root, "r346-old");
    const wd = path.join(root, "r351-new");
    fs.mkdirSync(other);
    fs.mkdirSync(wd);
    const scene = composeLanguageMap(golden());
    fs.writeFileSync(path.join(other, "scene-v11.json"), JSON.stringify(scene, null, 2));
    fs.writeFileSync(path.join(other, "hero.json"), JSON.stringify({ kind: "halo", sourceSha256: "s".repeat(64) }));
    const same = gradeCeiling(scene, base(wd, root));
    expect(same.ok).toBe(false);
    expect(same.reasons.some((r) => /replays r346-old\/scene-v11\.json on the same source/.test(r))).toBe(true);
    const diff = gradeCeiling(scene, { ...base(wd, root), sourceSha256: "t".repeat(64) });
    expect(diff.ok).toBe(true);
  });

  it("requires ≥2 languages on the hero layer when the hero travels", () => {
    const root = tmp();
    const wd = path.join(root, "r999-x");
    fs.mkdirSync(wd);
    const g = golden();
    // three composed languages, but all on a second layer — hero layer stays golden L3 only
    const scene = { ...g, layers: [g.layers![0], { ...composeLanguageMap(g).layers![0], id: "other", file: "layers/x.png", animation: { ...composeLanguageMap(g).layers![0].animation, sourcePrism: { amount: 0 } } }] };
    const grade = gradeCeiling(scene, { ...base(wd, root), heroTravel: true });
    expect(grade.ok).toBe(false);
    expect(grade.reasons.some((r) => /hero layer has 1 language/.test(r))).toBe(true);
  });

  it("honors an Isaac waiver only for the exact scene sha", () => {
    const root = tmp();
    const wd = path.join(root, "r999-x");
    fs.mkdirSync(wd);
    const waiver = { approvedBy: "isaac" as const, reason: "221 그대로", at: "t", sceneSha256: "a".repeat(64) };
    expect(gradeCeiling(golden(), { ...base(wd, root), waiver }).ok).toBe(true);
    expect(gradeCeiling(golden(), { ...base(wd, root, "b".repeat(64)), waiver }).ok).toBe(false);
  });
});
