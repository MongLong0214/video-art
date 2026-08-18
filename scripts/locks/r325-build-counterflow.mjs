/**
 * v8 flow: alternating in/out ring bands + source-structure mix.
 * Breaks the single "light only goes up" fountain.
 */
import sharp from "sharp";

const DIR = "out/manual-runs/r325-ganesha-rainbow-rings-master/layers";
const cx = 816;
const cy = 966;
const rInner = 161.7;
const rOuter = 599.1;
const bandW = (rOuter - rInner) / 8;

const clamp01 = (v) => Math.max(0, Math.min(1, v));

const radial = await sharp(`${DIR}/flow-halo-radial.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const struct = await sharp(`${DIR}/flow-field.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = radial.info;
const out = Buffer.alloc(w * h * 4);

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const pxR = Math.hypot(x - cx, y - cy);
    const inHalo = pxR >= rInner - 12 && pxR <= rOuter + 20;
    const band = Math.floor(Math.max(0, pxR - rInner) / Math.max(8, bandW));
    const flip = band % 2 === 0 ? 1 : -1;

    const rdx = (radial.data[i] / 255) * 2 - 1;
    const rdy = (radial.data[i + 1] / 255) * 2 - 1;
    const sdx = (struct.data[i] / 255) * 2 - 1;
    const sdy = (struct.data[i + 1] / 255) * 2 - 1;
    const scoh = struct.data[i + 2] / 255;

    let dx;
    let dy;
    let coh;
    if (inHalo) {
      dx = rdx * flip * 0.72 + sdx * 0.28;
      dy = rdy * flip * 0.72 + sdy * 0.28;
      coh = 0.96;
    } else {
      dx = sdx * 0.7 + rdx * 0.3;
      dy = sdy * 0.7 + rdy * 0.3;
      coh = Math.max(0.35, scoh);
    }
    const len = Math.max(1e-5, Math.hypot(dx, dy));
    dx /= len;
    dy /= len;
    out[i] = Math.round(255 * clamp01(0.5 + 0.5 * dx));
    out[i + 1] = Math.round(255 * clamp01(0.5 + 0.5 * dy));
    out[i + 2] = Math.round(255 * clamp01(coh));
    out[i + 3] = 255;
  }
}

await sharp(out, { raw: { width: w, height: h, channels: 4 } })
  .png()
  .toFile(`${DIR}/flow-halo-counter.png`);
console.log("wrote flow-halo-counter.png", w, h, "bandW", bandW.toFixed(1));
