// M1: Color Palette Sinkhorn Distance
// sRGB → CIELAB → k-means++ palette → Sinkhorn distance (EMD approx)

const MAX_DIST = 50;
const K = 12;
const SINKHORN_EPSILON = 0.1;
const SINKHORN_ITERS = 100;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// ── sRGB → CIELAB ──────────────────────────────────────────

function srgbChannelToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function linearToXyz(r: number, g: number, b: number): [number, number, number] {
  return [
    r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
    r * 0.2126729 + g * 0.7151522 + b * 0.0721750,
    r * 0.0193339 + g * 0.1191920 + b * 0.9503041,
  ];
}

const D65_X = 0.95047;
const D65_Y = 1.0;
const D65_Z = 1.08883;

function labF(t: number): number {
  return t > 0.008856 ? t ** (1 / 3) : 7.787 * t + 16 / 116;
}

export function srgbToLab(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  const lr = srgbChannelToLinear(r);
  const lg = srgbChannelToLinear(g);
  const lb = srgbChannelToLinear(b);
  const [x, y, z] = linearToXyz(lr, lg, lb);
  const fx = labF(x / D65_X);
  const fy = labF(y / D65_Y);
  const fz = labF(z / D65_Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// ── CIEDE2000 ──────────────────────────────────────────────

export function ciede2000(
  lab1: [number, number, number],
  lab2: [number, number, number],
): number {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;

  const Lbar = (L1 + L2) / 2;
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cbar = (C1 + C2) / 2;

  const Cbar7 = Cbar ** 7;
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + 25 ** 7)));
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);
  const Cbarp = (C1p + C2p) / 2;

  let h1p = (Math.atan2(b1, a1p) * 180) / Math.PI;
  if (h1p < 0) h1p += 360;
  let h2p = (Math.atan2(b2, a2p) * 180) / Math.PI;
  if (h2p < 0) h2p += 360;

  let dhp: number;
  if (Math.abs(h1p - h2p) <= 180) dhp = h2p - h1p;
  else if (h2p - h1p > 180) dhp = h2p - h1p - 360;
  else dhp = h2p - h1p + 360;

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(((dhp / 2) * Math.PI) / 180);

  let Hbarp: number;
  if (Math.abs(h1p - h2p) <= 180) Hbarp = (h1p + h2p) / 2;
  else if (h1p + h2p < 360) Hbarp = (h1p + h2p + 360) / 2;
  else Hbarp = (h1p + h2p - 360) / 2;

  const T =
    1 -
    0.17 * Math.cos(((Hbarp - 30) * Math.PI) / 180) +
    0.24 * Math.cos(((2 * Hbarp) * Math.PI) / 180) +
    0.32 * Math.cos(((3 * Hbarp + 6) * Math.PI) / 180) -
    0.20 * Math.cos(((4 * Hbarp - 63) * Math.PI) / 180);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  const SL = 1 + (0.015 * (Lbar - 50) ** 2) / Math.sqrt(20 + (Lbar - 50) ** 2);
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;

  const Cbarp7 = Cbarp ** 7;
  const RT =
    -2 *
    Math.sqrt(Cbarp7 / (Cbarp7 + 25 ** 7)) *
    Math.sin((60 * Math.exp(-(((Hbarp - 275) / 25) ** 2)) * Math.PI) / 180);

  const dE = Math.sqrt(
    (dLp / SL) ** 2 +
    (dCp / SC) ** 2 +
    (dHp / SH) ** 2 +
    RT * (dCp / SC) * (dHp / SH),
  );

  return dE;
}

// ── k-means++ ──────────────────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

export function kmeanspp(
  pixels: [number, number, number][],
  k: number,
  seed: number = 42,
): { centroids: [number, number, number][]; weights: number[] } {
  const rng = seededRandom(seed);
  const n = pixels.length;
  if (n === 0) return { centroids: [], weights: [] };

  const effectiveK = Math.min(k, n);

  // k-means++ init
  const centroids: [number, number, number][] = [pixels[Math.floor(rng() * n)]];
  const dist = new Float64Array(n).fill(Infinity);

  for (let c = 1; c < effectiveK; c++) {
    for (let i = 0; i < n; i++) {
      const d = labDist2(pixels[i], centroids[c - 1]);
      if (d < dist[i]) dist[i] = d;
    }
    const total = dist.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    let idx = 0;
    for (let i = 0; i < n; i++) {
      r -= dist[i];
      if (r <= 0) { idx = i; break; }
    }
    centroids.push(pixels[idx]);
  }

  // Lloyd iterations
  const assignment = new Int32Array(n);
  for (let iter = 0; iter < 20; iter++) {
    for (let i = 0; i < n; i++) {
      let minD = Infinity;
      for (let c = 0; c < effectiveK; c++) {
        const d = labDist2(pixels[i], centroids[c]);
        if (d < minD) { minD = d; assignment[i] = c; }
      }
    }
    const sums = Array.from({ length: effectiveK }, () => [0, 0, 0] as number[]);
    const counts = new Int32Array(effectiveK);
    for (let i = 0; i < n; i++) {
      const c = assignment[i];
      sums[c][0] += pixels[i][0];
      sums[c][1] += pixels[i][1];
      sums[c][2] += pixels[i][2];
      counts[c]++;
    }
    for (let c = 0; c < effectiveK; c++) {
      if (counts[c] > 0) {
        centroids[c] = [
          sums[c][0] / counts[c],
          sums[c][1] / counts[c],
          sums[c][2] / counts[c],
        ];
      }
    }
  }

  const counts = new Int32Array(effectiveK);
  for (let i = 0; i < n; i++) counts[assignment[i]]++;
  const weights = Array.from(counts, (c) => c / n);

  return { centroids, weights };
}

function labDist2(a: [number, number, number], b: [number, number, number]): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

// ── Sinkhorn Distance ──────────────────────────────────────

export function sinkhornDistance(
  p1: [number, number, number][],
  p2: [number, number, number][],
  w1: number[],
  w2: number[],
  epsilon: number = SINKHORN_EPSILON,
  maxIter: number = SINKHORN_ITERS,
): number {
  const n = p1.length;
  const m = p2.length;
  if (n === 0 || m === 0) return 0;

  // cost matrix
  const C: number[][] = [];
  for (let i = 0; i < n; i++) {
    C[i] = [];
    for (let j = 0; j < m; j++) {
      C[i][j] = ciede2000(p1[i], p2[j]);
    }
  }

  // Adaptive epsilon: at least max_cost / 20 to prevent kernel underflow
  const maxCost = Math.max(...C.flat(), 1);
  const adaptiveEps = Math.max(epsilon, maxCost / 20);

  // Gibbs kernel K = exp(-C/epsilon)
  const K: number[][] = [];
  for (let i = 0; i < n; i++) {
    K[i] = [];
    for (let j = 0; j < m; j++) {
      K[i][j] = Math.exp(-C[i][j] / adaptiveEps);
    }
  }

  const u = new Float64Array(n).fill(1);
  const v = new Float64Array(m).fill(1);

  for (let iter = 0; iter < maxIter; iter++) {
    // u = w1 / (K * v)
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < m; j++) sum += K[i][j] * v[j];
      u[i] = sum > 1e-10 ? w1[i] / sum : 0;
    }
    // v = w2 / (K^T * u)
    for (let j = 0; j < m; j++) {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += K[i][j] * u[i];
      v[j] = sum > 1e-10 ? w2[j] / sum : 0;
    }
  }

  // transport cost = sum(u_i * K_ij * v_j * C_ij)
  let cost = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      cost += u[i] * K[i][j] * v[j] * C[i][j];
    }
  }

  return cost;
}

// ── M1: Composite ──────────────────────────────────────────

export function computeColorPaletteSimilarity(
  refPixelsLab: [number, number, number][],
  genPixelsLab: [number, number, number][],
  k: number = K,
  maxDist: number = MAX_DIST,
): number {
  if (refPixelsLab.length === 0 || genPixelsLab.length === 0) return 0;

  const ref = kmeanspp(refPixelsLab, k, 42);
  const gen = kmeanspp(genPixelsLab, k, 42);

  const dist = sinkhornDistance(
    ref.centroids,
    gen.centroids,
    ref.weights,
    gen.weights,
  );

  return clamp01(1 - dist / maxDist);
}
