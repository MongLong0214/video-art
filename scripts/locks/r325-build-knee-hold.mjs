/**
 * v8b: v8 plates + scene unchanged except deity alpha on the right knee.
 * Fills the lava notch and replaces the nx=0.88 vertical wall with a
 * curved cloth edge. Face / lotus / flow / knobs stay v8.
 */
import { copyFileSync } from "node:fs";
import sharp from "sharp";

const DIR = "out/manual-runs/r325-ganesha-rainbow-rings-master/layers";
copyFileSync(`${DIR}/deity-v8.png`, `${DIR}/deity.png`);

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

const deity = await sharp(`${DIR}/deity-v8.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const src = await sharp(`${DIR}/source.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = deity.info;
const n = w * h;
const a0 = new Float32Array(n);
for (let i = 0; i < n; i++) a0[i] = deity.data[i * 4 + 3] / 255;

// Close the 1-wide lava slit through the knee (v8 hole at nx≈0.84).
const closed = new Float32Array(a0);
const rad = 8;
for (let y = Math.floor(0.56 * h); y < Math.floor(0.84 * h); y++) {
  for (let x = Math.floor(0.72 * w); x < Math.floor(0.9 * w); x++) {
    const i = y * w + x;
    let m = a0[i];
    for (let dy = -rad; dy <= rad; dy += 2) {
      const yy = y + dy;
      if (yy < 0 || yy >= h) continue;
      for (let dx = -rad; dx <= rad; dx += 2) {
        const xx = x + dx;
        if (xx < 0 || xx >= w) continue;
        if (dx * dx + dy * dy > rad * rad) continue;
        const v = a0[yy * w + xx];
        if (v > m) m = v;
      }
    }
    closed[i] = m;
  }
}

const outA = new Float32Array(a0);
for (let y = 0; y < h; y++) {
  const ny = y / h;
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const nx = x / w;
    const inKnee = nx > 0.7 && nx < 0.94 && ny > 0.56 && ny < 0.84;
    if (!inKnee) {
      outA[i] = a0[i];
      continue;
    }
    const o = i * 4;
    const hsv = rgbToHsv(src.data[o], src.data[o + 1], src.data[o + 2]);
    const water =
      ((hsv.h < 28 || hsv.h > 350) && hsv.s > 0.78 && hsv.v > 0.38) ||
      (hsv.h > 310 && hsv.h < 345 && hsv.s > 0.75 && hsv.v > 0.4);
    const ex = (nx - 0.78) / 0.14;
    const ey = (ny - 0.72) / 0.12;
    const knee = 1 - smoothstep(0.86, 1.12, Math.hypot(ex, ey));
    const figureLike = hsv.s < 0.74 || (hsv.h > 22 && hsv.h < 55 && hsv.s < 0.86);
    const patch = Math.max(closed[i], knee * (figureLike && !water ? 1 : 0));
    outA[i] = Math.max(a0[i], patch);
  }
}

const gray = Buffer.alloc(n * 4);
for (let i = 0; i < n; i++) {
  const a = Math.round(outA[i] * 255);
  gray[i * 4] = a;
  gray[i * 4 + 1] = a;
  gray[i * 4 + 2] = a;
  gray[i * 4 + 3] = 255;
}
await sharp(gray, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/_tmp-knee.png`);
const soft = await sharp(`${DIR}/_tmp-knee.png`).extractChannel("red").blur(4).raw().toBuffer();

const out = Buffer.from(deity.data);
const dbg = Buffer.alloc(n * 4);
for (let y = 0; y < h; y++) {
  const ny = y / h;
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const nx = x / w;
    const inKnee = nx > 0.7 && ny > 0.56 && ny < 0.84;
    const a = inKnee ? Math.max(a0[i], soft[i] / 255) : a0[i];
    out[i * 4 + 3] = Math.round(255 * a);
    const g = Math.round(255 * a);
    dbg[i * 4] = g;
    dbg[i * 4 + 1] = g;
    dbg[i * 4 + 2] = g;
    dbg[i * 4 + 3] = 255;
  }
}
await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/deity.png`);

const left = Math.floor(0.58 * w);
const top = Math.floor(0.56 * h);
await sharp(dbg, { raw: { width: w, height: h, channels: 4 } })
  .extract({ left, top, width: w - left, height: h - top })
  .png()
  .toFile(`${DIR}/debug-v8b-br-deity.png`);

const check = (nx, ny) => {
  const a = out[(Math.floor(ny * h) * w + Math.floor(nx * w)) * 4 + 3] / 255;
  return a.toFixed(3);
};
const steep = [];
for (const ny of [0.62, 0.68, 0.7, 0.74, 0.78]) {
  const y = Math.floor(ny * h);
  let maxDa = 0;
  let maxX = 0;
  let prev = out[(y * w + Math.floor(0.55 * w)) * 4 + 3];
  for (let x = Math.floor(0.55 * w); x < Math.floor(0.96 * w); x++) {
    const a = out[(y * w + x) * 4 + 3];
    const da = prev - a;
    if (da > maxDa) {
      maxDa = da;
      maxX = x;
    }
    prev = a;
  }
  steep.push(`ny${ny}=${(maxX / w).toFixed(3)}/${maxDa}`);
}
console.log(
  "v8b",
  `face=${check(0.5, 0.42)} hole=${check(0.84, 0.7)} knee=${check(0.86, 0.72)} wall=${check(0.88, 0.7)} water=${check(0.94, 0.7)}`,
);
console.log("steepest", steep.join(" "));
