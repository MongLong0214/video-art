import type { InterpretationResult } from "./schemas.ts";

const SCALE_NOTES: Record<string, number[]> = {
  "G_minor": [7, 9, 10, 0, 2, 3, 5],   // G A Bb C D Eb F
  "C_minor": [0, 2, 3, 5, 7, 8, 10],
  "A_minor": [9, 11, 0, 2, 4, 5, 7],
  "D_minor": [2, 4, 5, 7, 9, 10, 0],
  "E_minor": [4, 6, 7, 9, 11, 0, 2],
  "F_minor": [5, 7, 8, 10, 0, 1, 3],
  "Bb_minor": [10, 0, 1, 3, 5, 6, 8],
};

const closestScaleNote = (midi: number, scaleKey: string): number => {
  const scale = SCALE_NOTES[scaleKey];
  if (!scale) return midi;

  const pc = midi % 12;
  let closest = scale[0];
  let minDist = 12;
  for (const note of scale) {
    const dist = Math.min(Math.abs(pc - note), 12 - Math.abs(pc - note));
    if (dist < minDist) {
      minDist = dist;
      closest = note;
    }
  }
  return midi - pc + closest + (closest > pc + 6 ? -12 : closest < pc - 6 ? 12 : 0);
};

const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

export const normalize = (
  raw: InterpretationResult,
): { normalized: InterpretationResult; warnings: string[] } => {
  const warnings: string[] = [];
  const bpm = raw.bpm;
  const gridSize = 15 / bpm; // 16th note
  const scaleKey = `${raw.key.root}_${raw.key.mode}`;
  const duration = raw.duration;
  const barsNeeded = Math.ceil(duration / (4 * 60 / bpm));

  const normalizeEvents = (events: InterpretationResult["tracks"]["bass_303"]["events"]) => {
    return events.map((e) => {
      const quantizedTime = Math.round(e.time / gridSize) * gridSize;
      const clampedMidi = closestScaleNote(e.note_midi, scaleKey);
      return {
        ...e,
        time: Number(quantizedTime.toFixed(4)),
        note_midi: clampedMidi,
        duration: clamp(e.duration, 0.01, 2),
        velocity: clamp(e.velocity, 0, 1),
        cutoff: clamp(e.cutoff, 100, 5000),
        resonance: clamp(e.resonance, 0, 1),
        envMod: clamp(e.envMod, 0, 1),
        decay: clamp(e.decay, 0.01, 2),
        waveform: e.waveform === 1 ? 1 : 0,
      };
    });
  };

  const normalized: InterpretationResult = {
    ...raw,
    tracks: {
      ...raw.tracks,
      bass_303: { events: normalizeEvents(raw.tracks.bass_303.events) },
      riff_303: { events: normalizeEvents(raw.tracks.riff_303.events) },
      kick_909: padPattern(raw.tracks.kick_909, 16),
      hat_909: {
        ...padPattern(raw.tracks.hat_909, 16),
        open_pattern: padArray(raw.tracks.hat_909.open_pattern, 16),
      },
      snare_909: padPattern(raw.tracks.snare_909, 16),
    },
    fx: {
      ...raw.fx,
      reverb_send: clamp(raw.fx.reverb_send, 0, 1),
      delay_send: clamp(raw.fx.delay_send, 0, 1),
      delay_time: clamp(raw.fx.delay_time, 0.05, 2),
    },
  };

  // Density check: drop sections should have enough events
  const eventsPerBar = normalized.tracks.bass_303.events.length / Math.max(barsNeeded, 1);
  if (eventsPerBar < 4) {
    warnings.push(`Low bass_303 density: ${eventsPerBar.toFixed(1)} events/bar (expected ≥4)`);
  }

  return { normalized, warnings };
};

const padPattern = <T extends { pattern: number[]; velocity: number[] }>(p: T, len: number): T => ({
  ...p,
  pattern: padArray(p.pattern, len),
  velocity: padArray(p.velocity, len),
});

const padArray = (arr: number[], len: number): number[] => {
  if (arr.length >= len) return arr.slice(0, len);
  const result = [...arr];
  while (result.length < len) {
    result.push(arr[result.length % arr.length] ?? 0);
  }
  return result;
};
