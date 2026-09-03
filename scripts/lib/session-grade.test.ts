import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { applyHeroOverride, detectHero } from "./hero-detect.js";
import { fillBoxAlpha } from "./hold-walls.js";
import { writeSessionPlates } from "./session-plates.js";
import { collectSpinReasons, gradeSession } from "./session-grade.js";
import { composeLanguageMap } from "./language-map.js";
import { patchSessionScene } from "./session-scene.js";

const timeout = 180_000;

function tmpWork(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "session-grade-"));
}

async function writeTinyPng(filePath: string): Promise<void> {
  const raw = Buffer.from([0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255]);
  await sharp(raw, { raw: { width: 2, height: 2, channels: 4 } }).png().toFile(filePath);
}

describe("collectSpinReasons", () => {
  it("flags kaleidoscope / polarTwist / rotateSpeed / angular / rotate", () => {
    const reasons = collectSpinReasons({
      layers: [
        {
          animation: {
            phaseField: "layers/phase-angular.png",
            polarTwist: 0.4,
            rotateSpeed: 1,
          },
        },
      ],
      effects: { multipassFeedback: { rotate: 0.01 }, kaleidoscope: { segments: 8 } },
    });
    expect(reasons.some((r) => r.includes("angular"))).toBe(true);
    expect(reasons.some((r) => r.includes("polarTwist"))).toBe(true);
    expect(reasons.some((r) => r.includes("rotateSpeed"))).toBe(true);
    expect(reasons.some((r) => r.includes("rotate"))).toBe(true);
    expect(reasons.some((r) => r.includes("kaleidoscope"))).toBe(true);
  });
});

describe("gradeSession hero.json (prepared hero wins over a fresh detect)", () => {
  it(
    "enforces a --hero override: r221 form source declared halo now requires halo plates",
    async () => {
      const dir = tmpWork();
      fs.copyFileSync("sources/approved/r221-eye-mirror.png", path.join(dir, "source.png"));
      fs.copyFileSync("recipes/golden/eye-mirror-phase-advect-r221.json", path.join(dir, "scene.json"));
      const detected = await detectHero(path.join(dir, "source.png"));
      expect(detected.kind).toBe("form");
      const hero = applyHeroOverride(detected, "halo@0.50,0.30:120/600", "eye rings are the living part");
      const sourceSha256 = createHash("sha256").update(fs.readFileSync(path.join(dir, "source.png"))).digest("hex");
      fs.writeFileSync(path.join(dir, "hero.json"), JSON.stringify({ ...hero, sourceSha256 }));
      const grade = await gradeSession(dir);
      expect(grade.hero?.kind).toBe("halo");
      expect(grade.hero?.override?.spec).toBe("halo@0.50,0.30:120/600");
      expect(grade.ok).toBe(false);
      expect(grade.reasons.some((r) => /hero=halo/.test(r))).toBe(true);
    },
    timeout,
  );

  it(
    "ignores a stale hero.json whose source sha does not match",
    async () => {
      const dir = tmpWork();
      fs.copyFileSync("sources/approved/r221-eye-mirror.png", path.join(dir, "source.png"));
      fs.copyFileSync("recipes/golden/eye-mirror-phase-advect-r221.json", path.join(dir, "scene.json"));
      const detected = await detectHero(path.join(dir, "source.png"));
      const hero = applyHeroOverride(detected, "halo@0.50,0.30:120/600", "stale");
      fs.writeFileSync(path.join(dir, "hero.json"), JSON.stringify({ ...hero, sourceSha256: "0".repeat(64) }));
      const grade = await gradeSession(dir);
      expect(grade.hero?.kind).toBe("form");
    },
    timeout,
  );
});

describe("gradeSession ceiling (00 §3 — golden as-is and clones are refused)", () => {
  it(
    "refuses golden r221 as-is on its own source (r349 class) and passes the composed scene",
    async () => {
      const dir = tmpWork();
      fs.mkdirSync(path.join(dir, "layers"));
      fs.copyFileSync("sources/approved/r221-eye-mirror.png", path.join(dir, "source.png"));
      fs.copyFileSync("sources/approved/r221-eye-mirror.png", path.join(dir, "layers/source.png"));
      fs.copyFileSync("recipes/golden/eye-mirror-phase-advect-r221.json", path.join(dir, "scene.json"));
      const asIs = await gradeSession(dir);
      expect(asIs.job).toBe("new-source");
      expect(asIs.ok).toBe(false);
      expect(asIs.reasons.some((r) => /golden eye-mirror-phase-advect-r221\.json as-is/.test(r))).toBe(true);
      expect(asIs.ceiling?.map.composed).toEqual([]);

      const golden = JSON.parse(fs.readFileSync(path.join(dir, "scene.json"), "utf8"));
      fs.writeFileSync(path.join(dir, "scene.json"), `${JSON.stringify(composeLanguageMap(golden), null, 2)}\n`);
      const composed = await gradeSession(dir);
      expect(composed.ok, composed.reasons.join("\n")).toBe(true);
      expect(composed.ceiling?.map.composed.length).toBeGreaterThanOrEqual(3);
    },
    timeout,
  );

  it(
    "accepts golden as-is when Isaac waived it for that exact scene sha",
    async () => {
      const dir = tmpWork();
      fs.mkdirSync(path.join(dir, "layers"));
      fs.copyFileSync("sources/approved/r221-eye-mirror.png", path.join(dir, "source.png"));
      fs.copyFileSync("sources/approved/r221-eye-mirror.png", path.join(dir, "layers/source.png"));
      fs.copyFileSync("recipes/golden/eye-mirror-phase-advect-r221.json", path.join(dir, "scene.json"));
      const sceneSha256 = createHash("sha256").update(fs.readFileSync(path.join(dir, "scene.json"))).digest("hex");
      fs.writeFileSync(path.join(dir, "ceiling-waiver.json"), JSON.stringify({ approvedBy: "isaac", reason: "221 그대로", at: "t", sceneSha256 }));
      const grade = await gradeSession(dir);
      expect(grade.ok, grade.reasons.join("\n")).toBe(true);
      expect(grade.ceiling?.waived).toBe(true);
    },
    timeout,
  );
});

describe("gradeSession", () => {
  it(
    "fails a scaffold-only r221 scene on the r325 halo source",
    async () => {
      const dir = tmpWork();
      fs.copyFileSync("sources/approved/r325-ganesha-rainbow-rings.png", path.join(dir, "source.png"));
      fs.copyFileSync("recipes/golden/eye-mirror-phase-advect-r221.json", path.join(dir, "scene.json"));
      const grade = await gradeSession(dir);
      expect(grade.job).toBe("new-source");
      expect(grade.hero?.kind).toBe("halo");
      expect(grade.ok).toBe(false);
      expect(grade.reasons.some((r) => /custom flow|missing layers\/phase-halo|hero=halo/.test(r))).toBe(true);
    },
    timeout,
  );

  it(
    "fails a closed r325 lock when halo plates are missing",
    async () => {
      const dir = tmpWork();
      fs.copyFileSync("sources/approved/r325-ganesha-rainbow-rings.png", path.join(dir, "source.png"));
      fs.copyFileSync("recipes/locks/r325-ganesha-rainbow-rings-master.json", path.join(dir, "scene.json"));
      const grade = await gradeSession(dir);
      expect(grade.job).toBe("closed-lock");
      expect(grade.ok).toBe(false);
      expect(grade.reasons.some((r) => r.includes("missing layer"))).toBe(true);
    },
    timeout,
  );

  it(
    "passes a closed r325 lock when layer files exist at source size (does not re-judge deity)",
    async () => {
      const dir = tmpWork();
      const layers = path.join(dir, "layers");
      fs.mkdirSync(layers);
      const src = "sources/approved/r325-ganesha-rainbow-rings.png";
      fs.copyFileSync(src, path.join(dir, "source.png"));
      fs.copyFileSync(src, path.join(layers, "source.png"));
      fs.copyFileSync(src, path.join(layers, "deity.png"));
      fs.copyFileSync("recipes/locks/r325-ganesha-rainbow-rings-master.json", path.join(dir, "scene.json"));
      const grade = await gradeSession(dir);
      expect(grade.job).toBe("closed-lock");
      expect(grade.ok).toBe(true);
    },
    timeout,
  );

  it(
    "passes a closed r242 lock with rotate 0.002",
    async () => {
      const dir = tmpWork();
      fs.mkdirSync(path.join(dir, "layers"));
      fs.copyFileSync("sources/approved/r242-hand-face.png", path.join(dir, "source.png"));
      fs.copyFileSync("sources/approved/r242-hand-face.png", path.join(dir, "layers/source.png"));
      fs.copyFileSync("recipes/locks/r242-handface-phase-river-gatepass.json", path.join(dir, "scene.json"));
      const grade = await gradeSession(dir);
      expect(grade.job).toBe("closed-lock");
      expect(grade.ok).toBe(true);
    },
    timeout,
  );

  it(
    "cosmos golden on a form source: floor passes (not figure-vivid legal), only the ceiling refuses golden-as-is",
    async () => {
      const dir = tmpWork();
      fs.mkdirSync(path.join(dir, "layers"));
      fs.copyFileSync("sources/approved/r221-eye-mirror.png", path.join(dir, "source.png"));
      fs.copyFileSync("sources/approved/r221-eye-mirror.png", path.join(dir, "layers/layer-0.png"));
      fs.copyFileSync("recipes/golden/cosmos-vivid-oklch-r24b.json", path.join(dir, "scene.json"));
      const grade = await gradeSession(dir);
      expect(grade.job).toBe("new-source");
      expect(grade.ok).toBe(false);
      expect(grade.reasons.every((r) => /golden cosmos-vivid-oklch-r24b\.json as-is|composed language/.test(r)), grade.reasons.join("\n")).toBe(true);
      const cosmos = JSON.parse(fs.readFileSync(path.join(dir, "scene.json"), "utf8"));
      fs.writeFileSync(path.join(dir, "scene.json"), `${JSON.stringify(composeLanguageMap(cosmos), null, 2)}\n`);
      const composed = await gradeSession(dir);
      expect(composed.ok, composed.reasons.join("\n")).toBe(true);
    },
    timeout,
  );

  it(
    "fails dummy 2x2 travel plates on a pour source",
    async () => {
      const dir = tmpWork();
      const layers = path.join(dir, "layers");
      fs.mkdirSync(layers);
      fs.copyFileSync("sources/approved/r342-cosmic-buddha-eye-fall.png", path.join(dir, "source.png"));
      fs.copyFileSync("sources/approved/r342-cosmic-buddha-eye-fall.png", path.join(layers, "source.png"));
      const hero = await detectHero(path.join(dir, "source.png"));
      const golden = JSON.parse(fs.readFileSync("recipes/golden/eye-mirror-phase-advect-r221.json", "utf8"));
      fs.writeFileSync(path.join(dir, "scene.json"), `${JSON.stringify(patchSessionScene(golden, hero), null, 2)}\n`);
      await writeTinyPng(path.join(layers, "figure-hold.png"));
      await writeTinyPng(path.join(layers, "flow-fall.png"));
      await writeTinyPng(path.join(layers, "phase-fall.png"));
      const grade = await gradeSession(dir);
      expect(grade.ok).toBe(false);
      expect(grade.reasons.some((r) => /2x2|source is/.test(r))).toBe(true);
    },
    timeout,
  );

  it(
    "fails a pour scene whose hold is an nx/ny rectangle",
    async () => {
      const dir = tmpWork();
      const layers = path.join(dir, "layers");
      fs.mkdirSync(layers);
      fs.copyFileSync("sources/approved/r342-cosmic-buddha-eye-fall.png", path.join(dir, "source.png"));
      fs.copyFileSync("sources/approved/r342-cosmic-buddha-eye-fall.png", path.join(layers, "source.png"));
      const hero = await detectHero(path.join(dir, "source.png"));
      const golden = JSON.parse(fs.readFileSync("recipes/golden/eye-mirror-phase-advect-r221.json", "utf8"));
      fs.writeFileSync(path.join(dir, "scene.json"), `${JSON.stringify(patchSessionScene(golden, hero), null, 2)}\n`);
      const meta = await sharp(path.join(dir, "source.png")).metadata();
      const w = meta.width ?? 1632;
      const h = meta.height ?? 2912;
      const box = fillBoxAlpha(w, h, 0.12, 0.08, 0.72, 0.64);
      const raw = Buffer.alloc(w * h * 4);
      for (let i = 0; i < w * h; i++) {
        raw[i * 4] = 10;
        raw[i * 4 + 1] = 10;
        raw[i * 4 + 2] = 10;
        raw[i * 4 + 3] = Math.round(box[i] * 255);
      }
      await sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(layers, "figure-hold.png"));
      await sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(layers, "flow-fall.png"));
      await sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(layers, "phase-fall.png"));
      const grade = await gradeSession(dir);
      expect(grade.ok).toBe(false);
      expect(grade.reasons.some((r) => /vertical wall/.test(r))).toBe(true);
    },
    timeout,
  );

  it(
    "passes generated r342 pour plates",
    async () => {
      const dir = tmpWork();
      const layers = path.join(dir, "layers");
      fs.mkdirSync(layers);
      const src = "sources/approved/r342-cosmic-buddha-eye-fall.png";
      fs.copyFileSync(src, path.join(dir, "source.png"));
      fs.copyFileSync(src, path.join(layers, "source.png"));
      const hero = await detectHero(path.join(dir, "source.png"));
      expect(hero.kind).toBe("pour");
      const plates = await writeSessionPlates(layers, hero);
      expect(plates.holdWallOk).toBe(true);
      const golden = JSON.parse(fs.readFileSync("recipes/golden/eye-mirror-phase-advect-r221.json", "utf8"));
      fs.writeFileSync(path.join(dir, "scene.json"), `${JSON.stringify(patchSessionScene(golden, hero), null, 2)}\n`);
      const grade = await gradeSession(dir);
      expect(grade.ok).toBe(true);
      expect(grade.job).toBe("new-source");
    },
    timeout,
  );

  it(
    "passes generated r325 halo plates",
    async () => {
      const dir = tmpWork();
      const layers = path.join(dir, "layers");
      fs.mkdirSync(layers);
      const src = "sources/approved/r325-ganesha-rainbow-rings.png";
      fs.copyFileSync(src, path.join(dir, "source.png"));
      fs.copyFileSync(src, path.join(layers, "source.png"));
      const hero = await detectHero(path.join(dir, "source.png"));
      expect(hero.kind).toBe("halo");
      const plates = await writeSessionPlates(layers, hero);
      expect(plates.holdWallOk).toBe(true);
      const golden = JSON.parse(fs.readFileSync("recipes/golden/eye-mirror-phase-advect-r221.json", "utf8"));
      fs.writeFileSync(path.join(dir, "scene.json"), `${JSON.stringify(patchSessionScene(golden, hero), null, 2)}\n`);
      const grade = await gradeSession(dir);
      expect(grade.ok).toBe(true);
    },
    timeout,
  );

  it(
    "writes a hold whose PNG alpha matches the mask it computed (sharp blur returns 3ch for 1ch raw)",
    async () => {
      const dir = tmpWork();
      const layers = path.join(dir, "layers");
      fs.mkdirSync(layers);
      const src = "sources/approved/r325-ganesha-rainbow-rings.png";
      fs.copyFileSync(src, path.join(dir, "source.png"));
      fs.copyFileSync(src, path.join(layers, "source.png"));
      const hero = await detectHero(path.join(dir, "source.png"));
      await writeSessionPlates(layers, hero);
      const hold = await sharp(path.join(layers, "figure-hold.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const debug = await sharp(path.join(layers, "debug-hold.png")).raw().toBuffer({ resolveWithObject: true });
      const n = hold.info.width * hold.info.height;
      // debug-hold is the same mask painted as grey; a channel-stride bug desynchronises them.
      let worst = 0;
      for (let i = 0; i < n; i += 997) {
        worst = Math.max(worst, Math.abs(hold.data[i * 4 + 3] - debug.data[i * debug.info.channels]));
      }
      expect(worst).toBeLessThanOrEqual(1);
      // 04 §1.2: the hold must not cover the hero it is supposed to free.
      const heroAlpha = hold.data[(hero.cy * hold.info.width + hero.cx) * 4 + 3] / 255;
      expect(heroAlpha).toBeLessThanOrEqual(0.28);
    },
    timeout,
  );

  it(
    "passes a closed r221 lock that only references source.png",
    async () => {
      const dir = tmpWork();
      fs.mkdirSync(path.join(dir, "layers"));
      fs.copyFileSync("sources/approved/r221-eye-mirror.png", path.join(dir, "source.png"));
      fs.copyFileSync("sources/approved/r221-eye-mirror.png", path.join(dir, "layers/source.png"));
      fs.copyFileSync("recipes/locks/r221-eye-mirror-phase-advect-peak.json", path.join(dir, "scene.json"));
      const grade = await gradeSession(dir);
      expect(grade.job).toBe("closed-lock");
      expect(grade.ok).toBe(true);
    },
    timeout,
  );
});
