/**
 * r353 v4 sky marble: cobalt color mask + curl flow-sky. No rectangle.
 * Caps/stems punched out. Hold is not this file.
 */
import sharp from "sharp";

const DIR = "out/manual-runs/r353-mushroom-man-stems/layers";
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
const { width: w, height: h } = src.info;
const n = w * h;
const raw = new Float32Array(n);
const flow = Buffer.alloc(n * 4);

for (let y = 0; y < h; y++) {
  const ny = y / h;
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const o = i * 4;
    const hsv = rgbToHsv(src.data[o], src.data[o + 1], src.data[o + 2]);
    const nx = x / w;
    const cap = (hsv.h < 30 || hsv.h > 340) && hsv.s > 0.5 && hsv.v > 0.35 && ny < 0.52;
    const stem = hsv.h > 35 && hsv.h < 155 && hsv.s > 0.4 && hsv.v > 0.28 && ny < 0.55;
    const horizon = clamp01((0.54 - ny) / 0.06);
    const cobalt = hsv.h > 198 && hsv.h < 238 && hsv.s > 0.55 && hsv.v > 0.48;
    raw[i] = cobalt && !cap && !stem ? horizon : 0;

    const curlX = Math.sin(ny * 14.0 + nx * 3.0) * 0.75 + Math.cos(nx * 9.0) * 0.25;
    const curlY = Math.cos(nx * 11.0 + ny * 5.0) * 0.55 + Math.sin(ny * 8.0) * 0.25;
    const fl = Math.max(1e-5, Math.hypot(curlX, curlY));
    flow[o] = Math.round(255 * clamp01(0.5 + 0.5 * (curlX / fl)));
    flow[o + 1] = Math.round(255 * clamp01(0.5 + 0.5 * (curlY / fl)));
    flow[o + 2] = Math.round(255 * 0.9);
    flow[o + 3] = 255;
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
await sharp(gray, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/_tmp-sky.png`);
const soft = await sharp(`${DIR}/_tmp-sky.png`).extractChannel("red").blur(5.5).raw().toBuffer();
const sky = Buffer.from(src.data);
for (let i = 0; i < n; i++) sky[i * 4 + 3] = soft[i];
await sharp(sky, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/sky.png`);
await sharp(flow, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/_tmp-flow-sky.png`);
await sharp(`${DIR}/_tmp-flow-sky.png`).blur(2.2).png().toFile(`${DIR}/flow-sky.png`);
console.log("r353 sky plates", DIR);
