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
  pitch_contour: {
    tracker_used: string;
    note_events: { time: number; freq: number; duration: number; velocity: number; slide: boolean }[];
  } | null;
  warnings: string[];
}

// === Section types (AC-8.1) ===
interface SectionConfig {
  label: string;
  start: number;
  end: number;
  synthOverrides?: Record<string, Record<string, number>>;
  fxOverrides?: Record<string, number>;
}

// === BPM ===
const mapBpmToPreset = (bpm: number): { min: number; max: number; default: number } => ({
  min: Math.max(60, Math.round(bpm) - 5),
  max: Math.min(200, Math.round(bpm) + 5),
  default: Math.round(bpm),
});

// === Kick drive (freq balance lookup) ===
const mapKickDrive = (low: number): number => {
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

const mapBassType = (type: string): { cutoff: number; resonance: number; envAmount: number } =>
  BASS_PROFILES[type] ?? BASS_PROFILES.rolling;

// === Dynamics → compress ===
const mapCompress = (crest: number): number => {
  if (crest <= 3) return 0.8;
  if (crest <= 5) return 0.5;
  return 0.25;
};

// === Spectral contrast → saturate ===
const mapSaturate = (contrastMean: number[]): number => {
  if (contrastMean.length === 0) return 0.4;
  const avg = contrastMean.reduce((a, b) => a + b, 0) / contrastMean.length;
  if (avg > 20) return 0.2;  // high contrast = clean
  if (avg > 12) return 0.4;
  return 0.6;                  // low contrast = distorted
};

// === Hat openness ===
const mapHatOpenness = (density: number): number => {
  if (density > 8) return 0.05;
  if (density > 6) return 0.15;
  if (density > 4) return 0.25;
  return 0.35;
};

// === Danceability → energy ===
const mapDanceabilityToEnergy = (score: number): number => {
  if (score > 2) return 0.85;
  if (score > 1) return 0.65;
  return 0.35;
};

// === Genre from BPM ===
const mapGenre = (bpm: number): "techno" | "trance" | "house" | "dnb" | "ambient" => {
  if (bpm >= 135 && bpm < 160) return "trance";
  if (bpm >= 120 && bpm < 135) return "techno";
  if (bpm >= 115 && bpm < 120) return "house";
  if (bpm >= 160) return "dnb";
  return "ambient";
};

// === Section detection (energy-based, synced with Python detect_structure) ===
const MIN_SECTION_RATIO = 0.05; // 5% of total
const OUTRO_MAX_RATIO = 0.5;

const coalesceAdjacentSections = (
  sections: { start: number; end: number; label: string }[],
): { start: number; end: number; label: string }[] => {
  const merged: { start: number; end: number; label: string }[] = [];
  for (const seg of sections) {
    if (seg.end <= seg.start) continue;
    const current = {
      start: seg.start,
      end: seg.end,
      label: seg.label,
    };
    if (merged.length === 0) {
      merged.push(current);
      continue;
    }
    const prev = merged[merged.length - 1];
    if (prev.label === current.label) {
      prev.end = current.end;
    } else {
      if (Math.abs(prev.end - current.start) < 0.001) {
        current.start = prev.end;
      }
      merged.push(current);
    }
  }
  return merged;
};

const normalizeOutroPlacement = (
  sections: { start: number; end: number; label: string }[],
): { start: number; end: number; label: string }[] => {
  if (sections.length < 2) return sections;
  const normalized = sections.map((seg, idx) => ({
    start: seg.start,
    end: seg.end,
    label: seg.label === "outro" && idx !== sections.length - 1 ? "break" : seg.label,
  }));
  return coalesceAdjacentSections(normalized);
};

const detectSections = (curve: number[]): { start: number; end: number; label: string }[] => {
  if (!curve || curve.length === 0) return [{ start: 0, end: 1, label: "drop" }];

  const len = curve.length;
  const peak = Math.max(...curve);

  // Silence → single drop
  if (peak < 1e-6) return [{ start: 0, end: 1, label: "drop" }];

  const normalized = curve.map((v) => v / peak);
  const avg = normalized.reduce((a, b) => a + b, 0) / len;

  // Label each point
  const labels: string[] = normalized.map((e, i) => {
    const pos = i / len;
    if (e < avg * 0.5) return pos < 0.3 ? "intro" : "break";
    if (e > avg * 1.2) return "drop";
    if (pos < 0.25) return "build";
    if (pos > 0.8) return "outro";
    return pos < 0.5 ? "build" : "drop";
  });

  // Merge consecutive same-label regions
  const raw: { start: number; end: number; label: string }[] = [];
  let prevLabel = labels[0];
  let segStart = 0;
  for (let i = 1; i < len; i++) {
    if (labels[i] !== prevLabel) {
      raw.push({ start: segStart / len, end: i / len, label: prevLabel });
      segStart = i;
      prevLabel = labels[i];
    }
  }
  raw.push({ start: segStart / len, end: 1, label: prevLabel });

  // Merge short segments into neighbors
  const merged: { start: number; end: number; label: string }[] = [];
  for (const seg of raw) {
    const segDur = seg.end - seg.start;
    if (segDur < MIN_SECTION_RATIO && merged.length > 0) {
      merged[merged.length - 1].end = seg.end;
    } else {
      merged.push({ ...seg });
    }
  }

  // Merge last segment if too short
  if (merged.length > 1) {
    const last = merged[merged.length - 1];
    if (last.end - last.start < MIN_SECTION_RATIO) {
      merged[merged.length - 2].end = last.end;
      merged.pop();
    }
  }

  // Outro cap: split if > 50%
  let sections = merged;
  const outroDur = sections
    .filter((s) => s.label === "outro")
    .reduce((sum, s) => sum + (s.end - s.start), 0);
  if (outroDur > OUTRO_MAX_RATIO) {
    const newSections: typeof sections = [];
    for (const s of sections) {
      if (s.label === "outro" && s.end - s.start > MIN_SECTION_RATIO * 2) {
        const mid = s.start + (s.end - s.start) * 0.5;
        newSections.push({ start: s.start, end: mid, label: "break" });
        newSections.push({ start: mid, end: s.end, label: "outro" });
      } else {
        newSections.push(s);
      }
    }
    sections = newSections;
  }

  sections = coalesceAdjacentSections(sections);
  sections = normalizeOutroPlacement(sections);

  // Ensure minimum 4 sections
  if (sections.length < 4) {
    const labelSeq = ["intro", "build", "drop", "outro"];
    sections = labelSeq.map((label, i) => ({
      start: i / 4,
      end: (i + 1) / 4,
      label,
    }));
    sections[sections.length - 1].end = 1;
  }

  sections = coalesceAdjacentSections(sections);
  sections = normalizeOutroPlacement(sections);

  return sections;
};

// === Onset → 16-step Tidal pattern ===
const quantizeOnsets = (positions: number[], bpm: number): string => {
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

// === Section-aware Tidal output (AC-8.7) ===
export const generateTidalSections = (
  analysis: AnalysisResult,
): string => {
  const bpm = analysis.bpm?.value ?? 130;
  const sections = analysis.structure?.segments ?? [];
  const kickPositions = analysis.kick_pattern?.positions ?? [];
  const hatPositions = analysis.hat_pattern?.positions ?? [];

  if (sections.length === 0) {
    // No sections — single block (backward compat)
    const kick = quantizeOnsets(kickPositions, bpm);
    const hat = quantizeOnsets(hatPositions, bpm);
    return `-- BPM: ${bpm}\n\nd1 $ s "kick" # n "${kick}"\n\nd2 $ s "hat" # n "${hat}"\n`;
  }

  const lines: string[] = [`-- BPM: ${bpm}`, `-- Sections: ${sections.map((s) => s.label).join(" → ")}`, ""];

  for (const seg of sections) {
    const segKicks = kickPositions.filter((t) => t >= seg.start && t < seg.end);
    const segHats = hatPositions.filter((t) => t >= seg.start && t < seg.end);
    const kick = quantizeOnsets(segKicks, bpm);
    const hat = quantizeOnsets(segHats, bpm);

    lines.push(`-- ${seg.label} (${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s)`);

    switch (seg.label) {
      case "drop":
        lines.push(`d1 $ s "kick" # n "${kick}"`);
        lines.push(`d2 $ s "hat" # n "${hat}"`);
        lines.push(`d3 $ s "bass" # n "${kick}"`);
        break;
      case "break":
        lines.push(`-- d1 $ silence`);
        lines.push(`d2 $ s "hat" # n "${hat}" # gain 0.6`);
        lines.push(`d4 $ s "pad"`);
        break;
      case "build":
        lines.push(`d1 $ s "kick" # n "${kick}" # gain 0.7`);
        lines.push(`d2 $ s "hat" # n "${hat}"`);
        lines.push(`d5 $ s "riser"`);
        break;
      case "intro":
        lines.push(`-- d1 $ silence`);
        lines.push(`d4 $ s "pad" # gain 0.5`);
        break;
      case "outro":
        lines.push(`d1 $ s "kick" # n "${kick}" # gain 0.5`);
        lines.push(`d4 $ s "pad" # gain 0.4`);
        break;
      default:
        lines.push(`d1 $ s "kick" # n "${kick}"`);
        lines.push(`d2 $ s "hat" # n "${hat}"`);
    }
    lines.push("");
  }

  return lines.join("\n");
};

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

// === RMS envelope following (AC-8.3) ===
const mapRmsToOverrides = (energyCurve: number[], segStart: number, segEnd: number): { compress: number; drive: number } => {
  if (!energyCurve.length) return { compress: 0.5, drive: 0.3 };
  const len = energyCurve.length;
  const startIdx = Math.floor((segStart) * len);
  const endIdx = Math.ceil((segEnd) * len);
  const slice = energyCurve.slice(Math.max(0, startIdx), Math.min(len, endIdx));
  if (!slice.length) return { compress: 0.5, drive: 0.3 };
  const avgRms = slice.reduce((a, b) => a + b, 0) / slice.length;
  // High RMS → more compression, more drive
  return {
    compress: avgRms > 0.7 ? 0.8 : avgRms > 0.4 ? 0.5 : 0.25,
    drive: avgRms > 0.7 ? 0.6 : avgRms > 0.4 ? 0.35 : 0.15,
  };
};

// === Accent extraction from pitch_contour velocity (AC-8.4) ===
const extractAccents = (
  noteEvents: { time: number; velocity: number }[],
  segStart: number,
  segEnd: number,
  threshold = 0.7,
): number[] => {
  return noteEvents
    .filter((n) => n.time >= segStart && n.time < segEnd && n.velocity > threshold)
    .map((n) => n.time);
};

// === Section overrides by label (AC-8.2) ===
const buildSectionOverrides = (
  label: string,
  energyCurve: number[],
  segStartNorm: number,
  segEndNorm: number,
  bassType: string,
): { synthOverrides: Record<string, Record<string, number>>; fxOverrides: Record<string, number> } => {
  const rms = mapRmsToOverrides(energyCurve, segStartNorm, segEndNorm);

  switch (label) {
    case "drop":
      return {
        synthOverrides: {
          kick: { drive: 0.7 },
          ...(bassType === "acid" ? { acid_bass: { cutoff: 2200, resonance: 2.5, dist: 0.4 } } : { bass: { cutoff: 1200 } }),
        },
        fxOverrides: { compress: rms.compress, drive: rms.drive, saturate: 0.3 },
      };
    case "break":
      return {
        synthOverrides: {
          pad: { attack: 1.0, release: 2.5, filterEnv: 0.5 },
        },
        fxOverrides: { compress: 0.2, drive: 0.1, saturate: 0.1 },
      };
    case "build":
      return {
        synthOverrides: {
          riser: { sweepRange: 0.9, noiseAmount: 0.5 },
        },
        fxOverrides: { compress: rms.compress, drive: rms.drive * 1.2, saturate: 0.4 },
      };
    case "intro":
      return {
        synthOverrides: {
          pad: { attack: 1.5, release: 3.0, filterEnv: 0.2 },
        },
        fxOverrides: { compress: 0.15, drive: 0.05, saturate: 0.05 },
      };
    case "outro":
      return {
        synthOverrides: {
          pad: { attack: 1.0, release: 3.0, filterEnv: 0.3 },
        },
        fxOverrides: { compress: 0.2, drive: 0.1, saturate: 0.1 },
      };
    default:
      return {
        synthOverrides: {},
        fxOverrides: { compress: rms.compress, drive: rms.drive },
      };
  }
};

// === Generate sections from analysis structure (AC-8.1, AC-8.2, AC-8.3) ===
const generateSections = (
  analysis: AnalysisResult,
): SectionConfig[] => {
  const segments = analysis.structure?.segments;
  if (!segments || segments.length === 0) return [];

  const energyCurve = analysis.energy_curve ?? [];
  const totalDuration = segments[segments.length - 1]?.end ?? 1;
  const bassType = analysis.bass_profile?.type ?? "rolling";

  return segments.map((seg) => {
    const startNorm = seg.start / totalDuration;
    const endNorm = seg.end / totalDuration;
    const overrides = buildSectionOverrides(seg.label, energyCurve, startNorm, endNorm, bassType);
    return {
      label: seg.label,
      start: Math.max(0, seg.start),
      end: seg.end,
      synthOverrides: overrides.synthOverrides,
      fxOverrides: overrides.fxOverrides,
    };
  });
};

// === Phase 2 SynthDef mapping functions ===
const mapAcidBass = (bass: { centroid: number; variance: number; flux: number; type: string }) => ({
  cutoff: bass.flux > 0.5 ? 2200 : 1200,
  resonance: bass.flux > 0.3 ? 2.5 : 1.5,
  envDepth: bass.flux > 0.5 ? 5000 : 3000,
  envDecay: bass.flux > 0.3 ? 0.15 : 0.25,
  accent: 0,
  slide: 0,
  slideTime: 0.1,
  wave: 0,
  dist: bass.flux > 0.5 ? 0.4 : 0.2,
});

const mapFmLead = (centroid: number) => ({
  mRatio: centroid > 3000 ? 3 : 2,
  cRatio: 1,
  index: centroid > 3000 ? 5 : 3,
  iScale: 5,
  vibrato: 0.3,
  drive: centroid > 3000 ? 0.3 : 0.15,
});

const mapLayeredKick = (freq: { low: number }, dyn: { crest: number }) => ({
  subDecay: freq.low > 0.6 ? 0.5 : 0.3,
  bodyDecay: 0.1,
  clickAmp: dyn.crest > 4 ? 0.7 : 0.4,
  bodyFreq: 200,
  drive: dyn.crest < 3 ? 0.4 : 0.1,
  punch: dyn.crest > 4 ? 0.7 : 0.3,
});

const mapSquelch = () => ({
  sweepStart: 300,
  sweepEnd: 5000,
  sweepCurve: -4,
  resonance: 0.85,
  source: 1,
  lfoRate: 0,
  lfoDepth: 0,
});

const mapWavetable = () => ({
  morph: 0.5,
  attack: 1.0,
  release: 1.5,
  filterCutoff: 4000,
  filterRes: 0.4,
  detune: 0.005,
  bufBase: 8,
});

const mapGranular = () => ({
  buf: 0,
  density: 8,
  grainDur: 0.1,
  rate: 1.0,
  posRand: 0.5,
  panWidth: 0.5,
});

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
  const sections = generateSections(analysis);

  return {
    name: sanitizedName,
    bpm: mapBpmToPreset(bpm),
    ...(sections.length > 0 ? { sections } : {}),
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
      // Phase 2 optional SynthDefs — conditional on analysis
      ...(bass.type === "acid" ? { acid_bass: mapAcidBass(bass) } : {}),
      ...(centroid > 2500 ? { fm_lead: mapFmLead(centroid) } : {}),
      ...(genre === "trance" || genre === "ambient" ? { wavetable_pad: mapWavetable() } : {}),
      ...(genre === "trance" || genre === "ambient" ? { granular_pad: mapGranular() } : {}),
      ...{ layered_kick: mapLayeredKick(freq, dyn) },
      ...(bass.flux > 0.3 ? { squelch: mapSquelch() } : {}),
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
      drums: ["kick", "layered_kick", "hat", "clap"],
      bass: bass.type === "acid" ? ["acid_bass"] : ["bass"],
      synth: ["lead", ...(centroid > 2500 ? ["fm_lead"] : []), "supersaw", "arp_pluck", ...(bass.flux > 0.3 ? ["squelch"] : [])],
      pad: ["pad", ...(genre === "trance" || genre === "ambient" ? ["wavetable_pad", "granular_pad"] : [])],
      fx: ["riser"],
    },
  };
};
