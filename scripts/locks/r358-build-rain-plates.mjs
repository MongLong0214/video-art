/**
 * r358: rain falls; statue stays. session-plates pour = cone + water diagonals + oval hold.
 * Hold = statue color silhouette only (no ellipse fill). Rain not held. Hero origin not held.
 */
import sharp from "sharp";

const DIR = "out/manual-runs/r358-buddha-rain-glitch/layers";
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
const rainRaw = new Float32Array(n);
const statueRaw = new Float32Array(n);

for (let y = 0; y < h; y++) {
  const ny = y / h;
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const o = i * 4;
    const hsv = rgbToHsv(src.data[o], src.data[o + 1], src.data[o + 2]);
    const nx = x / w;
    const rain = hsv.s > 0.45 && hsv.v > 0.34;
    const statue = !rain && hsv.v < 0.42 && hsv.s < 0.48 && ny > 0.2 && ny < 0.86;
    rainRaw[i] = rain ? 1 : 0;
    statueRaw[i] = statue ? 1 : 0;
  }
}

const toGray = (a) => {
  const g = Buffer.alloc(n);
  for (let i = 0; i < n; i++) g[i] = Math.round(a[i] * 255);
  return g;
};
const rainSoftBuf = await sharp(toGray(rainRaw), { raw: { width: w, height: h, channels: 1 } }).blur(7).raw().toBuffer();
const statueSoftBuf = await sharp(toGray(statueRaw), { raw: { width: w, height: h, channels: 1 } }).blur(5.5).raw().toBuffer();
const strideR = rainSoftBuf.length === n ? 1 : 3;
const strideS = statueSoftBuf.length === n ? 1 : 3;

const flow = Buffer.alloc(n * 4);
const phase = Buffer.alloc(n * 4);
const hold = Buffer.from(src.data);

for (let y = 0; y < h; y++) {
  const ny = y / h;
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const o = i * 4;
    const sdx = (struct.data[o] / 255) * 2 - 1;
    const sdy = (struct.data[o + 1] / 255) * 2 - 1;
    const rainW = rainSoftBuf[i * strideR] / 255;
    const statueW = statueSoftBuf[i * strideS] / 255;
    let dx = sdx;
    let dy = sdy;
    dx = dx * (1 - rainW) + 0.03 * rainW;
    dy = dy * (1 - rainW) + 0.97 * rainW;
    dx = dx * (1 - 0.7 * statueW) + sdx * 0.7 * statueW;
    dy = dy * (1 - 0.7 * statueW) + sdy * 0.7 * statueW;
    const fl = Math.max(1e-5, Math.hypot(dx, dy));
    flow[o] = Math.round(255 * clamp01(0.5 + 0.5 * (dx / fl)));
    flow[o + 1] = Math.round(255 * clamp01(0.5 + 0.5 * (dy / fl)));
    flow[o + 2] = Math.round(255 * (0.35 + 0.6 * rainW));
    flow[o + 3] = 255;
    const g = Math.round(255 * clamp01(ny));
    phase[o] = g;
    phase[o + 1] = g;
    phase[o + 2] = g;
    phase[o + 3] = 255;
    const originE = Math.hypot((x / w - 0.5) / 0.08, (ny - 0.08) / 0.05);
    hold[o + 3] = originE < 1 ? 0 : Math.round(255 * statueW * (1 - rainW));
  }
}

await sharp(hold, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/figure-hold.png`);
await sharp(flow, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/_tmp-flow.png`);
await sharp(`${DIR}/_tmp-flow.png`).blur(2.4).png().toFile(`${DIR}/flow-fall.png`);
await sharp(phase, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/phase-fall.png`);
const dbg = Buffer.alloc(n * 4);
for (let i = 0; i < n; i++) {
  const a = hold[i * 4 + 3];
  dbg[i * 4] = a;
  dbg[i * 4 + 1] = a;
  dbg[i * 4 + 2] = a;
  dbg[i * 4 + 3] = 255;
}
await sharp(dbg, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/debug-hold.png`);
const aAt = (nx, ny) => (hold[(Math.floor(ny * h) * w + Math.floor(nx * w)) * 4 + 3] / 255).toFixed(2);
console.log(
  `hero=${aAt(0.5, 0.08)} rain=${aAt(0.5, 0.12)} curls=${aAt(0.5, 0.32)} face=${aAt(0.5, 0.52)} rainR=${aAt(0.85, 0.4)}`,
);
