// r366 lips-buddha-tongue: histogram-equalised glow phase plates.
// phase-edge has ~70 % of pixels in [0, 0.2], so every glow crest lands on most of the frame at once (whole-frame strobe).
// A monotone remap keeps every iso-phase contour (the maze lines) and only spreads *when* each contour lights.
//   node scripts/locks/r366-build-phase-eq.mjs [work-dir]   -> layers/phase-edge-eq.png, layers/phase-mix-eq.png
import path from "node:path";
import sharp from "sharp";

const layers = path.join(path.resolve(process.argv[2] ?? "out/manual-runs/r366-lips-buddha-tongue"), "layers");

for (const name of ["phase-edge", "phase-mix"]) {
  const { data, info } = await sharp(path.join(layers, `${name}.png`)).greyscale().raw().toBuffer({ resolveWithObject: true });
  const hist = new Float64Array(256);
  for (const v of data) hist[v]++;
  // midpoint CDF: value v maps to the centre of its rank band, so the output stays in (0, 1) and ties stay tied
  const lut = new Uint8Array(256);
  let below = 0;
  for (let v = 0; v < 256; v++) {
    lut[v] = Math.round(((below + hist[v] / 2) / data.length) * 255);
    below += hist[v];
  }
  const out = Buffer.alloc(data.length * 3);
  for (let i = 0; i < data.length; i++) out[i * 3] = out[i * 3 + 1] = out[i * 3 + 2] = lut[data[i]];
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toFile(path.join(layers, `${name}-eq.png`));
  console.log(`${name}-eq.png  lut[0]=${lut[0]} lut[25]=${lut[25]} lut[51]=${lut[51]} lut[128]=${lut[128]} lut[255]=${lut[255]}`);
}
