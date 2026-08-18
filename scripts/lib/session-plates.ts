/**
 * Custom flow / phase / hold for a measured hero.
 * No nx/ny boxes. Hold is source pixels of the figure minus the traveling hero.
 */
import path from "node:path";
import sharp from "sharp";
import { clamp01, loadImageData, rgbToHsv, smoothstep } from "./image-stats.js";
import { type HeroDetect } from "./hero-detect.js";
import { plateNamesFor } from "./session-scene.js";
import { scanHoldWalls } from "./hold-walls.js";

export type WrittenPlates = {
  readonly files: readonly string[];
  readonly holdWallOk: boolean;
  readonly holdWallReasons: readonly string[];
};

const clamp255 = (value: number): number => Math.min(255, Math.max(0, Math.round(value)));

async function blurAlpha(alpha: Float32Array, width: number, height: number, sigma: number): Promise<Uint8Array> {
  const gray = Buffer.alloc(alpha.length);
  for (let i = 0; i < alpha.length; i++) gray[i] = clamp255(alpha[i] * 255);
  return sharp(gray, { raw: { width, height, channels: 1 } }).blur(Math.max(0.3, sigma)).raw().toBuffer();
}

function encodeFlow(dx: number, dy: number, coh: number): [number, number, number] {
  const len = Math.max(1e-5, Math.hypot(dx, dy));
  return [
    clamp255(255 * clamp01(0.5 + 0.5 * (dx / len))),
    clamp255(255 * clamp01(0.5 + 0.5 * (dy / len))),
    clamp255(255 * clamp01(coh)),
  ];
}

export async function writeSessionPlates(layersDir: string, hero: HeroDetect): Promise<WrittenPlates> {
  const names = plateNamesFor(hero.kind);
  const sourcePath = path.join(layersDir, "source.png");
  const image = await loadImageData(sourcePath);
  const { width: w, height: h, raw } = image;
  const n = w * h;
  const flow = Buffer.alloc(n * 4);
  const phase = Buffer.alloc(n * 4);
  const holdA = new Float32Array(n);
  const cx = hero.cx;
  const cy = hero.cy;
  const waterY = hero.waterNy * h;
  const rInner = Math.max(8, hero.rInner);
  const rOuter = Math.max(rInner + 16, hero.rOuter);

  let struct: Buffer | null = null;
  try {
    const field = await sharp(path.join(layersDir, "flow-field.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    struct = field.data;
  } catch {
    struct = null;
  }

  for (let y = 0; y < h; y++) {
    const ny = y / h;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = i * 4;
      const hsv = rgbToHsv([raw[o], raw[o + 1], raw[o + 2]]);
      const sat = hsv[1];
      const val = hsv[2];
      const hue = hsv[0] * 360;
      const sdx = struct ? (struct[o] / 255) * 2 - 1 : 0;
      const sdy = struct ? (struct[o + 1] / 255) * 2 - 1 : 0;

      let dx = sdx * 0.2;
      let dy = sdy * 0.2;
      let coh = 0.2;
      let phaseV = ny;
      let hold = 0;

      if (hero.kind === "halo") {
        const pxR = Math.hypot(x - cx, y - cy);
        const annulus = smoothstep(rInner - 8, rInner + 6, pxR) * (1 - smoothstep(rOuter + 4, rOuter + 26, pxR));
        const rainbow = sat > 0.78 && val > 0.28;
        const halo = annulus * (rainbow ? 1 : 0);
        const lava = (hue < 40 || hue > 350) && sat > 0.62 && val > 0.32 && ny > 0.46 && pxR > rOuter * 0.55;
        const marble = ny < 0.18 && hue > 198 && hue < 275 && sat > 0.25 && annulus < 0.2;
        const midSatFigure = sat < 0.88 && val > 0.16 && val < 0.92;
        const bandW = Math.max(8, (rOuter - rInner) / 8);
        const band = Math.floor(Math.max(0, pxR - rInner) / bandW);
        const flip = band % 2 === 0 ? 1 : -1;
        const len = Math.max(1e-5, Math.hypot((x - cx) / w, (y - cy) / h));
        const rdx = (x - cx) / w / len;
        const rdy = (y - cy) / h / len;
        if (annulus > 0.2) {
          dx = rdx * flip * 0.72 + sdx * 0.28;
          dy = rdy * flip * 0.72 + sdy * 0.28;
          coh = 0.96;
        } else if (lava) {
          dx = 0.05 * rdx;
          dy = 0.95;
          coh = 0.84;
        } else if (marble) {
          dx = rdx * 0.4;
          dy = rdy * 0.6;
          coh = 0.72;
        }
        phaseV = clamp01(pxR / (rOuter * 1.15));
        const nx = x / w;
        const faceR = Math.hypot((nx - hero.cxN) / 0.28, (ny - (hero.cyN + 0.12)) / 0.34);
        hold = midSatFigure && !lava && !marble ? (1 - halo * 0.98) * (1 - smoothstep(0.92, 1.18, faceR)) : 0;
      } else {
        const nx = x / w;
        const water = ny > hero.waterNy - 0.01;
        const t = clamp01((y - cy) / Math.max(8, waterY - cy));
        const half = 78 + t ** 1.12 * 168;
        const inCone = y >= cy - 18 && y <= waterY + 40 && Math.abs(x - cx) < half + 10;
        const nearPupil = Math.hypot(x - cx, y - cy) < 52;
        const fall = (inCone || nearPupil) && !water;
        if (fall || nearPupil) {
          dx = sdx * 0.08;
          dy = 0.92 + t * 0.08;
          coh = 0.96;
        } else if (water) {
          const band = Math.sin((ny - hero.waterNy) * 38 + nx * 6);
          dx = 0.72 * Math.sign(band || 1) + sdx * 0.28;
          dy = 0.12 + sdy * 0.18;
          coh = 0.82;
        }
        phaseV = fall || nearPupil ? clamp01((y - (cy - 40)) / (waterY - cy + 80)) : clamp01(ny);
        const faceE = Math.hypot((nx - hero.cxN) / 0.27, (ny - (hero.cyN + 0.06)) / 0.24);
        const crownE = Math.hypot((nx - hero.cxN) / 0.2, (ny - (hero.cyN - 0.12)) / 0.12);
        const chinE = Math.hypot((nx - (hero.cxN - 0.03)) / 0.16, (ny - (hero.cyN + 0.22)) / 0.11);
        const prior = Math.min(faceE, crownE, chinE);
        const sky = val > 0.34 && sat < 0.58 && hue > 175 && hue < 235 && ny < hero.cyN - 0.04;
        const headish = val > 0.04 && val < 0.78 && !sky && !water && sat < 0.78;
        const fallSoft = fall ? smoothstep(half * 0.72, half + 18, Math.abs(x - cx)) : 1;
        hold = (1 - smoothstep(0.92, 1.14, prior)) * (headish ? 1 : 0.06) * fallSoft;
        if (nearPupil || water) hold = 0;
      }

      const rgb = encodeFlow(dx, dy, coh);
      flow[o] = rgb[0];
      flow[o + 1] = rgb[1];
      flow[o + 2] = rgb[2];
      flow[o + 3] = 255;
      const g = clamp255(phaseV * 255);
      phase[o] = g;
      phase[o + 1] = g;
      phase[o + 2] = g;
      phase[o + 3] = 255;
      holdA[i] = clamp01(hold);
    }
  }

  const soft = await blurAlpha(holdA, w, h, hero.kind === "halo" ? 4 : 3.4);
  const hold = Buffer.from(raw);
  const holdAlpha = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    hold[i * 4 + 3] = soft[i];
    holdAlpha[i] = soft[i] / 255;
  }

  const flowName = path.basename(names.flow);
  const phaseName = path.basename(names.phase);
  const holdName = path.basename(names.hold);
  await sharp(flow, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(layersDir, flowName));
  await sharp(phase, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(layersDir, phaseName));
  await sharp(hold, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(layersDir, holdName));

  const dbg = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const a = soft[i];
    dbg[i * 4] = a;
    dbg[i * 4 + 1] = a;
    dbg[i * 4 + 2] = a;
    dbg[i * 4 + 3] = 255;
  }
  await sharp(dbg, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(layersDir, "debug-hold.png"));

  const walls = scanHoldWalls(holdAlpha, w, h);
  return {
    files: [names.flow, names.phase, names.hold, "layers/debug-hold.png"],
    holdWallOk: walls.ok,
    holdWallReasons: walls.reasons,
  };
}
