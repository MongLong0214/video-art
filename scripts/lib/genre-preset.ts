import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";

// Per-SynthDef allowed parameter keys (from actual .scd files)
const SYNTHDEF_PARAMS: Record<string, string[]> = {
  // Phase 1 — 9 base SynthDefs
  kick: ["drive", "click", "decay"],
  bass: ["cutoff", "resonance", "envAmount"],
  hat: ["openness", "tone"],
  clap: ["spread", "decay"],
  supersaw: ["detune", "mix", "cutoff"],
  pad: ["attack", "release", "filterEnv"],
  lead: ["vibrato", "portamento", "drive"],
  arp_pluck: ["decay", "brightness"],
  riser: ["sweepRange", "noiseAmount"],
  // Phase 2 — 7 new SynthDefs
  acid_bass: ["cutoff", "resonance", "envDepth", "envDecay", "accent", "slide", "slideTime", "wave", "dist"],
  fm_lead: ["mRatio", "cRatio", "index", "iScale", "vibrato", "drive"],
  wavetable_pad: ["morph", "attack", "release", "filterCutoff", "filterRes", "detune", "bufBase"],
  granular_pad: ["buf", "density", "grainDur", "rate", "posRand", "panWidth"],
  layered_kick: ["subDecay", "bodyDecay", "clickAmp", "bodyFreq", "drive", "punch"],
  squelch: ["sweepStart", "sweepEnd", "sweepCurve", "resonance", "source", "lfoRate", "lfoDepth"],
  sample_player: [
    "buf", "rate", "startPos", "attack", "release", "hpFreq", "lpFreq",
    "loopMode", "xfade", "sustainLevel", "rateLag", "legato", "slide", "slideTime",
  ],
};

// Common params every SynthDef accepts
const COMMON_PARAMS = ["freq", "amp", "dur", "pan"];

const getAllowedKeys = (synthDef: string): Set<string> => {
  const unique = SYNTHDEF_PARAMS[synthDef] ?? [];
  return new Set([...unique, ...COMMON_PARAMS]);
};

// Strict per-SynthDef param schema
const synthParamSchema = (name: string) =>
  z.record(z.string(), z.number()).refine(
    (params) => {
      const allowed = getAllowedKeys(name);
      return Object.keys(params).every((k) => allowed.has(k));
    },
    { message: `Invalid params for ${name}` },
  );

const bpmSchema = z.object({
  min: z.number().int().min(60).max(200),
  max: z.number().int().min(60).max(200),
  default: z.number().int().min(60).max(200),
}).refine((b) => b.min < b.max, "BPM min must be less than max")
  .refine((b) => b.default >= b.min && b.default <= b.max, "BPM default must be within range");

const fxDefaultsSchema = z.object({
  compress: z.number(), threshold: z.number(), ratio: z.number(),
  compAttack: z.number(), compRelease: z.number(),
  saturate: z.number(), drive: z.number(),
  loGain: z.number(), midGain: z.number(), hiGain: z.number(),
  loFreq: z.number(), hiFreq: z.number(),
  sideGain: z.number(), sideRelease: z.number(),
});

const stemGroupsSchema = z.record(z.string(), z.array(z.string()));

const sectionSchema = z.object({
  label: z.string(),
  start: z.number().min(0),
  end: z.number().min(0),
  synthOverrides: z.record(z.string(), z.record(z.string(), z.number())).optional(),
  fxOverrides: z.record(z.string(), z.number()).optional(),
}).refine((s) => s.end > s.start, "Section end must be after start");

export const presetSchema = z.object({
  name: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  bpm: bpmSchema,
  synthParams: z.object({
    // Phase 1 — required
    kick: synthParamSchema("kick"),
    bass: synthParamSchema("bass"),
    hat: synthParamSchema("hat"),
    clap: synthParamSchema("clap"),
    supersaw: synthParamSchema("supersaw"),
    pad: synthParamSchema("pad"),
    lead: synthParamSchema("lead"),
    arp_pluck: synthParamSchema("arp_pluck"),
    riser: synthParamSchema("riser"),
    // Phase 2 — optional (backward compatible)
    acid_bass: synthParamSchema("acid_bass").optional(),
    fm_lead: synthParamSchema("fm_lead").optional(),
    wavetable_pad: synthParamSchema("wavetable_pad").optional(),
    granular_pad: synthParamSchema("granular_pad").optional(),
    layered_kick: synthParamSchema("layered_kick").optional(),
    squelch: synthParamSchema("squelch").optional(),
    sample_player: synthParamSchema("sample_player").optional(),
  }),
  fxDefaults: fxDefaultsSchema,
  stemGroups: stemGroupsSchema,
  sections: z.array(sectionSchema).optional(),
});

export type Preset = z.infer<typeof presetSchema>;

const MAX_FILE_SIZE = 64 * 1024; // 64KB

export const validatePresetName = (name: string): boolean =>
  /^[a-zA-Z0-9_-]+$/.test(name);

export const loadPreset = (
  name: string,
  presetsDir: string,
): Preset => {
  const filePath = path.join(presetsDir, `${name}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Preset not found: ${name}`);
  }

  const stat = fs.statSync(filePath);
  if (stat.size > MAX_FILE_SIZE) {
    throw new Error(`Preset file too large: ${stat.size} bytes (max ${MAX_FILE_SIZE})`);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Invalid JSON in preset file: ${filePath}`);
  }
  return presetSchema.parse(parsed);
};

export const listPresets = (
  genresDir: string,
  userDir: string,
): { name: string; source: "genre" | "user" }[] => {
  const presets: { name: string; source: "genre" | "user" }[] = [];

  if (fs.existsSync(genresDir)) {
    for (const f of fs.readdirSync(genresDir)) {
      if (f.endsWith(".json")) {
        presets.push({ name: f.replace(".json", ""), source: "genre" });
      }
    }
  }

  if (fs.existsSync(userDir)) {
    for (const f of fs.readdirSync(userDir)) {
      if (f.endsWith(".json")) {
        presets.push({ name: f.replace(".json", ""), source: "user" });
      }
    }
  }

  return presets;
};

export const savePreset = (
  name: string,
  sourcePreset: Preset,
  userDir: string,
  force = false,
): void => {
  if (!validatePresetName(name)) {
    throw new Error(`Invalid preset name: "${name}". Use only a-z, A-Z, 0-9, _, -`);
  }

  const targetPath = path.join(userDir, `${name}.json`);

  if (fs.existsSync(targetPath) && !force) {
    throw new Error(`Preset "${name}" already exists. Use --force to overwrite.`);
  }

  const preset = { ...sourcePreset, name };
  fs.mkdirSync(userDir, { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify(preset, null, 2));
};

