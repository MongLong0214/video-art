import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";

// Per-SynthDef allowed parameter keys (from actual .scd files)
const SYNTHDEF_PARAMS: Record<string, string[]> = {
  kick: ["drive", "click", "decay"],
  bass: ["cutoff", "resonance", "envAmount"],
  hat: ["openness", "tone"],
  clap: ["spread", "decay"],
  supersaw: ["detune", "mix", "cutoff"],
  pad: ["attack", "release", "filterEnv"],
  lead: ["vibrato", "portamento", "drive"],
  arp_pluck: ["decay", "brightness"],
  riser: ["sweepRange", "noiseAmount"],
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

export const presetSchema = z.object({
  name: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  bpm: bpmSchema,
  synthParams: z.object({
    kick: synthParamSchema("kick"),
    bass: synthParamSchema("bass"),
    hat: synthParamSchema("hat"),
    clap: synthParamSchema("clap"),
    supersaw: synthParamSchema("supersaw"),
    pad: synthParamSchema("pad"),
    lead: synthParamSchema("lead"),
    arp_pluck: synthParamSchema("arp_pluck"),
    riser: synthParamSchema("riser"),
  }),
  fxDefaults: fxDefaultsSchema,
  stemGroups: stemGroupsSchema,
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
  const parsed = JSON.parse(content);
  return presetSchema.parse(parsed);
};

export const mergeWithDefaults = (
  preset: Partial<Preset["synthParams"]>,
  defaults: Preset["synthParams"],
): Preset["synthParams"] => {
  const result = { ...defaults };
  for (const [synth, params] of Object.entries(preset)) {
    if (synth in result) {
      (result as Record<string, Record<string, number>>)[synth] = {
        ...(result as Record<string, Record<string, number>>)[synth],
        ...params,
      };
    }
  }
  return result;
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

export const SYNTHDEF_PARAM_KEYS = SYNTHDEF_PARAMS;

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

export const detectPresetFromOsclog = (events: { s: string; n?: number | string }[]): string | null => {
  for (const event of events) {
    if (event.s === "setpreset" && event.n != null) {
      return String(event.n);
    }
  }
  return null;
};

export const mergeFxDefaults = (
  eventParams: Record<string, unknown>,
  presetFxDefaults: Record<string, number>,
): Record<string, unknown> => {
  const merged = { ...presetFxDefaults };
  for (const [key, val] of Object.entries(eventParams)) {
    if (val != null) {
      (merged as Record<string, unknown>)[key] = val;
    }
  }
  return merged;
};
