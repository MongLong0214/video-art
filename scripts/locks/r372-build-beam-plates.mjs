/**
 * r372: rays leave the third eye.
 * session-plates beam is a pour cone plus water diagonals and an oval head.
 * This replaces both. Flow is radial from the eye, and the face itself
 * rides its own line structure so the portrait does not shear.
 * Hold stays clear. No water diagonals.
 */
import fs from "node:fs";
import sharp from "sharp";

const DIR = "out/manual-runs/r372-third-eye-burst/layers";
const CXN = 0.5;
const CYN = 0.46;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

const src = await sharp(`${DIR}/source.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const struct = await sharp(`${DIR}/flow-field.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = src.info;
const n = w * h;
const cx = CXN * w;
const cy = CYN * h;
const flow = Buffer.alloc(n * 4);
const phase = Buffer.alloc(n * 4);

for (let y = 0; y < h; y++) {
  const ny = y / h;
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const o = i * 4;
    const sdx = (struct.data[o] / 255) * 2 - 1;
    const sdy = (struct.data[o + 1] / 255) * 2 - 1;
    const dx0 = x - cx;
    const dy0 = y - cy;
    const len = Math.max(1e-5, Math.hypot(dx0, dy0));
    const rdx = dx0 / len;
    const rdy = dy0 / len;
    const dist = len / Math.max(w, h);
    const radialW = smoothstep(0.012, 0.07, dist);
    const face = Math.hypot((x / w - CXN) / 0.2, (ny - 0.51) / 0.15);
    const faceW = 1 - smoothstep(0.55, 1.15, face);
    const robe = smoothstep(0.58, 0.74, ny);
    const radialAmt = (0.35 + 0.55 * radialW) * (1 - 0.65 * faceW) * (1 - 0.72 * robe);
    const dx = rdx * radialAmt + sdx * (1 - radialAmt);
    const dy = rdy * radialAmt + sdy * (1 - radialAmt);
    const fl = Math.max(1e-5, Math.hypot(dx, dy));
    const coh = 0.5 + 0.46 * radialW * (1 - 0.45 * faceW);
    flow[o] = Math.round(255 * clamp01(0.5 + 0.5 * (dx / fl)));
    flow[o + 1] = Math.round(255 * clamp01(0.5 + 0.5 * (dy / fl)));
    flow[o + 2] = Math.round(255 * clamp01(coh));
    flow[o + 3] = 255;
    const g = Math.round(255 * clamp01(dist / 0.9));
    phase[o] = g;
    phase[o + 1] = g;
    phase[o + 2] = g;
    phase[o + 3] = 255;
  }
}

const luma = new Float32Array(n);
for (let i = 0; i < n; i++) {
  const o = i * 4;
  luma[i] = (0.299 * src.data[o] + 0.587 * src.data[o + 1] + 0.114 * src.data[o + 2]) / 255;
}
const detail = new Float32Array(n);
for (let y = 2; y < h - 2; y++) {
  for (let x = 2; x < w - 2; x++) {
    const i = y * w + x;
    let acc = 0;
    acc += Math.abs(luma[i] - luma[i - 2]);
    acc += Math.abs(luma[i] - luma[i + 2]);
    acc += Math.abs(luma[i] - luma[i - w * 2]);
    acc += Math.abs(luma[i] - luma[i + w * 2]);
    detail[i] = acc * 0.25;
  }
}
const rawHold = new Float32Array(n);
for (let y = 0; y < h; y++) {
  const ny = y / h;
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const head = Math.hypot((x / w - CXN) / 0.26, (ny - 0.5) / 0.2);
    const prior = 1 - smoothstep(0.45, 1.55, head);
    const drawn = smoothstep(0.035, 0.11, detail[i]);
    const dx0 = x - cx;
    const dy0 = y - cy;
    const pupil = Math.hypot(dx0 / 22, dy0 / 34);
    const eyeHole = 1 - smoothstep(0.35, 1.15, pupil);
    rawHold[i] = clamp01(prior * drawn * (1 - eyeHole));
  }
}
const gray = Buffer.alloc(n);
for (let i = 0; i < n; i++) gray[i] = Math.round(rawHold[i] * 255);
const soft = await sharp(gray, { raw: { width: w, height: h, channels: 1 } }).blur(5).raw().toBuffer({ resolveWithObject: true });
const stride = soft.info.channels;
const hold = Buffer.from(src.data);
for (let i = 0; i < n; i++) hold[i * 4 + 3] = soft.data[i * stride];
await sharp(hold, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/figure-hold.png`);
await sharp(flow, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/_tmp-flow.png`);
await sharp(`${DIR}/_tmp-flow.png`).blur(1.2).png().toFile(`${DIR}/flow-beam.png`);
await sharp(phase, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/phase-beam.png`);
const dbg = Buffer.alloc(n * 4);
for (let i = 0; i < n; i++) {
  const a = soft.data[i * stride];
  dbg[i * 4] = a;
  dbg[i * 4 + 1] = a;
  dbg[i * 4 + 2] = a;
  dbg[i * 4 + 3] = 255;
}
const heroA = (nx, ny) => {
  const x = Math.min(w - 1, Math.round(nx * (w - 1)));
  const y = Math.min(h - 1, Math.round(ny * (h - 1)));
  return (hold[(y * w + x) * 4 + 3] / 255).toFixed(2);
};
console.log("hold alpha", ["eye", heroA(0.5, 0.46), "cheek", heroA(0.4, 0.52), "ray", heroA(0.2, 0.2), "robe", heroA(0.5, 0.82)].join(" "));
await sharp(dbg, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/debug-hold.png`);
fs.unlinkSync(`${DIR}/_tmp-flow.png`);

const at = (nx, ny) => {
  const x = Math.min(w - 1, Math.max(0, Math.round(nx * (w - 1))));
  const y = Math.min(h - 1, Math.max(0, Math.round(ny * (h - 1))));
  const o = (y * w + x) * 4;
  const dx = (flow[o] / 255) * 2 - 1;
  const dy = (flow[o + 1] / 255) * 2 - 1;
  return `nx${nx.toFixed(2)},ny${ny.toFixed(2)} d(${dx.toFixed(2)},${dy.toFixed(2)})`;
};
console.log(
  [at(0.5, 0.46), at(0.5, 0.12), at(0.5, 0.78), at(0.18, 0.4), at(0.82, 0.4), at(0.35, 0.52), at(0.65, 0.52)].join("\n"),
);

const scenePath = "out/manual-runs/r372-third-eye-burst/scene.json";
const scene = JSON.parse(fs.readFileSync(scenePath, "utf8"));
const source = scene.layers[0].animation;
source.saturationBoost = 1.08;
source.valueLift = 0;
source.sourcePrism = {
  ...source.sourcePrism,
  amount: 1,
  radiusPx: 0,
  directionCycles: 0,
  chromaCycles: 0,
  surfaceCycles: 0,
  phaseFlowPx: 0,
  phaseFlowCycles: 0,
  detailBoost: 0.25,
};
source.sourceColorClamp = { maxDrift: 0.18 };
source.sourceFlowAdvection = {
  ...source.sourceFlowAdvection,
  maxDisplacementPx: 40,
  edgePreserve: 0.8,
  normalMix: 0.08,
  detailGain: 5,
  forwardBias: 0.4,
};
source.sourceFlowTransport = { ...source.sourceFlowTransport, colorAmount: 0, forwardBias: 0.4, macroDisplacementPx: 18 };
source.sourceMaterialDissolve = { ...source.sourceMaterialDissolve, amount: 0 };
source.sourceSpectralFlow = { ...source.sourceSpectralFlow, amount: 0 };
source.sourceChromaFlow = { ...source.sourceChromaFlow, amount: 0 };

const holdAnim = scene.layers[1].animation;
holdAnim.saturationBoost = 1;
holdAnim.glowWave = { ...holdAnim.glowWave, strength: 0.22 };
holdAnim.glowWave2 = { ...holdAnim.glowWave2, strength: 0.14 };
holdAnim.sourcePrism = {
  ...holdAnim.sourcePrism,
  amount: 1,
  radiusPx: 0,
  directionCycles: 0,
  chromaCycles: 0,
  surfaceCycles: 0,
  phaseFlowPx: 0,
  phaseFlowCycles: 0,
  detailBoost: 0.25,
};
holdAnim.sourceColorClamp = { maxDrift: 0.12 };
holdAnim.colorMotionMask = { ...holdAnim.colorMotionMask, floor: 0 };
scene.effects.multipassFeedback.strength = 0.08;
scene.effects.multipassFeedback.hueShift = 0;
scene.effects.multipassFeedback.rotate = 0;
fs.writeFileSync(scenePath, `${JSON.stringify(scene, null, 2)}\n`);
console.log("scene patched");
