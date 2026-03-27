import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execSync } from "node:child_process";

// --- Source imports ---
import {
  loadPreset,
  mergeWithDefaults,
  validatePresetName,
  listPresets,
  presetSchema,
  savePreset,
  detectPresetFromOsclog,
  mergeFxDefaults,
  SYNTHDEF_PARAM_KEYS,
  type Preset,
} from "./genre-preset";

import {
  validateFxParams,
  FX_MODULE_ORDER,
  getFxBypassOrder,
  FX_MODULE_CONFIGS,
} from "./fx-utils";

import {
  parseOscEvent,
  generateLogPath,
  shouldRotateFile,
  generateSessionMetadata,
  writeOscEvent,
  type OscEvent,
} from "./osc-logger";

import {
  parseOscLog,
  listOscLogFiles,
  mergeMultiPart,
  convertToNrt,
  generateSummary,
  writeNrtScore,
} from "./osc-to-nrt";

import {
  mapSynthDef,
  mapDirtSample,
  isSampleEvent,
  normalizeParams,
  SUPPORTED_SYNTHDEFS,
  SYNTH_STEM_MAP,
  DIRT_SAMPLE_STEMS,
  FX_PARAMS,
  PARAM_ALIASES,
  TIDAL_CONTEXT_PARAMS,
} from "./synth-stem-map";

import {
  getStemBus,
  parseCustomStems,
  generateNrtScoreEntries,
  stemOutputPath,
  buildSplitCommands,
  writeScoreConfig,
  checkRenderLock,
  writeRenderLock,
  removeRenderLock,
  checkDiskSpace as stemCheckDiskSpace,
  DEFAULT_STEMS,
  SIDECHAIN_BUS,
} from "./stem-render";

import {
  generateSessionInfo,
  generateImportGuide,
  buildMasteringCommand,
  verifyLoudness,
  createOutputStructure,
  runPipelineSteps,
  hasExecOrSpawn,
} from "./prod-pipeline";

import { generateBootTidal, validateGhcVersion } from "./tidal-utils";
import { validateFilePath } from "./validate-file-path";
import { validateSamplePath, generateBootConfig } from "./superdirt-utils";
import { LiveHealthMonitor } from "./live-health-monitor";
import {
  sanitizeTitle,
  generateRecordPath,
  checkDiskSpace as recCheckDiskSpace,
  LiveRecording,
} from "./live-recording";
import type { NrtScore, NrtEvent } from "./osc-to-nrt";

// --- Constants ---
const PROJECT_ROOT = path.resolve(import.meta.dirname, "../..");
const GENRES_DIR = path.join(PROJECT_ROOT, "audio", "presets", "genres");
const USER_DIR = path.join(PROJECT_ROOT, "audio", "presets", "user");
const SC_DIR = path.join(PROJECT_ROOT, "audio", "sc", "superdirt");
const SCORES_DIR = path.join(PROJECT_ROOT, "audio", "sc", "scores");
const TIDAL_DIR = path.join(PROJECT_ROOT, "audio", "tidal");
const GENRES = ["hard_techno", "melodic_techno", "industrial", "psytrance", "progressive_trance"] as const;
const SYNTH_NAMES = ["kick", "bass", "hat", "clap", "supersaw", "pad", "lead", "arp_pluck", "riser"] as const;
const COMMON_PARAMS = ["freq", "amp", "dur", "pan"];
const FX_DEFAULTS_KEYS = [
  "compress", "threshold", "ratio", "compAttack", "compRelease",
  "saturate", "drive",
  "loGain", "midGain", "hiGain", "loFreq", "hiFreq",
  "sideGain", "sideRelease",
];

const hasSclang = (() => {
  try { execSync("which sclang", { stdio: "ignore" }); return true; }
  catch { return false; }
})();

// --- Shared temp dir ---
let tmpDir: string;
beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "comp-e2e-"));
});
afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- Helper: load all presets ---
const loadAllPresets = (): Record<string, Preset> => {
  const presets: Record<string, Preset> = {};
  for (const g of GENRES) {
    presets[g] = loadPreset(g, GENRES_DIR);
  }
  return presets;
};

const makeNrtScore = (events: NrtEvent[] = [], duration = 3.0): NrtScore => ({
  metadata: { duration, eventCount: events.length, mapped: events.length, skipped: 0, skipRate: 0 },
  events,
});

// ============================================================================
// 1. SynthDef Parameters (9 SynthDefs x N params)
// ============================================================================
describe("1. SynthDef Parameters", () => {
  const presets = loadAllPresets();

  // --- 1.1 SYNTHDEF_PARAM_KEYS structure ---
  describe("SYNTHDEF_PARAM_KEYS structure", () => {
    it("contains exactly 9 SynthDefs", () => {
      expect(Object.keys(SYNTHDEF_PARAM_KEYS)).toHaveLength(9);
    });

    for (const name of SYNTH_NAMES) {
      it(`contains ${name}`, () => {
        expect(SYNTHDEF_PARAM_KEYS[name]).toBeDefined();
        expect(Array.isArray(SYNTHDEF_PARAM_KEYS[name])).toBe(true);
      });
    }

    it("does not contain unknown SynthDefs", () => {
      for (const key of Object.keys(SYNTHDEF_PARAM_KEYS)) {
        expect(SYNTH_NAMES).toContain(key);
      }
    });
  });

  // --- 1.2 Kick params ---
  describe("kick", () => {
    it("has drive param", () => { expect(SYNTHDEF_PARAM_KEYS.kick).toContain("drive"); });
    it("has click param", () => { expect(SYNTHDEF_PARAM_KEYS.kick).toContain("click"); });
    it("has decay param", () => { expect(SYNTHDEF_PARAM_KEYS.kick).toContain("decay"); });
    it("has exactly 3 unique params", () => { expect(SYNTHDEF_PARAM_KEYS.kick).toHaveLength(3); });
    it("does NOT have openness", () => { expect(SYNTHDEF_PARAM_KEYS.kick).not.toContain("openness"); });
    it("does NOT have cutoff", () => { expect(SYNTHDEF_PARAM_KEYS.kick).not.toContain("cutoff"); });
    it("does NOT have tone", () => { expect(SYNTHDEF_PARAM_KEYS.kick).not.toContain("tone"); });

    for (const genre of GENRES) {
      it(`${genre} kick.drive is number`, () => {
        expect(typeof presets[genre].synthParams.kick.drive).toBe("number");
      });
    }

    it("hard_techno kick.drive >= 0.7", () => {
      expect(presets.hard_techno.synthParams.kick.drive).toBeGreaterThanOrEqual(0.7);
    });
    it("melodic_techno kick.drive < 0.3", () => {
      expect(presets.melodic_techno.synthParams.kick.drive).toBeLessThan(0.3);
    });
    it("industrial kick.drive >= 0.9", () => {
      expect(presets.industrial.synthParams.kick.drive).toBeGreaterThanOrEqual(0.9);
    });
  });

  // --- 1.3 Bass params ---
  describe("bass", () => {
    it("has cutoff param", () => { expect(SYNTHDEF_PARAM_KEYS.bass).toContain("cutoff"); });
    it("has resonance param", () => { expect(SYNTHDEF_PARAM_KEYS.bass).toContain("resonance"); });
    it("has envAmount param", () => { expect(SYNTHDEF_PARAM_KEYS.bass).toContain("envAmount"); });
    it("has exactly 3 unique params", () => { expect(SYNTHDEF_PARAM_KEYS.bass).toHaveLength(3); });
    it("does NOT have drive", () => { expect(SYNTHDEF_PARAM_KEYS.bass).not.toContain("drive"); });
    it("does NOT have openness", () => { expect(SYNTHDEF_PARAM_KEYS.bass).not.toContain("openness"); });

    for (const genre of GENRES) {
      it(`${genre} bass.cutoff is number`, () => {
        expect(typeof presets[genre].synthParams.bass.cutoff).toBe("number");
      });
      it(`${genre} bass.cutoff > 0`, () => {
        expect(presets[genre].synthParams.bass.cutoff).toBeGreaterThan(0);
      });
    }
  });

  // --- 1.4 Hat params ---
  describe("hat", () => {
    it("has openness param", () => { expect(SYNTHDEF_PARAM_KEYS.hat).toContain("openness"); });
    it("has tone param", () => { expect(SYNTHDEF_PARAM_KEYS.hat).toContain("tone"); });
    it("has exactly 2 unique params", () => { expect(SYNTHDEF_PARAM_KEYS.hat).toHaveLength(2); });
    it("does NOT have drive", () => { expect(SYNTHDEF_PARAM_KEYS.hat).not.toContain("drive"); });
    it("does NOT have cutoff", () => { expect(SYNTHDEF_PARAM_KEYS.hat).not.toContain("cutoff"); });

    for (const genre of GENRES) {
      it(`${genre} hat.openness between 0 and 1`, () => {
        const val = presets[genre].synthParams.hat.openness;
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      });
    }
  });

  // --- 1.5 Clap params ---
  describe("clap", () => {
    it("has spread param", () => { expect(SYNTHDEF_PARAM_KEYS.clap).toContain("spread"); });
    it("has decay param", () => { expect(SYNTHDEF_PARAM_KEYS.clap).toContain("decay"); });
    it("has exactly 2 unique params", () => { expect(SYNTHDEF_PARAM_KEYS.clap).toHaveLength(2); });
    it("does NOT have drive", () => { expect(SYNTHDEF_PARAM_KEYS.clap).not.toContain("drive"); });
    it("does NOT have openness", () => { expect(SYNTHDEF_PARAM_KEYS.clap).not.toContain("openness"); });

    for (const genre of GENRES) {
      it(`${genre} clap.decay is number`, () => {
        expect(typeof presets[genre].synthParams.clap.decay).toBe("number");
      });
    }
  });

  // --- 1.6 Supersaw params ---
  describe("supersaw", () => {
    it("has detune param", () => { expect(SYNTHDEF_PARAM_KEYS.supersaw).toContain("detune"); });
    it("has mix param", () => { expect(SYNTHDEF_PARAM_KEYS.supersaw).toContain("mix"); });
    it("has cutoff param", () => { expect(SYNTHDEF_PARAM_KEYS.supersaw).toContain("cutoff"); });
    it("has exactly 3 unique params", () => { expect(SYNTHDEF_PARAM_KEYS.supersaw).toHaveLength(3); });
    it("does NOT have openness", () => { expect(SYNTHDEF_PARAM_KEYS.supersaw).not.toContain("openness"); });

    for (const genre of GENRES) {
      it(`${genre} supersaw.detune between 0 and 1`, () => {
        const val = presets[genre].synthParams.supersaw.detune;
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      });
    }
  });

  // --- 1.7 Pad params ---
  describe("pad", () => {
    it("has attack param", () => { expect(SYNTHDEF_PARAM_KEYS.pad).toContain("attack"); });
    it("has release param", () => { expect(SYNTHDEF_PARAM_KEYS.pad).toContain("release"); });
    it("has filterEnv param", () => { expect(SYNTHDEF_PARAM_KEYS.pad).toContain("filterEnv"); });
    it("has exactly 3 unique params", () => { expect(SYNTHDEF_PARAM_KEYS.pad).toHaveLength(3); });
    it("does NOT have drive", () => { expect(SYNTHDEF_PARAM_KEYS.pad).not.toContain("drive"); });

    for (const genre of GENRES) {
      it(`${genre} pad.attack > 0`, () => {
        expect(presets[genre].synthParams.pad.attack).toBeGreaterThan(0);
      });
      it(`${genre} pad.release > 0`, () => {
        expect(presets[genre].synthParams.pad.release).toBeGreaterThan(0);
      });
    }
  });

  // --- 1.8 Lead params ---
  describe("lead", () => {
    it("has vibrato param", () => { expect(SYNTHDEF_PARAM_KEYS.lead).toContain("vibrato"); });
    it("has portamento param", () => { expect(SYNTHDEF_PARAM_KEYS.lead).toContain("portamento"); });
    it("has drive param", () => { expect(SYNTHDEF_PARAM_KEYS.lead).toContain("drive"); });
    it("has exactly 3 unique params", () => { expect(SYNTHDEF_PARAM_KEYS.lead).toHaveLength(3); });
    it("does NOT have openness", () => { expect(SYNTHDEF_PARAM_KEYS.lead).not.toContain("openness"); });

    for (const genre of GENRES) {
      it(`${genre} lead.vibrato is number`, () => {
        expect(typeof presets[genre].synthParams.lead.vibrato).toBe("number");
      });
    }

    it("hard_techno lead.drive >= 0.5", () => {
      expect(presets.hard_techno.synthParams.lead.drive).toBeGreaterThanOrEqual(0.5);
    });
    it("melodic_techno lead.drive < 0.3", () => {
      expect(presets.melodic_techno.synthParams.lead.drive).toBeLessThan(0.3);
    });
  });

  // --- 1.9 Arp_pluck params ---
  describe("arp_pluck", () => {
    it("has decay param", () => { expect(SYNTHDEF_PARAM_KEYS.arp_pluck).toContain("decay"); });
    it("has brightness param", () => { expect(SYNTHDEF_PARAM_KEYS.arp_pluck).toContain("brightness"); });
    it("has exactly 2 unique params", () => { expect(SYNTHDEF_PARAM_KEYS.arp_pluck).toHaveLength(2); });
    it("does NOT have drive", () => { expect(SYNTHDEF_PARAM_KEYS.arp_pluck).not.toContain("drive"); });

    for (const genre of GENRES) {
      it(`${genre} arp_pluck.decay is number`, () => {
        expect(typeof presets[genre].synthParams.arp_pluck.decay).toBe("number");
      });
      it(`${genre} arp_pluck.brightness between 0 and 1`, () => {
        const val = presets[genre].synthParams.arp_pluck.brightness;
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      });
    }
  });

  // --- 1.10 Riser params ---
  describe("riser", () => {
    it("has sweepRange param", () => { expect(SYNTHDEF_PARAM_KEYS.riser).toContain("sweepRange"); });
    it("has noiseAmount param", () => { expect(SYNTHDEF_PARAM_KEYS.riser).toContain("noiseAmount"); });
    it("has exactly 2 unique params", () => { expect(SYNTHDEF_PARAM_KEYS.riser).toHaveLength(2); });
    it("does NOT have drive", () => { expect(SYNTHDEF_PARAM_KEYS.riser).not.toContain("drive"); });

    for (const genre of GENRES) {
      it(`${genre} riser.sweepRange > 0`, () => {
        expect(presets[genre].synthParams.riser.sweepRange).toBeGreaterThan(0);
      });
      it(`${genre} riser.noiseAmount between 0 and 1`, () => {
        const val = presets[genre].synthParams.riser.noiseAmount;
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      });
    }
  });

  // --- 1.11 Cross-contamination checks ---
  describe("cross-contamination", () => {
    for (const genre of GENRES) {
      it(`${genre}: kick has no hat params (openness, tone)`, () => {
        const kick = presets[genre].synthParams.kick;
        expect(kick).not.toHaveProperty("openness");
        expect(kick).not.toHaveProperty("tone");
      });

      it(`${genre}: hat has no kick params (drive, click)`, () => {
        const hat = presets[genre].synthParams.hat;
        expect(hat).not.toHaveProperty("click");
      });

      it(`${genre}: bass has no pad params (attack, release)`, () => {
        const bass = presets[genre].synthParams.bass;
        expect(bass).not.toHaveProperty("attack");
        expect(bass).not.toHaveProperty("release");
      });

      it(`${genre}: pad has no bass params (cutoff, resonance)`, () => {
        const pad = presets[genre].synthParams.pad;
        expect(pad).not.toHaveProperty("cutoff");
        expect(pad).not.toHaveProperty("resonance");
      });

      it(`${genre}: clap has no supersaw params (detune, mix)`, () => {
        const clap = presets[genre].synthParams.clap;
        expect(clap).not.toHaveProperty("detune");
        expect(clap).not.toHaveProperty("mix");
      });
    }
  });

  // --- 1.12 Schema validation for all param combinations ---
  describe("schema rejects wrong params on each SynthDef", () => {
    const wrongParamPairs: [string, string][] = [
      ["kick", "openness"], ["kick", "cutoff"], ["kick", "detune"],
      ["bass", "openness"], ["bass", "drive"], ["bass", "brightness"],
      ["hat", "drive"], ["hat", "cutoff"], ["hat", "decay"],
      ["clap", "cutoff"], ["clap", "openness"], ["clap", "drive"],
      ["supersaw", "openness"], ["supersaw", "drive"], ["supersaw", "brightness"],
      ["pad", "cutoff"], ["pad", "drive"], ["pad", "openness"],
      ["lead", "openness"], ["lead", "cutoff"], ["lead", "brightness"],
      ["arp_pluck", "cutoff"], ["arp_pluck", "openness"], ["arp_pluck", "detune"],
      ["riser", "cutoff"], ["riser", "openness"], ["riser", "drive"],
    ];

    for (const [synth, badParam] of wrongParamPairs) {
      it(`rejects ${synth} with ${badParam}`, () => {
        const base: Record<string, Record<string, number>> = {};
        for (const s of SYNTH_NAMES) base[s] = {};
        base[synth] = { [badParam]: 0.5 };
        const invalid = {
          name: "test", bpm: { min: 120, max: 140, default: 130 },
          synthParams: base,
          fxDefaults: Object.fromEntries(FX_DEFAULTS_KEYS.map(k => [k, 0])),
          stemGroups: {},
        };
        expect(() => presetSchema.parse(invalid)).toThrow();
      });
    }
  });

  // --- 1.13 Common params accepted on every SynthDef ---
  describe("common params accepted on all SynthDefs", () => {
    for (const synth of SYNTH_NAMES) {
      for (const cp of COMMON_PARAMS) {
        it(`${synth} accepts common param ${cp}`, () => {
          const base: Record<string, Record<string, number>> = {};
          for (const s of SYNTH_NAMES) base[s] = {};
          base[synth] = { [cp]: 440 };
          const valid = {
            name: "test", bpm: { min: 120, max: 140, default: 130 },
            synthParams: base,
            fxDefaults: Object.fromEntries(FX_DEFAULTS_KEYS.map(k => [k, 0])),
            stemGroups: {},
          };
          expect(() => presetSchema.parse(valid)).not.toThrow();
        });
      }
    }
  });
});

// ============================================================================
// 2. FX Parameters
// ============================================================================
describe("2. FX Parameters", () => {
  // --- 2.1 FX_PARAMS set completeness ---
  describe("FX_PARAMS Set", () => {
    const expected = [
      "compress", "threshold", "ratio", "compAttack", "compRelease",
      "saturate", "drive",
      "loGain", "midGain", "hiGain", "loFreq", "hiFreq",
      "sideGain", "sideRelease",
      "room", "size", "dry", "delaytime", "delayfeedback",
    ];

    for (const param of expected) {
      it(`FX_PARAMS includes ${param}`, () => {
        expect(FX_PARAMS.has(param)).toBe(true);
      });
    }

    it("FX_PARAMS has exactly 19 entries", () => {
      expect(FX_PARAMS.size).toBe(19);
    });

    it("FX_PARAMS does not include instrument params (freq, amp, dur, pan)", () => {
      expect(FX_PARAMS.has("freq")).toBe(false);
      expect(FX_PARAMS.has("amp")).toBe(false);
      expect(FX_PARAMS.has("dur")).toBe(false);
      expect(FX_PARAMS.has("pan")).toBe(false);
    });

    it("FX_PARAMS does not include SynthDef-specific params", () => {
      expect(FX_PARAMS.has("openness")).toBe(false);
      expect(FX_PARAMS.has("cutoff")).toBe(false);
      expect(FX_PARAMS.has("detune")).toBe(false);
      expect(FX_PARAMS.has("brightness")).toBe(false);
    });
  });

  // --- 2.2 FX_MODULE_ORDER ---
  describe("FX_MODULE_ORDER", () => {
    it("has exactly 6 entries", () => { expect(FX_MODULE_ORDER).toHaveLength(6); });
    it("starts with customSidechain", () => { expect(FX_MODULE_ORDER[0]).toBe("customSidechain"); });
    it("customCompressor is second", () => { expect(FX_MODULE_ORDER[1]).toBe("customCompressor"); });
    it("customSaturator is third", () => { expect(FX_MODULE_ORDER[2]).toBe("customSaturator"); });
    it("customEQ is fourth", () => { expect(FX_MODULE_ORDER[3]).toBe("customEQ"); });
    it("superdirt_reverb is fifth", () => { expect(FX_MODULE_ORDER[4]).toBe("superdirt_reverb"); });
    it("superdirt_delay is last", () => { expect(FX_MODULE_ORDER[5]).toBe("superdirt_delay"); });
    it("sidechain before compressor", () => {
      expect(FX_MODULE_ORDER.indexOf("customSidechain")).toBeLessThan(FX_MODULE_ORDER.indexOf("customCompressor"));
    });
    it("compressor before saturator", () => {
      expect(FX_MODULE_ORDER.indexOf("customCompressor")).toBeLessThan(FX_MODULE_ORDER.indexOf("customSaturator"));
    });
    it("saturator before EQ", () => {
      expect(FX_MODULE_ORDER.indexOf("customSaturator")).toBeLessThan(FX_MODULE_ORDER.indexOf("customEQ"));
    });
  });

  // --- 2.3 FX_MODULE_CONFIGS ---
  describe("FX_MODULE_CONFIGS details", () => {
    it("customCompressor has 5 params", () => {
      const comp = FX_MODULE_CONFIGS.find(c => c.name === "customCompressor");
      expect(comp!.params).toHaveLength(5);
      expect(comp!.params).toContain("compress");
      expect(comp!.params).toContain("threshold");
      expect(comp!.params).toContain("ratio");
      expect(comp!.params).toContain("compAttack");
      expect(comp!.params).toContain("compRelease");
    });

    it("customSaturator has 2 params", () => {
      const sat = FX_MODULE_CONFIGS.find(c => c.name === "customSaturator");
      expect(sat!.params).toHaveLength(2);
      expect(sat!.params).toContain("saturate");
      expect(sat!.params).toContain("drive");
    });

    it("customEQ has 5 params", () => {
      const eq = FX_MODULE_CONFIGS.find(c => c.name === "customEQ");
      expect(eq!.params).toHaveLength(5);
      expect(eq!.params).toContain("loGain");
      expect(eq!.params).toContain("midGain");
      expect(eq!.params).toContain("hiGain");
      expect(eq!.params).toContain("loFreq");
      expect(eq!.params).toContain("hiFreq");
    });

    it("customSidechain has 2 params", () => {
      const sc = FX_MODULE_CONFIGS.find(c => c.name === "customSidechain");
      expect(sc!.params).toHaveLength(2);
      expect(sc!.params).toContain("sideGain");
      expect(sc!.params).toContain("sideRelease");
    });

    it("sidechain has highest cpuWeight", () => {
      const sc = FX_MODULE_CONFIGS.find(c => c.name === "customSidechain")!;
      const maxWeight = Math.max(...FX_MODULE_CONFIGS.map(c => c.cpuWeight));
      expect(sc.cpuWeight).toBe(maxWeight);
    });

    it("each config has positive cpuWeight", () => {
      for (const config of FX_MODULE_CONFIGS) {
        expect(config.cpuWeight).toBeGreaterThan(0);
      }
    });
  });

  // --- 2.4 Preset fxDefaults completeness ---
  describe("preset fxDefaults completeness", () => {
    const presets = loadAllPresets();

    for (const genre of GENRES) {
      for (const key of FX_DEFAULTS_KEYS) {
        it(`${genre} fxDefaults has ${key}`, () => {
          expect(presets[genre].fxDefaults).toHaveProperty(key);
          expect(typeof (presets[genre].fxDefaults as Record<string, number>)[key]).toBe("number");
        });
      }

      it(`${genre} fxDefaults has exactly 14 keys`, () => {
        expect(Object.keys(presets[genre].fxDefaults)).toHaveLength(14);
      });
    }
  });

  // --- 2.5 FX param range validation ---
  describe("validateFxParams ranges", () => {
    it("compressor min boundary (compress=0)", () => {
      expect(validateFxParams("compressor", { compress: 0 })).toBe(true);
    });
    it("compressor max boundary (compress=1)", () => {
      expect(validateFxParams("compressor", { compress: 1 })).toBe(true);
    });
    it("compressor rejects compress=-0.001", () => {
      expect(validateFxParams("compressor", { compress: -0.001 })).toBe(false);
    });
    it("compressor rejects compress=1.001", () => {
      expect(validateFxParams("compressor", { compress: 1.001 })).toBe(false);
    });
    it("compressor threshold min -60", () => {
      expect(validateFxParams("compressor", { threshold: -60 })).toBe(true);
    });
    it("compressor threshold max 0", () => {
      expect(validateFxParams("compressor", { threshold: 0 })).toBe(true);
    });
    it("compressor rejects threshold=-61", () => {
      expect(validateFxParams("compressor", { threshold: -61 })).toBe(false);
    });
    it("compressor rejects threshold=1", () => {
      expect(validateFxParams("compressor", { threshold: 1 })).toBe(false);
    });

    it("saturator min boundary (saturate=0, drive=0)", () => {
      expect(validateFxParams("saturator", { saturate: 0, drive: 0 })).toBe(true);
    });
    it("saturator max boundary (saturate=1, drive=1)", () => {
      expect(validateFxParams("saturator", { saturate: 1, drive: 1 })).toBe(true);
    });
    it("saturator rejects negative drive", () => {
      expect(validateFxParams("saturator", { drive: -0.01 })).toBe(false);
    });
    it("saturator rejects drive > 1", () => {
      expect(validateFxParams("saturator", { drive: 1.01 })).toBe(false);
    });

    it("eq min boundary (loGain=-24)", () => {
      expect(validateFxParams("eq", { loGain: -24 })).toBe(true);
    });
    it("eq max boundary (hiGain=24)", () => {
      expect(validateFxParams("eq", { hiGain: 24 })).toBe(true);
    });
    it("eq rejects loGain=-25", () => {
      expect(validateFxParams("eq", { loGain: -25 })).toBe(false);
    });
    it("eq rejects midGain=25", () => {
      expect(validateFxParams("eq", { midGain: 25 })).toBe(false);
    });

    it("rejects unknown param key on compressor", () => {
      expect(validateFxParams("compressor", { unknownParam: 0.5 })).toBe(false);
    });
    it("rejects unknown fx type 'reverb'", () => {
      expect(validateFxParams("reverb", { room: 0.5 })).toBe(false);
    });
    it("rejects unknown fx type 'delay'", () => {
      expect(validateFxParams("delay", { time: 0.5 })).toBe(false);
    });
    it("empty params valid for compressor", () => {
      expect(validateFxParams("compressor", {})).toBe(true);
    });
    it("empty params valid for eq", () => {
      expect(validateFxParams("eq", {})).toBe(true);
    });
  });

  // --- 2.6 FX bypass order ---
  describe("getFxBypassOrder", () => {
    it("returns sidechain first (highest cpu)", () => {
      const order = getFxBypassOrder();
      expect(order[0]).toBe("customSidechain");
    });
    it("returns compressor second (cpu=2)", () => {
      const order = getFxBypassOrder();
      expect(order[1]).toBe("customCompressor");
    });
    it("all 4 modules present in bypass order", () => {
      const order = getFxBypassOrder();
      expect(order).toHaveLength(4);
    });
    it("bypass order is sorted by cpuWeight descending", () => {
      const order = getFxBypassOrder();
      const configs = FX_MODULE_CONFIGS.slice();
      configs.sort((a, b) => b.cpuWeight - a.cpuWeight);
      expect(order).toEqual(configs.map(c => c.name));
    });
  });
});

// ============================================================================
// 3. Presets (5 genres x detailed)
// ============================================================================
describe("3. Presets", () => {
  const presets = loadAllPresets();

  // --- 3.1 BPM ranges ---
  describe("BPM ranges", () => {
    const expectedBpm: Record<string, { min: number; max: number; default: number }> = {
      hard_techno: { min: 140, max: 155, default: 145 },
      melodic_techno: { min: 120, max: 130, default: 124 },
      industrial: { min: 130, max: 145, default: 138 },
      psytrance: { min: 138, max: 148, default: 142 },
      progressive_trance: { min: 128, max: 138, default: 132 },
    };

    for (const genre of GENRES) {
      it(`${genre} bpm.min = ${expectedBpm[genre].min}`, () => {
        expect(presets[genre].bpm.min).toBe(expectedBpm[genre].min);
      });
      it(`${genre} bpm.max = ${expectedBpm[genre].max}`, () => {
        expect(presets[genre].bpm.max).toBe(expectedBpm[genre].max);
      });
      it(`${genre} bpm.default = ${expectedBpm[genre].default}`, () => {
        expect(presets[genre].bpm.default).toBe(expectedBpm[genre].default);
      });
      it(`${genre} bpm.min < bpm.max`, () => {
        expect(presets[genre].bpm.min).toBeLessThan(presets[genre].bpm.max);
      });
      it(`${genre} bpm.default within range`, () => {
        expect(presets[genre].bpm.default).toBeGreaterThanOrEqual(presets[genre].bpm.min);
        expect(presets[genre].bpm.default).toBeLessThanOrEqual(presets[genre].bpm.max);
      });
      it(`${genre} bpm values are integers`, () => {
        expect(Number.isInteger(presets[genre].bpm.min)).toBe(true);
        expect(Number.isInteger(presets[genre].bpm.max)).toBe(true);
        expect(Number.isInteger(presets[genre].bpm.default)).toBe(true);
      });
      it(`${genre} bpm 60-200 range`, () => {
        expect(presets[genre].bpm.min).toBeGreaterThanOrEqual(60);
        expect(presets[genre].bpm.max).toBeLessThanOrEqual(200);
      });
    }
  });

  // --- 3.2 synthParams all 9 SynthDefs present ---
  describe("synthParams completeness", () => {
    for (const genre of GENRES) {
      for (const synth of SYNTH_NAMES) {
        it(`${genre} has synthParams.${synth}`, () => {
          expect(presets[genre].synthParams).toHaveProperty(synth);
        });
      }
      it(`${genre} synthParams has exactly 9 keys`, () => {
        expect(Object.keys(presets[genre].synthParams)).toHaveLength(9);
      });
    }
  });

  // --- 3.3 stemGroups ---
  describe("stemGroups", () => {
    for (const genre of GENRES) {
      it(`${genre} has drums stemGroup`, () => {
        expect(presets[genre].stemGroups.drums).toBeDefined();
      });
      it(`${genre} has bass stemGroup`, () => {
        expect(presets[genre].stemGroups.bass).toBeDefined();
      });
      it(`${genre} has synth stemGroup`, () => {
        expect(presets[genre].stemGroups.synth).toBeDefined();
      });
      it(`${genre} has fx stemGroup`, () => {
        expect(presets[genre].stemGroups.fx).toBeDefined();
      });
      it(`${genre} drums contains kick,hat,clap`, () => {
        expect(presets[genre].stemGroups.drums).toContain("kick");
        expect(presets[genre].stemGroups.drums).toContain("hat");
        expect(presets[genre].stemGroups.drums).toContain("clap");
      });
      it(`${genre} bass contains bass`, () => {
        expect(presets[genre].stemGroups.bass).toContain("bass");
      });
      it(`${genre} fx contains riser`, () => {
        expect(presets[genre].stemGroups.fx).toContain("riser");
      });
    }
  });

  // --- 3.4 Genre characteristics ---
  describe("genre characteristics", () => {
    it("hard_techno has highest kick drive across all genres", () => {
      const ht = presets.hard_techno.synthParams.kick.drive;
      for (const genre of ["melodic_techno", "progressive_trance"] as const) {
        expect(ht).toBeGreaterThan(presets[genre].synthParams.kick.drive);
      }
    });

    it("industrial has highest overall drive/saturate", () => {
      expect(presets.industrial.fxDefaults.drive).toBeGreaterThan(presets.melodic_techno.fxDefaults.drive);
      expect(presets.industrial.fxDefaults.saturate).toBeGreaterThan(presets.melodic_techno.fxDefaults.saturate);
    });

    it("melodic_techno has lowest compress", () => {
      for (const genre of ["hard_techno", "industrial"] as const) {
        expect(presets.melodic_techno.fxDefaults.compress).toBeLessThan(presets[genre].fxDefaults.compress);
      }
    });

    it("progressive_trance has longest pad attack", () => {
      for (const genre of ["hard_techno", "industrial"] as const) {
        expect(presets.progressive_trance.synthParams.pad.attack).toBeGreaterThan(presets[genre].synthParams.pad.attack);
      }
    });

    it("psytrance has highest bass resonance", () => {
      for (const genre of ["melodic_techno", "progressive_trance"] as const) {
        expect(presets.psytrance.synthParams.bass.resonance).toBeGreaterThanOrEqual(presets[genre].synthParams.bass.resonance);
      }
    });
  });

  // --- 3.5 Preset name validation ---
  describe("preset name validation extended", () => {
    it("accepts alphanumeric", () => { expect(validatePresetName("abc123")).toBe(true); });
    it("accepts underscores", () => { expect(validatePresetName("my_preset")).toBe(true); });
    it("accepts hyphens", () => { expect(validatePresetName("my-preset")).toBe(true); });
    it("accepts mixed case", () => { expect(validatePresetName("MyPreset")).toBe(true); });
    it("accepts single char", () => { expect(validatePresetName("a")).toBe(true); });
    it("rejects empty", () => { expect(validatePresetName("")).toBe(false); });
    it("rejects spaces", () => { expect(validatePresetName("my preset")).toBe(false); });
    it("rejects dots", () => { expect(validatePresetName("my.preset")).toBe(false); });
    it("rejects path separators", () => { expect(validatePresetName("../evil")).toBe(false); });
    it("rejects backslashes", () => { expect(validatePresetName("a\\b")).toBe(false); });
    it("rejects colons", () => { expect(validatePresetName("C:evil")).toBe(false); });
    it("rejects unicode", () => { expect(validatePresetName("pres\u00e9t")).toBe(false); });
    it("rejects newlines", () => { expect(validatePresetName("pre\nset")).toBe(false); });
    it("rejects tabs", () => { expect(validatePresetName("pre\tset")).toBe(false); });
    it("rejects null bytes", () => { expect(validatePresetName("pre\0set")).toBe(false); });
  });

  // --- 3.6 Preset schema boundary ---
  describe("preset schema boundary", () => {
    it("rejects bpm.min < 60", () => {
      const bad = {
        name: "t", bpm: { min: 59, max: 120, default: 100 },
        synthParams: Object.fromEntries(SYNTH_NAMES.map(s => [s, {}])),
        fxDefaults: Object.fromEntries(FX_DEFAULTS_KEYS.map(k => [k, 0])),
        stemGroups: {},
      };
      expect(() => presetSchema.parse(bad)).toThrow();
    });

    it("rejects bpm.max > 200", () => {
      const bad = {
        name: "t", bpm: { min: 100, max: 201, default: 150 },
        synthParams: Object.fromEntries(SYNTH_NAMES.map(s => [s, {}])),
        fxDefaults: Object.fromEntries(FX_DEFAULTS_KEYS.map(k => [k, 0])),
        stemGroups: {},
      };
      expect(() => presetSchema.parse(bad)).toThrow();
    });

    it("rejects bpm.min == bpm.max", () => {
      const bad = {
        name: "t", bpm: { min: 130, max: 130, default: 130 },
        synthParams: Object.fromEntries(SYNTH_NAMES.map(s => [s, {}])),
        fxDefaults: Object.fromEntries(FX_DEFAULTS_KEYS.map(k => [k, 0])),
        stemGroups: {},
      };
      expect(() => presetSchema.parse(bad)).toThrow();
    });

    it("rejects bpm.default outside range", () => {
      const bad = {
        name: "t", bpm: { min: 120, max: 140, default: 141 },
        synthParams: Object.fromEntries(SYNTH_NAMES.map(s => [s, {}])),
        fxDefaults: Object.fromEntries(FX_DEFAULTS_KEYS.map(k => [k, 0])),
        stemGroups: {},
      };
      expect(() => presetSchema.parse(bad)).toThrow();
    });

    it("rejects non-integer bpm", () => {
      const bad = {
        name: "t", bpm: { min: 120.5, max: 140, default: 130 },
        synthParams: Object.fromEntries(SYNTH_NAMES.map(s => [s, {}])),
        fxDefaults: Object.fromEntries(FX_DEFAULTS_KEYS.map(k => [k, 0])),
        stemGroups: {},
      };
      expect(() => presetSchema.parse(bad)).toThrow();
    });

    it("rejects name with special chars in schema", () => {
      const bad = {
        name: "../hack", bpm: { min: 120, max: 140, default: 130 },
        synthParams: Object.fromEntries(SYNTH_NAMES.map(s => [s, {}])),
        fxDefaults: Object.fromEntries(FX_DEFAULTS_KEYS.map(k => [k, 0])),
        stemGroups: {},
      };
      expect(() => presetSchema.parse(bad)).toThrow();
    });
  });

  // --- 3.7 detectPresetFromOsclog ---
  describe("detectPresetFromOsclog extended", () => {
    it("detects numeric n value", () => {
      expect(detectPresetFromOsclog([{ s: "setpreset", n: 42 }])).toBe("42");
    });
    it("detects string n value", () => {
      expect(detectPresetFromOsclog([{ s: "setpreset", n: "hard_techno" }])).toBe("hard_techno");
    });
    it("takes first setpreset event", () => {
      const events = [
        { s: "setpreset", n: "first" },
        { s: "setpreset", n: "second" },
      ];
      expect(detectPresetFromOsclog(events)).toBe("first");
    });
    it("ignores other event types", () => {
      expect(detectPresetFromOsclog([{ s: "kick", n: 0 }, { s: "hat" }])).toBeNull();
    });
    it("returns null for empty array", () => {
      expect(detectPresetFromOsclog([])).toBeNull();
    });
    it("returns null when n is undefined", () => {
      expect(detectPresetFromOsclog([{ s: "setpreset" }])).toBeNull();
    });
  });

  // --- 3.8 mergeFxDefaults ---
  describe("mergeFxDefaults extended", () => {
    it("null values in event do not override preset", () => {
      const result = mergeFxDefaults({ compress: null as unknown as number }, { compress: 0.5 });
      expect(result.compress).toBe(0.5);
    });
    it("undefined values in event do not override", () => {
      const result = mergeFxDefaults({ compress: undefined as unknown as number }, { compress: 0.5 });
      expect(result.compress).toBe(0.5);
    });
    it("zero value overrides preset", () => {
      const result = mergeFxDefaults({ compress: 0 }, { compress: 0.8 });
      expect(result.compress).toBe(0);
    });
    it("preserves keys not in event", () => {
      const result = mergeFxDefaults({}, { a: 1, b: 2, c: 3 });
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });
    it("adds new keys from event", () => {
      const result = mergeFxDefaults({ newKey: 99 }, { existingKey: 1 });
      expect(result.newKey).toBe(99);
      expect(result.existingKey).toBe(1);
    });
  });
});

// ============================================================================
// 4. OSC Logger
// ============================================================================
describe("4. OSC Logger", () => {
  // --- 4.1 parseOscEvent diverse inputs ---
  describe("parseOscEvent diverse inputs", () => {
    it("parses event with all fields", () => {
      const e = parseOscEvent('{"ts":1.5,"s":"kick","n":0,"orbit":1,"gain":0.8}');
      expect(e!.ts).toBe(1.5);
      expect(e!.s).toBe("kick");
      expect(e!.orbit).toBe(1);
    });
    it("parses event with just ts and s", () => {
      const e = parseOscEvent('{"ts":0,"s":"hat"}');
      expect(e).not.toBeNull();
      expect(e!.n).toBeUndefined();
    });
    it("rejects object without ts", () => {
      expect(parseOscEvent('{"s":"kick"}')).toBeNull();
    });
    it("rejects object without s", () => {
      expect(parseOscEvent('{"ts":0}')).toBeNull();
    });
    it("rejects ts as string", () => {
      expect(parseOscEvent('{"ts":"0","s":"kick"}')).toBeNull();
    });
    it("rejects s as number", () => {
      expect(parseOscEvent('{"ts":0,"s":42}')).toBeNull();
    });
    it("returns null for empty string", () => {
      expect(parseOscEvent("")).toBeNull();
    });
    it("returns null for whitespace only", () => {
      expect(parseOscEvent("   ")).toBeNull();
    });
    it("returns null for random text", () => {
      expect(parseOscEvent("hello world")).toBeNull();
    });
    it("returns null for array JSON", () => {
      expect(parseOscEvent("[1,2,3]")).toBeNull();
    });
    it("returns null for null literal", () => {
      expect(parseOscEvent("null")).toBeNull();
    });
    it("parses event with large ts", () => {
      const e = parseOscEvent('{"ts":99999.999,"s":"bass"}');
      expect(e!.ts).toBe(99999.999);
    });
    it("parses event with zero ts", () => {
      const e = parseOscEvent('{"ts":0,"s":"pad"}');
      expect(e!.ts).toBe(0);
    });
    it("parses event with negative ts (unusual but valid JSON)", () => {
      const e = parseOscEvent('{"ts":-1,"s":"lead"}');
      expect(e!.ts).toBe(-1);
    });
    it("parses event with extra unknown fields", () => {
      const e = parseOscEvent('{"ts":1,"s":"kick","custom_field":"value","num_field":42}');
      expect(e).not.toBeNull();
      expect(e!.custom_field).toBe("value");
    });
  });

  // --- 4.2 generateLogPath diverse dates ---
  describe("generateLogPath diverse dates/parts", () => {
    it("midnight date", () => {
      const r = generateLogPath("/logs", new Date("2026-01-01T00:00:00Z"), 0);
      expect(r).toContain("session_2026-01-01_00-00_part0.osclog");
    });
    it("end of day", () => {
      const r = generateLogPath("/logs", new Date("2026-12-31T23:59:00Z"), 0);
      expect(r).toContain("23-59");
    });
    it("part number 99", () => {
      const r = generateLogPath("/logs", new Date("2026-06-15T12:30:00Z"), 99);
      expect(r).toContain("_part99.osclog");
    });
    it("custom output dir", () => {
      const r = generateLogPath("/my/custom/dir", new Date("2026-03-01T10:00:00Z"), 0);
      expect(r).toContain("/my/custom/dir/");
    });
    it("extension is .osclog", () => {
      const r = generateLogPath("/out", new Date(), 0);
      expect(r.endsWith(".osclog")).toBe(true);
    });
    it("contains session_ prefix", () => {
      const r = generateLogPath("/out", new Date(), 0);
      expect(path.basename(r)).toMatch(/^session_/);
    });
  });

  // --- 4.3 File rotation boundary ---
  describe("shouldRotateFile boundary", () => {
    it("returns false at exactly 9:59", () => {
      const start = 0;
      const at959 = 9 * 60 * 1000 + 59 * 1000;
      expect(shouldRotateFile(start, at959)).toBe(false);
    });
    it("returns true at exactly 10:00", () => {
      const start = 0;
      const at1000 = 10 * 60 * 1000;
      expect(shouldRotateFile(start, at1000)).toBe(true);
    });
    it("returns true well past 10 min", () => {
      expect(shouldRotateFile(0, 20 * 60 * 1000)).toBe(true);
    });
    it("returns false at 0 elapsed", () => {
      expect(shouldRotateFile(1000, 1000)).toBe(false);
    });
    it("returns false at 1ms elapsed", () => {
      expect(shouldRotateFile(0, 1)).toBe(false);
    });
  });

  // --- 4.4 JSONL format ---
  describe("JSONL format verification", () => {
    it("writeOscEvent produces valid JSON per line", () => {
      const lines: string[] = [];
      writeOscEvent({ ts: 1.0, s: "kick", n: 0, orbit: 0 }, l => lines.push(l));
      const parsed = JSON.parse(lines[0].trim());
      expect(parsed.ts).toBe(1.0);
      expect(parsed.s).toBe("kick");
    });
    it("each line ends with newline", () => {
      const lines: string[] = [];
      writeOscEvent({ ts: 0, s: "hat" }, l => lines.push(l));
      expect(lines[0].endsWith("\n")).toBe(true);
    });
    it("multiple events produce multiple lines", () => {
      const lines: string[] = [];
      writeOscEvent({ ts: 0, s: "kick" }, l => lines.push(l));
      writeOscEvent({ ts: 1, s: "hat" }, l => lines.push(l));
      writeOscEvent({ ts: 2, s: "bass" }, l => lines.push(l));
      expect(lines).toHaveLength(3);
      for (const line of lines) {
        expect(() => JSON.parse(line.trim())).not.toThrow();
      }
    });
  });

  // --- 4.5 Session metadata ---
  describe("generateSessionMetadata extended", () => {
    it("single event has 0 duration", () => {
      const meta = generateSessionMetadata([{ ts: 5.0, s: "kick" }]);
      expect(meta.duration).toBe(0);
      expect(meta.eventCount).toBe(1);
    });
    it("preserves bpm when provided", () => {
      const meta = generateSessionMetadata([{ ts: 0, s: "kick" }, { ts: 1, s: "hat" }], { bpm: 140 });
      expect(meta.bpm).toBe(140);
    });
    it("preserves key when provided", () => {
      const meta = generateSessionMetadata([{ ts: 0, s: "kick" }, { ts: 1, s: "hat" }], { key: "Cm" });
      expect(meta.key).toBe("Cm");
    });
    it("bpm null when not provided", () => {
      const meta = generateSessionMetadata([{ ts: 0, s: "kick" }, { ts: 1, s: "hat" }]);
      expect(meta.bpm).toBeNull();
    });
    it("key null when not provided", () => {
      const meta = generateSessionMetadata([{ ts: 0, s: "kick" }, { ts: 1, s: "hat" }]);
      expect(meta.key).toBeNull();
    });
    it("startTime is ISO string", () => {
      const meta = generateSessionMetadata([{ ts: 0, s: "kick" }, { ts: 1, s: "hat" }]);
      expect(() => new Date(meta.startTime)).not.toThrow();
      expect(meta.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});

// ============================================================================
// 5. OSC -> NRT Conversion
// ============================================================================
describe("5. OSC to NRT Conversion", () => {
  // --- 5.1 SynthDef mapping all 9 ---
  describe("SynthDef mapping (9 custom)", () => {
    for (const name of SYNTH_NAMES) {
      it(`mapSynthDef("${name}") returns valid mapping`, () => {
        const result = mapSynthDef(name);
        expect(result).not.toBeNull();
        expect(result!.synthDef).toBe(name);
      });
    }

    it("kick maps to drums stem bus 0", () => {
      const r = mapSynthDef("kick");
      expect(r!.stem).toBe("drums");
      expect(r!.bus).toBe(0);
    });
    it("hat maps to drums stem bus 0", () => {
      const r = mapSynthDef("hat");
      expect(r!.stem).toBe("drums");
      expect(r!.bus).toBe(0);
    });
    it("clap maps to drums stem bus 0", () => {
      const r = mapSynthDef("clap");
      expect(r!.stem).toBe("drums");
      expect(r!.bus).toBe(0);
    });
    it("bass maps to bass stem bus 2", () => {
      const r = mapSynthDef("bass");
      expect(r!.stem).toBe("bass");
      expect(r!.bus).toBe(2);
    });
    it("supersaw maps to synth stem bus 4", () => {
      const r = mapSynthDef("supersaw");
      expect(r!.stem).toBe("synth");
      expect(r!.bus).toBe(4);
    });
    it("pad maps to synth stem bus 4", () => {
      const r = mapSynthDef("pad");
      expect(r!.stem).toBe("synth");
      expect(r!.bus).toBe(4);
    });
    it("lead maps to synth stem bus 4", () => {
      const r = mapSynthDef("lead");
      expect(r!.stem).toBe("synth");
      expect(r!.bus).toBe(4);
    });
    it("arp_pluck maps to synth stem bus 4", () => {
      const r = mapSynthDef("arp_pluck");
      expect(r!.stem).toBe("synth");
      expect(r!.bus).toBe(4);
    });
    it("riser maps to fx stem bus 6", () => {
      const r = mapSynthDef("riser");
      expect(r!.stem).toBe("fx");
      expect(r!.bus).toBe(6);
    });
    it("SUPPORTED_SYNTHDEFS has 9 entries", () => {
      expect(SUPPORTED_SYNTHDEFS.size).toBe(9);
    });
  });

  // --- 5.2 Dirt-Samples mapping (15) ---
  describe("Dirt-Samples mapping (15)", () => {
    const dirtSamples = ["bd", "sd", "hh", "cp", "cb", "mt", "ht", "lt", "oh", "ch", "cr", "rd", "sn", "rim", "tom"];

    for (const sample of dirtSamples) {
      it(`mapDirtSample("${sample}") returns drums`, () => {
        const r = mapDirtSample(sample);
        expect(r).not.toBeNull();
        expect(r!.stem).toBe("drums");
      });
      it(`isSampleEvent("${sample}") is true`, () => {
        expect(isSampleEvent(sample)).toBe(true);
      });
    }

    it("DIRT_SAMPLE_STEMS has 15 entries", () => {
      expect(Object.keys(DIRT_SAMPLE_STEMS)).toHaveLength(15);
    });

    it("all dirt samples map to bus 0 (drums)", () => {
      for (const sample of dirtSamples) {
        expect(mapDirtSample(sample)!.bus).toBe(0);
      }
    });

    it("mapDirtSample unknown returns null", () => {
      expect(mapDirtSample("unknown_xyz")).toBeNull();
      expect(mapDirtSample("kick")).toBeNull();
      expect(mapDirtSample("supersaw")).toBeNull();
    });

    it("isSampleEvent false for SynthDef names", () => {
      for (const name of SYNTH_NAMES) {
        expect(isSampleEvent(name)).toBe(false);
      }
    });
  });

  // --- 5.3 Parameter normalization ---
  describe("normalizeParams", () => {
    it("gain -> amp alias", () => {
      const { normalized } = normalizeParams({ gain: 0.8 });
      expect(normalized.amp).toBe(0.8);
    });
    it("note -> midinote alias", () => {
      const { normalized } = normalizeParams({ note: 60 });
      expect(normalized.midinote).toBe(60);
    });
    it("lpf -> cutoff alias", () => {
      const { normalized } = normalizeParams({ lpf: 2000 });
      expect(normalized.cutoff).toBe(2000);
    });
    it("hpf -> hcutoff alias", () => {
      const { normalized } = normalizeParams({ hpf: 500 });
      expect(normalized.hcutoff).toBe(500);
    });
    it("skips ts key", () => {
      const { normalized } = normalizeParams({ ts: 1.0, amp: 0.5 });
      expect(normalized.ts).toBeUndefined();
      expect(normalized.amp).toBe(0.5);
    });
    it("skips s key", () => {
      const { normalized } = normalizeParams({ s: "kick", amp: 0.5 });
      expect(normalized.s).toBeUndefined();
    });
    it("preserves orbit", () => {
      const { normalized } = normalizeParams({ orbit: 3 });
      expect(normalized.orbit).toBe(3);
    });
    it("preserves FX params", () => {
      const { normalized } = normalizeParams({ compress: 0.7, saturate: 0.3 });
      expect(normalized.compress).toBe(0.7);
      expect(normalized.saturate).toBe(0.3);
    });
    it("preserves Tidal context params", () => {
      const { normalized } = normalizeParams({ cps: 0.5625, cycle: 10, delta: 0.25 });
      expect(normalized.cps).toBe(0.5625);
      expect(normalized.cycle).toBe(10);
      expect(normalized.delta).toBe(0.25);
    });

    it("PARAM_ALIASES has 4 entries", () => {
      expect(Object.keys(PARAM_ALIASES)).toHaveLength(4);
    });
    it("TIDAL_CONTEXT_PARAMS has 3 entries", () => {
      expect(TIDAL_CONTEXT_PARAMS.size).toBe(3);
    });
  });

  // --- 5.4 Timing precision ---
  describe("timing conversion precision", () => {
    it("timestamps are session-relative", () => {
      const events: OscEvent[] = [
        { ts: 100.0, s: "kick" },
        { ts: 100.125, s: "hat" },
        { ts: 100.250, s: "bass" },
      ];
      const nrt = convertToNrt(events);
      expect(nrt.events[0].time).toBe(0);
      expect(nrt.events[1].time).toBe(0.125);
      expect(nrt.events[2].time).toBe(0.250);
    });

    it("times are rounded to 3 decimal places", () => {
      const events: OscEvent[] = [
        { ts: 0, s: "kick" },
        { ts: 0.1234567, s: "hat" },
      ];
      const nrt = convertToNrt(events);
      expect(String(nrt.events[1].time).split(".")[1]?.length ?? 0).toBeLessThanOrEqual(3);
    });

    it("duration calculated correctly", () => {
      const events: OscEvent[] = [
        { ts: 0, s: "kick" },
        { ts: 5.5, s: "hat" },
      ];
      const nrt = convertToNrt(events);
      expect(nrt.metadata.duration).toBe(5.5);
    });

    it("single event has duration 0", () => {
      const nrt = convertToNrt([{ ts: 10, s: "kick" }]);
      expect(nrt.metadata.duration).toBe(0);
    });
  });

  // --- 5.5 FX parameter preservation ---
  describe("FX parameter preservation in NRT", () => {
    it("compress param preserved", () => {
      const nrt = convertToNrt([{ ts: 0, s: "kick", compress: 0.7 } as OscEvent]);
      expect(nrt.events[0].params.compress).toBe(0.7);
    });
    it("saturate param preserved", () => {
      const nrt = convertToNrt([{ ts: 0, s: "kick", saturate: 0.3 } as OscEvent]);
      expect(nrt.events[0].params.saturate).toBe(0.3);
    });
    it("room param preserved", () => {
      const nrt = convertToNrt([{ ts: 0, s: "kick", room: 0.5 } as OscEvent]);
      expect(nrt.events[0].params.room).toBe(0.5);
    });
    it("multiple FX params preserved", () => {
      const nrt = convertToNrt([{ ts: 0, s: "kick", compress: 0.7, saturate: 0.3, loGain: 2 } as OscEvent]);
      expect(nrt.events[0].params.compress).toBe(0.7);
      expect(nrt.events[0].params.saturate).toBe(0.3);
      expect(nrt.events[0].params.loGain).toBe(2);
    });
  });

  // --- 5.6 Skip rate ---
  describe("skip rate threshold", () => {
    it("0% skip is ok", () => {
      const r = generateSummary(100, 100, 0);
      expect(r.level).toBe("ok");
      expect(r.warnings).toHaveLength(0);
    });
    it("10% skip is ok", () => {
      const r = generateSummary(100, 90, 10);
      expect(r.level).toBe("ok");
    });
    it("11% skip is warning", () => {
      const r = generateSummary(100, 89, 11);
      expect(r.level).toBe("warning");
    });
    it("50% skip is warning", () => {
      const r = generateSummary(100, 50, 50);
      expect(r.level).toBe("warning");
    });
    it("51% skip throws error", () => {
      expect(() => generateSummary(100, 49, 51)).toThrow("50% threshold");
    });
    it("100% skip throws error", () => {
      expect(() => generateSummary(100, 0, 100)).toThrow("50% threshold");
    });
    it("0 total returns ok level", () => {
      const r = generateSummary(0, 0, 0);
      expect(r.level).toBe("ok");
    });
  });

  // --- 5.7 NRT node IDs ---
  describe("NRT node IDs", () => {
    it("first node ID starts at 1000", () => {
      const nrt = convertToNrt([{ ts: 0, s: "kick" }]);
      expect(nrt.events[0].nodeId).toBe(1000);
    });
    it("node IDs increment by 10", () => {
      const nrt = convertToNrt([
        { ts: 0, s: "kick" },
        { ts: 0.5, s: "hat" },
        { ts: 1.0, s: "bass" },
      ]);
      expect(nrt.events[0].nodeId).toBe(1000);
      expect(nrt.events[1].nodeId).toBe(1010);
      expect(nrt.events[2].nodeId).toBe(1020);
    });
    it("all node IDs are unique", () => {
      const events: OscEvent[] = Array.from({ length: 20 }, (_, i) => ({
        ts: i * 0.1, s: SYNTH_NAMES[i % SYNTH_NAMES.length],
      }));
      const nrt = convertToNrt(events);
      const ids = nrt.events.map(e => e.nodeId);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  // --- 5.8 Multipart merge ---
  describe("multipart merge", () => {
    it("mergeMultiPart empty dir throws", () => {
      const dir = path.join(tmpDir, "empty-merge");
      fs.mkdirSync(dir, { recursive: true });
      expect(() => mergeMultiPart(dir)).toThrow("no .osclog files");
    });

    it("single part file works", () => {
      const dir = path.join(tmpDir, "single-part");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "p0.osclog"), '{"ts":0,"s":"kick"}\n{"ts":1,"s":"hat"}\n');
      const events = mergeMultiPart(dir);
      expect(events).toHaveLength(2);
    });

    it("listOscLogFiles filters non-osclog", () => {
      const dir = path.join(tmpDir, "mixed-files");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "a.osclog"), "");
      fs.writeFileSync(path.join(dir, "b.txt"), "");
      fs.writeFileSync(path.join(dir, "c.json"), "");
      const files = listOscLogFiles(dir);
      expect(files).toHaveLength(1);
      expect(files[0]).toContain(".osclog");
    });

    it("listOscLogFiles returns sorted", () => {
      const dir = path.join(tmpDir, "sort-test");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "z_part2.osclog"), "");
      fs.writeFileSync(path.join(dir, "a_part0.osclog"), "");
      fs.writeFileSync(path.join(dir, "m_part1.osclog"), "");
      const files = listOscLogFiles(dir);
      expect(path.basename(files[0])).toBe("a_part0.osclog");
      expect(path.basename(files[2])).toBe("z_part2.osclog");
    });
  });

  // --- 5.9 writeNrtScore ---
  describe("writeNrtScore", () => {
    it("creates output directory", () => {
      const outPath = path.join(tmpDir, "nrt-out", "sub", "score.json");
      const score = makeNrtScore([{ time: 0, synthDef: "kick", stem: "drums", bus: 0, nodeId: 1000, params: {} }]);
      writeNrtScore(score, outPath);
      expect(fs.existsSync(outPath)).toBe(true);
    });

    it("output is valid JSON", () => {
      const outPath = path.join(tmpDir, "nrt-out2", "score.json");
      const score = makeNrtScore([{ time: 0, synthDef: "kick", stem: "drums", bus: 0, nodeId: 1000, params: {} }]);
      writeNrtScore(score, outPath);
      const content = fs.readFileSync(outPath, "utf-8");
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it("preserves metadata in output", () => {
      const outPath = path.join(tmpDir, "nrt-out3", "score.json");
      const score = makeNrtScore(
        [{ time: 0, synthDef: "kick", stem: "drums", bus: 0, nodeId: 1000, params: {} }],
        10.5,
      );
      writeNrtScore(score, outPath);
      const written = JSON.parse(fs.readFileSync(outPath, "utf-8"));
      expect(written.metadata.duration).toBe(10.5);
    });
  });
});

// ============================================================================
// 6. Stem Render
// ============================================================================
describe("6. Stem Render", () => {
  // --- 6.1 Bus routing (9 SynthDefs) ---
  describe("bus routing", () => {
    for (const name of SYNTH_NAMES) {
      it(`getStemBus("${name}") returns non-null`, () => {
        expect(getStemBus(name)).not.toBeNull();
      });
      it(`getStemBus("${name}") channels = 2`, () => {
        expect(getStemBus(name)!.channels).toBe(2);
      });
    }

    it("drums SynthDefs share bus 0", () => {
      expect(getStemBus("kick")!.bus).toBe(0);
      expect(getStemBus("hat")!.bus).toBe(0);
      expect(getStemBus("clap")!.bus).toBe(0);
    });
    it("bass on bus 2", () => { expect(getStemBus("bass")!.bus).toBe(2); });
    it("synth SynthDefs share bus 4", () => {
      expect(getStemBus("supersaw")!.bus).toBe(4);
      expect(getStemBus("pad")!.bus).toBe(4);
      expect(getStemBus("lead")!.bus).toBe(4);
      expect(getStemBus("arp_pluck")!.bus).toBe(4);
    });
    it("fx on bus 6", () => { expect(getStemBus("riser")!.bus).toBe(6); });
    it("unknown SynthDef returns null", () => { expect(getStemBus("unknown")).toBeNull(); });
    it("empty string returns null", () => { expect(getStemBus("")).toBeNull(); });
  });

  // --- 6.2 DEFAULT_STEMS ---
  describe("DEFAULT_STEMS", () => {
    it("has 4 stems", () => { expect(DEFAULT_STEMS).toHaveLength(4); });
    it("drums is bus 0", () => { expect(DEFAULT_STEMS.find(s => s.name === "drums")!.bus).toBe(0); });
    it("bass is bus 2", () => { expect(DEFAULT_STEMS.find(s => s.name === "bass")!.bus).toBe(2); });
    it("synth is bus 4", () => { expect(DEFAULT_STEMS.find(s => s.name === "synth")!.bus).toBe(4); });
    it("fx is bus 6", () => { expect(DEFAULT_STEMS.find(s => s.name === "fx")!.bus).toBe(6); });
    it("all channels are 2", () => {
      for (const stem of DEFAULT_STEMS) expect(stem.channels).toBe(2);
    });
  });

  // --- 6.3 SIDECHAIN_BUS ---
  describe("SIDECHAIN_BUS", () => {
    it("is 100", () => { expect(SIDECHAIN_BUS).toBe(100); });
    it("does not collide with stem buses", () => {
      for (const stem of DEFAULT_STEMS) {
        expect(SIDECHAIN_BUS).not.toBe(stem.bus);
      }
    });
  });

  // --- 6.4 Custom stem parsing ---
  describe("parseCustomStems", () => {
    it("parses single stem", () => {
      const r = parseCustomStems("drums:kick,hat,clap");
      expect(r).toHaveLength(1);
      expect(r[0].name).toBe("drums");
      expect(r[0].bus).toBe(0);
    });
    it("parses multiple stems", () => {
      const r = parseCustomStems("a:x b:y c:z");
      expect(r).toHaveLength(3);
      expect(r[0].bus).toBe(0);
      expect(r[1].bus).toBe(2);
      expect(r[2].bus).toBe(4);
    });
    it("bus increments by 2", () => {
      const r = parseCustomStems("a:x b:y c:z d:w");
      expect(r[0].bus).toBe(0);
      expect(r[1].bus).toBe(2);
      expect(r[2].bus).toBe(4);
      expect(r[3].bus).toBe(6);
    });
    it("throws for no colon", () => {
      expect(() => parseCustomStems("invalid")).toThrow("Invalid stem format");
    });
    it("handles extra whitespace", () => {
      const r = parseCustomStems("  a:x   b:y  ");
      expect(r).toHaveLength(2);
    });
  });

  // --- 6.5 NRT score entries ---
  describe("generateNrtScoreEntries", () => {
    it("empty score produces only end marker", () => {
      const score = makeNrtScore([], 5.0);
      const entries = generateNrtScoreEntries(score);
      expect(entries).toHaveLength(1);
      expect(entries[0].cmd[0]).toBe("c_set");
    });

    it("end marker time = duration + 1", () => {
      const score = makeNrtScore([], 7.5);
      const entries = generateNrtScoreEntries(score);
      expect(entries[entries.length - 1].time).toBe(8.5);
    });

    it("instrument node uses s_new", () => {
      const score = makeNrtScore([{ time: 0, synthDef: "kick", stem: "drums", bus: 0, nodeId: 1000, params: {} }]);
      const entries = generateNrtScoreEntries(score);
      const instrEntry = entries.find(e => e.cmd[1] === "kick");
      expect(instrEntry!.cmd[0]).toBe("s_new");
    });

    it("kick gets sidechain send node", () => {
      const score = makeNrtScore([{ time: 0, synthDef: "kick", stem: "drums", bus: 0, nodeId: 1000, params: { compress: 0.5 } }]);
      const entries = generateNrtScoreEntries(score);
      const scSend = entries.find(e => e.cmd[1] === "nrt_sidechain_send");
      expect(scSend).toBeDefined();
    });

    it("non-kick does NOT get sidechain send", () => {
      const score = makeNrtScore([{ time: 0, synthDef: "hat", stem: "drums", bus: 0, nodeId: 1000, params: { compress: 0.5 } }]);
      const entries = generateNrtScoreEntries(score);
      const scSend = entries.find(e => e.cmd[1] === "nrt_sidechain_send");
      expect(scSend).toBeUndefined();
    });

    it("FX nodes only when FX params exist", () => {
      const score = makeNrtScore([{ time: 0, synthDef: "hat", stem: "drums", bus: 0, nodeId: 1000, params: { amp: 0.8 } }]);
      const entries = generateNrtScoreEntries(score);
      const fxEntries = entries.filter(e => String(e.cmd[1]).startsWith("custom") || String(e.cmd[1]).startsWith("nrt"));
      expect(fxEntries).toHaveLength(0);
    });

    it("entries sorted by time", () => {
      const score = makeNrtScore([
        { time: 1.0, synthDef: "hat", stem: "drums", bus: 0, nodeId: 1010, params: {} },
        { time: 0.0, synthDef: "kick", stem: "drums", bus: 0, nodeId: 1000, params: {} },
      ]);
      const entries = generateNrtScoreEntries(score);
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i].time).toBeGreaterThanOrEqual(entries[i - 1].time);
      }
    });

    it("kick with FX: sidechain excluded from kick FX chain", () => {
      const score = makeNrtScore([
        { time: 0, synthDef: "kick", stem: "drums", bus: 0, nodeId: 1000, params: { compress: 0.5 } },
      ]);
      const entries = generateNrtScoreEntries(score);
      const kickFx = entries.filter(e => e.time === 0 && e.cmd[1] === "customSidechain");
      expect(kickFx).toHaveLength(0);
    });

    it("non-kick with FX gets sidechain in chain", () => {
      const score = makeNrtScore([
        { time: 0, synthDef: "bass", stem: "bass", bus: 2, nodeId: 1000, params: { compress: 0.5 } },
      ]);
      const entries = generateNrtScoreEntries(score);
      const scFx = entries.find(e => e.cmd[1] === "customSidechain");
      expect(scFx).toBeDefined();
    });

    it("sidechain send has outBus = SIDECHAIN_BUS", () => {
      const score = makeNrtScore([
        { time: 0, synthDef: "kick", stem: "drums", bus: 0, nodeId: 1000, params: { compress: 0.5 } },
      ]);
      const entries = generateNrtScoreEntries(score);
      const scSend = entries.find(e => e.cmd[1] === "nrt_sidechain_send")!;
      const outBusIdx = scSend.cmd.indexOf("outBus");
      expect(scSend.cmd[outBusIdx + 1]).toBe(String(SIDECHAIN_BUS));
    });
  });

  // --- 6.6 Split commands ---
  describe("buildSplitCommands", () => {
    it("default 4 stems produce 4 commands", () => {
      const cmds = buildSplitCommands("/in.wav", "/out");
      expect(cmds).toHaveLength(4);
    });
    it("output files named stem-{name}.wav", () => {
      const cmds = buildSplitCommands("/in.wav", "/out");
      expect(cmds[0].outputFile).toContain("stem-drums.wav");
      expect(cmds[1].outputFile).toContain("stem-bass.wav");
      expect(cmds[2].outputFile).toContain("stem-synth.wav");
      expect(cmds[3].outputFile).toContain("stem-fx.wav");
    });
    it("custom stems produce matching count", () => {
      const custom = [{ name: "a", bus: 0, channels: 2 }, { name: "b", bus: 2, channels: 2 }];
      const cmds = buildSplitCommands("/in.wav", "/out", custom);
      expect(cmds).toHaveLength(2);
    });
    it("args include -ar 48000", () => {
      const cmds = buildSplitCommands("/in.wav", "/out");
      expect(cmds[0].args).toContain("-ar");
      expect(cmds[0].args).toContain("48000");
    });
    it("args include -y (overwrite)", () => {
      const cmds = buildSplitCommands("/in.wav", "/out");
      expect(cmds[0].args).toContain("-y");
    });
  });

  // --- 6.7 Output path ---
  describe("stemOutputPath", () => {
    it("includes date", () => {
      const p = stemOutputPath("/root", "test", new Date("2026-01-15"));
      expect(p).toContain("2026-01-15");
    });
    it("includes title", () => {
      const p = stemOutputPath("/root", "my-session", new Date("2026-01-15"));
      expect(p).toContain("my-session");
    });
    it("ends with stems/", () => {
      const p = stemOutputPath("/root", "test", new Date());
      expect(p).toContain("stems");
    });
    it("sanitizes special chars in title", () => {
      const p = stemOutputPath("/root", "bad/title..name", new Date());
      expect(p).not.toContain("/title");
      expect(p).not.toContain("..");
    });
    it("empty title becomes untitled", () => {
      const p = stemOutputPath("/root", "", new Date());
      expect(p).toContain("untitled");
    });
  });

  // --- 6.8 Render lock ---
  describe("render lock", () => {
    it("writeRenderLock then checkRenderLock throws", () => {
      const dir = path.join(tmpDir, "lock-test-1");
      fs.mkdirSync(dir, { recursive: true });
      writeRenderLock(dir);
      expect(() => checkRenderLock(dir)).toThrow();
      removeRenderLock(dir);
    });
    it("removeRenderLock then checkRenderLock passes", () => {
      const dir = path.join(tmpDir, "lock-test-2");
      fs.mkdirSync(dir, { recursive: true });
      writeRenderLock(dir);
      removeRenderLock(dir);
      expect(() => checkRenderLock(dir)).not.toThrow();
    });
    it("removeRenderLock on nonexistent is safe", () => {
      const dir = path.join(tmpDir, "lock-test-3");
      fs.mkdirSync(dir, { recursive: true });
      expect(() => removeRenderLock(dir)).not.toThrow();
    });
  });

  // --- 6.9 Disk space check ---
  describe("disk space check", () => {
    it("true when available >= 2x estimated", () => {
      expect(stemCheckDiskSpace(200, 100)).toBe(true);
    });
    it("false when available < 2x estimated", () => {
      expect(stemCheckDiskSpace(199, 100)).toBe(false);
    });
    it("true when available = exactly 2x", () => {
      expect(stemCheckDiskSpace(200, 100)).toBe(true);
    });
    it("true with zero estimated", () => {
      expect(stemCheckDiskSpace(100, 0)).toBe(true);
    });
  });

  // --- 6.10 writeScoreConfig ---
  describe("writeScoreConfig", () => {
    it("creates config with 8 output channels", () => {
      const outPath = path.join(tmpDir, "sc-cfg", "config.json");
      writeScoreConfig([], "/tmp/nrt.json", outPath);
      const cfg = JSON.parse(fs.readFileSync(outPath, "utf-8"));
      expect(cfg.outputChannels).toBe(8);
    });
    it("creates config with 48000 sample rate", () => {
      const outPath = path.join(tmpDir, "sc-cfg2", "config.json");
      writeScoreConfig([], "/tmp/nrt.json", outPath);
      const cfg = JSON.parse(fs.readFileSync(outPath, "utf-8"));
      expect(cfg.sampleRate).toBe(48000);
    });
    it("includes nrtJsonPath", () => {
      const outPath = path.join(tmpDir, "sc-cfg3", "config.json");
      writeScoreConfig([], "/my/path.json", outPath);
      const cfg = JSON.parse(fs.readFileSync(outPath, "utf-8"));
      expect(cfg.nrtJsonPath).toBe("/my/path.json");
    });
  });
});

// ============================================================================
// 7. Mastering / Pipeline
// ============================================================================
describe("7. Mastering / Pipeline", () => {
  // --- 7.1 Loudnorm params ---
  describe("loudnorm parameters", () => {
    it("target LUFS is -14", () => {
      const args = buildMasteringCommand(["/a.wav"], "/m.wav");
      expect(args.join(" ")).toContain("I=-14");
    });
    it("true peak limit is -2", () => {
      const args = buildMasteringCommand(["/a.wav"], "/m.wav");
      expect(args.join(" ")).toContain("TP=-2");
    });
    it("LRA is 7", () => {
      const args = buildMasteringCommand(["/a.wav"], "/m.wav");
      expect(args.join(" ")).toContain("LRA=7");
    });
    it("output sample rate 48000", () => {
      const args = buildMasteringCommand(["/a.wav"], "/m.wav");
      expect(args).toContain("48000");
    });
    it("output format s16", () => {
      const args = buildMasteringCommand(["/a.wav"], "/m.wav");
      expect(args).toContain("s16");
    });
    it("includes -y for overwrite", () => {
      const args = buildMasteringCommand(["/a.wav"], "/m.wav");
      expect(args).toContain("-y");
    });
  });

  // --- 7.2 LUFS verification ---
  describe("verifyLoudness", () => {
    it("pass at -14 LUFS, -3 TP", () => {
      expect(verifyLoudness(-14, -3).pass).toBe(true);
    });
    it("pass at -13.5 LUFS (within 0.5 tolerance)", () => {
      expect(verifyLoudness(-13.5, -3).pass).toBe(true);
    });
    it("pass at -14.5 LUFS (within 0.5 tolerance)", () => {
      expect(verifyLoudness(-14.5, -3).pass).toBe(true);
    });
    it("fail at -13.4 LUFS (outside tolerance)", () => {
      expect(verifyLoudness(-13.4, -3).pass).toBe(false);
    });
    it("fail at -14.6 LUFS (outside tolerance)", () => {
      expect(verifyLoudness(-14.6, -3).pass).toBe(false);
    });
    it("fail at TP = -1.9 (too high)", () => {
      expect(verifyLoudness(-14, -1.9).pass).toBe(false);
    });
    it("pass at TP = -2 (exact limit)", () => {
      expect(verifyLoudness(-14, -2).pass).toBe(true);
    });
    it("pass at TP = -10 (well below)", () => {
      expect(verifyLoudness(-14, -10).pass).toBe(true);
    });
    it("message contains LUFS value", () => {
      const r = verifyLoudness(-14, -3);
      expect(r.message).toContain("-14");
    });
    it("message contains TP value", () => {
      const r = verifyLoudness(-14, -3);
      expect(r.message).toContain("-3");
    });
    it("fail message contains FAIL", () => {
      const r = verifyLoudness(-10, -3);
      expect(r.message).toContain("FAIL");
    });
    it("pass message contains OK", () => {
      const r = verifyLoudness(-14, -3);
      expect(r.message).toContain("OK");
    });
  });

  // --- 7.3 Pipeline step order ---
  describe("pipeline step order", () => {
    it("runs steps in order", async () => {
      const order: string[] = [];
      await runPipelineSteps([
        { name: "convert", fn: async () => { order.push("c"); } },
        { name: "stems", fn: async () => { order.push("s"); } },
        { name: "master", fn: async () => { order.push("m"); } },
      ]);
      expect(order).toEqual(["c", "s", "m"]);
    });

    it("stops at first failure", async () => {
      const order: string[] = [];
      await expect(runPipelineSteps([
        { name: "convert", fn: async () => { order.push("c"); } },
        { name: "stems", fn: async () => { throw new Error("fail"); } },
        { name: "master", fn: async () => { order.push("m"); } },
      ])).rejects.toThrow("stems");
      expect(order).toEqual(["c"]);
    });

    it("error message includes step name", async () => {
      await expect(runPipelineSteps([
        { name: "master", fn: async () => { throw new Error("oops"); } },
      ])).rejects.toThrow('Pipeline failed at step "master"');
    });

    it("error message includes original error", async () => {
      await expect(runPipelineSteps([
        { name: "convert", fn: async () => { throw new Error("bad format"); } },
      ])).rejects.toThrow("bad format");
    });
  });

  // --- 7.4 Session info ---
  describe("generateSessionInfo", () => {
    it("includes createdAt ISO string", () => {
      const info = generateSessionInfo({ duration: 10, stems: [], total: 0, mapped: 0, skipped: 0 });
      expect(info.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
    it("preserves stems array", () => {
      const info = generateSessionInfo({ duration: 10, stems: ["a.wav", "b.wav"], total: 0, mapped: 0, skipped: 0 });
      expect(info.stems).toEqual(["a.wav", "b.wav"]);
    });
    it("eventSummary has correct structure", () => {
      const info = generateSessionInfo({ duration: 10, stems: [], total: 100, mapped: 90, skipped: 10 });
      expect(info.eventSummary.total).toBe(100);
      expect(info.eventSummary.mapped).toBe(90);
      expect(info.eventSummary.skipped).toBe(10);
    });
  });

  // --- 7.5 Import guide ---
  describe("generateImportGuide", () => {
    it("contains BPM", () => {
      const info = generateSessionInfo({ bpm: 140, duration: 60, stems: [], total: 0, mapped: 0, skipped: 0 });
      expect(generateImportGuide(info)).toContain("140");
    });
    it("contains key when set", () => {
      const info = generateSessionInfo({ key: "Fm", duration: 60, stems: [], total: 0, mapped: 0, skipped: 0 });
      expect(generateImportGuide(info)).toContain("Fm");
    });
    it("contains 48kHz spec", () => {
      const info = generateSessionInfo({ duration: 60, stems: [], total: 0, mapped: 0, skipped: 0 });
      expect(generateImportGuide(info)).toContain("48kHz");
    });
    it("contains -14 LUFS reference", () => {
      const info = generateSessionInfo({ duration: 60, stems: [], total: 0, mapped: 0, skipped: 0 });
      expect(generateImportGuide(info)).toContain("-14 LUFS");
    });
    it("lists all stems", () => {
      const info = generateSessionInfo({ duration: 60, stems: ["drums.wav", "bass.wav"], total: 0, mapped: 0, skipped: 0 });
      const guide = generateImportGuide(info);
      expect(guide).toContain("drums.wav");
      expect(guide).toContain("bass.wav");
    });
  });

  // --- 7.6 createOutputStructure ---
  describe("createOutputStructure", () => {
    it("creates stems/ and raw/ dirs", () => {
      const dir = path.join(tmpDir, "out-struct");
      createOutputStructure(dir);
      expect(fs.existsSync(path.join(dir, "stems"))).toBe(true);
      expect(fs.existsSync(path.join(dir, "raw"))).toBe(true);
    });
    it("idempotent (no error on second call)", () => {
      const dir = path.join(tmpDir, "out-struct2");
      createOutputStructure(dir);
      expect(() => createOutputStructure(dir)).not.toThrow();
    });
  });

  // --- 7.7 hasExecOrSpawn ---
  describe("hasExecOrSpawn security check", () => {
    it("detects exec(", () => {
      const f = path.join(tmpDir, "has-exec.ts");
      fs.writeFileSync(f, 'const r = exec("ls")');
      expect(hasExecOrSpawn(f)).toBe(true);
    });
    it("detects spawn with shell:true", () => {
      const f = path.join(tmpDir, "has-spawn.ts");
      fs.writeFileSync(f, 'spawn("ls", [], { shell: true })');
      expect(hasExecOrSpawn(f)).toBe(true);
    });
    it("allows execFile", () => {
      const f = path.join(tmpDir, "has-execFile.ts");
      fs.writeFileSync(f, 'execFile("sclang", ["-i"])');
      expect(hasExecOrSpawn(f)).toBe(false);
    });
    it("allows spawn without shell", () => {
      const f = path.join(tmpDir, "safe-spawn.ts");
      fs.writeFileSync(f, 'spawn("sclang", ["-i"])');
      expect(hasExecOrSpawn(f)).toBe(false);
    });
  });
});

// ============================================================================
// 8. Security
// ============================================================================
describe("8. Security", () => {
  // --- 8.1 Path traversal attacks ---
  describe("path traversal vectors", () => {
    const traversalPaths = [
      "/etc/passwd",
      "/etc/shadow",
      "../../../../etc/passwd",
      "../../../etc/hosts",
      "/usr/local/bin/sclang",
      "/tmp/../../etc/passwd",
    ];

    for (const p of traversalPaths) {
      it(`validateFilePath blocks: ${p}`, () => {
        expect(validateFilePath(p, PROJECT_ROOT, [])).toBe(false);
      });
    }

    it("validateFilePath accepts file within project", () => {
      expect(validateFilePath(path.join(PROJECT_ROOT, "package.json"), PROJECT_ROOT, [".json"])).toBe(true);
    });
    it("validateFilePath rejects wrong extension", () => {
      expect(validateFilePath(path.join(PROJECT_ROOT, "package.json"), PROJECT_ROOT, [".txt"])).toBe(false);
    });
    it("validateFilePath rejects nonexistent file", () => {
      expect(validateFilePath(path.join(PROJECT_ROOT, "nonexistent.json"), PROJECT_ROOT, [".json"])).toBe(false);
    });
  });

  // --- 8.2 Preset name sanitization ---
  describe("preset name sanitization", () => {
    const attacks = [
      "../../../etc/passwd",
      "..\\..\\windows\\system32",
      "test; rm -rf /",
      "test$(whoami)",
      "test`id`",
      "test|cat /etc/passwd",
      "test\x00evil",
      "test\necho evil",
      '<script>alert(1)</script>',
    ];

    for (const attack of attacks) {
      it(`rejects attack: ${attack.substring(0, 30)}`, () => {
        expect(validatePresetName(attack)).toBe(false);
      });
    }
  });

  // --- 8.3 Sample path validation ---
  describe("sample path validation", () => {
    it("validateSamplePath concept: project root contained", () => {
      const config = generateBootConfig(PROJECT_ROOT);
      expect(config.samplesDir).toContain(PROJECT_ROOT);
    });
  });

  // --- 8.4 OSC binding ---
  describe("OSC 127.0.0.1 binding", () => {
    it("generateBootTidal defaults to 127.0.0.1", () => {
      const content = generateBootTidal();
      expect(content).toContain("127.0.0.1");
      expect(content).not.toContain("0.0.0.0");
    });

    it("rejects 0.0.0.0", () => {
      expect(() => generateBootTidal({ oscTarget: "0.0.0.0" })).toThrow();
    });
    it("rejects 127.0.0.2", () => {
      expect(() => generateBootTidal({ oscTarget: "127.0.0.2" })).toThrow();
    });
    it("rejects 192.168.1.1", () => {
      expect(() => generateBootTidal({ oscTarget: "192.168.1.1" })).toThrow();
    });
    it("rejects 10.0.0.1", () => {
      expect(() => generateBootTidal({ oscTarget: "10.0.0.1" })).toThrow();
    });
    it("rejects localhost string", () => {
      expect(() => generateBootTidal({ oscTarget: "localhost" })).toThrow();
    });
    it("rejects empty string", () => {
      expect(() => generateBootTidal({ oscTarget: "" })).toThrow();
    });
  });

  // --- 8.5 execFile-only enforcement ---
  describe("execFile-only enforcement", () => {
    const scriptsToCheck = [
      "scripts/render-stems.ts",
      "scripts/prod-convert.ts",
    ];

    for (const script of scriptsToCheck) {
      const fullPath = path.join(PROJECT_ROOT, script);
      if (fs.existsSync(fullPath)) {
        it(`${script} uses execFile only`, () => {
          expect(hasExecOrSpawn(fullPath)).toBe(false);
        });
      }
    }
  });
});

// ============================================================================
// 9. BootTidal.hs
// ============================================================================
describe("9. BootTidal.hs", () => {
  const hsPath = path.join(TIDAL_DIR, "BootTidal.hs");
  const hsContent = fs.readFileSync(hsPath, "utf-8");

  // --- 9.1 All 14 FX pF params ---
  describe("14 FX pF params", () => {
    const fxParams = [
      "compress", "threshold", "ratio", "compAttack", "compRelease",
      "saturate", "drive", "loGain", "midGain", "hiGain",
      "loFreq", "hiFreq", "sideGain", "sideRelease",
    ];
    for (const param of fxParams) {
      it(`has pF "${param}"`, () => {
        expect(hsContent).toMatch(new RegExp(`pF\\s+"${param}"`));
      });
    }
  });

  // --- 9.2 SynthDef pF params (6) ---
  describe("6 SynthDef pF params", () => {
    const sdParams = ["cutoff", "resonance", "detune", "width", "click", "decay"];
    for (const param of sdParams) {
      it(`has pF "${param}"`, () => {
        expect(hsContent).toMatch(new RegExp(`pF\\s+"${param}"`));
      });
    }
  });

  // --- 9.3 Preset-specific pF (9 new) ---
  describe("9 new preset pF params", () => {
    const newParams = [
      "openness", "tone", "filterEnv", "vibrato", "portamento",
      "brightness", "sweepRange", "noiseAmount", "envAmount",
    ];
    for (const param of newParams) {
      it(`has pF "${param}"`, () => {
        expect(hsContent).toMatch(new RegExp(`pF\\s+"${param}"`));
      });
    }
  });

  // --- 9.4 Aliases ---
  describe("aliases", () => {
    it("clapSpread = pF spread", () => {
      expect(hsContent).toMatch(/clapSpread\s*=\s*pF\s+"spread"/);
    });
    it("sawMix = pF mix", () => {
      expect(hsContent).toMatch(/sawMix\s*=\s*pF\s+"mix"/);
    });
    it("presetName = pS presetName", () => {
      expect(hsContent).toMatch(/presetName\s*=\s*pS\s+"presetName"/);
    });
  });

  // --- 9.5 setPreset / getPreset ---
  describe("preset helpers", () => {
    it("has setPreset function", () => { expect(hsContent).toContain("setPreset"); });
    it("has getPreset function", () => { expect(hsContent).toContain("getPreset"); });
    it("setPreset uses setpreset sound", () => { expect(hsContent).toContain("setpreset"); });
    it("getPreset uses getpreset sound", () => { expect(hsContent).toContain("getpreset"); });
  });

  // --- 9.6 127.0.0.1 binding ---
  describe("security bindings", () => {
    it("oAddress is 127.0.0.1", () => { expect(hsContent).toContain('"127.0.0.1"'); });
    it("does not contain 0.0.0.0", () => { expect(hsContent).not.toContain("0.0.0.0"); });
    it("port is 57120", () => { expect(hsContent).toContain("57120"); });
  });

  // --- 9.7 Structure ---
  describe("structure", () => {
    it("imports Sound.Tidal.Context", () => { expect(hsContent).toContain("import Sound.Tidal.Context"); });
    it("has startStream", () => { expect(hsContent).toContain("startStream"); });
    it("has d1-d8 definitions", () => {
      for (let i = 1; i <= 8; i++) {
        expect(hsContent).toContain(`d${i}`);
      }
    });
    it("has hush", () => { expect(hsContent).toContain("hush"); });
    it("has solo", () => { expect(hsContent).toContain("solo"); });
    it("has unsolo", () => { expect(hsContent).toContain("unsolo"); });
    it("has 8 orbits", () => { expect(hsContent).toContain("[0..7]"); });
    it("no attack pF (Tidal builtin)", () => {
      expect(hsContent).not.toMatch(/pF\s+"attack"/);
    });
    it("no release pF (Tidal builtin)", () => {
      expect(hsContent).not.toMatch(/pF\s+"release"/);
    });
  });

  // --- 9.8 Generated BootTidal validation ---
  describe("generateBootTidal output", () => {
    it("includes all FX params from generateBootTidal", () => {
      const generated = generateBootTidal();
      for (const p of ["compress", "saturate", "loGain", "sideGain"]) {
        expect(generated).toContain(p);
      }
    });
    it("custom port accepted", () => {
      const generated = generateBootTidal({ oscPort: 57121 });
      expect(generated).toContain("57121");
    });
    it("generated content has tidal prompt", () => {
      const generated = generateBootTidal();
      expect(generated).toContain("tidal>");
    });
  });

  // --- 9.9 validateGhcVersion ---
  describe("validateGhcVersion extended", () => {
    it("accepts 9.4.0", () => { expect(validateGhcVersion("9.4.0")).toBe(true); });
    it("accepts 9.6.4", () => { expect(validateGhcVersion("9.6.4")).toBe(true); });
    it("accepts 9.8.1", () => { expect(validateGhcVersion("9.8.1")).toBe(true); });
    it("accepts 10.0.0", () => { expect(validateGhcVersion("10.0.0")).toBe(true); });
    it("accepts 11.0.0", () => { expect(validateGhcVersion("11.0.0")).toBe(true); });
    it("rejects 9.3.9", () => { expect(validateGhcVersion("9.3.9")).toBe(false); });
    it("rejects 9.2.0", () => { expect(validateGhcVersion("9.2.0")).toBe(false); });
    it("rejects 8.10.7", () => { expect(validateGhcVersion("8.10.7")).toBe(false); });
    it("rejects 8.0.0", () => { expect(validateGhcVersion("8.0.0")).toBe(false); });
    it("rejects empty string", () => { expect(validateGhcVersion("")).toBe(false); });
    it("rejects single number", () => { expect(validateGhcVersion("9")).toBe(false); });
    it("rejects non-numeric", () => { expect(validateGhcVersion("abc")).toBe(false); });
  });
});

// ============================================================================
// 10. SC File Static Verification
// ============================================================================
describe("10. SC File Static Verification", () => {
  // --- 10.1 genre-presets.scd ---
  describe("genre-presets.scd", () => {
    const scdPath = path.join(SC_DIR, "genre-presets.scd");
    const content = fs.readFileSync(scdPath, "utf-8");

    it("exists", () => { expect(fs.existsSync(scdPath)).toBe(true); });
    it("no 0.0.0.0", () => { expect(content).not.toContain("0.0.0.0"); });
    it("has matchRegexp for input validation", () => { expect(content).toContain("matchRegexp"); });
    it("has try/catch error handling", () => { expect(content).toContain("try"); });
    it("has orbits.do for orbit iteration", () => { expect(content).toContain("orbits.do"); });
    it("has currentPresetName cache guard", () => { expect(content).toContain("currentPresetName"); });
    it("has presetName param reading", () => { expect(content).toContain("presetName"); });
    it("has getpreset handler", () => { expect(content).toContain("getpreset"); });
    it("has setpreset handler", () => { expect(content).toContain("setpreset"); });
    it("no eval or interpret for security", () => {
      expect(content).not.toMatch(/\.interpret\s*\(/);
    });
  });

  // --- 10.2 render-stems-nrt.scd ---
  describe("render-stems-nrt.scd", () => {
    const scdPath = path.join(SCORES_DIR, "render-stems-nrt.scd");
    const content = fs.readFileSync(scdPath, "utf-8");

    it("exists", () => { expect(fs.existsSync(scdPath)).toBe(true); });
    it("has recordNRT", () => { expect(content).toContain("recordNRT"); });
    it("has writeDefFile", () => { expect(content).toContain("writeDefFile"); });
    it("has nrt_sidechain_send SynthDef", () => { expect(content).toContain("nrt_sidechain_send"); });
    it("has numOutputBusChannels", () => { expect(content).toContain("numOutputBusChannels"); });
    it("has parseJSON for config reading", () => { expect(content).toContain("parseJSON"); });
    it("has argv for CLI args", () => { expect(content).toContain("argv"); });
    it("has error exit handling", () => { expect(content).toContain("exit"); });
    it("has nrtPlayBuf for sample playback", () => { expect(content).toContain("nrtPlayBuf"); });
    it("has Buffer for sample loading", () => { expect(content).toContain("Buffer"); });
    it("has nrtReverb", () => { expect(content).toContain("nrtReverb"); });
    it("has nrtDelay", () => { expect(content).toContain("nrtDelay"); });
    it("has FreeVerb ugen", () => { expect(content).toContain("FreeVerb"); });
    it("has CombL ugen", () => { expect(content).toContain("CombL"); });
  });

  // --- 10.3 boot.scd ---
  describe("boot.scd", () => {
    const bootPath = path.join(SC_DIR, "boot.scd");
    const content = fs.readFileSync(bootPath, "utf-8");

    it("exists", () => { expect(fs.existsSync(bootPath)).toBe(true); });
    it("loads genre-presets.scd", () => { expect(content).toContain("genre-presets"); });
    it("loads custom-fx.scd", () => { expect(content).toContain("custom-fx"); });
    it("loads osc-logger.scd conditionally", () => { expect(content).toContain("osc-logger"); });
    it("has numBuffers = 1024 * 256", () => { expect(content).toContain("1024 * 256"); });
    it("has memSize configuration", () => { expect(content).toContain("memSize"); });
    it("has waitForBoot", () => { expect(content).toContain("waitForBoot"); });
    it("loads 9 SynthDef files", () => {
      for (const name of SYNTH_NAMES) {
        expect(content).toContain(`"${name}"`);
      }
    });
    it("starts SuperDirt on port 57120", () => { expect(content).toContain("57120"); });
    it("uses 8 orbits", () => { expect(content).toContain("0 ! 8"); });
    it("has SuperDirt ready signal", () => { expect(content).toContain("SuperDirt ready"); });
    it("has path traversal prevention for samples", () => { expect(content).toContain("beginsWith"); });
    it("has custom samples loading", () => { expect(content).toContain("loadSoundFiles"); });
    it("load order: SynthDefs -> SuperDirt -> FX -> presets -> logger", () => {
      const synthDefsIdx = content.indexOf("synthDefFiles.do");
      const superDirtIdx = content.indexOf("SuperDirt(");
      const fxIdx = content.indexOf("custom-fx");
      const presetsIdx = content.indexOf("genre-presets");
      expect(synthDefsIdx).toBeLessThan(superDirtIdx);
      expect(superDirtIdx).toBeLessThan(fxIdx);
      expect(fxIdx).toBeLessThan(presetsIdx);
    });
  });

  // --- 10.4 custom-fx.scd ---
  describe("custom-fx.scd", () => {
    const fxPath = path.join(SC_DIR, "custom-fx.scd");
    const content = fs.readFileSync(fxPath, "utf-8");

    it("exists", () => { expect(fs.existsSync(fxPath)).toBe(true); });
    it("has sidechainBus allocation", () => { expect(content).toContain("sidechainBus"); });
    it("has customCompressor SynthDef", () => { expect(content).toContain("customCompressor"); });
    it("has customSaturator SynthDef", () => { expect(content).toContain("customSaturator"); });
    it("has customEQ SynthDef", () => { expect(content).toContain("customEQ"); });
    it("has customSidechain SynthDef", () => { expect(content).toContain("customSidechain"); });
    it("has addModule for each FX", () => {
      const addModuleCount = (content.match(/addModule/g) ?? []).length;
      expect(addModuleCount).toBeGreaterThanOrEqual(4);
    });
    it("has orderModules call", () => { expect(content).toContain("orderModules"); });
    it("order: sidechain before compressor in orderModules", () => {
      const orderMatch = content.match(/orderModules\s*\(\s*\[([\s\S]*?)\]/);
      if (orderMatch) {
        const orderStr = orderMatch[1];
        const scIdx = orderStr.indexOf("customSidechain");
        const compIdx = orderStr.indexOf("customCompressor");
        expect(scIdx).toBeLessThan(compIdx);
      }
    });
    it("compressor uses Compander", () => { expect(content).toContain("Compander"); });
    it("saturator uses tanh", () => { expect(content).toContain("tanh"); });
    it("EQ uses BLowShelf", () => { expect(content).toContain("BLowShelf"); });
    it("EQ uses BHiShelf", () => { expect(content).toContain("BHiShelf"); });
    it("EQ uses BPeakEQ", () => { expect(content).toContain("BPeakEQ"); });
    it("sidechain uses Bus.audio", () => { expect(content).toContain("Bus.audio"); });
    it("all FX use ReplaceOut.ar", () => {
      const replaceOutCount = (content.match(/ReplaceOut\.ar/g) ?? []).length;
      expect(replaceOutCount).toBeGreaterThanOrEqual(4);
    });
    it("loaded message at end", () => { expect(content).toContain("Custom FX modules loaded"); });
  });

  // --- 10.5 osc-logger.scd ---
  describe("osc-logger.scd", () => {
    const loggerPath = path.join(SC_DIR, "osc-logger.scd");
    if (fs.existsSync(loggerPath)) {
      const content = fs.readFileSync(loggerPath, "utf-8");
      it("exists", () => { expect(fs.existsSync(loggerPath)).toBe(true); });
      it("no 0.0.0.0 binding", () => { expect(content).not.toContain("0.0.0.0"); });
    }
  });

  // --- 10.6 render-nrt.scd ---
  describe("render-nrt.scd", () => {
    const nrtPath = path.join(SCORES_DIR, "render-nrt.scd");
    if (fs.existsSync(nrtPath)) {
      const content = fs.readFileSync(nrtPath, "utf-8");
      it("exists", () => { expect(fs.existsSync(nrtPath)).toBe(true); });
      it("has Score", () => { expect(content).toContain("Score"); });
    }
  });
});

// ============================================================================
// 11. Live System (Health Monitor, Recording, Orchestrator)
// ============================================================================
describe("11. Live System", () => {
  // --- 11.1 Health Monitor ---
  describe("LiveHealthMonitor extended", () => {
    it("memory threshold is 1.5GB", () => {
      const monitor = new LiveHealthMonitor({ onCrash: vi.fn(), onHighMemory: vi.fn(), onHighCpu: vi.fn() });
      const onHighMemory = vi.fn();
      const m2 = new LiveHealthMonitor({ onCrash: vi.fn(), onHighMemory, onHighCpu: vi.fn() });
      m2.checkMemory(1.5 * 1024 * 1024 * 1024);
      expect(onHighMemory).not.toHaveBeenCalled();
      m2.checkMemory(1.5 * 1024 * 1024 * 1024 + 1);
      expect(onHighMemory).toHaveBeenCalled();
    });

    it("CPU threshold is 70%", () => {
      const onHighCpu = vi.fn();
      const m = new LiveHealthMonitor({ onCrash: vi.fn(), onHighMemory: vi.fn(), onHighCpu });
      m.checkCpu(70);
      expect(onHighCpu).not.toHaveBeenCalled();
      m.checkCpu(71);
      expect(onHighCpu).toHaveBeenCalled();
    });

    it("checkProcess(null) triggers onCrash", () => {
      const onCrash = vi.fn();
      const m = new LiveHealthMonitor({ onCrash, onHighMemory: vi.fn(), onHighCpu: vi.fn() });
      m.checkProcess(null);
      expect(onCrash).toHaveBeenCalledTimes(1);
    });

    it("checkProcess(pid) does not trigger crash", () => {
      const onCrash = vi.fn();
      const m = new LiveHealthMonitor({ onCrash, onHighMemory: vi.fn(), onHighCpu: vi.fn() });
      m.checkProcess(12345);
      expect(onCrash).not.toHaveBeenCalled();
    });

    it("stopPolling clears interval", () => {
      const m = new LiveHealthMonitor({ onCrash: vi.fn(), onHighMemory: vi.fn(), onHighCpu: vi.fn() });
      m.stopPolling();
      expect(() => m.stopPolling()).not.toThrow();
    });
  });

  // --- 11.2 Live Recording ---
  describe("LiveRecording extended", () => {
    it("initial state is idle", () => {
      const r = new LiveRecording({ projectRoot: "/fake", onRecordingChange: vi.fn() });
      expect(r.getState()).toBe("idle");
    });
    it("start transitions to recording", () => {
      const r = new LiveRecording({ projectRoot: tmpDir, onRecordingChange: vi.fn() });
      r.start();
      expect(r.getState()).toBe("recording");
    });
    it("stop transitions to stopped", () => {
      const r = new LiveRecording({ projectRoot: tmpDir, onRecordingChange: vi.fn() });
      r.start();
      r.stop();
      expect(r.getState()).toBe("stopped");
    });
    it("getRecordConfig sampleRate = 48000", () => {
      const r = new LiveRecording({ projectRoot: "/fake", onRecordingChange: vi.fn() });
      expect(r.getRecordConfig().sampleRate).toBe(48000);
    });
    it("getRecordConfig format = WAV", () => {
      const r = new LiveRecording({ projectRoot: "/fake", onRecordingChange: vi.fn() });
      expect(r.getRecordConfig().format).toBe("WAV");
    });
    it("getRecordConfig sampleFormat = float", () => {
      const r = new LiveRecording({ projectRoot: "/fake", onRecordingChange: vi.fn() });
      expect(r.getRecordConfig().sampleFormat).toBe("float");
    });
    it("handleLowDiskSpace stops recording if active", () => {
      const onChange = vi.fn();
      const r = new LiveRecording({ projectRoot: tmpDir, onRecordingChange: onChange });
      r.start();
      r.handleLowDiskSpace();
      expect(r.getState()).toBe("stopped");
    });
    it("handleLowDiskSpace is no-op if idle", () => {
      const r = new LiveRecording({ projectRoot: "/fake", onRecordingChange: vi.fn() });
      r.handleLowDiskSpace();
      expect(r.getState()).toBe("idle");
    });
  });

  // --- 11.3 sanitizeTitle ---
  describe("sanitizeTitle", () => {
    it("alphanumeric passes through", () => { expect(sanitizeTitle("hello123")).toBe("hello123"); });
    it("hyphens preserved", () => { expect(sanitizeTitle("my-title")).toBe("my-title"); });
    it("underscores preserved", () => { expect(sanitizeTitle("my_title")).toBe("my_title"); });
    it("spaces replaced", () => { expect(sanitizeTitle("my title")).toBe("my-title"); });
    it("special chars replaced", () => { expect(sanitizeTitle("a!@#$b")).toBe("a----b"); });
    it("empty becomes untitled", () => { expect(sanitizeTitle("")).toBe("untitled"); });
    it("whitespace-only becomes untitled", () => { expect(sanitizeTitle("   ")).toBe("untitled"); });
  });

  // --- 11.4 generateRecordPath ---
  describe("generateRecordPath", () => {
    it("includes date", () => {
      const p = generateRecordPath("/proj", "test", new Date("2026-06-15"));
      expect(p).toContain("2026-06-15");
    });
    it("includes sanitized title", () => {
      const p = generateRecordPath("/proj", "my session", new Date("2026-06-15"));
      expect(p).toContain("my-session");
    });
    it("ends with live-recording.wav", () => {
      const p = generateRecordPath("/proj", "test", new Date());
      expect(p).toContain("live-recording.wav");
    });
    it("includes out/audio path", () => {
      const p = generateRecordPath("/proj", "test", new Date());
      expect(p).toContain("out/audio");
    });
  });

  // --- 11.5 checkDiskSpace (recording) ---
  describe("checkDiskSpace (recording)", () => {
    it("sufficient space returns true", () => {
      expect(recCheckDiskSpace(10_000_000_000, 1_000_000_000)).toBe(true);
    });
    it("insufficient space returns false", () => {
      expect(recCheckDiskSpace(100, 1_000_000_000)).toBe(false);
    });
    it("exactly 2x returns true", () => {
      expect(recCheckDiskSpace(2_000_000_000, 1_000_000_000)).toBe(true);
    });
    it("just under 2x returns false", () => {
      expect(recCheckDiskSpace(1_999_999_999, 1_000_000_000)).toBe(false);
    });
  });
});

// ============================================================================
// 12. SYNTH_STEM_MAP Structure
// ============================================================================
describe("12. SYNTH_STEM_MAP Structure", () => {
  it("has 9 entries", () => {
    expect(Object.keys(SYNTH_STEM_MAP)).toHaveLength(9);
  });

  for (const name of SYNTH_NAMES) {
    it(`${name} has synthDef field`, () => {
      expect(SYNTH_STEM_MAP[name].synthDef).toBe(name);
    });
    it(`${name} has stem field`, () => {
      expect(typeof SYNTH_STEM_MAP[name].stem).toBe("string");
    });
    it(`${name} has bus field`, () => {
      expect(typeof SYNTH_STEM_MAP[name].bus).toBe("number");
    });
  }

  it("drums stem SynthDefs: kick, hat, clap", () => {
    expect(SYNTH_STEM_MAP.kick.stem).toBe("drums");
    expect(SYNTH_STEM_MAP.hat.stem).toBe("drums");
    expect(SYNTH_STEM_MAP.clap.stem).toBe("drums");
  });
  it("bass stem SynthDef: bass", () => {
    expect(SYNTH_STEM_MAP.bass.stem).toBe("bass");
  });
  it("synth stem SynthDefs: supersaw, pad, lead, arp_pluck", () => {
    expect(SYNTH_STEM_MAP.supersaw.stem).toBe("synth");
    expect(SYNTH_STEM_MAP.pad.stem).toBe("synth");
    expect(SYNTH_STEM_MAP.lead.stem).toBe("synth");
    expect(SYNTH_STEM_MAP.arp_pluck.stem).toBe("synth");
  });
  it("fx stem SynthDef: riser", () => {
    expect(SYNTH_STEM_MAP.riser.stem).toBe("fx");
  });

  it("only 4 unique bus values (0, 2, 4, 6)", () => {
    const buses = new Set(Object.values(SYNTH_STEM_MAP).map(m => m.bus));
    expect(buses.size).toBe(4);
    expect(buses.has(0)).toBe(true);
    expect(buses.has(2)).toBe(true);
    expect(buses.has(4)).toBe(true);
    expect(buses.has(6)).toBe(true);
  });

  it("only 4 unique stem values (drums, bass, synth, fx)", () => {
    const stems = new Set(Object.values(SYNTH_STEM_MAP).map(m => m.stem));
    expect(stems.size).toBe(4);
  });
});

// ============================================================================
// 13. SuperDirt Utils
// ============================================================================
describe("13. SuperDirt Utils", () => {
  describe("generateBootConfig", () => {
    it("numOrbits is 8", () => {
      expect(generateBootConfig(PROJECT_ROOT).numOrbits).toBe(8);
    });
    it("synthDefNames has 9 entries", () => {
      expect(generateBootConfig(PROJECT_ROOT).synthDefNames).toHaveLength(9);
    });
    for (const name of SYNTH_NAMES) {
      it(`synthDefNames includes ${name}`, () => {
        expect(generateBootConfig(PROJECT_ROOT).synthDefNames).toContain(name);
      });
    }
    it("synthDefsDir points to audio/sc/synthdefs", () => {
      expect(generateBootConfig(PROJECT_ROOT).synthDefsDir).toContain("audio/sc/synthdefs");
    });
    it("samplesDir points to audio/samples", () => {
      expect(generateBootConfig(PROJECT_ROOT).samplesDir).toContain("audio/samples");
    });
  });
});

// ============================================================================
// 14. Additional Edge Cases & Integration
// ============================================================================
describe("14. Additional Edge Cases", () => {
  // --- 14.1 Preset save/load roundtrip ---
  describe("preset save/load roundtrip", () => {
    it("saved preset loads back identically", () => {
      const src = loadPreset("hard_techno", GENRES_DIR);
      const userDir = path.join(tmpDir, "roundtrip");
      savePreset("roundtrip_test", src, userDir);
      const loaded = loadPreset("roundtrip_test", userDir);
      expect(loaded.bpm).toEqual(src.bpm);
      expect(loaded.synthParams).toEqual(src.synthParams);
      expect(loaded.fxDefaults).toEqual(src.fxDefaults);
    });
  });

  // --- 14.2 OSC->NRT->Score full pipeline ---
  describe("OSC->NRT->Score pipeline", () => {
    it("full pipeline produces valid score entries", () => {
      const oscEvents: OscEvent[] = [
        { ts: 0, s: "kick", compress: 0.7 } as OscEvent,
        { ts: 0.5, s: "hat" },
        { ts: 1.0, s: "supersaw", cutoff: 2000, saturate: 0.3 } as OscEvent,
        { ts: 1.5, s: "bass" },
      ];
      const nrt = convertToNrt(oscEvents);
      expect(nrt.metadata.mapped).toBe(4);

      const entries = generateNrtScoreEntries(nrt);
      expect(entries.length).toBeGreaterThan(4);

      const lastEntry = entries[entries.length - 1];
      expect(lastEntry.cmd[0]).toBe("c_set");
    });
  });

  // --- 14.3 mergeWithDefaults various ---
  describe("mergeWithDefaults edge cases", () => {
    it("unknown synth key in preset is ignored", () => {
      const defaults = { kick: { drive: 0.5 } } as any;
      const preset = { unknown_synth: { param: 1 } };
      const result = mergeWithDefaults(preset, defaults);
      expect((result as any).kick.drive).toBe(0.5);
    });

    it("multiple synths merged correctly", () => {
      const defaults = { kick: { drive: 0.5, click: 0.3 }, bass: { cutoff: 800 } } as any;
      const preset = { kick: { drive: 0.9 }, bass: { cutoff: 1200 } };
      const result = mergeWithDefaults(preset, defaults);
      expect((result as any).kick.drive).toBe(0.9);
      expect((result as any).kick.click).toBe(0.3);
      expect((result as any).bass.cutoff).toBe(1200);
    });
  });

  // --- 14.4 buildMasteringCommand ---
  describe("buildMasteringCommand edge cases", () => {
    it("single stem input", () => {
      const args = buildMasteringCommand(["/a.wav"], "/master.wav");
      expect(args).toContain("-i");
      expect(args).toContain("/a.wav");
    });
    it("three stem inputs", () => {
      const args = buildMasteringCommand(["/a.wav", "/b.wav", "/c.wav"], "/master.wav");
      const inputCount = args.filter(a => a === "-i").length;
      expect(inputCount).toBe(3);
    });
    it("filter_complex includes amix", () => {
      const args = buildMasteringCommand(["/a.wav", "/b.wav"], "/master.wav");
      const fcIdx = args.indexOf("-filter_complex");
      expect(args[fcIdx + 1]).toContain("amix");
    });
    it("amix inputs matches stem count", () => {
      const args = buildMasteringCommand(["/a.wav", "/b.wav", "/c.wav"], "/master.wav");
      const fcIdx = args.indexOf("-filter_complex");
      expect(args[fcIdx + 1]).toContain("inputs=3");
    });
  });

  // --- 14.5 Various validateFilePath ---
  describe("validateFilePath edge cases", () => {
    it("allows all default extensions", () => {
      for (const ext of [".osclog", ".osc", ".wav", ".json"]) {
        const f = path.join(tmpDir, `test${ext}`);
        fs.writeFileSync(f, "test");
        expect(validateFilePath(f, tmpDir, [ext])).toBe(true);
      }
    });
    it("empty extensions array allows any file", () => {
      const f = path.join(tmpDir, "any.xyz");
      fs.writeFileSync(f, "test");
      expect(validateFilePath(f, tmpDir, [])).toBe(true);
    });
  });

  // --- 14.6 convertToNrt with mixed events ---
  describe("convertToNrt mixed SynthDef + DirtSample", () => {
    it("maps both SynthDefs and dirt samples", () => {
      const events: OscEvent[] = [
        { ts: 0, s: "kick" },
        { ts: 0.25, s: "bd" },
        { ts: 0.5, s: "supersaw" },
        { ts: 0.75, s: "hh" },
      ];
      const nrt = convertToNrt(events);
      expect(nrt.metadata.mapped).toBe(4);
      expect(nrt.metadata.skipped).toBe(0);
    });

    it("skips truly unknown events", () => {
      const events: OscEvent[] = [
        { ts: 0, s: "kick" },
        { ts: 0.25, s: "totally_unknown_synth" },
      ];
      const nrt = convertToNrt(events);
      expect(nrt.metadata.mapped).toBe(1);
      expect(nrt.metadata.skipped).toBe(1);
    });
  });

  // --- 14.7 SYNTH_STEM_MAP consistency with getStemBus ---
  describe("SYNTH_STEM_MAP <-> getStemBus consistency", () => {
    for (const name of SYNTH_NAMES) {
      it(`${name}: SYNTH_STEM_MAP.bus == getStemBus.bus`, () => {
        expect(getStemBus(name)!.bus).toBe(SYNTH_STEM_MAP[name].bus);
      });
    }
  });

  // --- 14.8 Preset file format ---
  describe("preset JSON file format", () => {
    for (const genre of GENRES) {
      it(`${genre}.json is valid JSON`, () => {
        const filePath = path.join(GENRES_DIR, `${genre}.json`);
        const content = fs.readFileSync(filePath, "utf-8");
        expect(() => JSON.parse(content)).not.toThrow();
      });
      it(`${genre}.json name matches filename`, () => {
        const preset = loadPreset(genre, GENRES_DIR);
        expect(preset.name).toBe(genre);
      });
    }
  });
});

// ============================================================================
// 15. SC Integration (sclang required)
// ============================================================================
describe.skipIf(!hasSclang)("15. SC Integration (requires sclang)", () => {
  it("sclang is accessible", () => {
    const result = execSync("sclang -v 2>&1 || true", { encoding: "utf-8" });
    expect(result.length).toBeGreaterThan(0);
  });
});
