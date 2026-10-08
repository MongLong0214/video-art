/**
 * r385 x-ray mushroom: the dark smoke field, made to carry colour (Isaac: "백그라운드 배경이 너무 심심해").
 * The field layer reads source pixels; prism keeps OKLab L, so a near-black field can only rotate near-black.
 * - field-lift: source with the smoke lifted outside the body (CLAHE then gain), body kept as source.
 *   shape > 0: gaps go neutral and clouds go bright (OKLab rotation keeps L, so a mid-dark teal turned yellow reads olive).
 * - hold-lift: field-lift pixels under the figure-hold alpha, so the hold rim does not carry the old dark field.
 * - cloud-layer: field-lift clouds and rays (alpha = lifted luma outside the body) for a palette layer whose
 *   cosine path never crosses yellow-green; the gaps stay on the static field below.
 * - phase-field-bg: smoke luma bands + distance from the ray nexus, so hue bands ride outward through the smoke.
 *   node scripts/locks/r385-build-field-plates.mjs [work-dir] [lift=1] [distWeight=0.5] [gain=2.2] [slope=10] [shape=0]  (defaults = the v10e final)
 */
import path from "node:path";
import sharp from "sharp";

const [, , wdArg, liftArg = "1", distArg = "0.5", gainArg = "2.2", slopeArg = "10", shapeArg = "0"] = process.argv;
const DIR = path.join(path.resolve(wdArg ?? "out/manual-runs/r385-xray-mushroom"), "layers");
const LIFT = Number(liftArg);
const DIST_W = Number(distArg);
const GAIN = Number(gainArg);
const SHAPE = Number(shapeArg);
const CXN = 0.241;
const CYN = 0.34;
const smoothstep = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

const src = await sharp(path.join(DIR, "source.png")).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = src.info;
const n = w * h;
const clahe = await sharp(path.join(DIR, "source.png")).removeAlpha().clahe({ width: 96, height: 96, maxSlope: Number(slopeArg) }).raw().toBuffer();
const holdBlur = await sharp(path.join(DIR, "figure-hold.png")).extractChannel(3).blur(6).raw().toBuffer();
const lumaBand = await sharp(clahe, { raw: { width: w, height: h, channels: 3 } }).greyscale().blur(10).normalise().raw().toBuffer();

const field = Buffer.alloc(n * 3);
const phase = Buffer.alloc(n * 3);
const maxDim = Math.max(w, h);
for (let i = 0; i < n; i++) {
  const bg = 1 - holdBlur[i] / 255;
  const lifted = [0, 1, 2].map((c) => Math.min(255, clahe[i * 3 + c] * GAIN));
  const l = (0.299 * lifted[0] + 0.587 * lifted[1] + 0.114 * lifted[2]) / 255;
  const cloud = smoothstep(0.1, 0.35, l);
  for (let c = 0; c < 3; c++) {
    const s = src.data[i * 3 + c];
    const shaped = l * 255 * 0.5 + (Math.min(255, lifted[c] * (1 + 0.9 * cloud)) - l * 255 * 0.5) * cloud;
    const bgPix = lifted[c] + (shaped - lifted[c]) * SHAPE;
    field[i * 3 + c] = Math.round(s + (bgPix - s) * bg * LIFT);
  }
  const x = i % w;
  const y = (i / w) | 0;
  const dist = Math.hypot(x - CXN * w, y - CYN * h) / maxDim;
  const p = (1 - DIST_W) * (lumaBand[i] / 255) + DIST_W * Math.min(1, dist / 0.9);
  phase[i * 3] = phase[i * 3 + 1] = phase[i * 3 + 2] = Math.round(255 * p);
}

await sharp(field, { raw: { width: w, height: h, channels: 3 } }).png().toFile(path.join(DIR, "field-lift.png"));
const holdAlpha = await sharp(path.join(DIR, "figure-hold.png")).extractChannel(3).raw().toBuffer();
const holdLift = Buffer.alloc(n * 4);
for (let i = 0; i < n; i++) {
  holdLift[i * 4] = field[i * 3];
  holdLift[i * 4 + 1] = field[i * 3 + 1];
  holdLift[i * 4 + 2] = field[i * 3 + 2];
  holdLift[i * 4 + 3] = holdAlpha[i];
}
await sharp(holdLift, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(DIR, "hold-lift.png"));
// Clouds stop well short of the body (no palette outline on the hold rim) and take a soft luma alpha.
const holdWide = await sharp(path.join(DIR, "figure-hold.png")).extractChannel(3).blur(20).raw().toBuffer();
const fieldSoft = await sharp(field, { raw: { width: w, height: h, channels: 3 } }).greyscale().blur(4).raw().toBuffer();
const cloudLayer = Buffer.alloc(n * 4);
for (let i = 0; i < n; i++) {
  const l = fieldSoft[i] / 255;
  const away = 1 - Math.min(1, (holdWide[i] / 255) * 2);
  cloudLayer[i * 4] = field[i * 3];
  cloudLayer[i * 4 + 1] = field[i * 3 + 1];
  cloudLayer[i * 4 + 2] = field[i * 3 + 2];
  cloudLayer[i * 4 + 3] = Math.round(255 * away * smoothstep(0.05, 0.3, l));
}
await sharp(cloudLayer, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(DIR, "cloud-layer.png"));
// Equalise the phase over the field so every palette colour holds an equal share of the smoke at every instant
// (a skewed phase histogram turns the whole field one colour at once).
const phaseSoft = await sharp(phase, { raw: { width: w, height: h, channels: 3 } }).blur(8).greyscale().raw().toBuffer();
const hist = new Float64Array(256);
for (let i = 0; i < n; i++) hist[phaseSoft[i]] += 1 - holdBlur[i] / 255;
const cdf = new Float64Array(256);
let acc = 0;
for (let v = 0; v < 256; v++) cdf[v] = acc += hist[v];
const phaseEq = Buffer.alloc(n * 3);
for (let i = 0; i < n; i++) phaseEq[i * 3] = phaseEq[i * 3 + 1] = phaseEq[i * 3 + 2] = Math.round((255 * cdf[phaseSoft[i]]) / acc);
await sharp(phaseEq, { raw: { width: w, height: h, channels: 3 } }).png().toFile(path.join(DIR, "phase-field-bg.png"));
console.log("field-lift + hold-lift + cloud-layer + phase-field-bg", { lift: LIFT, distWeight: DIST_W, gain: GAIN, slope: Number(slopeArg), shape: SHAPE });
