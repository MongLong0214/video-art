import { rgbToHsv } from "./image-stats.js";

export type PaletteName = "jewel-night" | "jewel-fire" | "jewel-opal";
export type V3 = [number, number, number];

export type Palette = {
  readonly A: V3;
  readonly B: V3;
  readonly C: V3;
  readonly D: V3;
};

type PaletteAnalysis = {
  readonly M3: {
    readonly dominantHues: readonly { readonly hueDeg: number; readonly weightPct: number }[];
  };
};

export const PALETTE_NAMES: readonly PaletteName[] = ["jewel-night", "jewel-fire", "jewel-opal"];

export const PALETTES: Record<PaletteName, Palette> = {
  "jewel-night": { A: [0.42, 0.4, 0.52], B: [0.38, 0.34, 0.4], C: [1, 1, 1], D: [0.62, 0.63, 0.95] },
  "jewel-fire": { A: [0.55, 0.42, 0.4], B: [0.42, 0.32, 0.38], C: [1, 1, 1], D: [0, 0.02, 0.78] },
  "jewel-opal": { A: [0.68, 0.62, 0.7], B: [0.3, 0.28, 0.32], C: [1, 1, 1.15], D: [0.05, 0.66, 0.6] },
};

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function paletteRgb(t: number, palette: Palette): V3 {
  return [
    clamp(palette.A[0] + palette.B[0] * Math.cos(Math.PI * 2 * (palette.C[0] * t + palette.D[0])), 0, 1),
    clamp(palette.A[1] + palette.B[1] * Math.cos(Math.PI * 2 * (palette.C[1] * t + palette.D[1])), 0, 1),
    clamp(palette.A[2] + palette.B[2] * Math.cos(Math.PI * 2 * (palette.C[2] * t + palette.D[2])), 0, 1),
  ];
}

function circDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

function paletteDistance(palette: Palette, analysis: PaletteAnalysis): number {
  const hues = Array.from({ length: 64 }, (_, i) => {
    const rgb = paletteRgb(i / 64, palette);
    return rgbToHsv([rgb[0] * 255, rgb[1] * 255, rgb[2] * 255])[0] * 360;
  });
  let sum = 0;
  let weight = 0;
  for (const hue of analysis.M3.dominantHues) {
    const nearest = Math.min(...hues.map((candidate) => circDiff(candidate, hue.hueDeg)));
    sum += nearest * Math.max(0.1, hue.weightPct);
    weight += Math.max(0.1, hue.weightPct);
  }
  return weight === 0 ? 180 : sum / weight;
}

export function choosePaletteCandidate(analysis: PaletteAnalysis): {
  readonly selected: PaletteName;
  readonly scores: Record<PaletteName, number>;
} {
  let selected: PaletteName = "jewel-night";
  let bestScore = Number.POSITIVE_INFINITY;
  const scores: Record<PaletteName, number> = { "jewel-night": 0, "jewel-fire": 0, "jewel-opal": 0 };
  for (const name of PALETTE_NAMES) {
    const score = round4(paletteDistance(PALETTES[name], analysis));
    scores[name] = score;
    if (score < bestScore) {
      selected = name;
      bestScore = score;
    }
  }
  return { selected, scores };
}
