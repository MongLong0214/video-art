/**
 * r386 hourglass faces: the smoke and stipple around the two heads carry a palette layer (r385 v10e route,
 * Isaac "간만에 아주 맘에들어"). The heads keep their own colour and ride the third-eye flow on the layer below.
 * - figure-env: a traced envelope of both heads, ears and neck (r383 route). Grain energy and luma both failed:
 *   the skin is stippled like the smoke, and the hair and lower neck are as dark as it.
 * - field-lift: source inside the envelope; the smoke outside lifted (CLAHE then gain) so the palette has value to ride.
 * - cloud-layer: field-lift with alpha = soft lifted luma away from the envelope. Blur 16: at blur 4 the alpha followed
 *   the stipple sparkles and the palette would land as confetti.
 * - phase-field-bg: smoke luma bands + distance from the third eye, histogram-equalised over the field.
 * - neck-glow: the warm glow channel only, for a soft glowWave that stays off the faces.
 *   node scripts/locks/r386-build-field-plates.mjs [work-dir] [gain] [slope] [distWeight] [phaseBlur] [brightTint]
 */
import path from "node:path";
import sharp from "sharp";

const [, , wdArg, gainArg = "1.6", slopeArg = "6", distArg = "0.75", phaseBlurArg = "24", tintArg = "0.6"] = process.argv;
const BRIGHT_TINT = Number(tintArg);
const DIR = path.join(path.resolve(wdArg ?? "out/manual-runs/r386-hourglass-faces"), "layers");
const GAIN = Number(gainArg);
const DIST_W = Number(distArg);
const CXN = 0.5055;
const CYN = 0.7091;
const ENVELOPE = [
  [0.2, 0], [0.21, 0.08], [0.18, 0.16], [0.1, 0.185], [0.055, 0.24], [0.06, 0.31], [0.12, 0.36], [0.2, 0.37],
  [0.25, 0.41], [0.33, 0.46], [0.38, 0.51], [0.4, 0.56], [0.37, 0.595], [0.29, 0.625], [0.235, 0.665], [0.205, 0.72],
  [0.2, 0.8], [0.17, 0.84], [0.17, 0.93], [0.23, 0.97], [0.24, 1], [0.86, 1], [0.86, 0.95], [0.95, 0.92],
  [0.955, 0.83], [0.9, 0.79], [0.85, 0.77], [0.83, 0.7], [0.78, 0.65], [0.72, 0.61], [0.665, 0.56], [0.655, 0.5],
  [0.68, 0.45], [0.77, 0.4], [0.84, 0.36], [0.885, 0.3], [0.9, 0.24], [0.89, 0.17], [0.86, 0.115], [0.84, 0.08],
  [0.78, 0.05], [0.775, 0],
];
const smoothstep = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const channel = async (img, n) => {
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = data[i * info.channels];
  return out;
};

const src = await sharp(path.join(DIR, "source.png")).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = src.info;
const n = w * h;
const pts = ENVELOPE.map(([x, y]) => `${(x * w).toFixed(1)},${(y * h).toFixed(1)}`).join(" ");
const svg = Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#000"/><polygon points="${pts}" fill="#fff"/></svg>`);
const envSharp = await sharp(svg).greyscale().png().toBuffer();
const env = await channel(sharp(envSharp).blur(10), n);
const envWide = await channel(sharp(envSharp).blur(20), n);
const clahe = await sharp(path.join(DIR, "source.png")).removeAlpha().clahe({ width: 96, height: 96, maxSlope: Number(slopeArg) }).raw().toBuffer();
const lumaBand = await channel(sharp(clahe, { raw: { width: w, height: h, channels: 3 } }).greyscale().blur(10).normalise(), n);

const field = Buffer.alloc(n * 3);
const phase = Buffer.alloc(n);
const maxDim = Math.max(w, h);
// The bright stipple corners are the source's own orange/teal: no lift there, and the palette only tints them.
const srcSoft = await channel(sharp(path.join(DIR, "source.png")).removeAlpha().greyscale().blur(16), n);
const bright = new Float32Array(n);
for (let i = 0; i < n; i++) bright[i] = smoothstep(0.25, 0.5, srcSoft[i] / 255);
for (let i = 0; i < n; i++) {
  const bg = (1 - env[i] / 255) * (1 - bright[i]);
  for (let c = 0; c < 3; c++) {
    const s = src.data[i * 3 + c];
    field[i * 3 + c] = Math.round(s + (Math.min(255, clahe[i * 3 + c] * GAIN) - s) * bg);
  }
  const dist = Math.hypot((i % w) - CXN * w, ((i / w) | 0) - CYN * h) / maxDim;
  phase[i] = Math.round(255 * ((1 - DIST_W) * (lumaBand[i] / 255) + DIST_W * Math.min(1, dist / 0.9)));
}
await sharp(field, { raw: { width: w, height: h, channels: 3 } }).png().toFile(path.join(DIR, "field-lift.png"));

const fieldSoft = await channel(sharp(field, { raw: { width: w, height: h, channels: 3 } }).greyscale().blur(16), n);
const cloudLayer = Buffer.alloc(n * 4);
for (let i = 0; i < n; i++) {
  const away = 1 - Math.min(1, (envWide[i] / 255) * 2);
  cloudLayer[i * 4] = field[i * 3];
  cloudLayer[i * 4 + 1] = field[i * 3 + 1];
  cloudLayer[i * 4 + 2] = field[i * 3 + 2];
  cloudLayer[i * 4 + 3] = Math.round(255 * away * smoothstep(0.02, 0.2, fieldSoft[i] / 255) * (1 - BRIGHT_TINT * bright[i]));
}
await sharp(cloudLayer, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(DIR, "cloud-layer.png"));

// neck-glow: the warm glow channel (eye flare, neck, upper mouth) as field-lift pixels, so a glowWave rides only there.
// v4d had the glowWave on layers[0]: rings swept both faces (Isaac "너무 인위적이고 저급해").
const srcBlur = await sharp(path.join(DIR, "source.png")).removeAlpha().blur(6).raw().toBuffer();
const warmMask = Buffer.alloc(n);
for (let i = 0; i < n; i++) {
  const r = srcBlur[i * 3] / 255;
  const g = srcBlur[i * 3 + 1] / 255;
  const b = srcBlur[i * 3 + 2] / 255;
  const mx = Math.max(r, g, b);
  const d = mx - Math.min(r, g, b);
  let hue = 0;
  if (d > 0) hue = 60 * (mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4);
  const warm = hue < 60 ? 1 - smoothstep(40, 60, hue) : smoothstep(300, 330, hue);
  warmMask[i] = Math.round(255 * warm * smoothstep(0.2, 0.4, mx ? d / mx : 0) * smoothstep(0.35, 0.55, mx) * (env[i] / 255));
}
// Density gate drops the stray stipple slivers along the envelope; only the continuous channel keeps its glow.
const warmSoft = await channel(sharp(warmMask, { raw: { width: w, height: h, channels: 1 } }).blur(32), n);
const warmDense = await channel(sharp(warmMask, { raw: { width: w, height: h, channels: 1 } }).blur(60), n);
const neckAlpha = new Uint8Array(n);
// The channel ends at the eye flare (y ≈ 0.76); below it only the lower-left corner stipple was left.
for (let i = 0; i < n; i++) neckAlpha[i] = Math.round(warmSoft[i] * smoothstep(0.15, 0.35, warmDense[i] / 255) * (1 - smoothstep(0.8, 0.85, ((i / w) | 0) / h)));
const neckGlow = Buffer.alloc(n * 4);
for (let i = 0; i < n; i++) {
  neckGlow[i * 4] = field[i * 3];
  neckGlow[i * 4 + 1] = field[i * 3 + 1];
  neckGlow[i * 4 + 2] = field[i * 3 + 2];
  neckGlow[i * 4 + 3] = neckAlpha[i];
}
await sharp(neckGlow, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(DIR, "neck-glow.png"));

// Equalise over the field so every palette colour holds an equal share of the smoke at every instant (r385 pump fix).
const phaseSoft = await channel(sharp(phase, { raw: { width: w, height: h, channels: 1 } }).blur(Number(phaseBlurArg)), n);
const hist = new Float64Array(256);
for (let i = 0; i < n; i++) hist[phaseSoft[i]] += 1 - env[i] / 255;
const cdf = new Float64Array(256);
let acc = 0;
for (let v = 0; v < 256; v++) cdf[v] = acc += hist[v];
const phaseEq = Buffer.alloc(n * 3);
for (let i = 0; i < n; i++) phaseEq[i * 3] = phaseEq[i * 3 + 1] = phaseEq[i * 3 + 2] = Math.round((255 * cdf[phaseSoft[i]]) / acc);
await sharp(phaseEq, { raw: { width: w, height: h, channels: 3 } }).png().toFile(path.join(DIR, "phase-field-bg.png"));
console.log("field-lift + cloud-layer + phase-field-bg + neck-glow", { gain: GAIN, slope: Number(slopeArg), distWeight: DIST_W, phaseBlur: Number(phaseBlurArg), brightTint: BRIGHT_TINT });
