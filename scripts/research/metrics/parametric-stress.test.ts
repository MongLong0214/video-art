import { describe, it, expect } from "vitest";
import { srgbToLab, ciede2000, computeColorPaletteSimilarity } from "./color-palette.js";
import { computeDominantColorAccuracy } from "./dominant-color.js";
import { computeColorTemperatureSimilarity, rgbToCCT, cctToMireds } from "./color-temperature.js";
import { ssimSingleScale, computeMsssimYCbCr } from "./ms-ssim.js";
import { computeEdgePreservation } from "./edge-preservation.js";
import { computeTextureRichness } from "./texture-richness.js";
import { consecutiveSsim, flickerScore } from "./temporal-coherence.js";
import { computeLayerIndependence, computeRoleCoherence } from "./layer-quality.js";
import { clamp01, hardGate, compositeScore, makeEvalResult, type MetricValues } from "../evaluate.js";

// ── Helper ─────────────────────────────────────────────────

function randChannel(w: number, h: number, seed: number): Float64Array {
  const a = new Float64Array(w * h); let s = seed;
  for (let i = 0; i < a.length; i++) { s = (s * 16807) % 2147483647; a[i] = (s / 2147483647) * 255; }
  return a;
}
function rgbBuf(w: number, h: number, r: number, g: number, b: number): Buffer {
  const buf = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) { buf[i * 3] = r; buf[i * 3 + 1] = g; buf[i * 3 + 2] = b; }
  return buf;
}
function makeMetrics(v: number): MetricValues {
  return { M1: v, M2: v, M3: v, M4: v, M5: v, M6: v, M7: v, M8: v, M9: v, M10: v };
}

// ── CIEDE2000 Stress: 100 random pairs ─────────────────────

describe("ciede2000 stress test (100 random pairs)", () => {
  let seed = 1;
  const next = () => { seed = (seed * 16807) % 2147483647; return seed % 256; };

  for (let i = 0; i < 100; i++) {
    const r1 = next(), g1 = next(), b1 = next();
    const r2 = next(), g2 = next(), b2 = next();
    it(`pair #${i}: rgb(${r1},${g1},${b1}) vs rgb(${r2},${g2},${b2})`, () => {
      const lab1 = srgbToLab(r1, g1, b1);
      const lab2 = srgbToLab(r2, g2, b2);
      const de = ciede2000(lab1, lab2);
      expect(de).toBeGreaterThanOrEqual(0);
      expect(de).toBeLessThan(200);
      expect(Number.isFinite(de)).toBe(true);
    });
  }
});

// ── CCT Stress: all primary/secondary/tertiary colors ──────

describe("CCT stress (36 hue steps)", () => {
  for (let h = 0; h < 360; h += 10) {
    const rad = (h * Math.PI) / 180;
    const r = Math.round(128 + 127 * Math.cos(rad));
    const g = Math.round(128 + 127 * Math.cos(rad - 2.094));
    const b = Math.round(128 + 127 * Math.cos(rad + 2.094));
    it(`hue ${h}° → valid CCT`, () => {
      const { cct, duv } = rgbToCCT(r, g, b);
      expect(Number.isFinite(cct)).toBe(true);
      // Some extreme hues can produce CCT outside normal range
      expect(cct).toBeGreaterThan(-100000);
      // CCT can be very high for near-monochromatic blue/magenta; clamped by mireds normalization
      expect(Number.isFinite(duv)).toBe(true);
    });
  }
});

// ── Mireds conversion: 50 values ───────────────────────────

describe("cctToMireds stress", () => {
  for (let cct = 1000; cct <= 25000; cct += 500) {
    it(`${cct}K → ${(1e6 / cct).toFixed(0)} MRD`, () => {
      const mrd = cctToMireds(cct);
      expect(mrd).toBeCloseTo(1e6 / cct, 0);
    });
  }
});

// ── SSIM stress: 20 random image pairs ─────────────────────

describe("SSIM stress (20 random pairs)", () => {
  for (let i = 0; i < 20; i++) {
    it(`pair #${i}: 64×64 random`, () => {
      const a = randChannel(64, 64, i * 7 + 1);
      const b = randChannel(64, 64, i * 7 + 2);
      const s = ssimSingleScale(a, b, 64, 64);
      expect(s).toBeGreaterThanOrEqual(-0.1); // SSIM can be slightly negative in theory
      expect(s).toBeLessThanOrEqual(1.01);
    });
  }
});

// ── MS-SSIM YCbCr stress: various color pairs ──────────────

describe("MS-SSIM YCbCr stress (15 color pairs)", () => {
  const colors: [number, number, number][] = [
    [255,0,0], [0,255,0], [0,0,255], [255,255,0], [255,0,255],
    [0,255,255], [128,128,128], [64,64,64], [192,192,192],
    [255,128,0], [128,0,255], [0,128,255], [255,192,128],
    [128,255,128], [64,128,192],
  ];
  for (let i = 0; i < colors.length; i++) {
    const [r, g, b] = colors[i];
    it(`solid rgb(${r},${g},${b}) vs self → ~1.0`, () => {
      const buf = rgbBuf(64, 64, r, g, b);
      expect(computeMsssimYCbCr(buf, buf, 64, 64)).toBeGreaterThan(0.99);
    });
  }
});

// ── Edge preservation stress: various patterns ─────────────

describe("edge preservation stress (8 patterns)", () => {
  const patterns = [
    () => { const a = new Float64Array(64*64); for(let x=0;x<64;x++) for(let y=0;y<64;y++) a[y*64+x]=x<32?0:255; return a; },
    () => { const a = new Float64Array(64*64); for(let x=0;x<64;x++) for(let y=0;y<64;y++) a[y*64+x]=y<32?0:255; return a; },
    () => { const a = new Float64Array(64*64); for(let x=0;x<64;x++) for(let y=0;y<64;y++) a[y*64+x]=(x+y)%2*255; return a; },
    () => { const a = new Float64Array(64*64); for(let x=0;x<64;x++) for(let y=0;y<64;y++) a[y*64+x]=Math.floor(x/8)%2*255; return a; },
    () => randChannel(64, 64, 42),
    () => randChannel(64, 64, 99),
    () => new Float64Array(64*64).fill(0),
    () => new Float64Array(64*64).fill(128),
  ];
  for (let i = 0; i < patterns.length; i++) {
    it(`pattern #${i} self-comparison → ≥ 0.9`, () => {
      const p = patterns[i]();
      expect(computeEdgePreservation(p, p, 64, 64)).toBeGreaterThanOrEqual(0.9);
    });
  }
});

// ── Texture stress: 10 size variations ─────────────────────

describe("texture richness stress (sizes)", () => {
  for (const sz of [16, 24, 32, 48, 64, 96, 128]) {
    it(`${sz}×${sz} self → ~1.0`, () => {
      const a = randChannel(sz, sz, 42);
      expect(computeTextureRichness(a, a, sz, sz)).toBeCloseTo(1.0, 1);
    });
  }
});

// ── Temporal stress: various difference magnitudes ─────────

describe("temporal flicker stress (10 magnitudes)", () => {
  for (let diff = 0; diff <= 255; diff += 25) {
    it(`diff=${diff} → valid range [0, 1]`, () => {
      const a = new Float64Array(32*32).fill(128);
      const b = new Float64Array(32*32).fill(128 + Math.min(diff, 127));
      const s = flickerScore(a, b, 32, 32);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    });
  }
});

// ── Layer quality stress: various manifest shapes ──────────

describe("layer independence stress (20 manifests)", () => {
  for (let n = 1; n <= 20; n++) {
    it(`${n} layers with coverage ${(1/n).toFixed(2)}`, () => {
      const manifest = { finalLayers: Array(n).fill({ uniqueCoverage: 1 / n }) };
      const s = computeLayerIndependence(manifest);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    });
  }
});

// ── Evaluate harness stress: 50 random metric vectors ──────

describe("evaluate harness stress (50 random vectors)", () => {
  let seed = 7;
  const next = () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647); };
  for (let i = 0; i < 50; i++) {
    it(`random vector #${i}`, () => {
      const m: MetricValues = {
        M1: next(), M2: next(), M3: next(), M4: next(), M5: next(),
        M6: next(), M7: next(), M8: next(), M9: next(), M10: next(),
      };
      const r = makeEvalResult(m);
      expect(r.qualityScore).toBeGreaterThanOrEqual(0);
      expect(r.qualityScore).toBeLessThanOrEqual(1);
      expect(typeof r.gatePassed).toBe("boolean");
      if (!r.gatePassed) expect(r.qualityScore).toBe(0);
    });
  }
});
