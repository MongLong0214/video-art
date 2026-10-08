// r383 mushroom-hand (r380 method): the hand, the mushroom forest and the black tree line as a still hold, so the tie-dye
// burst around them takes the field's colour cycle and radial transport while the figures stay the drawing.
// Hand + forest = traced envelope (r379 LOTUS idea): the rainbow fringes and the tan-on-tie-dye overlap (blurred sat
// 0.3-0.6 on both caps and background) defeat a pixel class. The background pocket under the thumb is cut back out.
// Trees = flood fill from the bottom row over dark pixels (blurred value < 0.22): a clean class.
// bodies=1 (v2): inside the forest only the bright tan caps and stems stay held; the tie-dye between the stems drops
// to the colour ring (v1 held it, and the forest read as a box of source colour against the cycling field).
// Writes layers/hand-hold.png: the r379 field-fill / color-ring chain reads that name.
//   node scripts/locks/r383-build-hand-hold.mjs [work-dir] [margin] [bodies 0|1] [debug-tag]
//   margin = dilation at 1/4 res (≈ 4 × margin px). The hero (beam@0.56,0.56) sits in the open vortex: no punch.
import path from "node:path";
import sharp from "sharp";

const [, , wdArg, marginArg, bodiesArg, tag] = process.argv;
const workDir = path.resolve(wdArg ?? "out/manual-runs/r383-mushroom-hand");
const layers = path.join(workDir, "layers");
const src = await sharp(path.join(layers, "source.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = src.info;

const S = 4, w = Math.round(W / S), h = Math.round(H / S), n = w * h;
const small = await sharp(path.join(layers, "source.png")).resize(w, h, { kernel: "lanczos3" }).blur(1).removeAlpha().raw().toBuffer();
const v = Buffer.alloc(n);
for (let i = 0; i < n; i++) v[i] = Math.max(small[i * 3], small[i * 3 + 1], small[i * 3 + 2]);
const hsv = (i) => {
  const r = small[i * 3] / 255, g = small[i * 3 + 1] / 255, b = small[i * 3 + 2] / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let hh = 0;
  if (d > 0) hh = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [hh * 60, mx ? d / mx : 0, mx];
};
// caps and stems are lit tan/salmon (h 0-80, v ≥ 0.55) or near-white; the tie-dye between them is darker or louder
const body = (hh, s, val) => val >= 0.55 && ((hh <= 80 && s <= 0.66) || s <= 0.22);
// the hand (thumb, index, shaded palm and knuckle) stays whole; the rest of the envelope is the forest
const HAND = [[0.3, 0.13], [0.36, 0.122], [0.43, 0.108], [0.52, 0.099], [0.61, 0.094], [0.7, 0.086], [0.78, 0.08],
  [0.87, 0.074], [1, 0.07], [1, 0.42], [0.87, 0.425], [0.74, 0.43], [0.61, 0.425], [0.54, 0.412], [0.505, 0.395],
  [0.53, 0.376], [0.58, 0.356], [0.64, 0.34], [0.685, 0.322], [0.61, 0.312], [0.48, 0.306], [0.4, 0.302], [0.345, 0.3],
  [0.31, 0.28], [0.296, 0.255], [0.3, 0.2]];
// the big pinched cap is one solid dome; its shaded underside fails the lit-tan class
const CAP1 = [[0.112, 0.19], [0.115, 0.16], [0.144, 0.131], [0.188, 0.11], [0.25, 0.104], [0.313, 0.115], [0.345, 0.128],
  [0.33, 0.16], [0.29, 0.185], [0.26, 0.2], [0.2, 0.205], [0.15, 0.2]];
// sharp may hand back 3 channels for a 1-channel raw input
const vBlur = await sharp(v, { raw: { width: w, height: h, channels: 1 } }).blur(2).extractChannel(0).raw().toBuffer();

// clockwise from the top-left cap: cap tops, index finger top, right edge, hand underside, red-spotted cap, the right
// stem pair, stem feet, left frame edge, left cap rims
const CLUSTER = [[0.112, 0.19], [0.115, 0.16], [0.144, 0.131], [0.188, 0.11], [0.25, 0.104], [0.313, 0.115], [0.345, 0.128],
  [0.36, 0.122], [0.43, 0.108], [0.52, 0.099], [0.61, 0.094], [0.7, 0.086], [0.78, 0.08], [0.87, 0.074], [1, 0.07],
  [1, 0.42], [0.87, 0.425], [0.74, 0.43], [0.61, 0.425], [0.54, 0.412], [0.54, 0.422], [0.528, 0.44], [0.52, 0.462],
  [0.545, 0.475], [0.556, 0.497], [0.54, 0.512], [0.518, 0.52], [0.52, 0.594], [0.512, 0.65], [0.45, 0.663],
  [0.375, 0.663], [0.3, 0.667], [0.225, 0.672], [0.15, 0.676], [0.075, 0.68], [0, 0.68], [0, 0.295], [0.05, 0.288],
  [0.081, 0.26], [0.094, 0.225]];
// tie-dye seen between the thumb, the curled knuckle and the caps below: it belongs to the field
const POCKET = [[0.345, 0.3], [0.4, 0.302], [0.48, 0.306], [0.61, 0.312], [0.685, 0.322], [0.64, 0.34], [0.58, 0.356],
  [0.53, 0.376], [0.505, 0.395], [0.47, 0.392], [0.44, 0.396], [0.4, 0.378], [0.36, 0.356], [0.345, 0.33]];
const inPoly = (poly, px, py) => {
  let inside = false;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
    const [xa, ya] = poly[a], [xb, yb] = poly[b];
    if (ya > py !== yb > py && px < ((xb - xa) * (py - ya)) / (yb - ya) + xa) inside = !inside;
  }
  return inside;
};

const morph = (m, r, grow) => {
  const out = new Uint8Array(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let hit = !grow;
    for (let dy = -r; dy <= r && hit !== grow; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const xx = x + dx, yy = y + dy;
      const val = xx >= 0 && yy >= 0 && xx < w && yy < h ? m[yy * w + xx] : 0;
      if (grow ? val : !val) { hit = grow; break; }
    }
    out[y * w + x] = hit ? 1 : 0;
  }
  return out;
};

const mask = new Uint8Array(n);
let bodies = new Uint8Array(n);
for (let i = 0; i < n; i++) {
  const x = (i % w) / (w - 1), y = ((i / w) | 0) / (h - 1);
  if (!inPoly(CLUSTER, x, y) || inPoly(POCKET, x, y)) continue;
  if (bodiesArg !== "1" || inPoly(HAND, x, y) || inPoly(CAP1, x, y)) mask[i] = 1;
  else if (body(...hsv(i))) bodies[i] = 1;
}
// open drops the tan specks in the tie-dye, close rejoins the spotted cap texture
bodies = morph(morph(morph(morph(bodies, 1, false), 1, true), 3, true), 3, false);
// and specks that survive (< 80 px at 1/4 res, a cap is > 300) would sit still in the moving tie-dye
const seen = new Uint8Array(n);
for (let s0 = 0; s0 < n; s0++) {
  if (!bodies[s0] || seen[s0]) continue;
  const comp = [s0];
  seen[s0] = 1;
  for (let k = 0; k < comp.length; k++) {
    const i = comp[k], x = i % w, y = (i / w) | 0;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
      if (j >= 0 && bodies[j] && !seen[j]) { seen[j] = 1; comp.push(j); }
    }
  }
  if (comp.length >= 80) for (const i of comp) mask[i] = 1;
}
// trees: dark below the horizon, flooded up from the bottom row so the dark vortex shadows above never join
const stack = [];
for (let x = 0; x < w; x++) {
  const i = (h - 1) * w + x;
  if (vBlur[i] < 56 && !mask[i]) { mask[i] = 1; stack.push(i); }
}
while (stack.length) {
  const i = stack.pop(), x = i % w, y = (i / w) | 0;
  for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
    if (j >= 0 && !mask[j] && vBlur[j] < 56 && j / w / h > 0.7) { mask[j] = 1; stack.push(j); }
  }
}

let m = morph(morph(mask, 2, true), 2, false); // close the needle fringes on the tree tops
m = morph(m, Number(marginArg ?? 2), true);

const gray = Buffer.alloc(n);
for (let i = 0; i < n; i++) gray[i] = m[i] * 255;
const soft = await sharp(gray, { raw: { width: w, height: h, channels: 1 } }).resize(W, H, { kernel: "lanczos3" }).blur(8).extractChannel(0).raw().toBuffer();

const out = Buffer.from(src.data);
for (let i = 0; i < W * H; i++) out[i * 4 + 3] = soft[i];
if (tag) {
  const dbg = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    const a = soft[i] / 255;
    for (let c = 0; c < 3; c++) dbg[i * 3 + c] = Math.round(src.data[i * 4 + c] * (0.25 + 0.75 * a) + (c === 1 ? 90 * (1 - a) * (a > 0.02) : 0));
  }
  await sharp(dbg, { raw: { width: W, height: H, channels: 3 } }).resize(816).png().toFile(path.join(layers, `debug-hand-hold-${tag}.png`));
  let cov = 0; for (let i = 0; i < W * H; i++) cov += soft[i] / 255;
  console.log(`debug ${tag}: hold coverage ${(100 * cov / (W * H)).toFixed(1)} %`);
} else {
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(layers, "hand-hold.png"));
  console.log("hand-hold.png written (mushroom hand)");
}
