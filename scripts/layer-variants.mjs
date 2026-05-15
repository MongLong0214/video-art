import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2];
const OUT_B = process.argv[3];
const OUT_C = process.argv[4];
if (!SRC || !OUT_B || !OUT_C) {
  console.error('Usage: node layer-variants.mjs <src.png> <outDirB> <outDirC>');
  process.exit(1);
}

fs.mkdirSync(OUT_B, { recursive: true });
fs.mkdirSync(OUT_C, { recursive: true });

const meta = await sharp(SRC).metadata();
console.log('Source:', meta.width, 'x', meta.height);

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width, h = info.height;
const px = w * h;

function makeBand(loL, hiL) {
  const out = Buffer.alloc(px * 4);
  for (let i = 0; i < px; i++) {
    const r = data[i*4], g = data[i*4+1], b = data[i*4+2];
    const L = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
    const inBand = L >= loL && L < hiL;
    out[i*4] = r;
    out[i*4+1] = g;
    out[i*4+2] = b;
    out[i*4+3] = inBand ? 255 : 0;
  }
  return out;
}

// === LUMINANCE-SPLIT ===
await sharp(SRC).removeAlpha().png().toFile(path.join(OUT_B, 'layer-0.png'));
await sharp(makeBand(0.35, 0.70), { raw: { width: w, height: h, channels: 4 }}).png().toFile(path.join(OUT_B, 'layer-1.png'));
await sharp(makeBand(0.70, 1.01), { raw: { width: w, height: h, channels: 4 }}).png().toFile(path.join(OUT_B, 'layer-2.png'));
await sharp({ create: { width: w, height: h, channels: 3, background: { r: 128, g: 128, b: 128 }}}).png().toFile(path.join(OUT_B, 'depth.png'));
console.log('LUMINANCE-SPLIT done →', OUT_B);

// === RGB-CHANNEL-SPLIT ===
await sharp(SRC).removeAlpha().modulate({ saturation: 0.6 }).png().toFile(path.join(OUT_C, 'layer-0.png'));

{
  const out = Buffer.alloc(px * 4);
  for (let i = 0; i < px; i++) {
    const r = data[i*4], g = data[i*4+1];
    out[i*4] = r; out[i*4+1] = g; out[i*4+2] = 0;
    out[i*4+3] = Math.round((r + g) / 2);
  }
  await sharp(out, { raw: { width: w, height: h, channels: 4 }}).png().toFile(path.join(OUT_C, 'layer-1.png'));
}

{
  const out = Buffer.alloc(px * 4);
  for (let i = 0; i < px; i++) {
    const b = data[i*4+2];
    out[i*4] = 0; out[i*4+1] = 0; out[i*4+2] = b;
    out[i*4+3] = b;
  }
  await sharp(out, { raw: { width: w, height: h, channels: 4 }}).png().toFile(path.join(OUT_C, 'layer-2.png'));
}
await sharp({ create: { width: w, height: h, channels: 3, background: { r: 128, g: 128, b: 128 }}}).png().toFile(path.join(OUT_C, 'depth.png'));
console.log('RGB-CHANNEL-SPLIT done →', OUT_C);
