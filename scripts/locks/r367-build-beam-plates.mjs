/**
 * r367: radial burst in the cap. session-plates beam is a pour cone plus water
 * diagonals, so this replaces it. Cap pixels ride outward from the burst.
 * Hold = skyline silhouette only. The red mushroom stays on the travel layer;
 * holding it turned the white stem into a flat pink cutout.
 * Tendrils over the city stay free. No nx/ny box, no oval.
 */
import sharp from "sharp";

const DIR = "out/manual-runs/r367-cap-head-city/layers";
const CXN = 0.66;
const CYN = 0.12;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
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
const cx = CXN * w;
const cy = CYN * h;
const rx = 0.46 * w;
const ry = 0.34 * h;
const hsv = new Array(n);
const red = Buffer.alloc(n);
for (let i = 0; i < n; i++) {
  const o = i * 4;
  const q = rgbToHsv(src.data[o], src.data[o + 1], src.data[o + 2]);
  hsv[i] = q;
  const y = Math.floor(i / w);
  const x = i - y * w;
  const ny = y / h;
  const nx = x / w;
  const isRed = (q.h < 16 || q.h > 348) && q.s > 0.5 && q.v > 0.22 && nx < 0.4 && ny > 0.28 && ny < 0.62;
  red[i] = isRed ? 255 : 0;
}
const redSoft = await sharp(red, { raw: { width: w, height: h, channels: 1 } }).blur(14).raw().toBuffer();
const redStride = redSoft.length === n ? 1 : 3;

const flow = Buffer.alloc(n * 4);
const phase = Buffer.alloc(n * 4);
const rawHold = new Float32Array(n);
const cand = new Uint8Array(n);
const cityM = new Uint8Array(n);
const skyline = new Int32Array(w);
skyline.fill(h);
const yStart = Math.floor(h * 0.74);
for (let x = 0; x < w; x++) {
  let run = 0;
  for (let y = yStart; y < h; y++) {
    const q = hsv[y * w + x];
    const swirl = q.s > 0.48 && q.v > 0.2;
    const building = !swirl && (q.v < 0.58 || q.s < 0.3);
    if (building) run++;
    else run = 0;
    if (run > 28) {
      skyline[x] = y - 28;
      break;
    }
  }
}

for (let y = 0; y < h; y++) {
  const ny = y / h;
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const o = i * 4;
    const q = hsv[i];
    const sdx = (struct.data[o] / 255) * 2 - 1;
    const sdy = (struct.data[o + 1] / 255) * 2 - 1;
    const ex = (x - cx) / rx;
    const ey = (y - cy) / ry;
    const eR = Math.max(1e-5, Math.hypot(ex, ey));
    const rdx = ex / eR;
    const rdy = ey / eR;
    const radialW = 1 - smoothstep(0.18, 1.05, eR);
    let dx = sdx * 0.5;
    let dy = sdy * 0.5;
    let coh = 0.4;
    if (radialW > 0.08) {
      dx = rdx * radialW + sdx * (1 - radialW) * 0.45;
      dy = rdy * radialW + sdy * (1 - radialW) * 0.45;
      coh = 0.5 + 0.45 * radialW;
    }
    const fl = Math.max(1e-5, Math.hypot(dx, dy));
    flow[o] = Math.round(255 * clamp01(0.5 + 0.5 * (dx / fl)));
    flow[o + 1] = Math.round(255 * clamp01(0.5 + 0.5 * (dy / fl)));
    flow[o + 2] = Math.round(255 * clamp01(coh));
    flow[o + 3] = 255;
    const g = Math.round(255 * clamp01(eR / 1.2));
    phase[o] = g;
    phase[o + 1] = g;
    phase[o + 2] = g;
    phase[o + 3] = 255;

    const nx = x / w;
    const capZone = nx < 0.4 && ny > 0.33 && ny < 0.56;
    const redMass = capZone && redSoft[i * redStride] > 100;
    const capWhite = q.s < 0.32 && q.v > 0.58 && redSoft[i * redStride] > 48 && capZone;
    const stem = q.s < 0.25 && q.v > 0.72 && nx > 0.08 && nx < 0.32 && ny > 0.42 && ny < 0.64;
    const swirl = q.s > 0.48 && q.v > 0.2;
    const city = y >= skyline[x] && !swirl && eR >= 0.08 && (q.v < 0.62 || q.s < 0.32);
    const glow = q.s < 0.28 && q.v > 0.74 && nx > 0.06 && nx < 0.38 && ny > 0.4 && ny < 0.64;
    rawHold[i] = city || glow ? 1 : 0;
  }
}

const gray = Buffer.alloc(n);
for (let i = 0; i < n; i++) gray[i] = Math.round(rawHold[i] * 255);
const soft = await sharp(gray, { raw: { width: w, height: h, channels: 1 } }).blur(5).raw().toBuffer();
const stride = soft.length === n ? 1 : 3;
const hold = Buffer.from(src.data);
for (let i = 0; i < n; i++) hold[i * 4 + 3] = soft[i * stride];
await sharp(hold, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/figure-hold.png`);
await sharp(flow, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/_tmp-flow.png`);
await sharp(`${DIR}/_tmp-flow.png`).blur(1.8).png().toFile(`${DIR}/flow-beam.png`);
await sharp(phase, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/phase-beam.png`);
const dbg = Buffer.alloc(n * 4);
for (let i = 0; i < n; i++) {
  const a = soft[i * stride];
  dbg[i * 4] = a;
  dbg[i * 4 + 1] = a;
  dbg[i * 4 + 2] = a;
  dbg[i * 4 + 3] = 255;
}
await sharp(dbg, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/debug-hold.png`);
const aAt = (nx, ny) => (hold[(Math.floor(ny * h) * w + Math.floor(nx * w)) * 4 + 3] / 255).toFixed(2);
console.log(
  [
    `burst=${aAt(0.66, 0.12)}`,
    `cap=${aAt(0.2, 0.39)}`,
    `stem=${aAt(0.16, 0.5)}`,
    `body=${aAt(0.7, 0.45)}`,
    `city=${aAt(0.3, 0.9)}`,
    `tendril=${aAt(0.72, 0.84)}`,
    `sky=${aAt(0.2, 0.7)}`,
  ].join(" "),
);
