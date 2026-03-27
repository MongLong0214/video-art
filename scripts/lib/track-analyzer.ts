/**
 * Track Analyzer — TS preset/pattern/scene generation from analysis.json
 * Lookup tables + expert rules (no linear interpolation)
 */

import type { Preset } from "./genre-preset.js";

// === Analysis types ===
interface AnalysisResult {
  bpm: { value: number; confidence: number };
  key: string | null;
  spectral_centroid: { mean: number; max: number; min: number } | null;
  spectral_bandwidth: number | null;
  spectral_rolloff: number | null;
  energy_curve: number[] | null;
  onset_density: number | null;
  frequency_balance: { low: number; mid: number; hi: number } | null;
  dynamic_range: { crest: number; rms_mean: number; rms_max: number } | null;
  stereo_width: number | null;
  kick_pattern: { positions: number[] } | null;
  hat_pattern: { positions: number[] } | null;
  bass_profile: { centroid: number; variance: number; flux: number; type: string } | null;
  structure: { segments: { start: number; end: number; label: string }[] } | null;
  loudness: { integrated: number; range: number; short_term_max: number } | null;
  mfcc: { mean: number[]; std: number[] } | null;
  spectral_contrast: { mean: number[]; std: number[] } | null;
  danceability: { score: number } | null;
  warnings: string[];
}

// === BPM ===
export const mapBpmToPreset = (bpm: number): { min: number; max: number; default: number } => ({
  min: Math.max(60, Math.round(bpm) - 5),
  max: Math.min(200, Math.round(bpm) + 5),
  default: Math.round(bpm),
});

// === Kick drive (freq balance lookup) ===
export const mapKickDrive = (low: number): number => {
  if (low > 0.85) return 0.85;
  if (low > 0.70) return 0.6;
  return 0.35;
};

// === Bass type profiles ===
const BASS_PROFILES: Record<string, { cutoff: number; resonance: number; envAmount: number }> = {
  acid: { cutoff: 2200, resonance: 0.75, envAmount: 0.85 },
  rolling: { cutoff: 1200, resonance: 0.45, envAmount: 0.55 },
  sub: { cutoff: 400, resonance: 0.20, envAmount: 0.30 },
};

export const mapBassType = (type: string): { cutoff: number; resonance: number; envAmount: number } =>
  BASS_PROFILES[type] ?? BASS_PROFILES.rolling;

// === Dynamics → compress ===
export const mapCompress = (crest: number): number => {
  if (crest <= 3) return 0.8;
  if (crest <= 5) return 0.5;
  return 0.25;
};

// === Spectral contrast → saturate ===
export const mapSaturate = (contrastMean: number[]): number => {
  const avg = contrastMean.reduce((a, b) => a + b, 0) / contrastMean.length;
  if (avg > 20) return 0.2;  // high contrast = clean
  if (avg > 12) return 0.4;
  return 0.6;                  // low contrast = distorted
};

// === Hat openness ===
export const mapHatOpenness = (density: number): number => {
  if (density > 8) return 0.05;
  if (density > 6) return 0.15;
  if (density > 4) return 0.25;
  return 0.35;
};

// === Danceability → energy ===
export const mapDanceabilityToEnergy = (score: number): number => {
  if (score > 2) return 0.85;
  if (score > 1) return 0.65;
  return 0.35;
};

// === Genre from BPM ===
export const mapGenre = (bpm: number): "techno" | "trance" | "house" | "dnb" | "ambient" => {
  if (bpm >= 135 && bpm <= 155) return "trance";
  if (bpm >= 120 && bpm < 135) return "techno";
  if (bpm >= 115 && bpm < 120) return "house";
  if (bpm >= 160) return "dnb";
  return "ambient";
};

// === Section detection ===
export const detectSections = (curve: number[]): { start: number; end: number; label: string }[] => {
  if (!curve || curve.length === 0) return [{ start: 0, end: 1, label: "drop" }];

  const avg = curve.reduce((a, b) => a + b, 0) / curve.length;
  const sections: { start: number; end: number; label: string }[] = [];
  const len = curve.length;

  // Simple threshold-based segmentation
  let prevLabel = curve[0] < avg * 0.6 ? "intro" : "drop";
  let segStart = 0;

  for (let i = 1; i < len; i++) {
    let label: string;
    if (curve[i] < avg * 0.5) label = i < len * 0.3 ? "intro" : "break";
    else if (curve[i] > avg * 1.2) label = "drop";
    else label = i > len * 0.8 ? "outro" : "build";

    if (label !== prevLabel) {
      sections.push({ start: segStart / len, end: i / len, label: prevLabel });
      segStart = i;
      prevLabel = label;
    }
  }
  sections.push({ start: segStart / len, end: 1, label: prevLabel });

  return sections;
};

// === Onset → 16-step Tidal pattern ===
export const quantizeOnsets = (positions: number[], bpm: number): string => {
  if (!positions.length || !bpm) return "~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~";

  const barDuration = (4 * 60) / bpm; // 1 bar = 4 beats
  const stepDuration = barDuration / 16;
  const steps = Array(16).fill("~");

  for (const t of positions) {
    const normalized = t % barDuration;
    const step = Math.round(normalized / stepDuration) % 16;
    steps[step] = "x";
  }

  return steps.join(" ");
};

export const generateTidalPattern = quantizeOnsets;

// === Scene audio generation ===
export const generateSceneAudio = (
  analysis: AnalysisResult,
  presetName: string,
): { genre: string; energy: number; bpm: number; preset: string } => {
  const bpm = analysis.bpm?.value ?? 130;
  const danceScore = analysis.danceability?.score ?? 1.5;

  return {
    genre: mapGenre(bpm),
    energy: mapDanceabilityToEnergy(danceScore),
    bpm: Math.round(bpm),
    preset: presetName,
  };
};

// === Full preset generation ===
export const generatePreset = (analysis: AnalysisResult, name: string): Preset => {
  const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/^_+|_+$/g, "") || "unnamed";
  const bpm = analysis.bpm?.value ?? 130;
  const freq = analysis.frequency_balance ?? { low: 0.5, mid: 0.3, hi: 0.2 };
  const bass = analysis.bass_profile ?? { centroid: 300, variance: 100, flux: 0.2, type: "rolling" };
  const dyn = analysis.dynamic_range ?? { crest: 4, rms_mean: 0.1, rms_max: 0.3 };
  const contrast = analysis.spectral_contrast?.mean ?? [20, 20, 18, 16, 14, 12, 10];
  const density = analysis.onset_density ?? 5;
  const centroid = analysis.spectral_centroid?.mean ?? 2000;

  const bassParams = mapBassType(bass.type);
  const genre = mapGenre(bpm);

  return {
    name: sanitizedName,
    bpm: mapBpmToPreset(bpm),
    synthParams: {
      kick: { drive: mapKickDrive(freq.low), click: density > 6 ? 0.6 : 0.3, decay: dyn.crest > 4 ? 0.35 : 0.2 },
      bass: { cutoff: bassParams.cutoff, resonance: bassParams.resonance, envAmount: bassParams.envAmount },
      hat: { openness: mapHatOpenness(density), tone: centroid > 3000 ? 0.7 : 0.4 },
      clap: { spread: 0.5, decay: 0.3 },
      supersaw: { detune: 0.3, mix: 0.5, cutoff: centroid > 2500 ? 3000 : 2000 },
      pad: { attack: 0.5, release: 2.0, filterEnv: 0.3 },
      lead: { vibrato: 0.2, portamento: 0.1, drive: mapSaturate(contrast) },
      arp_pluck: { decay: 0.2, brightness: centroid > 3000 ? 0.7 : 0.4 },
      riser: { sweepRange: 0.6, noiseAmount: 0.3 },
    },
    fxDefaults: {
      compress: mapCompress(dyn.crest),
      threshold: Math.round(20 * Math.log10(Math.max(dyn.rms_mean, 1e-10))),
      ratio: dyn.crest < 3 ? 6 : dyn.crest < 5 ? 4 : 2,
      compAttack: dyn.crest < 3 ? 0.005 : 0.02,
      compRelease: genre === "trance" ? 0.1 : 0.05,
      saturate: mapSaturate(contrast),
      drive: mapSaturate(contrast) * 0.8,
      loGain: freq.low > 0.7 ? 3 : 0,
      midGain: centroid > 2500 ? 1 : centroid > 1500 ? 0 : -1,
      hiGain: centroid > 3000 ? 2 : centroid > 1500 ? 0 : -1,
      loFreq: centroid > 2000 ? 250 : 200,
      hiFreq: centroid > 3000 ? 5000 : 4000,
      sideGain: genre === "trance" ? 0.8 : 1.0,
      sideRelease: genre === "trance" ? 0.15 : 0.1,
    },
    stemGroups: {
      drums: ["kick", "hat", "clap"],
      bass: ["bass"],
      lead: ["lead", "arp_pluck"],
      pad: ["pad", "supersaw"],
      fx: ["riser"],
    },
  };
};
