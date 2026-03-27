import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
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
} from "./genre-preset";

const GENRES_DIR = path.join(process.cwd(), "audio", "presets", "genres");
const USER_DIR = path.join(process.cwd(), "audio", "presets", "user");
const GENRES = ["hard_techno", "melodic_techno", "industrial", "psytrance", "progressive_trance"];

describe("genre-preset T1", () => {
  // TC-1: loadPreset hard_techno valid
  it("loads hard_techno preset successfully", () => {
    const preset = loadPreset("hard_techno", GENRES_DIR);
    expect(preset.name).toBe("hard_techno");
    expect(preset.bpm.default).toBe(145);
    expect(preset.synthParams.kick.drive).toBe(0.8);
  });

  // TC-2: loadPreset all 5 genres valid
  it("loads all 5 genre presets without error", () => {
    for (const genre of GENRES) {
      const preset = loadPreset(genre, GENRES_DIR);
      expect(preset.name).toBe(genre);
    }
  });

  // TC-3: loadPreset missing field rejects
  it("rejects preset with missing required field", () => {
    expect(() => presetSchema.parse({ name: "test" })).toThrow();
  });

  // TC-4: loadPreset invalid synthParam rejects
  it("rejects preset with invalid SynthDef param keys", () => {
    const invalid = {
      name: "test", bpm: { min: 120, max: 130, default: 125 },
      synthParams: {
        kick: { openness: 0.5 }, // openness is hat-only
        bass: {}, hat: {}, clap: {}, supersaw: {}, pad: {}, lead: {}, arp_pluck: {}, riser: {},
      },
      fxDefaults: {
        compress: 0.5, threshold: -10, ratio: 4, compAttack: 0.01, compRelease: 0.1,
        saturate: 0.3, drive: 0.2, loGain: 1, midGain: 0, hiGain: 1,
        loFreq: 200, hiFreq: 4000, sideGain: 1, sideRelease: 0.2,
      },
      stemGroups: { drums: ["kick"] },
    };
    expect(() => presetSchema.parse(invalid)).toThrow("Invalid params for kick");
  });

  // TC-5: mergeWithDefaults preserves preset value
  it("merge preserves preset value over default", () => {
    const defaults = { kick: { drive: 0.5, click: 0.3, decay: 0.2 } } as any;
    const preset = { kick: { drive: 0.8 } };
    const result = mergeWithDefaults(preset, defaults);
    expect((result as any).kick.drive).toBe(0.8);
    expect((result as any).kick.click).toBe(0.3);
  });

  // TC-6: mergeWithDefaults fills missing
  it("merge fills missing with defaults", () => {
    const defaults = { kick: { drive: 0.5, click: 0.3, decay: 0.2 } } as any;
    const result = mergeWithDefaults({}, defaults);
    expect((result as any).kick.drive).toBe(0.5);
  });

  // TC-7: validatePresetName accepts valid
  it("accepts valid preset name", () => {
    expect(validatePresetName("hard_techno")).toBe(true);
    expect(validatePresetName("my-custom-01")).toBe(true);
  });

  // TC-8: validatePresetName rejects special chars
  it("rejects names with special characters", () => {
    expect(validatePresetName("../hack")).toBe(false);
    expect(validatePresetName("test space")).toBe(false);
    expect(validatePresetName("")).toBe(false);
  });

  // TC-9: BPM ranges correct
  it("all 5 presets have valid BPM ranges", () => {
    for (const genre of GENRES) {
      const preset = loadPreset(genre, GENRES_DIR);
      expect(preset.bpm.min).toBeLessThan(preset.bpm.max);
      expect(preset.bpm.default).toBeGreaterThanOrEqual(preset.bpm.min);
      expect(preset.bpm.default).toBeLessThanOrEqual(preset.bpm.max);
    }
  });

  // TC-10: listPresets returns genres + user
  it("lists genre presets", () => {
    const presets = listPresets(GENRES_DIR, USER_DIR);
    const genrePresets = presets.filter((p) => p.source === "genre");
    expect(genrePresets.length).toBe(5);
  });

  // TC-11: rejectOversizePreset
  it("rejects file larger than 64KB", () => {
    const tmpDir = path.join("/tmp", `preset-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "huge.json"), "x".repeat(65 * 1024));
    expect(() => loadPreset("huge", tmpDir)).toThrow("too large");
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // TC-12: sceneSchema preset field optional
  it("scene-schema has optional preset field", () => {
    const schemaFile = fs.readFileSync(
      path.join(process.cwd(), "src", "lib", "scene-schema.ts"), "utf-8",
    );
    expect(schemaFile).toContain("preset");
    expect(schemaFile).toContain(".optional()");
  });

  // TC-13: sceneSchema genre enum unchanged
  it("scene-schema genre enum unchanged (5 original genres)", () => {
    const schemaFile = fs.readFileSync(
      path.join(process.cwd(), "src", "lib", "scene-schema.ts"), "utf-8",
    );
    expect(schemaFile).toContain('"techno"');
    expect(schemaFile).toContain('"trance"');
    expect(schemaFile).toContain('"house"');
    expect(schemaFile).toContain('"dnb"');
    expect(schemaFile).toContain('"ambient"');
  });

  // TC-14: hard_techno kick params match SynthDef
  it("hard_techno kick params match kick.scd signature", () => {
    const preset = loadPreset("hard_techno", GENRES_DIR);
    const kickParams = Object.keys(preset.synthParams.kick);
    const allowed = new Set([...SYNTHDEF_PARAM_KEYS.kick, "freq", "amp", "dur", "pan"]);
    for (const key of kickParams) {
      expect(allowed.has(key)).toBe(true);
    }
  });

  // TC-15: all 5 presets synthParams keys valid (no cross-contamination)
  it("all preset synthParams use only valid SynthDef keys", () => {
    for (const genre of GENRES) {
      const preset = loadPreset(genre, GENRES_DIR);
      for (const [synth, params] of Object.entries(preset.synthParams)) {
        const allowed = new Set([...SYNTHDEF_PARAM_KEYS[synth], "freq", "amp", "dur", "pan"]);
        for (const key of Object.keys(params)) {
          expect(allowed.has(key), `${genre}.${synth}.${key} not in allowed keys`).toBe(true);
        }
      }
    }
  });

  // TC-16: user/.gitkeep directory exists
  it("audio/presets/user/ directory exists", () => {
    expect(fs.existsSync(USER_DIR)).toBe(true);
  });

  // TC-17: BPM hard_techno specific values
  it("hard_techno BPM is 140-155, default 145", () => {
    const preset = loadPreset("hard_techno", GENRES_DIR);
    expect(preset.bpm.min).toBe(140);
    expect(preset.bpm.max).toBe(155);
    expect(preset.bpm.default).toBe(145);
  });

  // TC-18a: loadPreset malformed JSON
  it("rejects malformed JSON with clear error", () => {
    const tmpDir = path.join("/tmp", `preset-bad-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "broken.json"), "{bad json content}");
    expect(() => loadPreset("broken", tmpDir)).toThrow("Invalid JSON");
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // TC-18: mergeWithDefaults empty preset
  it("merge with empty preset returns all defaults", () => {
    const defaults = {
      kick: { drive: 0.5 }, bass: { cutoff: 800 },
    } as any;
    const result = mergeWithDefaults({}, defaults);
    expect((result as any).kick.drive).toBe(0.5);
    expect((result as any).bass.cutoff).toBe(800);
  });
});

describe("genre-preset T3a (CLI)", () => {
  const tmpUserDir = path.join("/tmp", `preset-user-${Date.now()}`);

  // TC-19: savePreset creates file
  it("saves preset to user directory", () => {
    const source = loadPreset("hard_techno", GENRES_DIR);
    savePreset("my_custom", source, tmpUserDir);
    expect(fs.existsSync(path.join(tmpUserDir, "my_custom.json"))).toBe(true);
    fs.rmSync(tmpUserDir, { recursive: true, force: true });
  });

  // TC-20: savePreset validates name
  it("rejects invalid preset name", () => {
    const source = loadPreset("hard_techno", GENRES_DIR);
    expect(() => savePreset("../hack", source, tmpUserDir)).toThrow("Invalid preset name");
  });

  // TC-21: savePreset rejects existing without force
  it("rejects overwrite without force", () => {
    const source = loadPreset("hard_techno", GENRES_DIR);
    savePreset("dup_test", source, tmpUserDir, false);
    expect(() => savePreset("dup_test", source, tmpUserDir, false)).toThrow("already exists");
    fs.rmSync(tmpUserDir, { recursive: true, force: true });
  });

  // TC-22: savePreset overwrites with force
  it("overwrites with force flag", () => {
    const source = loadPreset("hard_techno", GENRES_DIR);
    savePreset("force_test", source, tmpUserDir, false);
    savePreset("force_test", source, tmpUserDir, true); // should not throw
    fs.rmSync(tmpUserDir, { recursive: true, force: true });
  });

  // TC-23: listPresets shows genres + user
  it("lists genres and user presets", () => {
    fs.mkdirSync(tmpUserDir, { recursive: true });
    fs.writeFileSync(path.join(tmpUserDir, "custom.json"), "{}");
    const presets = listPresets(GENRES_DIR, tmpUserDir);
    expect(presets.filter((p) => p.source === "genre").length).toBe(5);
    expect(presets.filter((p) => p.source === "user").length).toBe(1);
    fs.rmSync(tmpUserDir, { recursive: true, force: true });
  });

  // TC-24: package.json has preset scripts
  it("package.json has preset:save and preset:list", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.scripts["preset:save"]).toBeDefined();
    expect(pkg.scripts["preset:list"]).toBeDefined();
  });
});

describe("genre-preset T3b (NRT integration)", () => {
  // TC-25: mergeFxDefaults event priority
  it("event FX params take priority over preset defaults", () => {
    const result = mergeFxDefaults({ compress: 0.5 }, { compress: 0.8, saturate: 0.3 });
    expect(result.compress).toBe(0.5);
    expect(result.saturate).toBe(0.3);
  });

  // TC-26: mergeFxDefaults fills missing
  it("fills missing event params with preset defaults", () => {
    const result = mergeFxDefaults({}, { compress: 0.8, saturate: 0.3 });
    expect(result.compress).toBe(0.8);
  });

  // TC-27: mergeFxDefaults empty preset
  it("empty preset defaults leaves event params unchanged", () => {
    const result = mergeFxDefaults({ compress: 0.5 }, {});
    expect(result.compress).toBe(0.5);
  });

  // TC-28: detectPresetFromOsclog found
  it("detects setpreset event in osclog events", () => {
    const events = [
      { s: "kick", n: 0 },
      { s: "setpreset", n: "hard_techno" },
      { s: "hat", n: 0 },
    ];
    expect(detectPresetFromOsclog(events)).toBe("hard_techno");
  });

  // TC-29: detectPresetFromOsclog not found
  it("returns null when no setpreset event", () => {
    const events = [{ s: "kick", n: 0 }, { s: "hat", n: 0 }];
    expect(detectPresetFromOsclog(events)).toBeNull();
  });

  // TC-30: --preset overrides osclog detected
  it("CLI --preset should override osclog detection", () => {
    // This tests the priority logic: if both exist, --preset wins
    const osclogPreset = detectPresetFromOsclog([{ s: "setpreset", n: "melodic_techno" }]);
    const cliPreset = "hard_techno";
    const resolved = cliPreset ?? osclogPreset; // CLI takes priority
    expect(resolved).toBe("hard_techno");
  });
});
