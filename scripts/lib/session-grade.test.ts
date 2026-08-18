import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { detectHero } from "./hero-detect.js";
import { fillBoxAlpha } from "./hold-walls.js";
import { writeSessionPlates } from "./session-plates.js";
import { collectSpinReasons, gradeSession } from "./session-grade.js";
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
    "passes cosmos golden on a form source (not figure-vivid legal)",
    async () => {
      const dir = tmpWork();
      fs.mkdirSync(path.join(dir, "layers"));
      fs.copyFileSync("sources/approved/r221-eye-mirror.png", path.join(dir, "source.png"));
      fs.copyFileSync("sources/approved/r221-eye-mirror.png", path.join(dir, "layers/layer-0.png"));
      fs.copyFileSync("recipes/golden/cosmos-vivid-oklch-r24b.json", path.join(dir, "scene.json"));
      const grade = await gradeSession(dir);
      expect(grade.job).toBe("new-source");
      expect(grade.ok).toBe(true);
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
