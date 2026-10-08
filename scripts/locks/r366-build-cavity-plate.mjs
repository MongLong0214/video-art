// r366 lips-buddha-tongue: L5 re-entry on the dark mouth cavity (00 §3.1 L5 = "dense-edge prism on flat / dark regions").
// Hold plate = source RGB + alpha from darkness, feathered. No nx/ny walls: the mask is the cavity silhouette.
//   node scripts/locks/r366-build-cavity-plate.mjs [work-dir]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

//   node scripts/locks/r366-build-cavity-plate.mjs [work-dir] [lo] [hi] [blurR] [debug-tag]
//   with debug-tag: writes only layers/debug-cavity-hold-<tag>.png (threshold probe), not the plate.
const [, , wdArg, loArg, hiArg, rArg, tag] = process.argv;
const workDir = path.resolve(wdArg ?? "out/manual-runs/r366-lips-buddha-tongue");
const LO = Number(loArg ?? 0.22), HI = Number(hiArg ?? 0.40), R = Number(rArg ?? 12);
const layers = path.join(workDir, "layers");
const { data, info } = await sharp(path.join(layers, "source.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
const n = w * h;

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// dark -> 1. The cavity is dark teal, not black (lum p5 = 0.21): default value band 0.22..0.40.
const alpha = new Float32Array(n);
for (let i = 0; i < n; i++) {
  const o = i * 4;
  const val = Math.max(data[o], data[o + 1], data[o + 2]) / 255;
  alpha[i] = 1 - smooth(LO, HI, val);
}

// feather: 2-pass box blur, radius 8 px at full res, run twice (~gaussian)
function boxBlur(src, r) {
  const tmp = new Float32Array(n), out = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    let acc = 0; const row = y * w;
    for (let x = -r; x <= r; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc / (2 * r + 1);
      acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / (2 * r + 1);
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}
const soft = boxBlur(boxBlur(alpha, R), R);

const hold = Buffer.from(data);
const dbg = Buffer.alloc(n * 4);
let cover = 0;
for (let i = 0; i < n; i++) {
  const a = Math.round(Math.min(1, Math.max(0, soft[i])) * 255);
  hold[i * 4 + 3] = a;
  dbg[i * 4] = dbg[i * 4 + 1] = dbg[i * 4 + 2] = a; dbg[i * 4 + 3] = 255;
  cover += a / 255;
}
const dbgName = tag ? `debug-cavity-hold-${tag}.png` : "debug-cavity-hold.png";
await sharp(dbg, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(layers, dbgName));
if (!tag) await sharp(hold, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(layers, "cavity-hold.png"));
console.log(`cavity-hold lo=${LO} hi=${HI} r=${R} coverage ${(100 * cover / n).toFixed(1)}%${tag ? ` (probe ${dbgName})` : " -> layers/cavity-hold.png"}`);
