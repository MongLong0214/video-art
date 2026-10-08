// r379 palm-eye-vine v10: the red tulip columns on the left/right frame edges, as their own field layer without L9.
// The field's hue rings expand from the palm eye; on the coherent vertical columns they travel up/down and read as light
// flowing (Isaac: "왼쪽 오른쪽 가장자리의 색 변화가 너무 인위적인데 마치 빛이 위라래로 흐르는거같은"). This plate = source
// RGB + tulip alpha; the scene gives it the field's motion and no colour cycle, so the tulips move with the bokeh and keep
// their red/orange.
//   node scripts/locks/r379-build-edge-columns.mjs [work-dir] [debug-tag]
import path from "node:path";
import sharp from "sharp";

const [, , wdArg, tag] = process.argv;
const workDir = path.resolve(wdArg ?? "out/manual-runs/r379-palm-eye-vine");
const layers = path.join(workDir, "layers");
const src = await sharp(path.join(layers, "source.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = src.info;

const S = 4, w = Math.round(W / S), h = Math.round(H / S), n = w * h;
const small = await sharp(path.join(layers, "source.png")).resize(w, h, { kernel: "lanczos3" }).removeAlpha().raw().toBuffer();
const hsv = (i) => {
  const r = small[i * 3] / 255, g = small[i * 3 + 1] / 255, b = small[i * 3 + 2] / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let hh = 0;
  if (d > 0) hh = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [hh * 60, mx ? d / mx : 0, mx];
};
// tulip red with yellow/orange flames; the zone keeps the orange bokeh blobs further in out
const tulip = (hh, s, v) => (hh >= 340 || hh <= 55) && s >= 0.5 && v >= 0.45;
const ZONE = 0.085;
const pass = new Uint8Array(n);
for (let i = 0; i < n; i++) {
  const x = (i % w) / (w - 1);
  pass[i] = (x < ZONE || x > 1 - ZONE) && tulip(...hsv(i)) ? 1 : 0;
}

// flood fill from seeds down both column centres, so a stray orange blob inside the zone stays out
const mask = new Uint8Array(n);
const stack = [];
for (let k = 0; k <= 40; k++) for (const sx of [0.03, 0.965]) {
  const cx = Math.round(sx * (w - 1)), cy = Math.round((k / 40) * (h - 1));
  let best = -1, bd = Infinity;
  for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
    const x = cx + dx, y = cy + dy, d = dx * dx + dy * dy;
    if (x >= 0 && y >= 0 && x < w && y < h && d < bd && pass[y * w + x]) { bd = d; best = y * w + x; }
  }
  if (best >= 0 && !mask[best]) { mask[best] = 1; stack.push(best); }
}
while (stack.length) {
  const i = stack.pop(), x = i % w, y = (i / w) | 0;
  for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
    if (j >= 0 && !mask[j] && pass[j]) { mask[j] = 1; stack.push(j); }
  }
}

const morph = (m, r, grow) => {
  const out = new Uint8Array(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let hit = !grow;
    for (let dy = -r; dy <= r && hit !== grow; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const xx = x + dx, yy = y + dy;
      const v = xx >= 0 && yy >= 0 && xx < w && yy < h ? m[yy * w + xx] : 0;
      if (grow ? v : !v) { hit = grow; break; }
    }
    out[y * w + x] = hit ? 1 : 0;
  }
  return out;
};
// close the flame gaps, then a 8 px margin so the tulips' soft red glow is not left in the cycling field
const m = morph(morph(morph(mask, 2, true), 2, false), 2, true);

const gray = Buffer.alloc(n);
for (let i = 0; i < n; i++) gray[i] = m[i] * 255;
const soft = await sharp(gray, { raw: { width: w, height: h, channels: 1 } }).resize(W, H, { kernel: "lanczos3" }).blur(6).raw().toBuffer({ resolveWithObject: true });
const stride = soft.info.channels; // sharp may hand back 3 channels for a 1-channel raw input
const out = Buffer.from(src.data);
for (let i = 0; i < W * H; i++) out[i * 4 + 3] = soft.data[i * stride];

if (tag) {
  const dbg = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    const a = out[i * 4 + 3] / 255;
    for (let c = 0; c < 3; c++) dbg[i * 3 + c] = Math.round(src.data[i * 4 + c] * (0.25 + 0.75 * a) + (c === 1 ? 90 * (1 - a) * (a > 0.02) : 0));
  }
  await sharp(dbg, { raw: { width: W, height: H, channels: 3 } }).resize(816).png().toFile(path.join(layers, `debug-edge-columns-${tag}.png`));
  console.log(`debug ${tag} written`);
} else {
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(layers, "edge-columns.png"));
  console.log("edge-columns.png written");
}
