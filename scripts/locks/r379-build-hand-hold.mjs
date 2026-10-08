// r379 palm-eye-vine: hand + vine silhouette hold, so L1 travel moves the bokeh field and never bends fingers or eyes
// (Isaac: "원본 최대한 보존해줘 너무 훼손하지마"). Hold plate = source RGB + alpha, feathered. No nx/ny walls.
// Mask = flood fill from palm/wrist seeds over skin (pink-red) and vine (dark green) pixels, then fill holes (the two eyes),
// close the vine hairs, grow a margin that covers L1 ghosting, feather, open the hero pupil.
//   node scripts/locks/r379-build-hand-hold.mjs [work-dir] [margin] [debug-tag]
//   margin = dilation at 1/4 res (default 3 ≈ 12 px, v3). v5 uses 6 so the source's light rim stays on the hand
//   and is not carried off by the field transport. R379_FLOWER=1 (v5) also holds the lotus.
//   With debug-tag: writes only layers/debug-hand-hold-<tag>.png.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [, , wdArg, marginArg, tag] = process.argv;
const withFlower = process.env.R379_FLOWER === "1";
const workDir = path.resolve(wdArg ?? "out/manual-runs/r379-palm-eye-vine");
const layers = path.join(workDir, "layers");
const src = await sharp(path.join(layers, "source.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = src.info;

// classify + flood fill at 1/4 res (408x728): the silhouette edge is soft in the source anyway.
const S = 4, w = Math.round(W / S), h = Math.round(H / S), n = w * h;
const small = await sharp(path.join(layers, "source.png")).resize(w, h, { kernel: "lanczos3" }).removeAlpha().raw().toBuffer();
const hsv = (i) => {
  const r = small[i * 3] / 255, g = small[i * 3 + 1] / 255, b = small[i * 3 + 2] / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let hh = 0;
  if (d > 0) hh = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [hh * 60, mx ? d / mx : 0, mx];
};
// skin has a lilac tone (h 321-326, s 0.34-0.41) and a red tone (h 340-3, s 0.6-0.74)
const skin = (hh, s, v) => (hh >= 315 || hh <= 22) && s >= 0.3 && v >= 0.45;
const vine = (hh, s, v) => hh >= 70 && hh <= 175 && s >= 0.3 && v <= 0.62;
// lotus (v5: L8 transport bobbed and smeared the flower): every non-bokeh pixel inside a traced envelope. A pink/white
// petal class missed the shaded lower-right petals (lavender, h ≈ 260, v ≈ 0.65) and they rode the field (Isaac:
// "연꽃 우측 하단이 배경과 같이 움직이고있는데"). The envelope keeps the look-alike pink bokeh blobs out.
const LOTUS = [[0.206, 0.16], [0.243, 0.126], [0.292, 0.089], [0.353, 0.06], [0.426, 0.043], [0.504, 0.041], [0.569, 0.048],
  [0.635, 0.064], [0.692, 0.087], [0.733, 0.114], [0.79, 0.149], [0.782, 0.176], [0.757, 0.204], [0.749, 0.236], [0.7, 0.263],
  [0.623, 0.272], [0.549, 0.256], [0.516, 0.236], [0.484, 0.247], [0.418, 0.272], [0.341, 0.275], [0.267, 0.252],
  [0.239, 0.22], [0.214, 0.192]];
const inLotus = (px, py) => {
  let inside = false;
  for (let a = 0, b = LOTUS.length - 1; a < LOTUS.length; b = a++) {
    const [xa, ya] = LOTUS[a], [xb, yb] = LOTUS[b];
    if (ya > py !== yb > py && px < ((xb - xa) * (py - ya)) / (yb - ya) + xa) inside = !inside;
  }
  return inside;
};
// background inside the envelope: green leaves, saturated blue bokeh, deep shadow
const bokeh = (hh, s, v) => (hh >= 70 && hh <= 185 && s >= 0.2) || (hh > 185 && hh <= 250 && s >= 0.3) || v < 0.45;
const pass = new Uint8Array(n), flowerPass = new Uint8Array(n);
for (let i = 0; i < n; i++) {
  const [hh, s, v] = hsv(i);
  pass[i] = skin(hh, s, v) || vine(hh, s, v) ? 1 : 0;
  flowerPass[i] = inLotus((i % w) / (w - 1), ((i / w) | 0) / (h - 1)) && !bokeh(hh, s, v) ? 1 : 0;
}

const mask = new Uint8Array(n);
const fill = (seeds, ok, out) => {
  const stack = [];
  for (const [sx, sy] of seeds) {
    // snap a seed that lands on fur or a pore to the nearest passing pixel within 8 px
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
// seeds: palm right of the vine, index, middle, ring, little finger, thumb, wrist, upper vine on the middle finger, wrist stub
// below the vine loop (r380: the loop cuts it off from the wrist seed)
fill([[0.6, 0.6], [0.38, 0.36], [0.555, 0.33], [0.62, 0.35], [0.705, 0.42], [0.22, 0.47], [0.5, 0.9], [0.5, 0.3], [0.5, 0.97]], (i) => pass[i] === 1, mask);
if (withFlower) fill([[0.49, 0.13], [0.4, 0.12], [0.58, 0.12], [0.49, 0.06], [0.32, 0.14], [0.66, 0.14], [0.663, 0.215], [0.32, 0.229]], (i) => flowerPass[i] === 1, mask);

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
let m = morph(morph(mask, 3, true), 3, false); // close vine hairs and pores

// fill holes (the eyes) that are not reachable from the frame border
const outside = new Uint8Array(n);
const border = [];
for (let x = 0; x < w; x++) border.push([x / w, 0], [x / w, (h - 1) / h]);
for (let y = 0; y < h; y++) border.push([0, y / h], [(w - 1) / w, y / h]);
fill(border, (i) => m[i] === 0, outside);
for (let i = 0; i < n; i++) if (!outside[i]) m[i] = 1;

m = morph(m, Number(marginArg ?? 3), true); // full-res margin = 4 × margin px

const gray = Buffer.alloc(n);
for (let i = 0; i < n; i++) gray[i] = m[i] * 255;
const soft = await sharp(gray, { raw: { width: w, height: h, channels: 1 } }).resize(W, H, { kernel: "lanczos3" }).blur(10).raw().toBuffer({ resolveWithObject: true });
const stride = soft.info.channels; // sharp may hand back 3 channels for a 1-channel raw input
const alpha = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) alpha[i] = soft.data[i * stride];
// open the palm pupil (the beam hero) like the v1 plate: the hero must travel on layer 0 (session-grade)
// rebuild-closed-lock has no hero.json: a lock wrapper passes the hero pupil as R379_HERO="cx,cy" (px)
const heroEnv = process.env.R379_HERO?.split(",").map(Number);
const hero = heroEnv ? { cx: heroEnv[0], cy: heroEnv[1] } : JSON.parse(fs.readFileSync(path.join(workDir, "hero.json"), "utf8"));
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
for (let y = Math.max(0, hero.cy - 40); y < Math.min(H, hero.cy + 40); y++) for (let x = Math.max(0, hero.cx - 40); x < Math.min(W, hero.cx + 40); x++) {
  alpha[y * W + x] = Math.round(alpha[y * W + x] * smooth(12, 34, Math.hypot(x - hero.cx, y - hero.cy)));
}

const out = Buffer.from(src.data);
for (let i = 0; i < W * H; i++) out[i * 4 + 3] = alpha[i];
if (tag) {
  const dbg = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    const a = alpha[i] / 255;
    for (let c = 0; c < 3; c++) dbg[i * 3 + c] = Math.round(src.data[i * 4 + c] * (0.25 + 0.75 * a) + (c === 1 ? 90 * (1 - a) * (a > 0.02) : 0));
  }
  await sharp(dbg, { raw: { width: W, height: H, channels: 3 } }).resize(816).png().toFile(path.join(layers, `debug-hand-hold-${tag}.png`));
  let cov = 0; for (let i = 0; i < W * H; i++) cov += alpha[i] / 255;
  console.log(`debug ${tag}: hold coverage ${(100 * cov / (W * H)).toFixed(1)} %`);
} else {
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(layers, "hand-hold.png"));
  console.log("hand-hold.png written");
}
