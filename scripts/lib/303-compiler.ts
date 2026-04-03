import { z } from "zod";
import {
  buildReferenceAbstraction,
  referenceAbstractionSchema,
  type AnalysisInput,
  type ReferenceAbstraction,
} from "./reference-abstraction.js";

const voiceRoleSchema = z.enum(["bass", "riff", "pseudo_hat", "fx"]);

const compositionEventSchema = z.object({
  time: z.number().min(0),
  duration: z.number().min(0),
  note_midi: z.number().int().nullable(),
  freq: z.number().positive().nullable(),
  articulation: z.string(),
  velocity: z.number().min(0).max(1),
  slide: z.boolean(),
  source_role: z.string(),
  source_strategy: z.string(),
  fallback_used: z.string().nullable(),
});

const voiceSchema = z.object({
  role: voiceRoleSchema,
  events: z.array(compositionEventSchema),
});

export const compositionIrSchema = z.object({
  version: z.literal(1),
  mode: z.literal("303_only"),
  seed: z.number().int(),
  bpm: z.number().positive(),
  root_midi: z.number().int(),
  voices: z.array(voiceSchema).length(4),
  automation: z.object({
    master_energy: z.array(z.number().min(0).max(1)),
    filter_open: z.array(z.number().min(0).max(1)),
    density: z.array(z.number().min(0).max(1)),
  }),
  fallbacks: z.object({
    root: z.string().nullable(),
    bass: z.string().nullable(),
    riff: z.string().nullable(),
    top: z.string().nullable(),
    fx: z.string().nullable(),
  }),
});

export type CompositionIR = z.infer<typeof compositionIrSchema>;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const freqToMidi = (freq: number): number => Math.round(69 + 12 * Math.log2(freq / 440));

const hashSeed = (text: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
};

const makeRng = (seed: number) => {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1_000_000) / 1_000_000;
  };
};

const thinEvents = <T>(events: T[], maxCount: number): T[] => {
  if (events.length <= maxCount) return events;
  const out: T[] = [];
  for (let i = 0; i < maxCount; i++) {
    const idx = Math.floor((i * events.length) / maxCount);
    out.push(events[idx]);
  }
  return out;
};

const buildBassVoice = (abstraction: ReferenceAbstraction) => {
  const fallbackUsed = abstraction.fallbacks.bass;
  return {
    role: "bass" as const,
    events: thinEvents(abstraction.roles.bass.note_events, 64).map((event) => ({
      time: event.time,
      duration: event.duration,
      note_midi: freqToMidi(event.freq),
      freq: event.freq,
      articulation: event.slide ? "slide" : event.velocity > 0.78 ? "accent" : event.duration > 0.45 ? "long" : "normal",
      velocity: clamp01(event.velocity),
      slide: event.slide,
      source_role: "bass",
      source_strategy: abstraction.roles.bass.strategy,
      fallback_used: fallbackUsed,
    })),
  };
};

const buildRiffVoice = (abstraction: ReferenceAbstraction, rng: () => number) => {
  const fallbackUsed = abstraction.fallbacks.riff;
  return {
    role: "riff" as const,
    events: thinEvents(abstraction.roles.riff.note_events, 48).map((event) => ({
      time: event.time,
      duration: Number(Math.max(event.duration * 0.8, 0.08).toFixed(3)),
      note_midi: freqToMidi(event.freq),
      freq: event.freq,
      articulation: rng() > 0.6 ? "squelch" : event.velocity > 0.7 ? "accent" : "stab",
      velocity: clamp01(event.velocity),
      slide: event.slide,
      source_role: "riff",
      source_strategy: abstraction.roles.riff.strategy,
      fallback_used: fallbackUsed,
    })),
  };
};

const buildTopVoice = (abstraction: ReferenceAbstraction, rng: () => number) => {
  const fallbackUsed = abstraction.fallbacks.top;
  return {
    role: "pseudo_hat" as const,
    events: thinEvents(abstraction.roles.top.positions, 128).map((time) => ({
      time,
      duration: 0.08,
      note_midi: null,
      freq: null,
      articulation: rng() > 0.5 ? "chirp" : "hat",
      velocity: 0.55,
      slide: false,
      source_role: "top",
      source_strategy: abstraction.roles.top.strategy,
      fallback_used: fallbackUsed,
    })),
  };
};

const buildFxVoice = (abstraction: ReferenceAbstraction) => {
  return {
    role: "fx" as const,
    events: abstraction.roles.fx.transition_times.map((time, index) => ({
      time,
      duration: 0.8,
      note_midi: abstraction.root.midi + 24 + (index % 2 === 0 ? 0 : 12),
      freq: 440 * (2 ** (((abstraction.root.midi + 24 + (index % 2 === 0 ? 0 : 12)) - 69) / 12)),
      articulation: index % 2 === 0 ? "sweep" : "zap",
      velocity: 0.65,
      slide: false,
      source_role: "fx",
      source_strategy: abstraction.roles.fx.strategy,
      fallback_used: abstraction.fallbacks.fx,
    })),
  };
};

export const compile303CompositionIR = (
  rawAbstraction: ReferenceAbstraction,
  options: { seed?: number } = {},
): CompositionIR => {
  const abstraction = referenceAbstractionSchema.parse(rawAbstraction);
  const seed = options.seed ?? hashSeed(`${abstraction.source}:${abstraction.bpm.value}:${abstraction.root.value}:${abstraction.root.mode}`);
  const rng = makeRng(seed);

  return compositionIrSchema.parse({
    version: 1,
    mode: "303_only",
    seed,
    bpm: abstraction.bpm.value,
    root_midi: abstraction.root.midi,
    voices: [
      buildBassVoice(abstraction),
      buildRiffVoice(abstraction, rng),
      buildTopVoice(abstraction, rng),
      buildFxVoice(abstraction),
    ],
    automation: {
      master_energy: abstraction.macro.energy_curve,
      filter_open: abstraction.macro.cutoff_curve,
      density: abstraction.macro.density_curve,
    },
    fallbacks: abstraction.fallbacks,
  });
};

export const buildReferenceAbstractionAndIR = (
  analysis: AnalysisInput,
  source: string,
  options: { seed?: number } = {},
) => {
  const abstraction = buildReferenceAbstraction(analysis, source);
  return {
    abstraction,
    ir: compile303CompositionIR(abstraction, options),
  };
};
