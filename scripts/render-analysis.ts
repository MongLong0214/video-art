/**
 * Analysis-driven NRT render — generates SC score from analysis.json + samples
 * Usage: npx tsx scripts/render-analysis.ts <analysis-dir> [--hybrid]
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";

const SCLANG = "/Applications/SuperCollider.app/Contents/MacOS/sclang";

interface AnalysisData {
  bpm: { value: number };
  kick_pattern?: { positions: number[] };
  hat_pattern?: { positions: number[] };
  bass_profile?: { type: string; flux: number };
  energy_curve?: number[];
  dynamic_range?: { crest: number; rms_mean: number };
  frequency_balance?: { low: number; mid: number; hi: number };
}

interface SampleHit {
  file: string;
  duration: number;
  onset_time: number;
}

interface Manifest {
  [type: string]: SampleHit[];
}

const analysisDir = process.argv[2];
const hybridMode = process.argv.includes("--hybrid");

if (!analysisDir) {
  console.error("Usage: npx tsx scripts/render-analysis.ts <analysis-dir> [--hybrid]");
  process.exit(1);
}

const analysis: AnalysisData = JSON.parse(
  fs.readFileSync(path.join(analysisDir, "analysis.json"), "utf-8"),
);

const bpm = analysis.bpm.value;
const beatDur = 60 / bpm;
const duration = 30; // render first 30 seconds

// High-res energy envelope from reference (23ms resolution)
const hiresPath = path.join(analysisDir, "energy-hires.json");
let hiresRms: number[] = [];
let hiresCentroid: number[] = [];
const hiresHop = 512;
const hiresSr = 22050;
if (fs.existsSync(hiresPath)) {
  const hires = JSON.parse(fs.readFileSync(hiresPath, "utf-8"));
  hiresRms = hires.rms;
  hiresCentroid = hires.centroid;
}

const getEnergy = (time: number): number => {
  if (hiresRms.length > 0) {
    const idx = Math.floor(time * hiresSr / hiresHop);
    return hiresRms[Math.min(idx, hiresRms.length - 1)] ?? 0.5;
  }
  const ec = analysis.energy_curve ?? Array(100).fill(0.5);
  const idx = Math.floor((time / 336) * ec.length);
  return ec[Math.min(idx, ec.length - 1)] ?? 0.5;
};

const getBrightness = (time: number): number => {
  if (hiresCentroid.length > 0) {
    const idx = Math.floor(time * hiresSr / hiresHop);
    return hiresCentroid[Math.min(idx, hiresCentroid.length - 1)] ?? 0.3;
  }
  return 0.3;
};

const spectralBrightness = (analysis.frequency_balance?.hi ?? 0.2) / 0.5;

// Build SC score events
const events: string[] = [];
let nodeId = 1000;

const addEvent = (time: number, synthDef: string, params: Record<string, number>) => {
  if (time < 0 || time >= duration) return;
  const paramStr = Object.entries(params)
    .map(([k, v]) => `\\${k}, ${v}`)
    .join(", ");
  events.push(`[${time.toFixed(4)}, [\\s_new, \\${synthDef}, ${nodeId++}, 0, 0, ${paramStr}]]`);
};

// === SYNTHESIS LAYER ===

// Kick — use actual analysis onset times, quantized to nearest 16th
const kickPositions = analysis.kick_pattern?.positions ?? [];
let kickCount = 0;
for (const t of kickPositions) {
  if (t >= duration) break;
  if (kickCount > 200) break;
  const energy = getEnergy(t);
  addEvent(t, "layered_kick", {
    freq: 50, amp: 0.85 * energy, dur: 0.3,
    subDecay: 0.4, bodyDecay: 0.1, clickAmp: 0.4,
    bodyFreq: 150, drive: 0.15 + energy * 0.2, punch: 0.5,
  });
  kickCount++;
}

// Hat — use actual analysis hat onsets
const hatPositions = analysis.hat_pattern?.positions ?? [];
let hatCount = 0;
for (const t of hatPositions) {
  if (t >= duration) break;
  if (hatCount > 400) break;
  const bright = getBrightness(t);
  addEvent(t, "hat", {
    freq: 7000 + bright * 4000, amp: 0.12 + bright * 0.15, dur: 0.03,
    openness: hatCount % 4 === 2 ? 0.2 : 0.04, tone: 0.3 + bright * 0.4,
  });
  hatCount++;
}

// Bass — acid bass at kick positions (every other kick)
const bassFlux = analysis.bass_profile?.flux ?? 0.2;
const isAcid = bassFlux > 0.3;
const bassNotes = [55, 55, 73.4, 55, 82.4, 55, 73.4, 82.4];
let bassIdx = 0;
for (let t = 0; t < duration; t += beatDur / 2) {
  const freq = bassNotes[bassIdx % bassNotes.length];
  const energy = getEnergy(t);
  if (isAcid) {
    addEvent(t, "acid_bass", {
      freq, amp: 0.75 * energy, dur: beatDur * 0.8,
      cutoff: 800 + energy * 1200, resonance: 2.2,
      envDepth: 4000, envDecay: 0.15,
      accent: bassIdx % 4 === 0 ? 1 : 0,
      slide: bassIdx % 8 === 2 ? 1 : 0, slideTime: 0.1,
      wave: 0, dist: 0.3,
    });
  } else {
    addEvent(t, "bass", {
      freq, amp: 0.75 * energy, dur: beatDur * 0.8,
      cutoff: 800, resonance: 0.45, envAmount: 0.55,
    });
  }
  bassIdx++;
}

// Supersaw pad — continuous, energy-gated
for (let bar = 0; bar < Math.ceil(duration / (beatDur * 4)); bar++) {
  const t = bar * beatDur * 4;
  const energy = getEnergy(t);
  if (energy > 0.3) {
    addEvent(t, "supersaw", {
      freq: 220, amp: 0.08 * energy, dur: beatDur * 4,
      detune: 0.2, mix: 0.3, cutoff: 1200 + energy * 800,
    });
  }
}

// Pad layer — continuous atmospheric fill matching energy
for (let t = 0; t < duration; t += beatDur * 2) {
  const energy = getEnergy(t);
  if (energy > 0.15) {
    addEvent(t, "pad", {
      freq: 110, amp: 0.15 * energy, dur: beatDur * 2,
      attack: 0.3, release: 0.5, filterEnv: 0.2 + energy * 0.3,
    });
  }
}

// Squelch — every 8 bars in high-energy sections
for (let t = beatDur * 16; t < duration; t += beatDur * 32) {
  const energy = getEnergy(t);
  if (energy > 0.5) {
    addEvent(t, "squelch", {
      freq: 220, amp: 0.3 * energy, dur: beatDur * 8,
      sweepStart: 300, sweepEnd: 5000, sweepCurve: -4,
      resonance: 0.85, source: 1, lfoRate: 2, lfoDepth: 800,
    });
  }
}

// === HYBRID LAYER (sample_player with extracted hits) ===
if (hybridMode) {
  const manifestPath = path.join(analysisDir, "samples", "manifest.json");
  if (fs.existsSync(manifestPath)) {
    const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

    // Schedule extracted kick samples at their original onset times
    const kickSamples = manifest.kick ?? [];
    for (const hit of kickSamples) {
      if (hit.onset_time >= duration) continue;
      addEvent(hit.onset_time, "sample_player", {
        buf: 100, // placeholder — real pipeline uses BufferAllocator
        amp: 0.5, dur: hit.duration, pan: 0,
        rate: 1.0, startPos: 0, attack: 0.005, release: 0.05,
        hpFreq: 20, lpFreq: 20000,
      });
    }

    // Bass samples at their onset times
    const bassSamples = manifest.bass ?? [];
    for (const hit of bassSamples) {
      if (hit.onset_time >= duration) continue;
      addEvent(hit.onset_time, "sample_player", {
        buf: 200, amp: 0.4, dur: hit.duration, pan: 0,
        rate: 1.0, startPos: 0, attack: 0.005, release: 0.05,
        hpFreq: 30, lpFreq: 8000,
      });
    }

    console.log(`Hybrid: ${kickSamples.filter(h => h.onset_time < duration).length} kick + ${bassSamples.filter(h => h.onset_time < duration).length} bass samples scheduled`);
  }
}

// Sort events by time and generate SC score
events.sort((a, b) => {
  const ta = parseFloat(a.match(/^\[([\d.]+)/)?.[1] ?? "0");
  const tb = parseFloat(b.match(/^\[([\d.]+)/)?.[1] ?? "0");
  return ta - tb;
});

// Add end marker
events.push(`[${(duration + 1).toFixed(1)}, [0]]`);

const scoreStr = `Score([
${events.join(",\n")}
])`;

// Generate SC script
const outputWav = path.join(analysisDir, hybridMode ? "render-hybrid.wav" : "render-synthesis.wav");
const scScript = `(
var score = ${scoreStr};
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

console.log(`Events: ${events.length - 1}, Duration: ${duration}s, Mode: ${hybridMode ? "hybrid" : "synthesis_only"}`);
console.log(`Kicks: ${kickCount}, Hats: ${hatCount}, Bass: ${bassIdx}`);
console.log("Rendering...");

const result = execFileSync(SCLANG, ["-i", "none", scPath], {
  encoding: "utf-8",
  timeout: 120000,
});

if (result.includes("RENDER_DONE")) {
  const stat = fs.statSync(outputWav);
  console.log(`Output: ${outputWav} (${(stat.size / 1024 / 1024).toFixed(1)}MB)`);
} else {
  console.error("Render may have failed:", result.slice(-200));
}
