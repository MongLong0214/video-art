// One-pass clip probe at 204x364 vs source, for the taste self-audit (04 §4): preservation (mean |RGB-src|, sharpness ratio),
// glare (hot%: max>=240 & sat>=0.7; white%: max>=245 & sat<0.12), tone (meanL, sat), motion (local |ΔL| per px per frame)
// and whole-frame pumping (pumpShare = global|Δ| / local|Δ|). CROP=x:y:w:h (normalised) restricts it to a region.
//   node scripts/taste/probe.mjs <source.png> <clip.mp4|png> [label]
import { execFileSync } from "node:child_process";
const [, , srcPng, clip, label] = process.argv; const W = 204, H = 364, n = W * H;
const C = process.env.CROP ? process.env.CROP.split(":").map(Number) : null; const vf = (C ? `crop=iw*${C[2]}:ih*${C[3]}:iw*${C[0]}:ih*${C[1]},` : "") + `scale=${W}:${H}:flags=area`;
const rgb = (f) => execFileSync("ffmpeg", ["-nostdin", "-v", "error", "-i", f, "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 1 << 30 });
const src = rgb(srcPng), raw = rgb(clip), F = raw.length / (n * 3);
const L = (b, i) => 0.299 * b[i] + 0.587 * b[i + 1] + 0.114 * b[i + 2];
const grad = (b) => { let e = 0; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = (y * W + x) * 3; e += Math.hypot(L(b, i + 3) - L(b, i - 3), L(b, i + W * 3) - L(b, i - W * 3)); } return e; };
const gs = grad(src); let diff = 0, sh = 0, hot = 0, wh = 0, ml = 0, sat = 0, loc = 0; const gm = [];
for (let f = 0; f < F; f++) { const b = raw.subarray(f * n * 3, (f + 1) * n * 3); let m = 0;
  for (let i = 0; i < n * 3; i += 3) { const r = b[i], g = b[i + 1], bl = b[i + 2], mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), s = mx ? (mx - mn) / mx : 0;
    diff += (Math.abs(r - src[i]) + Math.abs(g - src[i + 1]) + Math.abs(bl - src[i + 2])) / 3; if (mx >= 240 && s >= 0.7) hot++; if (mx >= 245 && s < 0.12) wh++; sat += s; const l = L(b, i); m += l; }
  gm.push(m / n); ml += m / n; if (f % 5 === 0) sh += grad(b) / gs;
  if (f) { const a = raw.subarray((f - 1) * n * 3, f * n * 3); let d = 0; for (let i = 0; i < n * 3; i += 3) d += Math.abs(L(b, i) - L(a, i)); loc += d / n; } }
let g = 0; for (let f = 1; f < F; f++) g += Math.abs(gm[f] - gm[f - 1]); const T = F * n;
const sw = (b) => { let h = 0, w = 0, s = 0, m = 0; for (let i = 0; i < n * 3; i += 3) { const mx = Math.max(b[i], b[i + 1], b[i + 2]), mn = Math.min(b[i], b[i + 1], b[i + 2]), q = mx ? (mx - mn) / mx : 0; if (mx >= 240 && q >= 0.7) h++; if (mx >= 245 && q < 0.12) w++; s += q; m += L(b, i); } return [100 * h / n, 100 * w / n, s / n, m / n]; };
const S0 = sw(src);
console.log(`${(label ?? clip.split("/").pop()).slice(0, 14).padEnd(14)} |Δsrc| ${(diff / T).toFixed(1).padStart(5)}  sharp ${(F > 1 ? sh / Math.ceil(F / 5) : grad(raw) / gs).toFixed(2)}  hot% ${(100 * hot / T).toFixed(1)} (src ${S0[0].toFixed(1)})  white% ${(100 * wh / T).toFixed(2)} (src ${S0[1].toFixed(2)})  meanL ${(ml / F).toFixed(1)} (src ${S0[3].toFixed(1)})  sat ${(sat / T).toFixed(3)} (src ${S0[2].toFixed(3)})` +
  (F > 1 ? `  local|Δ| ${(loc / (F - 1)).toFixed(2)}  pumpShare ${(g / loc).toFixed(3)}` : ""));
