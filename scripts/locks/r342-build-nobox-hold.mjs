/**
 * v1c: v1 scene/flow/phase untouched. Only rewrite figure-hold.
 * Kill the nx=0.12 / ny=0.08–0.64 rectangle + sky strip + mountain slab.
 * Keep the same fall cone open as v1.
 */
import sharp from "sharp";

const DIR = "out/manual-runs/r342-cosmic-buddha-eye-fall/layers";
const eyeX = 753;
const eyeY = 820;
const waterNy = 0.63;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / Math.max(1e-6, e1 - e0));
  return t * t * (3 - 2 * t);
};
const rgbToHsv = (r, g, b) => {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const d = max - min;
  let h = 0;
  if (d > 1e-6) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
};
const ellipseD = (nx, ny, ecx, ecy, rx, ry) =>
  Math.hypot((nx - ecx) / rx, (ny - ecy) / ry);

const src = await sharp(`${DIR}/source.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = src.info;
const n = w * h;
const waterY = waterNy * h;

const fallHalf = (y) => {
  const t = clamp01((y - eyeY) / Math.max(8, waterY - eyeY));
  return 78 + t ** 1.12 * 168;
};

const raw = new Float32Array(n);
for (let y = 0; y < h; y++) {
  const ny = y / h;
  const half = fallHalf(y);
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const o = i * 4;
    const hsv = rgbToHsv(src.data[o], src.data[o + 1], src.data[o + 2]);
    const nx = x / w;
    const inCone = y >= eyeY - 18 && y <= waterY + 40 && Math.abs(x - eyeX) < half + 10;
    const nearPupil = Math.hypot(x - eyeX, y - eyeY) < 52;
    const water = ny > waterNy - 0.01;
    const fall = (inCone || nearPupil) && !water;
    const faceE = ellipseD(nx, ny, 0.39, 0.36, 0.27, 0.23);
    const crownE = ellipseD(nx, ny, 0.4, 0.175, 0.2, 0.11);
    const chinE = ellipseD(nx, ny, 0.36, 0.52, 0.16, 0.1);
    const earE = ellipseD(nx, ny, 0.18, 0.4, 0.08, 0.1);
    const prior = Math.min(faceE, crownE, chinE, earE);
    const sky =
      ny < 0.22 && hsv.v > 0.34 && hsv.s < 0.58 && hsv.h > 175 && hsv.h < 235;
    const mountain = nx > 0.68 && ny < 0.58 && hsv.s < 0.5 && hsv.v > 0.28;
    const orange = (hsv.h < 28 || hsv.h > 350) && hsv.s > 0.62 && hsv.v > 0.28;
    const headish = hsv.v > 0.05 && hsv.v < 0.72 && !sky && !mountain && !orange;
    const fallSoft = fall ? smoothstep(half * 0.72, half + 18, Math.abs(x - eyeX)) : 1;
    let a = (1 - smoothstep(0.92, 1.12, prior)) * (headish ? 1 : 0.08) * fallSoft;
    if (nearPupil || water) a = 0;
    raw[i] = clamp01(a);
  }
}

const gray = Buffer.alloc(n * 4);
for (let i = 0; i < n; i++) {
  const a = Math.round(raw[i] * 255);
  gray[i * 4] = a;
  gray[i * 4 + 1] = a;
  gray[i * 4 + 2] = a;
  gray[i * 4 + 3] = 255;
}
await sharp(gray, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/_tmp-hold.png`);
const soft = await sharp(`${DIR}/_tmp-hold.png`).extractChannel("red").blur(3.6).raw().toBuffer();
const hold = Buffer.from(src.data);
for (let i = 0; i < n; i++) hold[i * 4 + 3] = soft[i];
await sharp(hold, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/figure-hold.png`);

const dbg = Buffer.alloc(n * 4);
for (let i = 0; i < n; i++) {
  const a = soft[i];
  dbg[i * 4] = a;
  dbg[i * 4 + 1] = a;
  dbg[i * 4 + 2] = a;
  dbg[i * 4 + 3] = 255;
}
await sharp(dbg, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/debug-v1c-hold.png`);

const steep = [];
for (const ny of [0.2, 0.3, 0.4, 0.5, 0.6]) {
  const y = Math.floor(ny * h);
  let maxDa = 0;
  let maxX = 0;
  let prev = hold[(y * w + Math.floor(0.05 * w)) * 4 + 3];
  for (let x = Math.floor(0.05 * w); x < Math.floor(0.8 * w); x++) {
    const a = hold[(y * w + x) * 4 + 3];
    const da = Math.abs(a - prev);
    if (da > maxDa) {
      maxDa = da;
      maxX = x;
    }
    prev = a;
  }
  steep.push(`ny${ny}=${(maxX / w).toFixed(3)}/${maxDa}`);
}
const aAt = (nx, ny) => (hold[(Math.floor(ny * h) * w + Math.floor(nx * w)) * 4 + 3] / 255).toFixed(2);
console.log("v1c", `face=${aAt(0.32, 0.38)} crown=${aAt(0.42, 0.12)} sky=${aAt(0.5, 0.05)} wall=${aAt(0.12, 0.4)} mt=${aAt(0.82, 0.28)} fall=${aAt(0.46, 0.42)}`);
console.log("steepest", steep.join(" "));
