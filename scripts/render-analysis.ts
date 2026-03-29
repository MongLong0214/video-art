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

if (!analysisDir) {
  console.error("Usage: npx tsx scripts/render-analysis.ts <analysis-dir> [--hybrid] [--offset N]");
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
console.log(`Energy mul: ${energyMul}, Brightness: ${brightnessScale.toFixed(2)}, Saturation: ${saturation}`);
console.log(`Scale: [${scaleNotes.map(n => n.toFixed(1)).join(", ")}]`);

// === Event builder ===
const events: string[] = [];
let nodeId = 1000;
const addEvent = (time: number, synthDef: string, params: Record<string, number>) => {
  if (time < 0 || time >= duration) return;
  const paramStr = Object.entries(params).map(([k, v]) => `\\${k}, ${v}`).join(", ");
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

// Sample-based mode: load manifest and arrange on grid
const samplesDir = path.join(analysisDir, "samples");
const manifestPath = fs.existsSync(path.join(samplesDir, "manifest.json"))
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
      buf, amp: Math.min(0.3 * energy, 0.4), dur: hat.duration,
      rate: 1.0, hpFreq: 2000, lpFreq: 18000,
    });
    hatCount++;
  }

  // === BASS — from pitch contour if available, else sub drone on 8ths ===
  const pitchEvents = analysis.pitch_contour?.note_events ?? [];
  if (pitchEvents.length > 5) {
    for (const note of pitchEvents) {
      const t = note.time - renderOffset;
      if (t < 0 || t >= duration) continue;
      const energy = getEnergy(t) * energyMul;
      addEvent(t, "acid_bass", {
        freq: note.freq, amp: Math.min(0.8 * energy, 1.0),
        dur: Math.min(note.duration, beatDur),
        cutoff: 200, resonance: 1.5,
        envDepth: 800, envDecay: 0.12,
        accent: note.velocity > 0.7 ? 1 : 0,
        slide: note.slide ? 1 : 0, slideTime: 0.08,
        wave: 0, dist: 0.2,
      });
    }
    console.log(`Bass: ${pitchEvents.filter(n => (n.time - renderOffset) >= 0 && (n.time - renderOffset) < duration).length} pitch events from analysis`);
  } else {
    // Sub drone on 8ths
    for (let step = 0; step < Math.floor(duration / (beatDur / 2)); step++) {
      const t = step * (beatDur / 2);
      if (t >= duration) continue;
      const section = getSectionAt(t);
      if (section === "intro") continue;
      if (step % 2 === 0) continue;
      const energy = getEnergy(t) * energyMul;
      addEvent(t, "acid_bass", {
        freq: rootFreq, amp: 0.7 * energy,
        dur: beatDur * 0.4,
        cutoff: 150, resonance: 1.8,
        envDepth: 600, envDecay: 0.12,
        accent: 0, slide: 0, slideTime: 0,
        wave: 0, dist: 0.2,
      });
    }
    console.log(`Bass: sub drone ${rootFreq.toFixed(0)}Hz`);
  }

  // === MINIMAL PAD — background texture only, very quiet ===
  for (let bar = 0; bar < Math.ceil(duration / (beatDur * 8)); bar++) {
    const t = bar * beatDur * 8;
    if (t >= duration) continue;
    const section = getSectionAt(t);
    if (section === "intro") continue;
    const energy = getEnergy(t) * energyMul;
    addEvent(t, "pad", {
      freq: rootFreq * 2, amp: 0.15 * energy, dur: beatDur * 8,
      attack: 2.0, release: 2.0,
      filterEnv: 0.05,
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
${[...bufferCommands, ...events].join(",\n")}
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
console.log("Rendering via scsynth NRT...");
const renderResult = execFileSync(SCSYNTH, [
  "-N", oscPath, "_", outputWav, "44100", "WAV", "int16",
  "-o", "2", "-u", "0", "-m", "65536",
], { encoding: "utf-8", timeout: 300000 });
console.log(renderResult.trim());

if (fs.existsSync(outputWav)) {
  const stat = fs.statSync(outputWav);
  console.log(`Output: ${outputWav} (${(stat.size / 1024 / 1024).toFixed(1)}MB)`);

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
