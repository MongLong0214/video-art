/**
 * r385 x-ray mushroom: spectral rays burst from the amanita's gills.
 * session-plates beam is a pour cone plus water diagonals, which this source does not have. This replaces it:
 * - flow-beam: radial-out from the ray nexus in the dark field, the body rides its own structure field.
 * - phase-beam: distance from the nexus.
 * - figure-hold: the x-ray body, hand and mushroom as source pixels. Thin rays fall out of the mask through a
 *   morphological opening of the luma (rays are 1-3 px at 1/4 res, fingers and stem are 15+). Holes inside the
 *   body (dark brain folds) are filled. A small feathered hole (~5 px) stays at the nexus: the hero is never held. 26×22 px (and 9×8) showed the L0 field
 *   through the gills as a dull grey disc.
 * Nexus (0.241, 0.340) = least-squares convergence of the streak orientations (structure tensor, 3224 windows).
 *   node scripts/locks/r385-build-beam-plates.mjs [work-dir]
 */
import path from "node:path";
import sharp from "sharp";

const [, , wdArg] = process.argv;
const DIR = path.join(path.resolve(wdArg ?? "out/manual-runs/r385-xray-mushroom"), "layers");
const CXN = 0.241;
const CYN = 0.34;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const firstChannel = async (img, w, h) => {
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const out = new Float32Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = data[i * info.channels] / 255;
  return out;
};

const src = await sharp(path.join(DIR, "source.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const struct = await sharp(path.join(DIR, "flow-field.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = src.info;
const n = w * h;
const cx = CXN * w;
const cy = CYN * h;

// body mask at 1/4 res: luma > 0.22, opening radius 4, fill holes
const S = 4, qw = Math.round(w / S), qh = Math.round(h / S), qn = qw * qh, R = 4;
const q = await sharp(path.join(DIR, "source.png")).resize(qw, qh).removeAlpha().blur(0.8).raw().toBuffer();
let m = new Uint8Array(qn);
// Saturated pixels count as body too: the amanita's crimson cap top has luma ≈ 0.23 and fell out of the hold,
// so the field's contour bands showed through it.
for (let i = 0; i < qn; i++) {
  const r = q[i * 3], g = q[i * 3 + 1], b = q[i * 3 + 2], mx = Math.max(r, g, b);
  const vivid = mx > 110 && (mx - Math.min(r, g, b)) / mx > 0.6;
  m[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.22 || vivid ? 1 : 0;
}
const pass = (a, horiz, useMin) => {
  const o = new Uint8Array(qn);
  for (let y = 0; y < qh; y++) for (let x = 0; x < qw; x++) {
    let v = useMin ? 1 : 0;
    for (let k = -R; k <= R; k++) {
      const xx = horiz ? x + k : x, yy = horiz ? y : y + k;
      const s = xx < 0 || yy < 0 || xx >= qw || yy >= qh ? v : a[yy * qw + xx];
      v = useMin ? Math.min(v, s) : Math.max(v, s);
    }
    o[y * qw + x] = v;
  }
  return o;
};
m = pass(pass(pass(pass(m, true, true), false, true), true, false), false, false);
const outside = new Uint8Array(qn);
const stack = [];
for (let x = 0; x < qw; x++) stack.push(x, (qh - 1) * qw + x);
for (let y = 0; y < qh; y++) stack.push(y * qw, y * qw + qw - 1);
while (stack.length) {
  const i = stack.pop();
  if (outside[i] || m[i]) continue;
  outside[i] = 1;
  const x = i % qw, y = (i / qw) | 0;
  if (x > 0) stack.push(i - 1);
  if (x < qw - 1) stack.push(i + 1);
  if (y > 0) stack.push(i - qw);
  if (y < qh - 1) stack.push(i + qw);
}
const qm = Buffer.alloc(qn);
for (let i = 0; i < qn; i++) qm[i] = outside[i] ? 0 : 255;
const body = await firstChannel(sharp(qm, { raw: { width: qw, height: qh, channels: 1 } }).resize(w, h, { kernel: "lanczos3" }).blur(4), w, h);
const bodyWide = await firstChannel(sharp(qm, { raw: { width: qw, height: qh, channels: 1 } }).blur(6).resize(w, h), w, h);

const flow = Buffer.alloc(n * 4);
const phase = Buffer.alloc(n * 4);
const hold = Buffer.from(src.data);
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
    const radialAmt = (0.35 + 0.6 * radialW) * (1 - 0.85 * bodyWide[i]);
    const dx = (dx0 / len) * radialAmt + sdx * (1 - radialAmt);
    const dy = (dy0 / len) * radialAmt + sdy * (1 - radialAmt);
    const fl = Math.max(1e-5, Math.hypot(dx, dy));
    const coh = 0.35 + 0.61 * radialW * (1 - bodyWide[i]);
    flow[o] = Math.round(255 * clamp01(0.5 + 0.5 * (dx / fl)));
    flow[o + 1] = Math.round(255 * clamp01(0.5 + 0.5 * (dy / fl)));
    flow[o + 2] = Math.round(255 * clamp01(coh));
    flow[o + 3] = 255;
    const g = Math.round(255 * clamp01(dist / 0.9));
    phase[o] = g;
    phase[o + 1] = g;
    phase[o + 2] = g;
    phase[o + 3] = 255;
    const nexusHole = 1 - smoothstep(0.5, 1.2, Math.hypot(dx0 / 5, dy0 / 4.5));
    hold[o + 3] = Math.round(255 * clamp01(body[i] * (1 - nexusHole)));
  }
}

await sharp(hold, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(DIR, "figure-hold.png"));
await sharp(flow, { raw: { width: w, height: h, channels: 4 } }).blur(1.2).png().toFile(path.join(DIR, "flow-beam.png"));
await sharp(phase, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(DIR, "phase-beam.png"));
const dbg = Buffer.alloc(n);
for (let i = 0; i < n; i++) dbg[i] = hold[i * 4 + 3];
await sharp(dbg, { raw: { width: w, height: h, channels: 1 } }).toColourspace("srgb").png().toFile(path.join(DIR, "debug-hold.png"));

const a = (nx, ny) => (hold[(Math.round(ny * (h - 1)) * w + Math.round(nx * (w - 1))) * 4 + 3] / 255).toFixed(2);
console.log("hold alpha", ["nexus", a(CXN, CYN), "cap", a(0.24, 0.31), "stem", a(0.24, 0.42), "skull", a(0.7, 0.2), "ray", a(0.1, 0.25), "gap", a(0.4, 0.6)].join(" "));
