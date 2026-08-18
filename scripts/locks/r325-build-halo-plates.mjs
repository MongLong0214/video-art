/**
 * r325 v6 plates: halo-centered radial flow + deity hold.
 * Alphas are source-derived. No foreign texture.
 */
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const DIR = "out/manual-runs/r325-ganesha-rainbow-rings-master/layers";

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

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / Math.max(1e-6, e1 - e0));
  return t * t * (3 - 2 * t);
};

const source = sharp(`${DIR}/source.png`);
const { data, info } = await source.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
const n = w * h;

const hsvAt = (i) => rgbToHsv(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);

const redRing = [];
for (let y = Math.floor(h * 0.06); y < Math.floor(h * 0.50); y++) {
  for (let x = Math.floor(w * 0.06); x < Math.floor(w * 0.94); x++) {
    const i = y * w + x;
    const hsv = hsvAt(i);
    const redHue = hsv.h <= 14 || hsv.h >= 348;
    if (redHue && hsv.s > 0.88 && hsv.v > 0.45 && hsv.v < 0.98) {
      redRing.push([x, y]);
    }
  }
}

// Painted rings are centered on the canvas; left lotus occludes the red
// band and would pull a free x-fit off-axis.
let cx = Math.round(w * 0.5);
let cy = Math.round(h * 0.30);
let rOuter = Math.round(h * 0.2);
if (redRing.length > 400) {
  let bestY = Math.round(h * 0.30);
  let bestR = rOuter;
  let bestVar = Infinity;
  for (let cyTry = Math.floor(h * 0.24); cyTry <= Math.floor(h * 0.36); cyTry += 2) {
    const rs = redRing.map(([x, y]) => Math.hypot(x - cx, y - cyTry));
    const mean = rs.reduce((a, b) => a + b, 0) / rs.length;
    let varr = 0;
    for (const r of rs) varr += (r - mean) ** 2;
    varr /= rs.length;
    if (varr < bestVar) {
      bestVar = varr;
      bestY = cyTry;
      bestR = mean;
    }
  }
  cy = bestY;
  rOuter = bestR;
}

const rInner = rOuter * 0.27;

const deityA = new Float32Array(n);
const haloA = new Float32Array(n);
const fieldA = new Float32Array(n);
const flow = Buffer.alloc(n * 4);
const phase = Buffer.alloc(n * 4);
const debug = Buffer.alloc(n * 4);
const deityRgba = Buffer.alloc(n * 4);

let haloCount = 0;
let deityCount = 0;

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const o = i * 4;
    const hsv = hsvAt(i);
    const nx = x - cx;
    const ny = y - cy;
    const pxR = Math.hypot(nx, ny);
    const ny01 = y / h;
    const nx01 = x / w;

    const annulus = smoothstep(rInner - 8, rInner + 6, pxR) * (1 - smoothstep(rOuter + 4, rOuter + 26, pxR));
    const rainbow = hsv.s > 0.82 && hsv.v > 0.28;
    const halo = clamp01(annulus * (rainbow ? 1 : 0));

    const lava =
      (hsv.h < 40 || hsv.h > 350) &&
      hsv.s > 0.62 &&
      hsv.v > 0.32 &&
      ny01 > 0.46 &&
      pxR > rOuter * 0.55;
    const marble = ny01 < 0.18 && hsv.h > 198 && hsv.h < 275 && hsv.s > 0.25 && annulus < 0.2;
    const inFigureBox =
      nx01 > 0.12 &&
      nx01 < 0.88 &&
      ny01 > 0.24 &&
      ny01 < 0.93;
    const midSatFigure = hsv.s < 0.88 && hsv.v > 0.16;
    const crown = pxR < rInner + 28 && hsv.s < 0.82;
    const deity = clamp01(
      ((inFigureBox && midSatFigure) || crown ? 1 : 0) *
        (1 - halo * 0.98) *
        (1 - (lava ? 0.96 : 0)) *
        (1 - (marble ? 0.95 : 0))
    );

    haloA[i] = halo;
    fieldA[i] = clamp01((lava ? 1 : 0) * 0.95 + (marble ? 0.9 : 0));
    deityA[i] = deity;
    if (halo > 0.35) haloCount++;
    if (deity > 0.35) deityCount++;

    const len = Math.max(1e-5, Math.hypot(nx / w, ny / h));
    const rdx = nx / w / len;
    const rdy = ny / h / len;
    let dx;
    let dy;
    let coh;
    if (annulus > 0.2) {
      dx = rdx;
      dy = rdy;
      coh = 1;
    } else if (lava) {
      dx = 0.05 * rdx;
      dy = 0.95;
      coh = 0.84;
    } else if (marble) {
      dx = rdx * 0.4;
      dy = rdy * 0.6;
      coh = 0.72;
    } else {
      dx = rdx * 0.15;
      dy = rdy * 0.15;
      coh = 0.16;
    }

    flow[o] = Math.round(255 * clamp01(0.5 + 0.5 * dx));
    flow[o + 1] = Math.round(255 * clamp01(0.5 + 0.5 * dy));
    flow[o + 2] = Math.round(255 * clamp01(coh));
    flow[o + 3] = 255;

    const phaseV = clamp01(pxR / (rOuter * 1.15));
    const g8 = Math.round(phaseV * 255);
    phase[o] = g8;
    phase[o + 1] = g8;
    phase[o + 2] = g8;
    phase[o + 3] = 255;

    deityRgba[o] = data[o];
    deityRgba[o + 1] = data[o + 1];
    deityRgba[o + 2] = data[o + 2];
    deityRgba[o + 3] = Math.round(deity * 255);

    debug[o] = Math.round(halo * 255);
    debug[o + 1] = Math.round(deity * 255);
    debug[o + 2] = Math.round(fieldA[i] * 255);
    debug[o + 3] = 255;
  }
}

const blurAlpha = async (src, radius) => {
  const gray = Buffer.alloc(n);
  for (let i = 0; i < n; i++) gray[i] = Math.round(src[i] * 255);
  const blurred = await sharp(gray, { raw: { width: w, height: h, channels: 1 } })
    .blur(radius)
    .raw()
    .toBuffer();
  return blurred;
};

for (let i = 0; i < n; i++) {
  deityRgba[i * 4 + 3] = Math.round(deityA[i] * 255);
}

const writeRgba = (name, buf) =>
  sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/${name}`);

const deityAlphaGray = Buffer.alloc(n * 4);
const haloAlphaGray = Buffer.alloc(n * 4);
for (let i = 0; i < n; i++) {
  const a = Math.round(deityA[i] * 255);
  const ha = Math.round(haloA[i] * 255);
  deityAlphaGray[i * 4] = a;
  deityAlphaGray[i * 4 + 1] = a;
  deityAlphaGray[i * 4 + 2] = a;
  deityAlphaGray[i * 4 + 3] = 255;
  haloAlphaGray[i * 4] = ha;
  haloAlphaGray[i * 4 + 1] = ha;
  haloAlphaGray[i * 4 + 2] = ha;
  haloAlphaGray[i * 4 + 3] = 255;
}

await writeRgba("deity.png", deityRgba);
await writeRgba("flow-halo-radial.png", flow);
await writeRgba("phase-halo.png", phase);
await writeRgba("debug-v6-masks.png", debug);
await writeRgba("debug-v6-deity-alpha.png", deityAlphaGray);
await writeRgba("debug-v6-halo-alpha.png", haloAlphaGray);

const meta = {
  redRingPts: redRing.length,
  cx,
  cy,
  cxN: +(cx / w).toFixed(4),
  cyN: +(cy / h).toFixed(4),
  rInner: +rInner.toFixed(1),
  rOuter: +rOuter.toFixed(1),
  haloPct: +(100 * haloCount / n).toFixed(2),
  deityPct: +(100 * deityCount / n).toFixed(2),
};
writeFileSync(
  "out/manual-runs/r325-ganesha-rainbow-rings-master/v6-plates-meta.json",
  JSON.stringify(meta, null, 2)
);
console.log(JSON.stringify(meta, null, 2));
