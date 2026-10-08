/**
 * r386 hourglass faces: two heads joined by a glowing neck; the lower head's third eye is the nexus.
 * session-plates beam is a pour cone from the upper nostril plus water diagonals across the lower face. This replaces it:
 * - flow-beam: radial-out from the third eye, so the glow rides up the neck and out through the smoke.
 *   Face features ride their own structure field (r372: the portrait does not shear).
 * - phase-beam: distance from the third eye.
 * - figure-hold: face features (closed eye, nostrils, lips, ears) as source pixels. The source is stippled
 *   all over, so features are found as edges of the blurred luma inside feature ellipses, not raw detail.
 *   The third eye is punched out: the hero is never held.
 *   node scripts/locks/r386-build-beam-plates.mjs [work-dir]
 */
import path from "node:path";
import sharp from "sharp";

const [, , wdArg] = process.argv;
const DIR = path.join(path.resolve(wdArg ?? "out/manual-runs/r386-hourglass-faces"), "layers");
const CXN = 0.5055;
const CYN = 0.7091;
// [cx, cy, rx, ry] in normalised coords: upper eye+nose+drip, upper ear, lower nose+lips+chin, lower ears
const FEATURES = [
  [0.735, 0.21, 0.17, 0.105],
  [0.125, 0.27, 0.085, 0.09],
  [0.5, 0.825, 0.2, 0.085],
  [0.19, 0.89, 0.055, 0.06],
  [0.9, 0.865, 0.065, 0.065],
];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

const src = await sharp(path.join(DIR, "source.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const struct = await sharp(path.join(DIR, "flow-field.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = src.info;
const n = w * h;
const cx = CXN * w;
const cy = CYN * h;

// blur 4 removes the stipple; features are the edges that survive
const lumaBlur = await sharp(path.join(DIR, "source.png")).removeAlpha().greyscale().blur(4).raw().toBuffer();
const grad = new Float32Array(n);
for (let y = 2; y < h - 2; y++) {
  for (let x = 2; x < w - 2; x++) {
    const i = y * w + x;
    grad[i] = (Math.abs(lumaBlur[i + 2] - lumaBlur[i - 2]) + Math.abs(lumaBlur[i + 2 * w] - lumaBlur[i - 2 * w])) / 255;
  }
}

const faceAt = (x, y) => {
  let f = 0;
  for (const [fx, fy, rx, ry] of FEATURES) f = Math.max(f, 1 - smoothstep(0.7, 1.15, Math.hypot((x / w - fx) / rx, (y / h - fy) / ry)));
  return f;
};

const flow = Buffer.alloc(n * 4);
const phase = Buffer.alloc(n * 4);
const rawHold = Buffer.alloc(n);
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const o = i * 4;
    const sdx = (struct.data[o] / 255) * 2 - 1;
    const sdy = (struct.data[o + 1] / 255) * 2 - 1;
    const dx0 = x - cx;
    const dy0 = y - cy;
    const len = Math.max(1e-5, Math.hypot(dx0, dy0));
    const dist = len / Math.max(w, h);
    const radialW = smoothstep(0.012, 0.07, dist);
    const faceW = faceAt(x, y);
    const radialAmt = (0.35 + 0.6 * radialW) * (1 - 0.8 * faceW);
    const dx = (dx0 / len) * radialAmt + sdx * (1 - radialAmt);
    const dy = (dy0 / len) * radialAmt + sdy * (1 - radialAmt);
    const fl = Math.max(1e-5, Math.hypot(dx, dy));
    const coh = 0.5 + 0.46 * radialW * (1 - 0.6 * faceW);
    flow[o] = Math.round(255 * clamp01(0.5 + 0.5 * (dx / fl)));
    flow[o + 1] = Math.round(255 * clamp01(0.5 + 0.5 * (dy / fl)));
    flow[o + 2] = Math.round(255 * clamp01(coh));
    flow[o + 3] = 255;
    const g = Math.round(255 * clamp01(dist / 0.9));
    phase[o] = g;
    phase[o + 1] = g;
    phase[o + 2] = g;
    phase[o + 3] = 255;
    const drawn = smoothstep(0.03, 0.09, grad[i]);
    const eyeHole = 1 - smoothstep(0.8, 1.3, Math.hypot(dx0 / 90, dy0 / 80));
    rawHold[i] = Math.round(255 * clamp01(faceW * drawn * (1 - eyeHole)));
  }
}

const blurred = await sharp(rawHold, { raw: { width: w, height: h, channels: 1 } }).blur(5).raw().toBuffer({ resolveWithObject: true });
const soft = Buffer.alloc(n);
for (let i = 0; i < n; i++) soft[i] = blurred.data[i * blurred.info.channels];
const hold = Buffer.from(src.data);
for (let i = 0; i < n; i++) hold[i * 4 + 3] = soft[i];
await sharp(hold, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(DIR, "figure-hold.png"));
await sharp(flow, { raw: { width: w, height: h, channels: 4 } }).blur(1.2).png().toFile(path.join(DIR, "flow-beam.png"));
await sharp(phase, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(DIR, "phase-beam.png"));
await sharp(soft, { raw: { width: w, height: h, channels: 1 } }).toColourspace("srgb").png().toFile(path.join(DIR, "debug-hold.png"));

const a = (nx, ny) => (hold[(Math.round(ny * (h - 1)) * w + Math.round(nx * (w - 1))) * 4 + 3] / 255).toFixed(2);
console.log("hold alpha", ["eye", a(CXN, CYN), "neck", a(0.56, 0.5), "lips", a(0.5, 0.83), "nostril", a(0.75, 0.24), "smoke", a(0.15, 0.6)].join(" "));
