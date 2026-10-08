// r380 palm-eye-lotus v2 (r379 family): the hold margin as its own colour-only layer. The wide hold (margin 6) kept a
// 24 px band of still source bokeh around the hand and lotus that never took the field's colour cycle, so it read as a
// blue sticker outline. Ring = source RGB, alpha = wide hold minus tight hold: it gets L9 in place (no transport) and
// the tight hold on top keeps the figure itself still.
//   node scripts/locks/r379-build-color-ring.mjs [work-dir]
//   needs layers/hand-hold-wide.png (margin 6, also the field-fill hole) and layers/hand-hold.png (tight).
import path from "node:path";
import sharp from "sharp";

const workDir = path.resolve(process.argv[2] ?? "out/manual-runs/r380-palm-eye-lotus");
const layers = path.join(workDir, "layers");
const wide = await sharp(path.join(layers, "hand-hold-wide.png")).raw().toBuffer({ resolveWithObject: true });
const tight = await sharp(path.join(layers, "hand-hold.png")).ensureAlpha().extractChannel(3).raw().toBuffer();
const { width: W, height: H } = wide.info;
const out = Buffer.from(wide.data);
for (let i = 0; i < W * H; i++) out[i * 4 + 3] = Math.round(wide.data[i * 4 + 3] * (1 - tight[i] / 255));
await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(layers, "color-ring.png"));
await sharp(out, { raw: { width: W, height: H, channels: 4 } }).flatten({ background: "#000" }).resize(408).png().toFile(path.join(layers, "debug-color-ring.png"));
console.log("color-ring.png written");
