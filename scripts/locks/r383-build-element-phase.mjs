// r383 mushroom-hand v8 ("뭔가 좀더 불규칙했으면 좋겠어 요소들이"): a phase field with one random value per drawn element
// (hand, each cap/stem cluster, tree line) over smooth value noise in the tie-dye. The prism morphs between this and
// phase-luminance (phaseMix + phaseFlowCycles, phaseFlowPx 0), so each element speeds up and slows down on its own
// clock: irregular colour tempo with zero displacement.
// Elements = connected components of layers/hand-hold.png alpha (r383-build-hand-hold.mjs bodies=1).
//   node scripts/locks/r383-build-element-phase.mjs [work-dir] [seed]   → layers/phase-elements.png
import path from "node:path";
import sharp from "sharp";

const [, , wdArg, seedArg] = process.argv;
const layers = path.join(path.resolve(wdArg ?? "out/manual-runs/r383-mushroom-hand"), "layers");
const { width: W, height: H } = await sharp(path.join(layers, "source.png")).metadata();
const S = 4, w = Math.round(W / S), h = Math.round(H / S), n = w * h;
const alpha = await sharp(path.join(layers, "hand-hold.png")).resize(w, h).extractChannel(3).raw().toBuffer();

let seed = Number(seedArg ?? 383);
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

// value noise, smoothstep-interpolated: blobs with no direction
const sm = (t) => t * t * (3 - 2 * t);
const noise = (GX, GY) => {
  const grid = Array.from({ length: (GX + 1) * (GY + 1) }, rand), out = new Float32Array(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = (x / (w - 1)) * GX, fy = (y / (h - 1)) * GY;
    const ix = Math.min(GX - 1, fx | 0), iy = Math.min(GY - 1, fy | 0), tx = sm(fx - ix), ty = sm(fy - iy);
    const g = (a, b) => grid[(iy + b) * (GX + 1) + ix + a];
    out[y * w + x] = (g(0, 0) * (1 - tx) + g(1, 0) * tx) * (1 - ty) + (g(0, 1) * (1 - tx) + g(1, 1) * tx) * ty;
  }
  return out;
};
// tie-dye: a few slow blobs. Elements: cap-sized blobs (≈ 140 px), because the caps touch and the forest is one component
const field = noise(4, 7), fine = noise(12, 21);

const seen = new Uint8Array(n);
let count = 0;
for (let s0 = 0; s0 < n; s0++) {
  if (alpha[s0] < 128 || seen[s0]) continue;
  const comp = [s0];
  seen[s0] = 1;
  for (let k = 0; k < comp.length; k++) {
    const i = comp[k], x = i % w, y = (i / w) | 0;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
      if (j >= 0 && alpha[j] >= 128 && !seen[j]) { seen[j] = 1; comp.push(j); }
    }
  }
  if (comp.length < 40) continue;
  const v = rand() * 0.65;
  for (const i of comp) field[i] = v + fine[i] * 0.35;
  count++;
}

const gray = Buffer.alloc(n);
for (let i = 0; i < n; i++) gray[i] = Math.round(field[i] * 255);
await sharp(gray, { raw: { width: w, height: h, channels: 1 } }).resize(W, H, { kernel: "lanczos3" }).blur(6)
  .toColourspace("srgb").png().toFile(path.join(layers, "phase-elements.png"));
console.log(`phase-elements.png written: ${count} elements`);
