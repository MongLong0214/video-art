/**
 * r353: radial-out beam from the face. Hold is empty (Isaac: oval overlay 제거).
 * session-plates writes pour water into flow-beam.png — do not use that.
 */
import sharp from "sharp";

const DIR = "out/manual-runs/r353-mushroom-man-stems/layers";
const CXN = 0.48;
const CYN = 0.4;
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
const cx = Math.round(CXN * w);
const cy = Math.round(CYN * h);
const flow = Buffer.alloc(n * 4);
const phase = Buffer.alloc(n * 4);
const rawHold = new Float32Array(n);

for (let y = 0; y < h; y++) {
  const ny = y / h;
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const o = i * 4;
    const hsv = rgbToHsv(src.data[o], src.data[o + 1], src.data[o + 2]);
    const sdx = (struct.data[o] / 255) * 2 - 1;
    const sdy = (struct.data[o + 1] / 255) * 2 - 1;
    const len = Math.max(1e-5, Math.hypot((x - cx) / w, (y - cy) / h));
    const rdx = (x - cx) / w / len;
    const rdy = (y - cy) / h / len;
    const dist = Math.hypot(x - cx, y - cy);
    const mushroom =
      ((hsv.h < 25 || hsv.h > 345) && hsv.s > 0.55 && hsv.v > 0.35 && ny < 0.52) ||
      (hsv.h > 35 && hsv.h < 150 && hsv.s > 0.45 && hsv.v > 0.28 && ny < 0.55);

    let dx = rdx * 0.82 + sdx * 0.18;
    let dy = rdy * 0.82 + sdy * 0.18;
    let coh = 0.94;
    if (ny > 0.58 && !mushroom) {
      dx = sdx * 0.55;
      dy = sdy * 0.55;
      coh = 0.4;
    }
    const fl = Math.max(1e-5, Math.hypot(dx, dy));
    flow[o] = Math.round(255 * clamp01(0.5 + 0.5 * (dx / fl)));
    flow[o + 1] = Math.round(255 * clamp01(0.5 + 0.5 * (dy / fl)));
    flow[o + 2] = Math.round(255 * clamp01(coh));
    flow[o + 3] = 255;
    const g = Math.round(clamp01(dist / 900) * 255);
    phase[o] = g;
    phase[o + 1] = g;
    phase[o + 2] = g;
    phase[o + 3] = 255;
    rawHold[i] = 0;
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
const soft = await sharp(`${DIR}/_tmp-hold.png`).extractChannel("red").blur(0.3).raw().toBuffer();
const hold = Buffer.from(src.data);
for (let i = 0; i < n; i++) hold[i * 4 + 3] = soft[i];
await sharp(hold, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/figure-hold.png`);
await sharp(flow, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/_tmp-flow.png`);
await sharp(`${DIR}/_tmp-flow.png`).blur(1.8).png().toFile(`${DIR}/flow-beam.png`);
await sharp(phase, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/phase-beam.png`);
console.log("r353 beam plates", DIR);
