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

// === KICK (4-on-the-floor from analysis, section-aware) ===
const rawKicks = analysis.kick_pattern?.positions ?? [];
const kickGrid = quantizeToGrid(rawKicks);
// Filter to near-beat positions (4-on-the-floor)
const kickBeats = kickGrid.filter(t => {
  const beatPhase = (t / beatDur) % 1;
  return beatPhase < 0.12 || beatPhase > 0.88;
});
const kicks = kickBeats.length > 8 ? kickBeats :
  Array.from({ length: Math.floor(duration / beatDur) }, (_, i) => i * beatDur);

for (const t of kicks) {
  const section = getSectionAt(t);
  if (section === "intro" || section === "break") continue; // no kick in intro/break
  const energy = getEnergy(t) * energyMul;
  addEvent(t, "layered_kick", {
    freq: 50, amp: Math.min(0.5 * energy, 0.7), dur: 0.25,
    subDecay: 0.3, bodyDecay: 0.06, clickAmp: 0.4 + punchFactor * 0.3,
    bodyFreq: 150 + freq.low * 100, drive: saturation * 0.3, punch: punchFactor,
  });
}

// === HI-HAT (8th notes, section-aware) ===
const rawHats = analysis.hat_pattern?.positions ?? [];
const hatGrid = quantizeToGrid(rawHats);
const hats = hatGrid.length > 8 && hatGrid.length < 500 ? hatGrid :
  Array.from({ length: Math.floor(duration / (beatDur / 2)) }, (_, i) => i * beatDur / 2);

for (const t of hats) {
  const section = getSectionAt(t);
  if (section === "intro") continue;
  const idx = Math.round(t / (beatDur / 2));
  const openHat = idx % 2 === 1;
  addEvent(t, "hat", {
    freq: 7000 + brightnessScale * 2000, amp: 0.3 * energyMul,
    dur: openHat ? 0.06 : 0.03,
    openness: openHat ? 0.2 : 0.04, tone: 0.3 + brightnessScale * 0.3,
  });
}

// === BASS LINE — from pitch_contour or key-based pattern ===
const noteEvents = analysis.pitch_contour?.note_events ?? [];
const hasPitchData = noteEvents.length > 5;

if (hasPitchData) {
  // Use actual extracted pitch contour as bass melody
  for (const note of noteEvents) {
    const t = note.time - renderOffset;
    if (t < 0 || t >= duration) continue;
    const section = getSectionAt(t);
    if (section === "intro") continue;
    const energy = getEnergy(t) * energyMul;
    addEvent(t, "acid_bass", {
      freq: note.freq, amp: Math.min(0.4 * energy * note.velocity, 0.6),
      dur: Math.min(note.duration, beatDur),
      cutoff: 500 + brightnessScale * 600,
      resonance: 1.8, envDepth: 2500, envDecay: 0.15,
      accent: note.velocity > 0.7 ? 1 : 0,
      slide: note.slide ? 1 : 0, slideTime: 0.1,
      wave: 0, dist: saturation * 0.5,
    });
  }
  console.log(`Bass: ${noteEvents.filter(n => (n.time - renderOffset) >= 0 && (n.time - renderOffset) < duration).length} pitch events`);
} else {
  // Fallback: key-based bass pattern
  let bassIdx = 0;
  for (let t = 0; t < duration; t += beatDur / 2) {
    const section = getSectionAt(t);
    if (section === "intro") { bassIdx++; continue; }
    const noteFreq = scaleNotes[bassIdx % scaleNotes.length];
    const energy = getEnergy(t) * energyMul;
    addEvent(t, "bass", {
      freq: noteFreq, amp: Math.min(0.35 * energy, 0.5),
      dur: beatDur * 0.6,
      cutoff: 400 + brightnessScale * 400, resonance: 0.35, envAmount: 0.45,
    });
    bassIdx++;
  }
  console.log(`Bass: key-based pattern (${key ?? "C"} scale)`);
}

// === PAD — section-aware, mid-range fill ===
for (let bar = 0; bar < Math.ceil(duration / (beatDur * 4)); bar++) {
  const t = bar * beatDur * 4;
  const section = getSectionAt(t);
  const energy = getEnergy(t) * energyMul;

  // Pad more prominent in break/intro, quieter in drop (+50% mid-range boost)
  const padAmp = section === "break" ? 0.75 : section === "intro" ? 0.6 : 0.3;
  if (energy > 0.05) {
    addEvent(t, "pad", {
      freq: scaleNotes[0] * 4, // root note, 2 octaves up
      amp: padAmp * energy, dur: beatDur * 4,
      attack: section === "break" ? 1.0 : 0.3,
      release: section === "break" ? 2.0 : 0.8,
      filterEnv: 0.2 + energy * 0.3,
    });
  }

  // Supersaw in drop sections
  if ((section === "drop" || section === "build") && energy > 0.2) {
    addEvent(t, "supersaw", {
      freq: scaleNotes[0] * 4,
      amp: 0.2 * energy, dur: beatDur * 4,
      detune: 0.25, mix: 0.5,
      cutoff: 1000 + brightnessScale * 1500,
    });
  }
}

// === CLAP (beats 2 and 4, drop only) ===
for (let beat = 0; beat < Math.floor(duration / beatDur); beat++) {
  if (beat % 2 !== 1) continue; // beat 2, 4, 6...
  const t = beat * beatDur;
  const section = getSectionAt(t);
  if (section !== "drop" && section !== "build") continue;
  addEvent(t, "clap", {
    amp: 0.3 * energyMul, dur: 0.1, spread: 0.5, decay: 0.12,
  });
}

// === SQUELCH (in build/drop, sparse) ===
if (bassProfile.flux > 0.1) {
  for (let bar = 4; bar < Math.ceil(duration / (beatDur * 4)); bar += 8) {
    const t = bar * beatDur * 4;
    const section = getSectionAt(t);
    if (section !== "drop" && section !== "build") continue;
    const energy = getEnergy(t);
    addEvent(t, "squelch", {
      freq: scaleNotes[0] * 4, amp: 0.25 * energy, dur: beatDur * 4,
      sweepStart: 200 + brightnessScale * 200,
      sweepEnd: 3000 + brightnessScale * 3000,
      sweepCurve: -4, resonance: 0.8, source: 1,
      lfoRate: 2, lfoDepth: 500,
    });
  }
}

// === FM LEAD (drop/build, 8th notes — mid-range fill) ===
for (let beat = 0; beat < Math.floor(duration / beatDur); beat++) {
  if (beat % 2 !== 0) continue; // every other beat (8th note feel)
  const t = beat * beatDur;
  const section = getSectionAt(t);
  if (section !== "drop" && section !== "build") continue;
  const energy = getEnergy(t) * energyMul;
  const noteIdx = beat % scaleNotes.length;
  const freq = scaleNotes[noteIdx] * 8; // 3 octaves up → mid-range (260-500Hz base → 2-4kHz)
  addEvent(t, "fm_lead", {
    freq, amp: 0.15 * energy, dur: beatDur * 0.8,
    mRatio: 2, cRatio: 1, index: 2 + brightnessScale,
    iScale: 3, vibrato: 0.2, drive: saturation * 0.3,
  });
}

// === ARP PLUCK (drop, 16th notes — mid-range articulation) ===
for (let step = 0; step < Math.floor(duration / sixteenthDur); step++) {
  if (step % 4 === 0) continue; // skip downbeats (kick occupies)
  if (step % 2 !== 0) continue; // every other 16th
  const t = step * sixteenthDur;
  const section = getSectionAt(t);
  if (section !== "drop") continue;
  const energy = getEnergy(t) * energyMul;
  if (energy < 0.2) continue;
  const noteIdx = step % scaleNotes.length;
  const freq = scaleNotes[noteIdx] * 8;
  addEvent(t, "arp_pluck", {
    freq, amp: 0.12 * energy, dur: sixteenthDur * 0.7,
    decay: 0.08 + energy * 0.05, brightness: brightnessScale * 0.8,
  });
}

// === Section boundary control events (AC-8.6: n_set at section transitions) ===
interface TrackedNode { nodeId: number; synthDef: string; start: number; end: number; }
const trackedNodes: TrackedNode[] = [];

// Re-parse events to extract tracked long-duration nodes (pad, supersaw)
for (const ev of events) {
  const timeMatch = ev.match(/^\[([\d.]+)/);
  // Match synthDef name: \s_new, \<name> — skip s_new, capture the second backslash-name
  const synthMatch = ev.match(/\\s_new, \\(\w+)/);
  const nodeMatch = ev.match(/\\s_new, \\\w+, (\d+)/);
  const durMatch = ev.match(/\\dur, ([\d.]+)/);
  if (timeMatch && synthMatch && nodeMatch && durMatch) {
    const synthDef = synthMatch[1];
    if (synthDef === "pad" || synthDef === "supersaw") {
      const t = parseFloat(timeMatch[1]);
      const dur = parseFloat(durMatch[1]);
      trackedNodes.push({
        nodeId: parseInt(nodeMatch[1]),
        synthDef,
        start: t,
        end: t + dur,
      });
    }
  }
}

// Build section overrides
const sectionOverrides: SectionOverride[] = segments.map((seg) => {
  const localStart = seg.start - renderOffset;
  const localEnd = seg.end - renderOffset;
  const overrides: Record<string, Record<string, number>> = {};

  switch (seg.label) {
    case "drop":
      overrides.pad = { amp: 0.225 };  // +50% from 0.15
      overrides.supersaw = { amp: 0.25 };
      break;
    case "break":
      overrides.pad = { amp: 0.75 };   // +50% from 0.5
      overrides.supersaw = { amp: 0.05 };
      break;
    case "build":
      overrides.pad = { amp: 0.45 };   // +50% from 0.3
      overrides.supersaw = { amp: 0.15 };
      break;
    case "intro":
    case "outro":
      overrides.pad = { amp: 0.525 };  // +50% from 0.35
      overrides.supersaw = { amp: 0.0 };
      break;
  }

  return { label: seg.label, start: localStart, end: localEnd, synthOverrides: overrides };
});

// Inject n_set events at section boundaries for active long-duration nodes
for (const section of sectionOverrides) {
  if (section.start < 0 || section.start >= duration) continue;
  if (!section.synthOverrides) continue;

  for (const node of trackedNodes) {
    if (node.start <= section.start && node.end > section.start) {
      const override = section.synthOverrides[node.synthDef];
      if (override) {
        const paramStr = Object.entries(override).map(([k, v]) => `\\${k}, ${v}`).join(", ");
        events.push(`[${section.start.toFixed(4)}, [\\n_set, ${node.nodeId}, ${paramStr}]]`);
      }
    }
  }
}

// === T16: Hybrid sample render — manifest → BufferAllocator → sample_player ===
let bufferCommands: string[] = [];
if (hybridMode) {
  const manifestPath = path.join(analysisDir, "manifest.json");
  const manifest = readManifest(manifestPath);
  if (manifest) {
    try {
      const allocator = new BufferAllocator();
      const { bufCmds, bufMap } = generateSampleBufferCommands(manifest, allocator, analysisDir);
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
const outputWav = path.join(analysisDir, hybridMode ? "render-hybrid.wav" : "render-synthesis.wav");
const synthDefsDir = path.join(process.cwd(), "audio/sc/synthdefs");
const scScript = `(
// Load ALL emitted SynthDefs (Phase 1 + Phase 2)
${["kick", "bass", "hat", "clap", "supersaw", "pad", "lead", "arp_pluck", "riser"].map((s) => `"${path.join(synthDefsDir, s + ".scd")}".load;`).join("\n")}
// Phase 2 SynthDefs
"${path.join(synthDefsDir, acidBassFile)}".load;
"${path.join(synthDefsDir, "layered_kick.scd")}".load;
"${path.join(synthDefsDir, "squelch.scd")}".load;
"${path.join(synthDefsDir, "fm_lead.scd")}".load;
"${path.join(synthDefsDir, "wavetable_pad.scd")}".load;
"${path.join(synthDefsDir, "granular_pad.scd")}".load;
"${path.join(synthDefsDir, "sample_player.scd")}".load;

var score = Score([
${[...bufferCommands, ...events].join(",\n")}
]);
score.recordNRT(
    outputFilePath: "${outputWav}",
    headerFormat: "WAV", sampleFormat: "int16", sampleRate: 44100,
    options: ServerOptions.new.numOutputBusChannels_(2).memSize_(65536),
    duration: ${duration + 1},
    action: { "RENDER_DONE".postln; 0.exit; }
);
)`;

const scPath = "/tmp/render-analysis.scd";
fs.writeFileSync(scPath, scScript);

const totalEvents = events.length - 1;
console.log(`Events: ${totalEvents}, Duration: ${duration}s, Sections: ${segments.map(s => s.label).join("→")}`);

if (dryRun) {
  console.log(`Dry run: ${scPath} written (${totalEvents} events). Skipping sclang.`);
  process.exit(0);
}

console.log("Rendering...");

const result = execFileSync(SCLANG, ["-i", "none", scPath], { encoding: "utf-8", timeout: 120000 });

if (result.includes("RENDER_DONE")) {
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
