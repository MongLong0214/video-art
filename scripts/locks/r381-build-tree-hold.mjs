// r381 tree-woman (field take, r380 method): the wood figure — body, arms, branches, roots — as a still hold, so the
// canopy, sky band and grass take the field's colour cycle and transport while the drawing stays the drawing.
// Mask = flood fill from body seeds over the wood class (tan, mid saturation), close the grain, fill holes, grow a
// margin, feather. Optional punch opens the belly swirl (the beam hero) so it travels on layer 0 (session-grade).
// Writes layers/hand-hold.png: the r379 field-fill / color-ring chain reads that name.
//   node scripts/locks/r381-build-tree-hold.mjs [work-dir] [margin] [punch 0|1] [debug-tag]
//   margin = dilation at 1/4 res (≈ 4 × margin px). Hero = R379_HERO="cx,cy" (px) or hero.json.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [, , wdArg, marginArg, punchArg, tag] = process.argv;
const workDir = path.resolve(wdArg ?? "out/manual-runs/r381-tree-woman-field");
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
// wood is tan h 19-29, s 0.44-0.62, v 0.51-0.76; the sunlit grass patches share the hue but sit at s ≥ 0.75
const wood = (hh, s, v) => hh >= 8 && hh <= 42 && s >= 0.3 && s <= 0.68 && v >= 0.4;
// shaded wood between the thighs and on the right hip (h 36-54, v 0.28-0.45), only inside the hip box so it never
// meets the grass or the dark sky band
const shade = (hh, s, v) => hh >= 25 && hh <= 60 && s >= 0.35 && s <= 0.75 && v >= 0.22 && v <= 0.5;
const inHips = (i) => { const x = (i % w) / (w - 1), y = ((i / w) | 0) / (h - 1); return x >= 0.36 && x <= 0.66 && y >= 0.5 && y <= 0.68; };
const pass = new Uint8Array(n);
for (let i = 0; i < n; i++) { const c = hsv(i); pass[i] = wood(...c) || (inHips(i) && shade(...c)) ? 1 : 0; }

const fill = (seeds, ok, out) => {
  const stack = [];
  for (const [sx, sy] of seeds) {
    const cx = Math.round(sx * (w - 1)), cy = Math.round(sy * (h - 1));
    let best = -1, bd = Infinity;
    for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
      const x = cx + dx, y = cy + dy, d = dx * dx + dy * dy;
      if (x >= 0 && y >= 0 && x < w && y < h && d < bd && ok(y * w + x)) { bd = d; best = y * w + x; }
    }
    if (best >= 0 && !out[best]) { out[best] = 1; stack.push(best); }
  }
  while (stack.length) {
    const i = stack.pop(), x = i % w, y = (i / w) | 0;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
      if (j >= 0 && !out[j] && ok(j)) { out[j] = 1; stack.push(j); }
    }
  }
};
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

// close the grain first so dark furrows do not split a branch, then flood from the body
const passClosed = morph(morph(pass, 1, true), 1, false);
const mask = new Uint8Array(n);
// seeds: belly, chest, both thighs, lower trunk, roots left/right, both arms, outer left/right branches
fill([[0.495, 0.548], [0.5, 0.43], [0.45, 0.66], [0.55, 0.66], [0.5, 0.76], [0.2, 0.86], [0.75, 0.86], [0.3, 0.36],
  [0.72, 0.36], [0.08, 0.24], [0.8, 0.3]], (i) => passClosed[i] === 1, mask);
let m = morph(morph(mask, 2, true), 2, false);

const outside = new Uint8Array(n);
const border = [];
for (let x = 0; x < w; x++) border.push([x / w, 0], [x / w, (h - 1) / h]);
for (let y = 0; y < h; y++) border.push([0, y / h], [(w - 1) / w, y / h]);
fill(border, (i) => m[i] === 0, outside);
for (let i = 0; i < n; i++) if (!outside[i]) m[i] = 1;

m = morph(m, Number(marginArg ?? 2), true);

const gray = Buffer.alloc(n);
for (let i = 0; i < n; i++) gray[i] = m[i] * 255;
const soft = await sharp(gray, { raw: { width: w, height: h, channels: 1 } }).resize(W, H, { kernel: "lanczos3" }).blur(8).raw().toBuffer({ resolveWithObject: true });
const stride = soft.info.channels;
const alpha = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) alpha[i] = soft.data[i * stride];
if (punchArg === "1") {
  const heroEnv = process.env.R379_HERO?.split(",").map(Number);
  const hero = heroEnv ? { cx: heroEnv[0], cy: heroEnv[1] } : JSON.parse(fs.readFileSync(path.join(workDir, "hero.json"), "utf8"));
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // the swirl core (≈ 80 px radius) travels; its rim stays held. Kept inside the body so transported field (128 px)
  // sampled from beyond the hip never reaches the opening
  for (let y = Math.max(0, hero.cy - 130); y < Math.min(H, hero.cy + 130); y++) for (let x = Math.max(0, hero.cx - 130); x < Math.min(W, hero.cx + 130); x++) {
    alpha[y * W + x] = Math.round(alpha[y * W + x] * smooth(24, 80, Math.hypot(x - hero.cx, y - hero.cy)));
  }
}

const out = Buffer.from(src.data);
for (let i = 0; i < W * H; i++) out[i * 4 + 3] = alpha[i];
if (tag) {
  const dbg = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    const a = alpha[i] / 255;
    for (let c = 0; c < 3; c++) dbg[i * 3 + c] = Math.round(src.data[i * 4 + c] * (0.25 + 0.75 * a) + (c === 1 ? 90 * (1 - a) * (a > 0.02) : 0));
  }
  await sharp(dbg, { raw: { width: W, height: H, channels: 3 } }).resize(816).png().toFile(path.join(layers, `debug-tree-hold-${tag}.png`));
  let cov = 0; for (let i = 0; i < W * H; i++) cov += alpha[i] / 255;
  console.log(`debug ${tag}: hold coverage ${(100 * cov / (W * H)).toFixed(1)} %`);
} else {
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(layers, "hand-hold.png"));
  console.log("hand-hold.png written (tree)");
}
