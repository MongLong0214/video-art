// r379 palm-eye-vine v5: the moving field layer for L8 transport. Transport on the source itself dragged pink skin
// out past the hand hold (echo outlines on fingers) and mashed the punched palm pupil. Any fill under the hand shows
// too once dragged out (flat fill = pale ghost band, radial mirror = torn streaks), so this plate is transparent
// under the hand: the shader samples alpha at the displaced uv, and whatever transport pulls out from under the hand
// shows the still source layer below — the original bokeh at that spot. RGB under the hand is a push-pull fill of
// the surrounding bokeh only so filtering at the alpha edge never bleeds skin colour.
//   node scripts/locks/r379-build-field-fill.mjs [work-dir]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const workDir = path.resolve(process.argv[2] ?? "out/manual-runs/r379-palm-eye-vine");
const layers = path.join(workDir, "layers");
// rebuild-closed-lock has no hero.json: a lock wrapper passes the hero pupil as R379_HERO="cx,cy" (px).
// R379_HERO=none (r383): the hero sits in the open field, not in a punched hold, so there is no pupil to close.
const heroEnv = process.env.R379_HERO === "none" ? null : process.env.R379_HERO?.split(",").map(Number);
const hero = process.env.R379_HERO === "none" ? null
  : heroEnv ? { cx: heroEnv[0], cy: heroEnv[1] } : JSON.parse(fs.readFileSync(path.join(workDir, "hero.json"), "utf8"));
const src = await sharp(path.join(layers, "source.png")).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const hold = await sharp(path.join(layers, "hand-hold.png")).ensureAlpha().extractChannel(3).raw().toBuffer();
const { width: W, height: H } = src.info;

// hold with the punched pupil closed again: the reference for "under the hand"
const holdFull = Buffer.alloc(W * H);
for (let i = 0; i < W * H; i++) holdFull[i] = hero && Math.hypot((i % W) - hero.cx, ((i / W) | 0) - hero.cy) < 40 ? 255 : hold[i];

// push-pull at 1/4 res from pixels the hold does not touch
const S = 4, w = Math.ceil(W / S), h = Math.ceil(H / S);
const col = new Float32Array(w * h * 3), wt = new Float32Array(w * h);
for (let i = 0; i < W * H; i++) {
  if (holdFull[i] > 5) continue;
  const j = ((((i / W) | 0) / S) | 0) * w + (((i % W) / S) | 0);
  for (let c = 0; c < 3; c++) col[j * 3 + c] += src.data[i * 3 + c];
  wt[j] += 1;
}
for (let j = 0; j < w * h; j++) if (wt[j] > 0) { for (let c = 0; c < 3; c++) col[j * 3 + c] /= wt[j]; wt[j] = Math.min(1, wt[j] / (S * S * 0.5)); }

const pushPull = (c, k, cw, ch) => {
  if (cw <= 1 && ch <= 1) return c;
  const w2 = Math.ceil(cw / 2), h2 = Math.ceil(ch / 2);
  const c2 = new Float32Array(w2 * h2 * 3), k2 = new Float32Array(w2 * h2);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const i = y * cw + x, j = (y >> 1) * w2 + (x >> 1);
    for (let n = 0; n < 3; n++) c2[j * 3 + n] += c[i * 3 + n] * k[i];
    k2[j] += k[i];
  }
  for (let j = 0; j < w2 * h2; j++) if (k2[j] > 0) { for (let n = 0; n < 3; n++) c2[j * 3 + n] /= k2[j]; k2[j] = Math.min(1, k2[j]); }
  const f2 = pushPull(c2, k2, w2, h2);
  const out = new Float32Array(cw * ch * 3);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    // bilinear sample of the coarser level, so the fill has no 2^n blocks
    const fx = Math.min(w2 - 1, Math.max(0, (x + 0.5) / 2 - 0.5)), fy = Math.min(h2 - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
    const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(w2 - 1, x0 + 1), y1 = Math.min(h2 - 1, y0 + 1), ax = fx - x0, ay = fy - y0;
    const i = y * cw + x;
    for (let n = 0; n < 3; n++) {
      const up = (f2[(y0 * w2 + x0) * 3 + n] * (1 - ax) + f2[(y0 * w2 + x1) * 3 + n] * ax) * (1 - ay)
        + (f2[(y1 * w2 + x0) * 3 + n] * (1 - ax) + f2[(y1 * w2 + x1) * 3 + n] * ax) * ay;
      out[i * 3 + n] = k[i] * c[i * 3 + n] + (1 - k[i]) * up;
    }
  }
  return out;
};
const fillSmall = pushPull(col, wt, w, h);
const fill = await sharp(Buffer.from(fillSmall.map((v) => Math.max(0, Math.min(255, Math.round(v))))), { raw: { width: w, height: h, channels: 3 } })
  .resize(W, H, { kernel: "cubic" }).blur(6).raw().toBuffer();
// soft alpha edge, so the moving field dissolves into the still source instead of cutting against it
const soft = await sharp(holdFull, { raw: { width: W, height: H, channels: 1 } }).blur(8).raw().toBuffer({ resolveWithObject: true });

const out = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const k = holdFull[i] > 5 ? 1 : 0;
  for (let c = 0; c < 3; c++) out[i * 4 + c] = k ? fill[i * 3 + c] : src.data[i * 3 + c];
  out[i * 4 + 3] = Math.round(255 * (1 - Math.min(1, (1.5 * soft.data[i * soft.info.channels]) / 255)));
}
await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(layers, "field-fill.png"));
await sharp(out, { raw: { width: W, height: H, channels: 4 } }).flatten({ background: "#000" }).resize(408).png().toFile(path.join(layers, "debug-field-fill.png"));
console.log("field-fill.png written");
