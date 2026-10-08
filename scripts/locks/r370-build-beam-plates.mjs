/**
 * r370: streaks radiate from the path's vanishing point.
 * session-plates beam is a pour cone, so this replaces it.
 * Hold = saturated orange robes plus the skin touching them.
 * The magenta tunnel is not held. No water diagonals.
 */
import sharp from "sharp";

const DIR = "out/manual-runs/r370-monk-light-path/layers";
const CXN = 0.55;
const CYN = 0.3;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const rgbToHsv = (r, g, b) => {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const d = max - min;
  let h = 0;
  if (d > 1e-6) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
};

const src = await sharp(`${DIR}/source.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const struct = await sharp(`${DIR}/flow-field.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = src.info;
const n = w * h;
const cx = CXN * w;
const cy = CYN * h;
const robe = Buffer.alloc(n);
const hsv = new Array(n);
for (let i = 0; i < n; i++) {
  const o = i * 4;
  const q = rgbToHsv(src.data[o], src.data[o + 1], src.data[o + 2]);
  hsv[i] = q;
  const orange = q.h > 0 && q.h < 32 && q.s > 0.48 && q.v > 0.16 && q.v < 0.95;
  robe[i] = orange ? 255 : 0;
}
const robeKeep = new Uint8Array(n);
const seen = new Uint8Array(n);
let monks = 0;
for (let s = 0; s < n; s++) {
  if (!robe[s] || seen[s]) continue;
  const stack = [s];
  const members = [];
  seen[s] = 1;
  while (stack.length) {
    const i = stack.pop();
    members.push(i);
    const x = i % w;
    const y = (i - x) / w;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if (seen[j] || !robe[j]) continue;
        seen[j] = 1;
        stack.push(j);
      }
    }
  }
  if (members.length < 1200) continue;
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (const i of members) {
    const x = i % w;
    const y = (i - x) / w;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const bw = maxX - minX;
  const bh = maxY - minY;
  const cnx = (minX + maxX) / 2 / w;
  const cny = (minY + maxY) / 2 / h;
  if (cnx < 0.3 || cnx > 0.62 || cny > 0.9) continue;
  if (bh < bw * 0.85 && bw > w * 0.16) continue;
  monks++;
  for (const i of members) robeKeep[i] = 255;
}
console.log("monks", monks);
const robeSoft = await sharp(robeKeep, { raw: { width: w, height: h, channels: 1 } }).blur(16).raw().toBuffer();
const robeStride = robeSoft.length === n ? 1 : 3;
const flow = Buffer.alloc(n * 4);
const counter = Buffer.alloc(n * 4);
const phase = Buffer.alloc(n * 4);
const raw = new Float32Array(n);
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const o = i * 4;
    const q = hsv[i];
    const sdx = (struct.data[o] / 255) * 2 - 1;
    const sdy = (struct.data[o + 1] / 255) * 2 - 1;
    const dx0 = x - cx;
    const dy0 = y - cy;
    const len = Math.max(1e-5, Math.hypot(dx0, dy0));
    const rdx = dx0 / len;
    const rdy = dy0 / len;
    const dist = len / Math.max(w, h);
    const radialW = smoothstep(0.02, 0.08, dist);
    const dx = rdx * 0.78 * radialW + sdx * (1 - 0.55 * radialW);
    const dy = rdy * 0.78 * radialW + sdy * (1 - 0.55 * radialW);
    const fl = Math.max(1e-5, Math.hypot(dx, dy));
    flow[o] = Math.round(255 * clamp01(0.5 + 0.5 * (dx / fl)));
    flow[o + 1] = Math.round(255 * clamp01(0.5 + 0.5 * (dy / fl)));
    flow[o + 2] = Math.round(255 * clamp01(0.55 + 0.35 * radialW));
    flow[o + 3] = 255;
    const flip = Math.sin(dist * Math.PI * 9);
    const cdx = rdx * flip * 0.86 * radialW + sdx * 0.2;
    const cdy = rdy * flip * 0.86 * radialW + sdy * 0.2;
    const cfl = Math.max(1e-5, Math.hypot(cdx, cdy));
    counter[o] = Math.round(255 * clamp01(0.5 + 0.5 * (cdx / cfl)));
    counter[o + 1] = Math.round(255 * clamp01(0.5 + 0.5 * (cdy / cfl)));
    counter[o + 2] = flow[o + 2];
    counter[o + 3] = 255;
    const g = Math.round(255 * clamp01(dist * 1.4));
    phase[o] = g;
    phase[o + 1] = g;
    phase[o + 2] = g;
    phase[o + 3] = 255;
    const nearRobe = robeSoft[i * robeStride] > 18;
    const skin = nearRobe && q.s < 0.55 && q.v > 0.22 && q.v < 0.88;
    const hero = dist < 0.04;
    raw[i] = !hero && (robeKeep[i] > 0 || skin) ? 1 : 0;
  }
}
const gray = Buffer.alloc(n);
for (let i = 0; i < n; i++) gray[i] = Math.round(raw[i] * 255);
const soft = await sharp(gray, { raw: { width: w, height: h, channels: 1 } }).blur(2.4).raw().toBuffer();
const stride = soft.length === n ? 1 : 3;
const hold = Buffer.from(src.data);
for (let i = 0; i < n; i++) hold[i * 4 + 3] = soft[i * stride];
await sharp(hold, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/figure-hold.png`);
await sharp(flow, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/_tmp-flow.png`);
await sharp(`${DIR}/_tmp-flow.png`).blur(1.4).png().toFile(`${DIR}/flow-beam.png`);
await sharp(counter, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/_tmp-counter.png`);
await sharp(`${DIR}/_tmp-counter.png`).blur(1.4).png().toFile(`${DIR}/flow-beam-counter.png`);
await sharp(phase, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/phase-beam.png`);
const dbg = Buffer.alloc(n * 4);
for (let i = 0; i < n; i++) {
  const a = soft[i * stride];
  dbg[i * 4] = a;
  dbg[i * 4 + 1] = a;
  dbg[i * 4 + 2] = a;
  dbg[i * 4 + 3] = 255;
}
await sharp(dbg, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${DIR}/debug-hold.png`);
const aAt = (nx, ny) => (hold[(Math.floor(ny * h) * w + Math.floor(nx * w)) * 4 + 3] / 255).toFixed(2);
console.log(
  [`robe=${aAt(0.42, 0.62)}`, `head=${aAt(0.45, 0.5)}`, `light=${aAt(0.55, 0.3)}`, `tree=${aAt(0.15, 0.3)}`, `path=${aAt(0.7, 0.75)}`].join(" "),
);
