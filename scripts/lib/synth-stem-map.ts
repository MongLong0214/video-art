// SynthDef → stem mapping + parameter alias normalization
// B-PROD: custom 9 SynthDefs only. Dirt-Samples = skip.

export interface StemMapping {
  synthDef: string;
  stem: string;
  bus: number;
}

export const SYNTH_STEM_MAP: Record<string, StemMapping> = {
  kick: { synthDef: "kick", stem: "drums", bus: 0 },
  hat: { synthDef: "hat", stem: "drums", bus: 0 },
  clap: { synthDef: "clap", stem: "drums", bus: 0 },
  bass: { synthDef: "bass", stem: "bass", bus: 2 },
  supersaw: { synthDef: "supersaw", stem: "synth", bus: 4 },
  pad: { synthDef: "pad", stem: "synth", bus: 4 },
  lead: { synthDef: "lead", stem: "synth", bus: 4 },
  arp_pluck: { synthDef: "arp_pluck", stem: "synth", bus: 4 },
  riser: { synthDef: "riser", stem: "fx", bus: 6 },
};

export const SUPPORTED_SYNTHDEFS = new Set(Object.keys(SYNTH_STEM_MAP));

// SuperDirt parameter aliases — normalize to internal names
export const PARAM_ALIASES: Record<string, string> = {
  gain: "amp",
  note: "midinote",
  lpf: "cutoff",
  hpf: "hcutoff",
};

// FX parameters that should be preserved in NRT events
export const FX_PARAMS = new Set([
  "compress", "threshold", "ratio", "compAttack", "compRelease",
  "saturate", "drive",
  "loGain", "midGain", "hiGain", "loFreq", "hiFreq",
  "sideGain", "sideRelease",
  "room", "size", "dry", "delaytime", "delayfeedback",
]);

// Parameters to skip (Tidal context — captured for reference only, not used in NRT)
export const TIDAL_CONTEXT_PARAMS = new Set(["cps", "cycle", "delta"]);

// Dirt-Samples → stem mapping (NRT Buffer.read playback)
export const DIRT_SAMPLE_STEMS: Record<string, string> = {
  bd: "drums", sd: "drums", hh: "drums", cp: "drums",
  cb: "drums", mt: "drums", ht: "drums", lt: "drums",
  oh: "drums", ch: "drums", cr: "drums", rd: "drums",
  sn: "drums", rim: "drums", tom: "drums",
};

export const isSampleEvent = (s: string): boolean =>
  s in DIRT_SAMPLE_STEMS;

export const mapSynthDef = (s: string): StemMapping | null => {
  return SYNTH_STEM_MAP[s] ?? null;
};

export const mapDirtSample = (s: string): StemMapping | null => {
  const stem = DIRT_SAMPLE_STEMS[s];
  if (!stem) return null;
  const bus = stem === "drums" ? 0 : stem === "bass" ? 2 : stem === "synth" ? 4 : 6;
  return { synthDef: s, stem, bus };
};

export const normalizeParams = (
  params: Record<string, unknown>,
): { normalized: Record<string, unknown>; warnings: string[] } => {
  const normalized: Record<string, unknown> = {};
  const warnings: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (key === "s" || key === "ts") continue;

    const resolvedKey = PARAM_ALIASES[key] ?? key;

    if (TIDAL_CONTEXT_PARAMS.has(key)) {
      // preserve but mark as context-only
      normalized[resolvedKey] = value;
      continue;
    }

    if (
      resolvedKey !== key &&
      !FX_PARAMS.has(resolvedKey) &&
      !["n", "orbit", "amp", "midinote", "freq", "dur", "pan", "speed", "out",
        "cutoff", "resonance", "detune", "width", "click", "decay",
        "begin", "end", "hcutoff",
        "openness", "tone", "filterEnv", "vibrato", "portamento",
        "brightness", "sweepRange", "noiseAmount", "envAmount", "mix", "spread",
        "attack", "release"].includes(resolvedKey)
    ) {
      warnings.push(`${key}: unknown alias → ${resolvedKey}`);
    }

    normalized[resolvedKey] = value;
  }

  return { normalized, warnings };
};
