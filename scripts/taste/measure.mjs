// Colour/light stats of a loop video, for the taste self-audit against the approved finals (04 §4).
//   node scripts/taste/measure.mjs <clip.mp4> <label>
// sat±/val± = mean and temporal std over frames · hueEnt = hue-histogram entropy (12 bins) ·
// hueDom = length of the mean sat×val-weighted hue vector (1 = one hue owns the frame; compare with the source still) ·
// hueSpd / lumSpd = per-pixel hue (°/s) and luma change · period = dominant period of the global hue vector ·
// neon (max > 0.95 & s > 0.85) · white (max > 0.92 & s < 0.12) · dark (max < 0.12), as % of pixels.
import { spawn } from "node:child_process";
const [, , file, label] = process.argv;
const W = 72, H = 128, FS = W * H * 3;
const ff = spawn("ffmpeg", ["-v", "error", "-i", file, "-vf", `fps=10,scale=${W}:${H},format=rgb24`, "-f", "rawvideo", "-"]);
const chunks = [];
ff.stdout.on("data", (c) => chunks.push(c));
ff.on("close", () => {
  const b = Buffer.concat(chunks), n = Math.floor(b.length / FS);
  const sat = [], val = [], ent = [], hx = [], hy = [];
  const prevHue = new Float32Array(W * H), prevW = new Float32Array(W * H), prevL = new Float32Array(W * H);
  let hueSpeed = 0, lumSpeed = 0, steps = 0, neon = 0, white = 0, dark = 0;
  for (let f = 0; f < n; f++) {
    let s = 0, v = 0, c = 0, sx = 0, sy = 0, sw = 0, hs = 0, hw = 0, ls = 0;
    const hist = new Float64Array(12);
    for (let i = 0; i < W * H; i++) {
      const o = f * FS + i * 3, r = b[o] / 255, g = b[o + 1] / 255, bb = b[o + 2] / 255;
      const mx = Math.max(r, g, bb), mn = Math.min(r, g, bb), d = mx - mn, st = mx ? d / mx : 0;
      let hh = 0;
      if (d > 0) hh = mx === r ? ((g - bb) / d + 6) % 6 : mx === g ? (bb - r) / d + 2 : (r - g) / d + 4;
      const ang = (hh / 6) * 2 * Math.PI, wgt = st * mx;
      v += mx;
      if (mx > 0.16) { s += st; c++; }
      if (mx > 0.95 && st > 0.85) neon++;
      if (mx > 0.92 && st < 0.12) white++;
      if (mx < 0.12) dark++;
      hist[Math.floor(hh * 2) % 12] += wgt;
      sx += Math.cos(ang) * wgt; sy += Math.sin(ang) * wgt; sw += wgt;
      const L = 0.299 * r + 0.587 * g + 0.114 * bb;
      if (f > 0) {
        const w2 = Math.min(wgt, prevW[i]);
        let dh = Math.abs(ang - prevHue[i]); if (dh > Math.PI) dh = 2 * Math.PI - dh;
        hs += dh * w2; hw += w2; ls += Math.abs(L - prevL[i]);
      }
      prevHue[i] = ang; prevW[i] = wgt; prevL[i] = L;
    }
    if (f > 0) { hueSpeed += hs / Math.max(hw, 1e-6); lumSpeed += ls / (W * H); steps++; }
    const tot = hist.reduce((a, x) => a + x, 0);
    let e = 0; for (const x of hist) if (x > 0) { const p = x / tot; e -= p * Math.log2(p); }
    sat.push(s / Math.max(c, 1)); val.push(v / (W * H)); ent.push(e); hx.push(sx / sw); hy.push(sy / sw);
  }
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
  // dominant period of the global (sat-weighted) hue vector, by autocorrelation over lags 0.5..10 s
  let best = 0, bestLag = 0;
  const mx_ = mean(hx), my_ = mean(hy);
  for (let lag = 5; lag <= 100; lag++) {
    let acc = 0, k = 0;
    for (let f = 0; f + lag < n; f++) { acc += (hx[f] - mx_) * (hx[f + lag] - mx_) + (hy[f] - my_) * (hy[f + lag] - my_); k++; }
    acc /= k;
    if (acc > best && lag > 5) { best = acc; bestLag = lag; }
  }
  const glob = mean(hx.map((x, i) => Math.hypot(x, hy[i])));
  console.log(`${label.padEnd(12)} sat ${mean(sat).toFixed(3)}±${sd(sat).toFixed(3)} val ${mean(val).toFixed(3)}±${sd(val).toFixed(3)} hueEnt ${mean(ent).toFixed(2)} hueDom ${glob.toFixed(2)} hueSpd ${(hueSpeed / steps * 10 * 180 / Math.PI).toFixed(0)}°/s lumSpd ${(lumSpeed / steps * 1000).toFixed(1)} period ${(bestLag / 10).toFixed(1)}s neon ${(100 * neon / n / W / H).toFixed(1)}% white ${(100 * white / n / W / H).toFixed(1)}% dark ${(100 * dark / n / W / H).toFixed(1)}%`);
});
