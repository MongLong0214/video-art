/**
 * r362: radial sunburst from the palm gap. session-plates beam writes pour water.
 * Hold = dark hand + dotted mushrooms (not the sky). Hero origin not held.
 */
import sharp from "sharp";

const DIR = "out/manual-runs/r362-dot-hand-mushrooms/layers";
const CXN = 0.58;
const CYN = 0.42;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
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
const flow = Buffer.alloc(n * 4);
const phase = Buffer.alloc(n * 4);
const rawHold = new Float32Array(n);

for (let y = 0; y < h; y++) {
  const ny = y / h;
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const o = i * 4;
    const hsv = rgbToHsv(src.data[o], src.data[o + 1], src.data[o + 2]);
    const nx = x / w;
    const sdx = (struct.data[o] / 255) * 2 - 1;
    const sdy = (struct.data[o + 1] / 255) * 2 - 1;
    const dist = Math.hypot(x - cx, y - cy);
    const len = Math.max(1e-5, Math.hypot((x - cx) / w, (y - cy) / h));
    const rdx = (x - cx) / w / len;
    const rdy = (y - cy) / h / len;
    const sky = hsv.s > 0.4 && hsv.v > 0.16;
    const figure = hsv.v < 0.45 && !sky;
    const originE = Math.hypot((nx - CXN) / 0.06, (ny - CYN) / 0.05);

    let dx = rdx * 0.88 + sdx * 0.12;
    let dy = rdy * 0.88 + sdy * 0.12;
    let coh = 0.94;
    if (figure) {
      dx = sdx * 0.2;
      dy = sdy * 0.2;
      coh = 0.28;
    }
    const fl = Math.max(1e-5, Math.hypot(dx, dy));
    flow[o] = Math.round(255 * clamp01(0.5 + 0.5 * (dx / fl)));
    flow[o + 1] = Math.round(255 * clamp01(0.5 + 0.5 * (dy / fl)));
    flow[o + 2] = Math.round(255 * clamp01(coh));
    flow[o + 3] = 255;
    const g = Math.round(255 * clamp01(dist / 1100));
    phase[o] = g;
    phase[o + 1] = g;
    phase[o + 2] = g;
    phase[o + 3] = 255;
    rawHold[i] = figure && originE >= 1 ? 1 : 0;
  }
}

const gray = Buffer.alloc(n);
for (let i = 0; i < n; i++) gray[i] = Math.round(rawHold[i] * 255);
const soft = await sharp(gray, { raw: { width: w, height: h, channels: 1 } }).blur(3.8).raw().toBuffer();
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
  `hero=${aAt(0.58, 0.42)} sky=${aAt(0.5, 0.12)} cap=${aAt(0.22, 0.32)} palm=${aAt(0.45, 0.62)} forest=${aAt(0.62, 0.62)}`,
);
