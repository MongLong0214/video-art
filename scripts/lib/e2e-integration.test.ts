import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..", "..");
const SC_DIR = path.join(PROJECT_ROOT, "audio", "sc", "superdirt");
const SCORES_DIR = path.join(PROJECT_ROOT, "audio", "sc", "scores");
const TIDAL_DIR = path.join(PROJECT_ROOT, "audio", "tidal");
const SCRIPTS_DIR = path.join(PROJECT_ROOT, "scripts");

// Sync sclang detection for skipIf
const hasSclang = (() => {
  try { execSync("which sclang", { stdio: "ignore" }); return true; }
  catch { return false; }
})();

// --- T1: genre-presets.scd ---
describe("T1: genre-presets.scd", () => {
  const scdPath = path.join(SC_DIR, "genre-presets.scd");

  it("genre-presets.scd exists", () => {
    expect(fs.existsSync(scdPath)).toBe(true);
  });

  it("genre-presets.scd no 0.0.0.0", () => {
    const content = fs.readFileSync(scdPath, "utf-8");
    expect(content).not.toContain("0.0.0.0");
  });

  it("genre-presets.scd has matchRegexp", () => {
    const content = fs.readFileSync(scdPath, "utf-8");
    expect(content).toContain("matchRegexp");
  });

  it("genre-presets.scd has try catch", () => {
    const content = fs.readFileSync(scdPath, "utf-8");
    expect(content).toContain("try");
  });

  it("genre-presets.scd has orbits.do", () => {
    const content = fs.readFileSync(scdPath, "utf-8");
    expect(content).toContain("orbits.do");
  });

  it("genre-presets.scd has cache guard", () => {
    const content = fs.readFileSync(scdPath, "utf-8");
    expect(content).toContain("currentPresetName");
  });

  it("genre-presets.scd reads presetName param", () => {
    const content = fs.readFileSync(scdPath, "utf-8");
    expect(content).toContain("presetName");
  });

  it("boot.scd loads genre-presets.scd", () => {
    const bootContent = fs.readFileSync(path.join(SC_DIR, "boot.scd"), "utf-8");
    expect(bootContent).toContain("genre-presets");
  });

  it("genre-presets.scd has getpreset handler", () => {
    const content = fs.readFileSync(scdPath, "utf-8");
    expect(content).toContain("getpreset");
  });
});

// --- T2: BootTidal.hs ---
describe("T2: BootTidal.hs pF bindings", () => {
  const hsPath = path.join(TIDAL_DIR, "BootTidal.hs");

  const NEW_PF_PARAMS = [
    "openness", "tone", "filterEnv", "vibrato", "portamento",
    "brightness", "sweepRange", "noiseAmount", "envAmount",
  ];

  it("BootTidal has 11 new pF (9 direct + 2 aliased)", () => {
    const content = fs.readFileSync(hsPath, "utf-8");
    for (const param of NEW_PF_PARAMS) {
      expect(content, `missing pF "${param}"`).toMatch(new RegExp(`pF\\s+"${param}"`));
    }
  });

  it("BootTidal has setPreset helper", () => {
    const content = fs.readFileSync(hsPath, "utf-8");
    expect(content).toContain("setPreset");
  });

  it("BootTidal has getPreset helper", () => {
    const content = fs.readFileSync(hsPath, "utf-8");
    expect(content).toContain("getPreset");
  });

  it("BootTidal has presetName pS", () => {
    const content = fs.readFileSync(hsPath, "utf-8");
    expect(content).toMatch(/pS\s+"presetName"/);
  });

  it("BootTidal no attack pF", () => {
    const content = fs.readFileSync(hsPath, "utf-8");
    expect(content).not.toMatch(/pF\s+"attack"/);
  });

  it("BootTidal no release pF", () => {
    const content = fs.readFileSync(hsPath, "utf-8");
    expect(content).not.toMatch(/pF\s+"release"/);
  });

  it("BootTidal clapSpread = pF spread", () => {
    const content = fs.readFileSync(hsPath, "utf-8");
    expect(content).toMatch(/clapSpread\s*=\s*pF\s+"spread"/);
  });

  it("BootTidal sawMix = pF mix", () => {
    const content = fs.readFileSync(hsPath, "utf-8");
    expect(content).toMatch(/sawMix\s*=\s*pF\s+"mix"/);
  });

  it("BootTidal 127.0.0.1 preserved", () => {
    const content = fs.readFileSync(hsPath, "utf-8");
    expect(content).toContain("127.0.0.1");
  });

  it("BootTidal existing 14 FX pF preserved", () => {
    const content = fs.readFileSync(hsPath, "utf-8");
    const fxParams = ["compress", "threshold", "ratio", "compAttack", "compRelease",
      "saturate", "drive", "loGain", "midGain", "hiGain", "loFreq", "hiFreq",
      "sideGain", "sideRelease"];
    for (const param of fxParams) {
      expect(content, `missing FX pF "${param}"`).toMatch(new RegExp(`pF\\s+"${param}"`));
    }
  });
});

// --- T3: render-stems-nrt.scd ---
describe("T3: render-stems-nrt.scd", () => {
  const scdPath = path.join(SCORES_DIR, "render-stems-nrt.scd");

  it("render-stems-nrt.scd exists", () => {
    expect(fs.existsSync(scdPath)).toBe(true);
  });

  it("render-stems-nrt.scd has recordNRT", () => {
    const content = fs.readFileSync(scdPath, "utf-8");
    expect(content).toContain("recordNRT");
  });

  it("render-stems-nrt.scd has writeDefFile", () => {
    const content = fs.readFileSync(scdPath, "utf-8");
    expect(content).toContain("writeDefFile");
  });

  it("render-stems-nrt.scd has nrt_sidechain_send", () => {
    const content = fs.readFileSync(scdPath, "utf-8");
    expect(content).toContain("nrt_sidechain_send");
  });

  it("render-stems-nrt.scd has numOutputBusChannels", () => {
    const content = fs.readFileSync(scdPath, "utf-8");
    expect(content).toContain("numOutputBusChannels");
  });

  it("render-stems-nrt.scd has parseJSON", () => {
    const content = fs.readFileSync(scdPath, "utf-8");
    expect(content).toContain("parseJSON");
  });

  it("render-stems-nrt.scd has argv", () => {
    const content = fs.readFileSync(scdPath, "utf-8");
    expect(content).toContain("argv");
  });

  it("render-stems-nrt.scd has error exit", () => {
    const content = fs.readFileSync(scdPath, "utf-8");
    expect(content).toContain("exit");
  });
});

// --- T4: render-stems.ts ---
describe("T4: render-stems.ts full implementation", () => {
  const tsPath = path.join(SCRIPTS_DIR, "render-stems.ts");

  it("render-stems.ts no exec or spawn", () => {
    const content = fs.readFileSync(tsPath, "utf-8");
    expect(content).not.toMatch(/\bexec\s*\(/);
    expect(content).not.toMatch(/\bspawn\s*\([^)]*shell\s*:\s*true/);
  });

  it("render-stems.ts imports execFile", () => {
    const content = fs.readFileSync(tsPath, "utf-8");
    expect(content).toContain("execFile");
  });

  it("render-stems.ts has render.lock", () => {
    const content = fs.readFileSync(tsPath, "utf-8");
    expect(content).toContain("checkRenderLock");
  });

  it("render-stems.ts has sclang call", () => {
    const content = fs.readFileSync(tsPath, "utf-8");
    expect(content).toContain("sclang");
  });

  it("render-stems.ts has ffmpeg call", () => {
    const content = fs.readFileSync(tsPath, "utf-8");
    expect(content).toContain("ffmpeg");
  });

  it("render-stems.ts has ENOENT handling", () => {
    const content = fs.readFileSync(tsPath, "utf-8");
    expect(content).toContain("ENOENT");
  });

  it("render-stems.ts has --title", () => {
    const content = fs.readFileSync(tsPath, "utf-8");
    expect(content).toContain("--title");
  });

  it("render-stems.ts no TODO", () => {
    const content = fs.readFileSync(tsPath, "utf-8");
    expect(content).not.toContain("TODO");
  });

  it("render-stems.ts has stems output path", () => {
    const content = fs.readFileSync(tsPath, "utf-8");
    expect(content).toContain("stems");
  });

  it("render-stems.ts has --preset", () => {
    const content = fs.readFileSync(tsPath, "utf-8");
    expect(content).toContain("--preset");
  });
});

// --- B-PROD v0.2: NRT SynthDefs ---
describe("B-PROD v0.2: NRT SynthDefs", () => {
  const scdPath = path.join(SCORES_DIR, "render-stems-nrt.scd");

  it("render-stems-nrt.scd has nrtPlayBuf", () => {
    const content = fs.readFileSync(scdPath, "utf-8");
    expect(content).toContain("nrtPlayBuf");
  });

  it("render-stems-nrt.scd has Buffer.read", () => {
    const content = fs.readFileSync(scdPath, "utf-8");
    expect(content).toContain("Buffer");
  });

  it("render-stems-nrt.scd has nrtReverb", () => {
    const content = fs.readFileSync(scdPath, "utf-8");
    expect(content).toContain("nrtReverb");
  });

  it("render-stems-nrt.scd has nrtDelay", () => {
    const content = fs.readFileSync(scdPath, "utf-8");
    expect(content).toContain("nrtDelay");
  });

  it("render-stems-nrt.scd has FreeVerb", () => {
    const content = fs.readFileSync(scdPath, "utf-8");
    expect(content).toContain("FreeVerb");
  });

  it("render-stems-nrt.scd has CombL", () => {
    const content = fs.readFileSync(scdPath, "utf-8");
    expect(content).toContain("CombL");
  });
});

// --- SC Integration (sclang required) ---
describe.skipIf(!hasSclang)("SC Integration (requires sclang)", () => {
  it("render-stems-nrt.scd parses without SC error", () => {
    const scdPath = path.join(SCORES_DIR, "render-stems-nrt.scd");
    const result = execSync(`sclang -i none -e "(\\"${scdPath}\\".load; 0.exit)"`, {
      timeout: 15000,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    // If sclang exits 0, parse succeeded
    expect(result).toBeDefined();
  });
});
