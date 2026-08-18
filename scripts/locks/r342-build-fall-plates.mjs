/**
 * r342 v1: downward fall from the third eye + water current.
 * Do not hold the rainbow pour. Face / ushnisha / mountains stay as source hold.
 * No angular phase. No rotate.
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

const src = await sharp(`${DIR}/source.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const struct = await sharp(`${DIR}/flow-field.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = src.info;
const n = w * h;
const waterY = waterNy * h;

const fallHalf = (y) => {
  const t = clamp01((y - eyeY) / Math.max(8, waterY - eyeY));
  return 78 + t ** 1.12 * 168;
};

const rawHold = new Float32Array(n);
const flow = Buffer.alloc(n * 4);
const phase = Buffer.alloc(n * 4);

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
    const hx = (nx - 0.4) / 0.3;
    const hy = (ny - 0.34) / 0.28;
    const cx = (nx - 0.4) / 0.22;
    const cy = (ny - 0.14) / 0.15;
    const head = Math.hypot(hx, hy) < 1 || Math.hypot(cx, cy) < 1;
    const fallSoft = fall ? smoothstep(half * 0.72, half + 18, Math.abs(x - eyeX)) : 1;
    rawHold[i] = head && !water && hsv.v > 0.06 ? fallSoft : 0;
    if (nearPupil) rawHold[i] = 0;

    const sdx = (struct.data[o] / 255) * 2 - 1;
    const sdy = (struct.data[o + 1] / 255) * 2 - 1;
    let dx;
    let dy;
    let coh;
    if (fall || nearPupil) {
      const t = clamp01((y - eyeY) / Math.max(8, waterY - eyeY));
      dx = sdx * 0.08;
      dy = 0.92 + t * 0.08;
      coh = 0.96;
    } else if (water) {
      const band = Math.sin((ny - waterNy) * 38 + nx * 6);
      dx = 0.72 * Math.sign(band || 1) + sdx * 0.28;
      dy = 0.12 + sdy * 0.18;
      coh = 0.82;
    } else {
      dx = sdx * 0.35;
      dy = sdy * 0.35;
      coh = 0.28;
    }
    const len = Math.max(1e-5, Math.hypot(dx, dy));
    dx /= len;
    dy /= len;
    flow[o] = Math.round(255 * clamp01(0.5 + 0.5 * dx));
    flow[o + 1] = Math.round(255 * clamp01(0.5 + 0.5 * dy));
    flow[o + 2] = Math.round(255 * clamp01(coh));
    flow[o + 3] = 255;

    const along = fall || nearPupil
      ? clamp01((y - (eyeY - 40)) / (waterY - eyeY + 80))
      : clamp01(ny);
    const g = Math.round(along * 255);
    phase[o] = g;
    phase[o + 1] = g;
    phase[o + 2] = g;
    phase[o + 3] = 255;
  }
}

const gray = Buffer.alloc(n * 4);
for (let i = 0; i < n; i++) {
  const a = Math.round(rawHold[i] * 255);
  gray[i * 4] = a;
  gray[i * 4 + 1] = a;
  gray[i * 4 + 2] = a;
  gray[i * 4 + 3] = 255;
}
await sharp(gray, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/_tmp-hold.png`);
const soft = await sharp(`${DIR}/_tmp-hold.png`).extractChannel("red").blur(3.2).raw().toBuffer();
const hold = Buffer.from(src.data);
for (let i = 0; i < n; i++) hold[i * 4 + 3] = soft[i];
await sharp(hold, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/figure-hold.png`);

await sharp(flow, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/_tmp-flow.png`);
await sharp(`${DIR}/_tmp-flow.png`).blur(5).png().toFile(`${DIR}/flow-fall.png`);
await sharp(phase, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/phase-fall.png`);

const dbg = Buffer.alloc(n * 4);
for (let i = 0; i < n; i++) {
  const a = soft[i];
  dbg[i * 4] = a;
  dbg[i * 4 + 1] = a;
  dbg[i * 4 + 2] = a;
  dbg[i * 4 + 3] = 255;
}
await sharp(dbg, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/debug-v1-hold.png`);

const aAt = (nx, ny) => (hold[(Math.floor(ny * h) * w + Math.floor(nx * w)) * 4 + 3] / 255).toFixed(2);
console.log(
  "r342 plates",
  `eye=${aAt(0.46, 0.28)} fall=${aAt(0.46, 0.42)} water=${aAt(0.5, 0.75)} face=${aAt(0.32, 0.38)} crown=${aAt(0.42, 0.12)} mt=${aAt(0.82, 0.28)}`,
);
