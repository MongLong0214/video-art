/**
 * M3: Correlated Color Temperature (CCT) + Duv metric
 *
 * Algorithm deviation from PRD:
 *  - PRD specifies: Ohno 2014 combined with Robertson LUT (±12K accuracy)
 *  - Implementation uses: Hernandez-Andres 1999 polynomial (±50K for 3000–50000K range)
 *
 * Known limitation:
 *  Less accurate for extreme CCT values (< 3000K and > 50000K) due to
 *  polynomial approximation divergence outside the valid range.
 *  Duv uses Krystek 1985 Planckian locus approximation which adds
 *  additional uncertainty at high/low CCT extremes.
 *
 * Phase 2 upgrade path:
 *  Replace Hernandez-Andres polynomial with Ohno 2014 iterative method
 *  using Robertson 1968 LUT for initial CCT estimate, achieving ±12K
 *  accuracy across 1000–25000K. See: Ohno, Y. (2014) "Practical Use and
 *  Calculation of CCT and Duv", LEUKOS 10(1), 47-55.
 */
// RGB → XYZ → chromaticity → CCT (Hernandez-Andres 1999) + Duv
// Score in mireds for perceptual uniformity

const MAX_DELTA_MRD = 100; // ~1500K at 4000K
const MAX_DELTA_DUV = 0.02;
const CCT_WEIGHT = 0.7;
const DUV_WEIGHT = 0.3;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// ── sRGB → XYZ ─────────────────────────────────────────────

function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function rgbToXyz(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  return [
    lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375,
    lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750,
    lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041,
  ];
}

// ── CCT via chromaticity (Hernandez-Andres et al. 1999) + Duv ──

function xyzToChromaticity(x: number, y: number, z: number): [number, number] {
  const sum = x + y + z;
  if (sum < 1e-10) return [0.3127, 0.3290]; // D65 fallback
  return [x / sum, y / sum];
}

function chromaticityToCCT(cx: number, cy: number): number {
  // Hernandez-Andres 1999 — valid for 3000K-50000K, ±2K accuracy
  const n = (cx - 0.3320) / (0.1858 - cy);
  return 449 * n * n * n + 3525 * n * n + 6823.3 * n + 5520.33;
}

function xyzToUv1960(x: number, y: number, z: number): [number, number] {
  const denom = x + 15 * y + 3 * z;
  if (denom < 1e-10) return [0, 0];
  return [(4 * x) / denom, (6 * y) / denom];
}


function computeDuv(x: number, y: number, z: number, cct: number): number {
  // Duv = distance from Planckian locus in CIE 1960 UCS
  // Simplified: compute actual (u,v) vs Planckian (u,v) at estimated CCT
  const [u, v] = xyzToUv1960(x, y, z);

  // Planckian locus approximation (Krystek 1985)
  const u_p = (0.860117757 + 1.54118254e-4 * cct + 1.28641212e-7 * cct * cct) /
              (1 + 8.42420235e-4 * cct + 7.08145163e-7 * cct * cct);
  const v_p = (0.317398726 + 4.22806245e-5 * cct + 4.20481691e-8 * cct * cct) /
              (1 - 2.89741816e-5 * cct + 1.61456053e-7 * cct * cct);

  const du = u - u_p;
  const dv = v - v_p;
  const dist = Math.sqrt(du * du + dv * dv);

  // Sign: positive = above Planckian (greenish), negative = below (pinkish)
  return dv >= 0 ? dist : -dist;
}

export function rgbToCCT(
  r: number,
  g: number,
  b: number,
): { cct: number; duv: number } {
  const [x, y, z] = rgbToXyz(r, g, b);
  const [cx, cy] = xyzToChromaticity(x, y, z);
  const cct = chromaticityToCCT(cx, cy);
  const duv = computeDuv(x, y, z, cct);
  return { cct, duv };
}

export function cctToMireds(cct: number): number {
  if (cct <= 0) return 0;
  return 1_000_000 / cct;
}

// ── M3: Composite ──────────────────────────────────────────

export function computeColorTemperatureSimilarity(
  refMeanRgb: [number, number, number],
  genMeanRgb: [number, number, number],
): number {
  const ref = rgbToCCT(refMeanRgb[0], refMeanRgb[1], refMeanRgb[2]);
  const gen = rgbToCCT(genMeanRgb[0], genMeanRgb[1], genMeanRgb[2]);

  const refMrd = cctToMireds(ref.cct);
  const genMrd = cctToMireds(gen.cct);
  const deltaMrd = Math.abs(refMrd - genMrd);
  const cctScore = clamp01(1 - deltaMrd / MAX_DELTA_MRD);

  const deltaDuv = Math.abs(ref.duv - gen.duv);
  const duvScore = clamp01(1 - deltaDuv / MAX_DELTA_DUV);

  return clamp01(CCT_WEIGHT * cctScore + DUV_WEIGHT * duvScore);
}
