/**
 * r381 tree-woman (field take): rays leave the belly swirl. Same radial field as r380-build-beam-plates without the
 * vine tangent (here the green class is canopy and grass). Writes flow-beam + phase-beam.
 */
import fs from "node:fs";
import sharp from "sharp";

const DIR = "out/manual-runs/r381-tree-woman-field/layers";
// prepare override beam@0.495,0.548 (belly swirl). rebuild-closed-lock has no hero.json, so it lives here.
const CX = 0.495;
const CY = 0.548;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

const struct = await sharp(`${DIR}/flow-field.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = struct.info;
const flow = Buffer.alloc(w * h * 4);
const phase = Buffer.alloc(w * h * 4);
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    const sdx = (struct.data[o] / 255) * 2 - 1;
    const sdy = (struct.data[o + 1] / 255) * 2 - 1;
    const dx0 = x - CX * w;
    const dy0 = y - CY * h;
    const dist = Math.max(1e-5, Math.hypot(dx0, dy0));
    const distN = dist / Math.max(w, h);
    const radialGate = smoothstep(0.015, 0.06, distN);
    const dx = (dx0 / dist) * radialGate + sdx * (1 - radialGate);
    const dy = (dy0 / dist) * radialGate + sdy * (1 - radialGate);
    const fl = Math.max(1e-5, Math.hypot(dx, dy));
    flow[o] = Math.round(255 * clamp01(0.5 + 0.5 * (dx / fl)));
    flow[o + 1] = Math.round(255 * clamp01(0.5 + 0.5 * (dy / fl)));
    flow[o + 2] = Math.round(255 * clamp01(0.5 + 0.42 * radialGate));
    flow[o + 3] = 255;
    const g = Math.round(255 * clamp01(distN / 0.72));
    phase[o] = g;
    phase[o + 1] = g;
    phase[o + 2] = g;
    phase[o + 3] = 255;
  }
}
await sharp(flow, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/_tmp-flow.png`);
await sharp(`${DIR}/_tmp-flow.png`).blur(1.4).png().toFile(`${DIR}/flow-beam.png`);
await sharp(phase, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/phase-beam.png`);
fs.unlinkSync(`${DIR}/_tmp-flow.png`);
console.log("flow-beam.png + phase-beam.png written");
