/**
 * r380 palm-eye-lotus: rays leave the palm eye. The vine crawls along itself toward the flower.
 * session-plates beam is a pour cone plus water diagonals — do not use it. Same builder as the r379 work-dir one,
 * minus its eye hold and scene edits (r380 holds come from r379-build-hand-hold.mjs). Writes flow-beam + phase-beam.
 */
import fs from "node:fs";
import sharp from "sharp";

const DIR = "out/manual-runs/r380-palm-eye-lotus/layers";
// prepare override beam@0.502,0.527 (palm pupil). rebuild-closed-lock has no hero.json, so it lives here.
const PALM_X = 0.502;
const PALM_Y = 0.527;
const FLOWER_X = 0.5;
const FLOWER_Y = 0.145;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

const src = await sharp(`${DIR}/source.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const struct = await sharp(`${DIR}/flow-field.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = src.info;
const n = w * h;
const pcx = PALM_X * w;
const pcy = PALM_Y * h;

const vine = new Uint8Array(n);
let vineCount = 0;
for (let i = 0; i < n; i++) {
  const o = i * 4;
  const r = src.data[o];
  const g = src.data[o + 1];
  const b = src.data[o + 2];
  if (g < 95 || g < r + 28 || g < b + 16) continue;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const sat = mx === 0 ? 0 : (mx - mn) / mx;
  if (sat < 0.42 || g > 235) continue;
  vine[i] = 1;
  vineCount++;
}

const S = 4;
const cw = Math.floor(w / S);
const ch = Math.floor(h / S);
const dens = new Float32Array(cw * ch);
for (let y = 0; y < ch * S; y++) {
  const cy = Math.floor(y / S);
  for (let x = 0; x < cw * S; x++) {
    if (vine[y * w + x]) dens[cy * cw + Math.floor(x / S)]++;
  }
}

const tdx = new Float32Array(cw * ch);
const tdy = new Float32Array(cw * ch);
const tcoh = new Float32Array(cw * ch);
const R = 6;
for (let cy = R; cy < ch - R; cy++) {
  for (let cx = R; cx < cw - R; cx++) {
    const id = cy * cw + cx;
    if (dens[id] < 3) continue;
    let m = 0;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        const d = dens[(cy + dy) * cw + (cx + dx)];
        if (d < 2) continue;
        m += d;
        sx += dx * d;
        sy += dy * d;
        sxx += dx * dx * d;
        syy += dy * dy * d;
        sxy += dx * dy * d;
      }
    }
    if (m < 12) continue;
    const mx = sx / m;
    const my = sy / m;
    const cxx = sxx / m - mx * mx;
    const cyy = syy / m - my * my;
    const cxy = sxy / m - mx * my;
    const tr = cxx + cyy;
    const det = cxx * cyy - cxy * cxy;
    const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
    const l1 = tr / 2 + disc;
    const l2 = tr / 2 - disc;
    let vx = cxy;
    let vy = l1 - cxx;
    let len = Math.hypot(vx, vy);
    if (len < 1e-4) {
      vx = l1 - cyy;
      vy = cxy;
      len = Math.hypot(vx, vy);
    }
    if (len < 1e-4) continue;
    vx /= len;
    vy /= len;
    const aniso = (l1 - l2) / (l1 + l2 + 1e-6);
    if (aniso < 0.18) continue;
    const step = 4;
    const ax = cx + vx * step;
    const ay = cy + vy * step;
    const bx = cx - vx * step;
    const by = cy - vy * step;
    const inside = (x, y) => x >= 0 && y >= 0 && x < cw && y < ch;
    const aOn = inside(Math.round(ax), Math.round(ay)) ? dens[Math.round(ay) * cw + Math.round(ax)] : 0;
    const bOn = inside(Math.round(bx), Math.round(by)) ? dens[Math.round(by) * cw + Math.round(bx)] : 0;
    let sign = 1;
    if (aOn > bOn * 1.35) sign = 1;
    else if (bOn > aOn * 1.35) sign = -1;
    else {
      const flowerX = FLOWER_X * cw;
      const flowerY = FLOWER_Y * ch;
      const da = Math.hypot(ax - flowerX, ay - flowerY);
      const db = Math.hypot(bx - flowerX, by - flowerY);
      sign = da <= db ? 1 : -1;
    }
    tdx[id] = vx * sign;
    tdy[id] = vy * sign;
    tcoh[id] = aniso;
  }
}

const vineGray = Buffer.from(vine);
const vineSoft = await sharp(vineGray, { raw: { width: w, height: h, channels: 1 } })
  .blur(2.2)
  .raw()
  .toBuffer({ resolveWithObject: true });
const vineStride = vineSoft.info.channels;

const flow = Buffer.alloc(n * 4);
const phase = Buffer.alloc(n * 4);
for (let y = 0; y < h; y++) {
  const cy = Math.min(ch - 1, Math.floor(y / S));
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const o = i * 4;
    const cx = Math.min(cw - 1, Math.floor(x / S));
    const id = cy * cw + cx;
    const sdx = (struct.data[o] / 255) * 2 - 1;
    const sdy = (struct.data[o + 1] / 255) * 2 - 1;
    const dx0 = x - pcx;
    const dy0 = y - pcy;
    const dist = Math.max(1e-5, Math.hypot(dx0, dy0));
    const rdx = dx0 / dist;
    const rdy = dy0 / dist;
    const distN = dist / Math.max(w, h);
    const radialGate = smoothstep(0.015, 0.06, distN);
    const vineW = smoothstep(0.18, 0.62, vineSoft.data[i * vineStride] / 255) * tcoh[id];
    const useT = vineW > 0.04 && tcoh[id] > 0;
    let dx = rdx * radialGate + sdx * (1 - radialGate);
    let dy = rdy * radialGate + sdy * (1 - radialGate);
    if (useT) {
      dx = tdx[id] * vineW + dx * (1 - vineW);
      dy = tdy[id] * vineW + dy * (1 - vineW);
    }
    const fl = Math.max(1e-5, Math.hypot(dx, dy));
    const coh = 0.5 + 0.42 * Math.max(radialGate, vineW);
    flow[o] = Math.round(255 * clamp01(0.5 + 0.5 * (dx / fl)));
    flow[o + 1] = Math.round(255 * clamp01(0.5 + 0.5 * (dy / fl)));
    flow[o + 2] = Math.round(255 * clamp01(coh));
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
