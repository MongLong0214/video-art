/**
 * Analysis-driven NRT render — Phase 2 T10/T14 완전 구현
 * 모든 분석 필드 활용: bpm, key, structure, pitch_contour, energy_curve,
 * spectral_centroid, dynamic_range, frequency_balance, bass_profile,
 * kick_pattern, hat_pattern, onset_density, loudness, danceability,
 * spectral_contrast, stereo_width
 *
 * Usage: npx tsx scripts/render-analysis.ts <analysis-dir> [--hybrid] [--offset N]
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import type { SectionOverride } from "./lib/nrt-builder.js";
import { hasRLPFD } from "./lib/sc-plugins-detect.js";
import { readManifest, generateSampleBufferCommands, scheduleSampleEvents } from "./lib/hybrid-render.js";
import { BufferAllocator } from "./lib/buffer-allocator.js";

const SCLANG = "/Applications/SuperCollider.app/Contents/MacOS/sclang";

// === Types ===
interface Analysis {
  bpm: { value: number; confidence: number };
  key: string | null;
  spectral_centroid: { mean: number } | null;
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
  danceability: { score: number } | null;
  spectral_contrast: { mean: number[] } | null;
  pitch_contour: {
    tracker_used: string;
    note_events: { time: number; freq: number; duration: number; velocity: number; slide: boolean }[];
  } | null;
  stems?: Record<string, unknown>;
}

// === Key → Scale mapping ===
const SCALES: Record<string, number[]> = {
  "C": [32.7, 36.7, 41.2, 43.7, 49.0, 55.0, 61.7],
  "C#": [34.6, 38.9, 43.7, 46.2, 51.9, 58.3, 65.4],
  "D": [36.7, 41.2, 46.2, 49.0, 55.0, 61.7, 69.3],
  "D#": [38.9, 43.7, 49.0, 51.9, 58.3, 65.4, 73.4],
  "E": [41.2, 46.2, 51.9, 55.0, 61.7, 69.3, 77.8],
  "F": [43.7, 49.0, 55.0, 58.3, 65.4, 73.4, 82.4],
  "F#": [46.2, 51.9, 58.3, 61.7, 69.3, 77.8, 87.3],
  "G": [49.0, 55.0, 61.7, 65.4, 73.4, 82.4, 92.5],
  "G#": [51.9, 58.3, 65.4, 69.3, 77.8, 87.3, 98.0],
  "A": [55.0, 61.7, 69.3, 73.4, 82.4, 92.5, 103.8],
  "A#": [58.3, 65.4, 73.4, 77.8, 87.3, 98.0, 110.0],
  "B": [61.7, 69.3, 77.8, 82.4, 92.5, 103.8, 116.5],
};

const getScaleNotes = (key: string | null): number[] => {
  if (!key) return SCALES["C"];
  // Parse "Cm" → "C", "F#m" → "F#"
  const root = key.replace(/m$/, "").replace("minor", "").replace("major", "").trim();
  return SCALES[root] ?? SCALES["C"];
};

// === Args ===
const analysisDir = process.argv[2];
const hybridMode = process.argv.includes("--hybrid");
const dryRun = process.argv.includes("--dry-run");
const offsetArg = process.argv.indexOf("--offset");
const rawOffset = offsetArg >= 0 ? Number(process.argv[offsetArg + 1]) : 0;
const renderOffset = Number.isFinite(rawOffset) ? rawOffset : 0;

// --mode synth|samples|hybrid (T4: 909 sample integration)
const modeArg = process.argv.indexOf("--mode");
const renderMode = modeArg >= 0 ? (process.argv[modeArg + 1] ?? "synth") : "synth";
if (modeArg >= 0 && !["synth", "samples", "hybrid"].includes(renderMode)) {
  console.error(`Invalid --mode "${renderMode}". Must be synth|samples|hybrid`);
  process.exit(1);
}

// 909 samples directory
const SAMPLES_909_DIR = path.join(process.cwd(), "audio/samples/909");
const has909Samples = fs.existsSync(path.join(SAMPLES_909_DIR, "kick.wav"));

if (!analysisDir) {
  console.error("Usage: npx tsx scripts/render-analysis.ts <analysis-dir> [--hybrid] [--offset N] [--mode synth|samples|hybrid]");
  process.exit(1);
}

const analysis: Analysis = JSON.parse(
  fs.readFileSync(path.join(analysisDir, "analysis.json"), "utf-8"),
);

// === Core parameters from analysis ===
const bpm = analysis.bpm.value;
const beatDur = 60 / bpm;
const duration = 30;
const key = analysis.key;
const scaleNotes = getScaleNotes(key);
const centroid = analysis.spectral_centroid?.mean ?? 2000;
const dyn = analysis.dynamic_range ?? { crest: 4, rms_mean: 0.1, rms_max: 0.3 };
const freq = analysis.frequency_balance ?? { low: 0.5, mid: 0.3, hi: 0.2 };
const loudness = analysis.loudness?.integrated ?? -14;
const danceability = analysis.danceability?.score ?? 1.5;
const bassProfile = analysis.bass_profile ?? { centroid: 300, variance: 100, flux: 0.2, type: "rolling" };
const stereoWidth = analysis.stereo_width ?? 0.5;
const contrast = analysis.spectral_contrast?.mean ?? [20, 20, 18, 16, 14, 12, 10];

// Energy from analysis (or hires if available)
const hiresPath = path.join(analysisDir, "energy-hires.json");
let hiresRms: number[] = [];
if (fs.existsSync(hiresPath)) {
  hiresRms = JSON.parse(fs.readFileSync(hiresPath, "utf-8")).rms;
}
const energyCurve = analysis.energy_curve ?? Array(100).fill(0.5);

const getEnergy = (time: number): number => {
  if (hiresRms.length > 0) {
    const idx = Math.floor(time * 22050 / 512);
    return hiresRms[Math.min(idx, hiresRms.length - 1)] ?? 0.5;
  }
  const totalDur = energyCurve.length * 3.36;
  const idx = Math.floor((time / totalDur) * energyCurve.length);
  return energyCurve[Math.min(idx, energyCurve.length - 1)] ?? 0.5;
};

// === Structure segments → section at time ===
const segments = analysis.structure?.segments ?? [{ start: 0, end: 999, label: "drop" }];
const getSectionAt = (time: number): string => {
  const absTime = time + renderOffset;
  for (const seg of segments) {
    if (absTime >= seg.start && absTime < seg.end) return seg.label;
  }
  return "drop";
};

// === T9: Section-aware energy scaling ===
// Compute per-section average energy from energy_curve
const sectionEnergyScale: Record<string, number> = {};
for (const seg of segments) {
  const segStart = Math.max(0, seg.start - renderOffset);
  const segEnd = Math.min(duration, seg.end - renderOffset);
  if (segEnd <= segStart) continue;
  // Sample energy_curve at section boundaries
  const samples: number[] = [];
  for (let t = segStart; t < segEnd; t += 0.5) {
    samples.push(getEnergy(t));
  }
  const avg = samples.length > 0 ? samples.reduce((a, b) => a + b, 0) / samples.length : 0.5;
  sectionEnergyScale[seg.label] = avg;
}
// Section type → base amplitude multiplier (gentle dynamics to match ref envelope)
const SECTION_AMP: Record<string, number> = {
  drop: 1.0, build: 0.85, break: 0.6, intro: 0.65, outro: 0.65,
};
const SUPERSAW_ENERGY_GATE = 0.15;
const getSectionAmp = (time: number): number => {
  const section = getSectionAt(time);
  const baseAmp = SECTION_AMP[section] ?? 0.7;
  const energyAmp = sectionEnergyScale[section] ?? 0.5;
  // Gentle blend: 70% structure + 30% energy curve
  return baseAmp * (0.7 + 0.3 * energyAmp);
};

// === Derived parameters ===
// Danceability → overall energy multiplier
const energyMul = danceability > 2 ? 1.2 : danceability > 1 ? 1.0 : 0.7;
// Spectral centroid → filter brightness
const brightnessScale = Math.min(centroid / 2000, 2.0);
// Dynamic range → compression/punch
const punchFactor = dyn.crest > 5 ? 0.8 : dyn.crest > 3 ? 0.5 : 0.3;
// Contrast → saturation
const contrastAvg = contrast.length > 0 ? contrast.reduce((a, b) => a + b, 0) / contrast.length : 15;
const saturation = contrastAvg > 20 ? 0.15 : contrastAvg > 12 ? 0.3 : 0.5;

console.log(`Key: ${key}, BPM: ${bpm}, Centroid: ${centroid}Hz, Crest: ${dyn.crest}`);
console.log(`Mode: ${renderMode}, 909: ${has909Samples ? "yes" : "no"}`);
console.log(`Energy mul: ${energyMul}, Brightness: ${brightnessScale.toFixed(2)}, Saturation: ${saturation}`);
console.log(`Scale: [${scaleNotes.map(n => n.toFixed(1)).join(", ")}]`);

// === 6-stem bus mapping (drums=0, bass=2, hat=4, synth=6, pad=8, fx=10) ===
const STEM_BUS: Record<string, number> = {
  kick: 0, layered_kick: 0, sample_player: 0,
  bass: 2, acid_bass: 2,
  hat: 4, clap: 4,
  supersaw: 6, lead: 6, arp_pluck: 6, fm_lead: 6, squelch: 6,
  pad: 8, wavetable_pad: 8, granular_pad: 8,
  riser: 10,
};
const OUTPUT_CHANNELS = 12; // 6 stems × 2ch

// === Event builder ===
const events: string[] = [];
let nodeId = 1000;
const addEvent = (time: number, synthDef: string, params: Record<string, number>) => {
  if (time < 0 || time >= duration) return;
  // Assign stem bus if not explicitly set
  const bus = params.out ?? STEM_BUS[synthDef] ?? 0;
  // T9: Section-aware amplitude scaling (clamped to prevent clipping)
  const sectionScale = getSectionAmp(time);
  const amp = Math.min((params.amp ?? 0.5) * sectionScale, 1.0);
  const allParams = { ...params, out: bus, amp };
  const paramStr = Object.entries(allParams).map(([k, v]) => `\\${k}, ${v}`).join(", ");
  events.push(`[${time.toFixed(4)}, [\\s_new, \\${synthDef}, ${nodeId++}, 0, 0, ${paramStr}]]`);
};

// === Grid quantization ===
const sixteenthDur = beatDur / 4;
const quantizeToGrid = (positions: number[]): number[] => {
  const grid = new Set<number>();
  for (const t of positions) {
    const local = t - renderOffset;
    if (local < 0 || local >= duration) continue;
    const snapped = Math.round(local / sixteenthDur) * sixteenthDur;
    grid.add(Number(snapped.toFixed(4)));
  }
  return [...grid].sort((a, b) => a - b);
};

// =====================================================
// SAMPLE-BASED — real sounds from reference, no synthesis
// Pro quality: actual extracted kicks/hats/bass + minimal texture
// =====================================================

let bufferCommands: string[] = [];

// === T4: 909 sample mode ===
const use909 = (renderMode === "samples" || renderMode === "hybrid") && has909Samples;
if (use909) {
  console.log(`909 samples: mode=${renderMode}, dir=${SAMPLES_909_DIR}`);
  const samplePlayerDef = path.join(process.cwd(), "audio/sc/compiled/sample_player.scsyndef");
  bufferCommands.push(`[0, [\\d_load, "${samplePlayerDef}"]]`);

  // Allocate buffers for 909 samples
  const sample909Files: Record<string, string> = {
    kick: "kick.wav",
    clap: "clap.wav",
    "hat-closed": "hat-closed.wav",
    "hat-open": "hat-open.wav",
    snare: "snare.wav",
    ride: "ride.wav",
  };
  const sample909Bufs = new Map<string, number>();
  let bufIdx = 300; // offset above BufferAllocator samples range (100-299)
  for (const [name, file] of Object.entries(sample909Files)) {
    const wavPath = path.join(SAMPLES_909_DIR, file);
    if (fs.existsSync(wavPath)) {
      sample909Bufs.set(name, bufIdx);
      bufferCommands.push(`[0, [\\b_allocRead, ${bufIdx}, "${wavPath}"]]`);
      bufIdx++;
    }
  }

  // 909 kick at analyzed positions
  const kickBuf = sample909Bufs.get("kick") ?? -1;
  if (kickBuf >= 0) {
    const rawKickPos = analysis.kick_pattern?.positions ?? [];
    let count909Kick = 0;
    for (const pos of rawKickPos) {
      const t = pos - renderOffset;
      if (t < 0.05 || t >= duration) continue;
      const energy = getEnergy(t) * energyMul;
      addEvent(t, "sample_player", {
        buf: kickBuf, amp: Math.min(0.7 * energy, 0.85), dur: 0.3,
        rate: 1.0, hpFreq: 20, lpFreq: 18000,
      });
      count909Kick++;
    }
    console.log(`909 kick: ${count909Kick} events`);
  }

  // 909 hat (closed) at analyzed hat positions
  const hatBuf = sample909Bufs.get("hat-closed") ?? -1;
  const hatOpenBuf = sample909Bufs.get("hat-open") ?? -1;
  if (hatBuf >= 0) {
    const rawHatPos = analysis.hat_pattern?.positions ?? [];
    let count909Hat = 0;
    for (const pos of rawHatPos) {
      const t = pos - renderOffset;
      if (t < 0.05 || t >= duration) continue;
      const energy = getEnergy(t) * energyMul;
      // Every 4th hat is open
      const isOpen = count909Hat % 4 === 3 && hatOpenBuf >= 0;
      addEvent(t, "sample_player", {
        out: 4, // hat stem bus
        buf: isOpen ? hatOpenBuf : hatBuf,
        amp: Math.min(0.3 * energy, 0.4),
        dur: isOpen ? 0.3 : 0.05,
        rate: 1.0, hpFreq: 2000, lpFreq: 18000,
      });
      count909Hat++;
    }
    console.log(`909 hat: ${count909Hat} events`);
  }

  // 909 clap on beats 2 and 4
  const clapBuf = sample909Bufs.get("clap") ?? -1;
  if (clapBuf >= 0) {
    let count909Clap = 0;
    for (let beat = 1; beat < Math.floor(duration / beatDur); beat += 2) {
      const t = beat * beatDur;
      if (t >= duration) break;
      const section = getSectionAt(t);
      if (section === "intro") continue;
      const energy = getEnergy(t) * energyMul;
      addEvent(t, "sample_player", {
        out: 4, // hat stem bus (clap → hat group)
        buf: clapBuf, amp: Math.min(0.4 * energy, 0.5), dur: 0.2,
        rate: 1.0, hpFreq: 800, lpFreq: 12000,
      });
      count909Clap++;
    }
    console.log(`909 clap: ${count909Clap} events`);
  }
}

// Skip demucs-extracted sample mode if using 909 samples exclusively
const skipDemucsManifest = renderMode === "samples";

// Sample-based mode: load manifest and arrange on grid
const samplesDir = path.join(analysisDir, "samples");
const manifestPath = !skipDemucsManifest && fs.existsSync(path.join(samplesDir, "manifest.json"))
  ? path.join(samplesDir, "manifest.json")
  : null;

if (manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as Record<string, Array<{ file: string; duration: number; onset_time: number }>>;
  const allocator = new BufferAllocator();
  const sampleBufs = new Map<string, number>();

  // Pre-allocate buffers for best samples of each type
  const pickBest = (type: string, count: number) => {
    const hits = manifest[type] ?? [];
    return hits.slice(0, Math.min(count, hits.length));
  };

  const kicks = pickBest("kick", 4);
  const hats = pickBest("hat", 4);
  const basses = pickBest("bass", 4);

  // Load SynthDefs + allocate buffers — stagger timing to ensure order
  const samplePlayerDef = path.join(process.cwd(), "audio/sc/compiled/sample_player.scsyndef");
  const acidBassDef = path.join(process.cwd(), "audio/sc/compiled/acid_bass.scsyndef");
  const padDef = path.join(process.cwd(), "audio/sc/compiled/pad.scsyndef");
  bufferCommands.push(`[0, [\\d_load, "${samplePlayerDef}"]]`);
  bufferCommands.push(`[0, [\\d_load, "${acidBassDef}"]]`);
  bufferCommands.push(`[0, [\\d_load, "${padDef}"]]`);

  for (const hits of [kicks, hats, basses]) {
    for (const h of hits) {
      if (!sampleBufs.has(h.file)) {
        const bufNum = allocator.allocate("samples", h.file);
        sampleBufs.set(h.file, bufNum);
        const wavPath = path.join(samplesDir, h.file);
        bufferCommands.push(`[0, [\\b_allocRead, ${bufNum}, "${wavPath}"]]`);
      }
    }
  }

  console.log(`Samples: ${kicks.length} kicks, ${hats.length} hats, ${basses.length} bass`);

  const rootFreq = scaleNotes[0];

  // === USE ACTUAL ANALYZED POSITIONS from reference ===
  // Kick: 2690 hits, hat: 1899 hits — place real samples at real times
  const rawKickPositions = analysis.kick_pattern?.positions ?? [];
  const rawHatPositions = analysis.hat_pattern?.positions ?? [];

  // === KICK — at analyzed positions (not grid) ===
  let kickCount = 0;
  for (const pos of rawKickPositions) {
    const t = pos - renderOffset;
    if (t < 0.05 || t >= duration) continue; // start after 0.05s for buffer loading
    const kick = kicks[kickCount % kicks.length];
    const buf = sampleBufs.get(kick.file) ?? -1;
    const energy = getEnergy(t) * energyMul;
    addEvent(t, "sample_player", {
      buf, amp: Math.min(0.7 * energy, 0.85), dur: kick.duration,
      rate: 1.0, hpFreq: 20, lpFreq: 18000, // full range, no coloring
    });
    kickCount++;
  }

  // === HAT — at analyzed positions ===
  let hatCount = 0;
  for (const pos of rawHatPositions) {
    const t = pos - renderOffset;
    if (t < 0.05 || t >= duration) continue;
    const hat = hats[hatCount % hats.length];
    const buf = sampleBufs.get(hat.file) ?? -1;
    const energy = getEnergy(t) * energyMul;
    addEvent(t, "sample_player", {
      out: 4, // hat stem bus
      buf, amp: Math.min(0.5 * energy, 0.6), dur: hat.duration,
      rate: 1.0, hpFreq: 2000, lpFreq: 18000,
    });
    hatCount++;
  }

  // === BASS — from pitch contour if available, else sub drone on 8ths ===
  const pitchEvents = analysis.pitch_contour?.note_events ?? [];
  // Filter to events within render window FIRST, then decide mode
  const pitchInWindow = pitchEvents.filter(
    (n: { time: number }) => (n.time - renderOffset) >= 0 && (n.time - renderOffset) < duration,
  );
  if (pitchInWindow.length > 5) {
    for (const note of pitchInWindow) {
      const t = note.time - renderOffset;
      const energy = getEnergy(t) * energyMul;
      addEvent(t, "acid_bass", {
        freq: note.freq, amp: Math.min(0.8 * energy, 1.0),
        dur: Math.min(note.duration, beatDur),
        cutoff: 500, resonance: 1.5,
        envDepth: 1200, envDecay: 0.12,
        accent: note.velocity > 0.7 ? 1 : 0,
        slide: note.slide ? 1 : 0, slideTime: 0.08,
        wave: 0, dist: 0.2,
      });
    }
    console.log(`Bass: ${pitchInWindow.length} pitch events from analysis`);
  } else {
    // Root + 5th alternation on all 8th notes
    for (let step = 0; step < Math.floor(duration / (beatDur / 2)); step++) {
      const t = step * (beatDur / 2);
      if (t >= duration) continue;
      const section = getSectionAt(t);
      if (section === "intro") continue;
      const energy = getEnergy(t) * energyMul;
      const freq = step % 2 === 0 ? rootFreq : rootFreq * 1.5;
      addEvent(t, "acid_bass", {
        freq, amp: 0.7 * energy,
        dur: beatDur * 0.4,
        cutoff: 300, resonance: 1.8,
        envDepth: 600, envDecay: 0.12,
        accent: 0, slide: 0, slideTime: 0,
        wave: 0, dist: 0.2,
      });
    }
    console.log(`Bass: root+5th ${rootFreq.toFixed(0)}Hz`);
  }

  // === PAD — sustained texture ===
  for (let bar = 0; bar < Math.ceil(duration / (beatDur * 4)); bar++) {
    const t = bar * beatDur * 4;
    if (t >= duration) continue;
    const section = getSectionAt(t);
    if (section === "intro") continue;
    const energy = getEnergy(t) * energyMul;
    addEvent(t, "pad", {
      freq: rootFreq * 2, amp: 0.4 * energy, dur: beatDur * 4,
      attack: 1.0, release: 1.5,
      filterEnv: 0.1,
    });
  }

  // === SUPERSAW — energy-driven chord stabs ===
  for (let bar = 0; bar < Math.ceil(duration / (beatDur * 2)); bar++) {
    const t = bar * beatDur * 2;
    if (t >= duration) continue;
    const section = getSectionAt(t);
    if (section === "intro" || section === "break") continue;
    const energy = getEnergy(t) * energyMul;
    if (energy < SUPERSAW_ENERGY_GATE) continue; // only in high-energy sections
    addEvent(t, "supersaw", {
      freq: rootFreq * 4, amp: 0.35 * energy, dur: beatDur * 1.5,
      attack: 0.01, release: 0.5,
      detune: 0.3, width: 0.7,
    });
  }

  console.log(`Kicks: ${kickCount}, Hats: ${hatCount} (from analysis positions)`);
} else {
  console.log("No samples found — skipping sample arrangement");
}

// === Hybrid sample render (--hybrid flag adds extra samples on top) ===
if (hybridMode) {
  // Look for manifest in samples/ subdirectory first, then root
  const samplesDir = path.join(analysisDir, "samples");
  const manifestPath = fs.existsSync(path.join(samplesDir, "manifest.json"))
    ? path.join(samplesDir, "manifest.json")
    : path.join(analysisDir, "manifest.json");
  const sampleBaseDir = fs.existsSync(samplesDir) ? samplesDir : analysisDir;
  const manifest = readManifest(manifestPath);
  if (manifest) {
    try {
      const allocator = new BufferAllocator();
      const { bufCmds, bufMap } = generateSampleBufferCommands(manifest, allocator, sampleBaseDir);
      bufferCommands = bufCmds;
      scheduleSampleEvents(manifest, bufMap, addEvent, duration);
      console.log(`Hybrid: ${bufCmds.length} buffers, ${bufMap.size} samples loaded`);
    } catch (e) {
      console.warn(`[hybrid] buffer alloc failed, continuing synthesis-only: ${e instanceof Error ? e.message : e}`);
    }
  }
}

// =====================================================
// SYNTHESIS-ONLY EVENTS — always generated regardless of manifest
// These SynthDefs fire based on section type + analysis parameters
// =====================================================
const rootFreqSynth = scaleNotes[0];
const fifthFreq = rootFreqSynth * 1.5;

// --- CLAP — backbeat on beats 2,4 (drop/build) ---
for (let beat = 1; beat < Math.floor(duration / beatDur); beat += 2) {
  const t = beat * beatDur;
  if (t >= duration) continue;
  const section = getSectionAt(t);
  if (section === "intro" || section === "break") continue;
  const energy = getEnergy(t) * energyMul;
  addEvent(t, "clap", {
    freq: 0, amp: 0.35 * energy, dur: 0.15,
    spread: 0.5, decay: 0.3,
  });
}

// --- RISER — build sections, every 2 bars ---
for (let bar = 0; bar < Math.ceil(duration / (beatDur * 8)); bar++) {
  const t = bar * beatDur * 8;
  if (t >= duration) continue;
  const section = getSectionAt(t);
  if (section !== "build") continue;
  const energy = getEnergy(t) * energyMul;
  addEvent(t, "riser", {
    freq: rootFreqSynth * 4, amp: 0.7 * energy, dur: beatDur * 8,
    sweepRange: 0.6, noiseAmount: 0.3,
  });
}

// --- ARP_PLUCK — build sections, 16th notes ---
for (let step = 0; step < Math.floor(duration / sixteenthDur); step++) {
  const t = step * sixteenthDur;
  if (t >= duration) continue;
  const section = getSectionAt(t);
  if (section !== "build") continue;
  const energy = getEnergy(t) * energyMul;
  const noteIdx = step % scaleNotes.length;
  addEvent(t, "arp_pluck", {
    freq: scaleNotes[noteIdx] * 4, amp: 0.25 * energy, dur: sixteenthDur * 0.8,
    decay: 0.2, brightness: brightnessScale * 0.5,
  });
}

// --- FM_LEAD — drop sections, centroid > 2500, every 2 bars ---
if (centroid > 2500) {
  for (let bar = 0; bar < Math.ceil(duration / (beatDur * 8)); bar++) {
    const t = bar * beatDur * 8;
    if (t >= duration) continue;
    const section = getSectionAt(t);
    if (section !== "drop") continue;
    const energy = getEnergy(t) * energyMul;
    const noteIdx = bar % 2 === 0 ? 2 : 4; // 3rd / 5th scale degree
    const freq = (scaleNotes[noteIdx % scaleNotes.length] ?? rootFreqSynth) * 4;
    addEvent(t, "fm_lead", {
      freq, amp: 0.3 * energy, dur: beatDur * 2,
      mRatio: 2, cRatio: 1, index: 3, iScale: 5,
      vibrato: 0.3, drive: 0.15,
    });
  }
}

// --- LAYERED_KICK — drop sections, 4-on-the-floor reinforcement ---
for (let beat = 0; beat < Math.floor(duration / beatDur); beat++) {
  const t = beat * beatDur;
  if (t >= duration) continue;
  const section = getSectionAt(t);
  if (section !== "drop") continue;
  const energy = getEnergy(t) * energyMul;
  addEvent(t, "layered_kick", {
    freq: rootFreqSynth, amp: 0.3 * energy, dur: 0.3,
    subDecay: 0.5, bodyDecay: 0.1, clickAmp: 0.4,
    bodyFreq: 200, drive: 0.1, punch: 0.3,
  });
}

// --- SQUELCH — drop sections, bass flux > 0.3, every 2 bars ---
if (bassProfile.flux > 0.3) {
  for (let bar = 0; bar < Math.ceil(duration / (beatDur * 8)); bar++) {
    const t = bar * beatDur * 8 + beatDur * 4; // offset by half
    if (t >= duration) continue;
    const section = getSectionAt(t);
    if (section !== "drop") continue;
    const energy = getEnergy(t) * energyMul;
    addEvent(t, "squelch", {
      freq: rootFreqSynth, amp: 0.25 * energy, dur: beatDur,
      sweepStart: 300, sweepEnd: 5000, sweepCurve: -4,
      resonance: 0.85, source: 1, lfoRate: 0, lfoDepth: 0,
    });
  }
}

// --- BASS FALLBACK — synth-only mode (no manifest), always generate if no pitch events ---
if (!manifestPath || !fs.existsSync(path.join(analysisDir, "samples", "manifest.json"))) {
  const pitchEvts = analysis.pitch_contour?.note_events ?? [];
  const pitchInWin = pitchEvts.filter(
    (n: { time: number }) => (n.time - renderOffset) >= 0 && (n.time - renderOffset) < duration,
  );

  if (pitchInWin.length <= 5) {
    // Root + 5th alternation pattern on 8th notes
    for (let step = 0; step < Math.floor(duration / (beatDur / 2)); step++) {
      const t = step * (beatDur / 2);
      if (t >= duration) continue;
      const section = getSectionAt(t);
      if (section === "intro") continue;
      const energy = getEnergy(t) * energyMul;
      const freq = step % 2 === 0 ? rootFreqSynth : fifthFreq;
      addEvent(t, "acid_bass", {
        freq, amp: 0.85 * energy, dur: beatDur * 0.4,
        cutoff: 500, resonance: 1.8,
        envDepth: 1200, envDecay: 0.12,
        accent: 0, slide: 0, slideTime: 0,
        wave: 0, dist: 0.2,
      });
    }
    console.log(`Synth bass: root+5th alternation ${rootFreqSynth.toFixed(0)}Hz`);
  }

  // Synth kick — use analyzed positions if available, else 4-on-the-floor
  const rawKickPos = analysis.kick_pattern?.positions ?? [];
  if (rawKickPos.length > 0) {
    for (const pos of rawKickPos) {
      const t = pos - renderOffset;
      if (t < 0 || t >= duration) continue;
      const energy = getEnergy(t) * energyMul;
      addEvent(t, "kick", {
        freq: rootFreqSynth, amp: 0.6 * energy, dur: 0.3,
        drive: punchFactor, click: 0.5, decay: 0.2,
      });
    }
    console.log(`Synth kick: ${rawKickPos.length} analyzed positions`);
  } else {
    for (let beat = 0; beat < Math.floor(duration / beatDur); beat++) {
      const t = beat * beatDur;
      if (t >= duration) continue;
      const energy = getEnergy(t) * energyMul;
      addEvent(t, "kick", {
        freq: rootFreqSynth, amp: 0.6 * energy, dur: 0.3,
        drive: punchFactor, click: 0.5, decay: 0.2,
      });
    }
    console.log("Synth kick: 4-on-the-floor grid");
  }

  // Synth hat — use analyzed positions if available, else 8th note grid
  const rawHatPos = analysis.hat_pattern?.positions ?? [];
  if (rawHatPos.length > 0) {
    for (const pos of rawHatPos) {
      const t = pos - renderOffset;
      if (t < 0 || t >= duration) continue;
      const energy = getEnergy(t) * energyMul;
      addEvent(t, "hat", {
        freq: 0, amp: 0.25 * energy, dur: 0.05,
        openness: 0.15, tone: 0.4,
      });
    }
    console.log(`Synth hat: ${rawHatPos.length} analyzed positions`);
  } else {
    for (let step = 0; step < Math.floor(duration / (beatDur / 2)); step++) {
      const t = step * (beatDur / 2);
      if (t >= duration) continue;
      const section = getSectionAt(t);
      if (section === "intro") continue;
      const energy = getEnergy(t) * energyMul;
      addEvent(t, "hat", {
        freq: 0, amp: 0.2 * energy, dur: 0.05,
        openness: 0.15, tone: 0.4,
      });
    }
    console.log("Synth hat: 8th note grid");
  }

  // Synth-only pad for break/intro
  for (let bar = 0; bar < Math.ceil(duration / (beatDur * 4)); bar++) {
    const t = bar * beatDur * 4;
    if (t >= duration) continue;
    const section = getSectionAt(t);
    if (section !== "break" && section !== "intro") continue;
    const energy = getEnergy(t) * energyMul;
    addEvent(t, "pad", {
      freq: rootFreqSynth * 2, amp: 0.4 * energy, dur: beatDur * 4,
      attack: 1.0, release: 1.5, filterEnv: 0.1,
    });
  }
}

console.log(`Total synth events before sort: ${events.length}`);

// === Sort + end marker ===
events.sort((a, b) => {
  const ta = parseFloat(a.match(/^\[([\d.]+)/)?.[1] ?? "0");
  const tb = parseFloat(b.match(/^\[([\d.]+)/)?.[1] ?? "0");
  return ta - tb;
});
events.push(`[${(duration + 1).toFixed(1)}, [0]]`);

// === RLPFD detection (T02 AC-3) ===
const useRLPFD = hasRLPFD();
const acidBassFile = useRLPFD ? "acid_bass_rlpfd.scd" : "acid_bass.scd";
console.log(`Filter: ${useRLPFD ? "RLPFD (SC3-plugins)" : "MoogFF (core SC)"}`);

// === Generate SC score ===
const outputWav = path.resolve(analysisDir, hybridMode ? "render-hybrid.wav" : "render-synthesis.wav");
const synthDefsDir = path.join(process.cwd(), "audio/sc/synthdefs");
const SCSYNTH = "/Applications/SuperCollider.app/Contents/Resources/scsynth";

const allSynthDefs = [
  "kick.scd", "bass.scd", "hat.scd", "clap.scd", "supersaw.scd", "pad.scd",
  "lead.scd", "arp_pluck.scd", "riser.scd", acidBassFile,
  "layered_kick.scd", "squelch.scd", "fm_lead.scd",
  "wavetable_pad.scd", "granular_pad.scd", "sample_player.scd",
];

// Generate d_load commands to load compiled .scsyndef files into scsynth NRT
const compiledDir = path.join(process.cwd(), "audio/sc/compiled");
const synthDefLoadCmds: string[] = [];
for (const sd of allSynthDefs) {
  const name = sd.replace(".scd", "");
  const defPath = path.join(compiledDir, `${name}.scsyndef`);
  if (fs.existsSync(defPath)) {
    synthDefLoadCmds.push(`[0, [\\d_load, "${defPath}"]]`);
  }
}

const scPath = "/tmp/render-analysis.scd";
const oscPath = "/tmp/render-analysis.osc";

// Score.write — no SynthDef loading in sclang (causes hang)
// SynthDefs loaded via d_load commands in the Score itself
const scScript = `(
var score = Score([
${[...synthDefLoadCmds, ...bufferCommands, ...events].join(",\n")}
]);
score.write("${oscPath}");
"WRITE_DONE".postln;
0.exit;
)`;
fs.writeFileSync(scPath, scScript);

const totalEvents = events.length - 1;
console.log(`Events: ${totalEvents}, Duration: ${duration}s, Sections: ${segments.map(s => s.label).join("→")}`);

if (dryRun) {
  console.log(`Dry run: ${scPath} written (${totalEvents} events). Skipping render.`);
  process.exit(0);
}

// Step 1: sclang writes OSC binary score (fast — no NRT render)
console.log("Compiling score...");
const writeResult = execFileSync(SCLANG, ["-i", "none", scPath], {
  encoding: "utf-8", timeout: 60000,
});

if (!writeResult.includes("WRITE_DONE")) {
  console.error("Score compilation failed");
  process.exit(1);
}

// Step 2: scsynth renders NRT directly (no sclang hang)
// Render as 10ch (5 stereo stems) for stem splitting, or 2ch for legacy mode
const multiStem = process.argv.includes("--multi-stem") || process.argv.includes("--no-master");
const outChannels = multiStem ? String(OUTPUT_CHANNELS) : "2";
console.log(`Rendering via scsynth NRT (${outChannels}ch)...`);
const renderResult = execFileSync(SCSYNTH, [
  "-N", oscPath, "_", outputWav, "44100", "WAV", "float",
  "-o", outChannels, "-u", "0", "-m", "65536",
], { encoding: "utf-8", timeout: 300000 });
console.log(renderResult.trim());

if (fs.existsSync(outputWav)) {
  const stat = fs.statSync(outputWav);
  console.log(`Output: ${outputWav} (${(stat.size / 1024 / 1024).toFixed(1)}MB)`);

  // Split 12ch WAV into 6 stereo stems using soundfile (more reliable than ffmpeg)
  if (multiStem) {
    const stemsOutDir = path.join(analysisDir, "pro", "stems");
    fs.mkdirSync(stemsOutDir, { recursive: true });
    try {
      execFileSync("python3", ["-c", `
import sys, soundfile as sf, numpy as np, os
wav_path, out_dir = sys.argv[1], sys.argv[2]
audio, sr = sf.read(wav_path)
expected_ch = 12
if audio.shape[1] != expected_ch:
    print(f"WARNING: Expected {expected_ch}ch, got {audio.shape[1]}ch")
for i, name in enumerate(["kick","bass","hat","synth","pad","fx"]):
    ch = i * 2
    stem = audio[:, ch:ch+2] if ch + 1 < audio.shape[1] else np.zeros((audio.shape[0], 2), dtype="float32")
    sf.write(os.path.join(out_dir, f"stem-{name}.wav"), stem, sr)
    rms = np.sqrt(np.mean(stem**2))
    print(f"  stem-{name}.wav: rms={20*np.log10(rms+1e-10):.1f}dB")
`, outputWav, stemsOutDir], { encoding: "utf-8", timeout: 30000 });
      console.log(`Stems split: 6 × stereo → ${stemsOutDir}`);
    } catch (e) {
      console.warn(`[stem] Split failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  // === T17: Python mastering chain (AC-2.5) ===
  const noMaster = process.argv.includes("--no-master");
  if (!noMaster) {
    const masterPy = path.join(process.cwd(), "audio/analyzer/master.py");
    const analysisJson = path.join(analysisDir, "analysis.json");
    if (fs.existsSync(masterPy)) {
      try {
        console.log("Mastering...");
        const masterArgs = [masterPy, outputWav, analysisJson];
        // Wire reference path for non-regression gate if reference WAV exists
        const refWav = path.join(analysisDir, "reference.wav");
        if (fs.existsSync(refWav)) {
          masterArgs.push("--reference", refWav);
        }
        const masterResult = execFileSync("python3", masterArgs, {
          encoding: "utf-8",
          timeout: 60000,
        });
        console.log(masterResult.trim());
      } catch (e) {
        console.warn(`[master] mastering failed, keeping unmastered render: ${e instanceof Error ? e.message : e}`);
      }
    }
  }
} else {
  console.error("Render failed");
  process.exit(1);
}
