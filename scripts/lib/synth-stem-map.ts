// SynthDef → stem mapping + parameter alias normalization
// B-PROD: custom 9 SynthDefs only. Dirt-Samples = skip.

export interface StemMapping {
  synthDef: string;
  stem: string;
  bus: number;
}

export const SYNTH_STEM_MAP: Record<string, StemMapping> = {
  // 5-stem layout: kick(0) bass(2) hat(4) synth(6) fx(8)
  kick: { synthDef: "kick", stem: "kick", bus: 0 },
  layered_kick: { synthDef: "layered_kick", stem: "kick", bus: 0 },
  bass: { synthDef: "bass", stem: "bass", bus: 2 },
  acid_bass: { synthDef: "acid_bass", stem: "bass", bus: 2 },
  hat: { synthDef: "hat", stem: "hat", bus: 4 },
  clap: { synthDef: "clap", stem: "hat", bus: 4 },
  supersaw: { synthDef: "supersaw", stem: "synth", bus: 6 },
  pad: { synthDef: "pad", stem: "synth", bus: 6 },
  lead: { synthDef: "lead", stem: "synth", bus: 6 },
  arp_pluck: { synthDef: "arp_pluck", stem: "synth", bus: 6 },
  fm_lead: { synthDef: "fm_lead", stem: "synth", bus: 6 },
  wavetable_pad: { synthDef: "wavetable_pad", stem: "synth", bus: 6 },
  granular_pad: { synthDef: "granular_pad", stem: "synth", bus: 6 },
  squelch: { synthDef: "squelch", stem: "synth", bus: 6 },
  riser: { synthDef: "riser", stem: "fx", bus: 8 },
  sample_player: { synthDef: "sample_player", stem: "kick", bus: 0 },
};

// sample_player dynamic bus routing — hit type determines stem bus
export const mapSamplePlayerBus = (hitType: string): number => {
  switch (hitType) {
    case "kick": case "snare": return 0;
    case "bass": return 2;
    case "hat": case "clap": case "ride": return 4;
    case "fx": return 8;
    default: return 6;
  }
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
  bd: "kick", sd: "kick", sn: "kick", rim: "kick",
  mt: "kick", ht: "kick", lt: "kick", tom: "kick",
  hh: "hat", oh: "hat", ch: "hat", cp: "hat",
  cr: "hat", rd: "hat", cb: "hat",
};

export const isSampleEvent = (s: string): boolean =>
  s in DIRT_SAMPLE_STEMS;

export const mapSynthDef = (s: string): StemMapping | null => {
  return SYNTH_STEM_MAP[s] ?? null;
};

export const mapDirtSample = (s: string): StemMapping | null => {
  const stem = DIRT_SAMPLE_STEMS[s];
  if (!stem) return null;
  const bus = stem === "kick" ? 0 : stem === "bass" ? 2 : stem === "hat" ? 4 : stem === "synth" ? 6 : 8;
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
        "attack", "release",
        // Phase 2 new params
        "envDepth", "envDecay", "accent", "slide", "slideTime", "wave", "dist",
        "mRatio", "cRatio", "index", "iScale",
        "morph", "filterCutoff", "filterRes", "bufBase",
        "buf", "density", "grainDur", "rate", "posRand", "panWidth",
        "subDecay", "bodyDecay", "clickAmp", "bodyFreq", "punch",
        "sweepStart", "sweepEnd", "sweepCurve", "source", "lfoRate", "lfoDepth",
        "startPos", "hpFreq", "lpFreq"].includes(resolvedKey)
    ) {
      warnings.push(`${key}: unknown alias → ${resolvedKey}`);
    }

    normalized[resolvedKey] = value;
  }

  return { normalized, warnings };
};
