/**
 * r357 v2: kill artificial seams.
 * v1 classified flow/hold by ny slabs (sheet vs sky vs face) → a horizontal line through the tree.
 * Isaac: “왜 자꾸 인위적인 경계선이 생겨 ? 근본적으로 제거해”
 * One continuous field. No hold slab at the waterline. Hold file exists empty (hero not held).
 */
import sharp from "sharp";

const DIR = "out/manual-runs/r357-tree-sun-drip-face/layers";
const SUNX = 0.5;
const SUNY = 0.23;
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
const sx = SUNX * w;
const sy = SUNY * h;
const dripRaw = new Float32Array(n);

for (let y = 0; y < h; y++) {
  const ny = y / h;
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const o = i * 4;
    const hsv = rgbToHsv(src.data[o], src.data[o + 1], src.data[o + 2]);
    const drip =
      ny > 0.47 &&
      ny < 0.8 &&
      hsv.v > 0.42 &&
      hsv.s > 0.28 &&
      (hsv.h > 150 || hsv.h < 70);
    dripRaw[i] = drip ? 1 : 0;
  }
}

const dripGray = Buffer.alloc(n);
for (let i = 0; i < n; i++) dripGray[i] = Math.round(dripRaw[i] * 255);
const dripSoft = await sharp(dripGray, { raw: { width: w, height: h, channels: 1 } })
  .blur(10)
  .raw()
  .toBuffer();
const dripStride = dripSoft.length === n ? 1 : 3;

const flow = Buffer.alloc(n * 4);
const phase = Buffer.alloc(n * 4);
const hold = Buffer.from(src.data);

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const o = i * 4;
    const sdx = (struct.data[o] / 255) * 2 - 1;
    const sdy = (struct.data[o + 1] / 255) * 2 - 1;
    const distSun = Math.hypot(x - sx, y - sy);
    const rdx = (x - sx) / Math.max(1e-5, distSun);
    const rdy = (y - sy) / Math.max(1e-5, distSun);
    const sunR = distSun / w;
    const sunW = clamp01((0.38 - sunR) / 0.2);
    const dripW = dripSoft[i * dripStride] / 255;

    let dx = sdx;
    let dy = sdy;
    dx = dx * (1 - sunW) + rdx * sunW;
    dy = dy * (1 - sunW) + rdy * sunW;
    dx = dx * (1 - dripW) + 0.02 * dripW;
    dy = dy * (1 - dripW) + 0.98 * dripW;

    const fl = Math.max(1e-5, Math.hypot(dx, dy));
    flow[o] = Math.round(255 * clamp01(0.5 + 0.5 * (dx / fl)));
    flow[o + 1] = Math.round(255 * clamp01(0.5 + 0.5 * (dy / fl)));
    flow[o + 2] = Math.round(255 * (0.35 + 0.6 * Math.max(sunW, dripW)));
    flow[o + 3] = 255;
    const g = Math.round(255 * clamp01(0.55 * sunR + 0.45 * (y / h)));
    phase[o] = g;
    phase[o + 1] = g;
    phase[o + 2] = g;
    phase[o + 3] = 255;
    hold[o + 3] = 0;
  }
}

await sharp(hold, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/figure-hold.png`);
await sharp(flow, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/_tmp-flow.png`);
await sharp(`${DIR}/_tmp-flow.png`).blur(2.8).png().toFile(`${DIR}/flow-fall.png`);
await sharp(phase, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/phase-fall.png`);
const dbg = Buffer.alloc(n * 4);
for (let i = 0; i < n; i++) {
  dbg[i * 4] = 0;
  dbg[i * 4 + 1] = 0;
  dbg[i * 4 + 2] = 0;
  dbg[i * 4 + 3] = 255;
}
await sharp(dbg, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/debug-hold.png`);
const aAt = (nx, ny) => (hold[(Math.floor(ny * h) * w + Math.floor(nx * w)) * 4 + 3] / 255).toFixed(2);
console.log(`hero=${aAt(0.5, 0.4)} drip=${aAt(0.28, 0.58)} face=${aAt(0.55, 0.7)} tree=${aAt(0.5, 0.26)} sun=${aAt(0.5, 0.2)}`);
