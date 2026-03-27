import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync, execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { presetSchema } from "./genre-preset.js";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "../..");
const ANALYZER_DIR = path.join(PROJECT_ROOT, "audio", "analyzer");
const ANALYZER_SCRIPT = path.join(ANALYZER_DIR, "analyze_track.py");
const REQUIREMENTS_FILE = path.join(ANALYZER_DIR, "requirements.txt");
const FIXTURE_DIR = path.join(ANALYZER_DIR, "test-fixtures");
const FIXTURE_WAV = path.join(FIXTURE_DIR, "test-sine.wav");

// Reference WAV detection (real track for integration tests)
const REFS_DIR = path.join(PROJECT_ROOT, "audio", "references");
const refFiles = fs.existsSync(REFS_DIR)
  ? fs.readdirSync(REFS_DIR).filter((f) => f.endsWith(".wav"))
  : [];
const hasReferenceWav = refFiles.length > 0;

// Fallback: use CI fixture if no reference WAV
const analysisWav = hasReferenceWav
  ? path.join(REFS_DIR, refFiles[0])
  : FIXTURE_WAV;
const hasAnalysisWav = fs.existsSync(analysisWav);

// Python + librosa + essentia detection (try/catch to prevent test runner crash)
let hasPython = false;
try {
  execSync("python3 -c 'import librosa; import essentia'", {
    stdio: "ignore",
    timeout: 15_000,
  });
  hasPython = true;
} catch {
  hasPython = false;
}

const ANALYSIS_FIELDS = [
  "bpm", "key", "spectral_centroid", "spectral_bandwidth", "spectral_rolloff",
  "energy_curve", "onset_density", "frequency_balance", "dynamic_range",
  "stereo_width", "kick_pattern", "hat_pattern", "bass_profile",
  "structure", "loudness", "mfcc", "spectral_contrast", "danceability",
];

// ============================================================================
// T1: Hybrid Python Analysis Engine (librosa + essentia)
// ============================================================================
describe("T1: Hybrid Analysis Engine", () => {
  // --- File existence ---
  it("analyze_track.py exists", () => {
    expect(fs.existsSync(ANALYZER_SCRIPT)).toBe(true);
  });

  it("requirements.txt has essentia", () => {
    const content = fs.readFileSync(REQUIREMENTS_FILE, "utf-8");
    expect(content).toContain("essentia");
    expect(content).not.toContain("madmom");
    expect(content).not.toContain("pyloudnorm");
  });

  it("test-sine.wav fixture exists", () => {
    if (!fs.existsSync(FIXTURE_WAV)) {
      console.warn("CI fixture test-sine.wav missing — some tests will skip");
    }
    expect(fs.existsSync(FIXTURE_WAV)).toBe(true);
  });

  // --- Static checks (script content) ---
  it("Python 3.9+ version check in script", () => {
    const content = fs.readFileSync(ANALYZER_SCRIPT, "utf-8");
    expect(content).toContain("sys.version_info");
  });

  it("uses essentia KeyExtractor", () => {
    const content = fs.readFileSync(ANALYZER_SCRIPT, "utf-8");
    expect(content).toContain("KeyExtractor");
  });

  it("uses essentia RhythmExtractor for BPM", () => {
    const content = fs.readFileSync(ANALYZER_SCRIPT, "utf-8");
    expect(content).toContain("RhythmExtractor");
  });

  it("uses essentia LoudnessEBUR128", () => {
    const content = fs.readFileSync(ANALYZER_SCRIPT, "utf-8");
    expect(content).toContain("LoudnessEBUR128");
    expect(content).not.toContain("pyloudnorm");
  });

  it("uses 2-way BPM cross-validation", () => {
    const content = fs.readFileSync(ANALYZER_SCRIPT, "utf-8");
    expect(content).toContain("RhythmExtractor");
    expect(content).toContain("beat_track");
  });

  // --- Integration tests (require Python + audio file) ---
  describe.skipIf(!hasPython || !hasAnalysisWav)(
    "analysis output (requires python + audio)",
    () => {
      let analysis: Record<string, unknown>;
      let outputDir: string;

      beforeAll(async () => {
        outputDir = fs.mkdtempSync(
          path.join(PROJECT_ROOT, "out", "analysis", "test-"),
        );
        execFileSync("python3", [ANALYZER_SCRIPT, analysisWav, outputDir], {
          timeout: 180_000,
          cwd: PROJECT_ROOT,
        });
        const jsonPath = path.join(outputDir, "analysis.json");
        expect(fs.existsSync(jsonPath)).toBe(true);
        analysis = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      }, 180_000);

      it("analysis.json has 18 ANALYSIS_FIELDS", () => {
        // Filter out non-metric fields (warnings, stems are optional)
        const keys = Object.keys(analysis).filter((k) => !["warnings", "stems"].includes(k));
        for (const field of ANALYSIS_FIELDS) {
          expect(keys, `missing field: ${field}`).toContain(field);
        }
        expect(keys.length).toBe(18);
      });

      it("bpm field with confidence score", () => {
        const bpm = analysis.bpm as Record<string, number>;
        expect(bpm.value).toBeGreaterThan(0);
        expect(bpm.confidence).toBeGreaterThanOrEqual(0);
        expect(bpm.confidence).toBeLessThanOrEqual(1);
      });

      it("key field is string or null", () => {
        const key = analysis.key;
        expect(key === null || typeof key === "string").toBe(true);
      });

      it("bass_profile has type field", () => {
        const bass = analysis.bass_profile as Record<string, unknown>;
        expect(["sub", "rolling", "acid"]).toContain(bass.type);
      });

      it("structure has segments array", () => {
        const structure = analysis.structure as Record<string, unknown>;
        expect(Array.isArray(structure.segments)).toBe(true);
        expect((structure.segments as unknown[]).length).toBeGreaterThan(0);
      });

      it("energy_curve max 100 segments", () => {
        const curve = analysis.energy_curve as number[];
        expect(Array.isArray(curve)).toBe(true);
        expect(curve.length).toBeLessThanOrEqual(100);
      });

      it("kick_pattern has positions array", () => {
        const kick = analysis.kick_pattern as Record<string, unknown>;
        expect(Array.isArray(kick.positions)).toBe(true);
      });

      it("hat_pattern has positions array", () => {
        const hat = analysis.hat_pattern as Record<string, unknown>;
        expect(Array.isArray(hat.positions)).toBe(true);
      });

      it("bpm half/double correction (60-200 range)", () => {
        const bpm = analysis.bpm as Record<string, number>;
        expect(bpm.value).toBeGreaterThanOrEqual(60);
        expect(bpm.value).toBeLessThanOrEqual(200);
      });

      it("loudness has LUFS field (EBU R128)", () => {
        const loudness = analysis.loudness as Record<string, number>;
        expect(typeof loudness.integrated).toBe("number");
      });

      it("danceability has score", () => {
        const dance = analysis.danceability as Record<string, number>;
        expect(typeof dance.score).toBe("number");
        expect(dance.score).toBeGreaterThanOrEqual(0);
        expect(dance.score).toBeLessThanOrEqual(3);
      });

      it("analysis.json size < 1MB", () => {
        const jsonPath = path.join(outputDir, "analysis.json");
        const stat = fs.statSync(jsonPath);
        expect(stat.size).toBeLessThan(1_000_000);
      });

      it("warnings array exists", () => {
        expect(Array.isArray(analysis.warnings)).toBe(true);
      });
    },
  );
});

// ============================================================================
// T2: TS Preset/Pattern/Scene Generation
// ============================================================================
const TRACK_ANALYZER_TS = path.join(PROJECT_ROOT, "scripts", "lib", "track-analyzer.ts");

// Mock analysis data for unit tests
const MOCK_ANALYSIS = {
  bpm: { value: 138, confidence: 0.95 },
  key: "G#m",
  spectral_centroid: { mean: 2100, max: 5000, min: 300 },
  spectral_bandwidth: 2500,
  spectral_rolloff: 6000,
  energy_curve: Array(50).fill(0).map((_, i) => 0.3 + 0.5 * Math.sin(i / 10)),
  onset_density: 6.5,
  frequency_balance: { low: 0.88, mid: 0.09, hi: 0.03 },
  dynamic_range: { crest: 3.5, rms_mean: 0.12, rms_max: 0.35 },
  stereo_width: 0.08,
  kick_pattern: { positions: [0.0, 0.435, 0.87, 1.304] },
  hat_pattern: { positions: [0.109, 0.326, 0.543, 0.761, 0.978, 1.195] },
  bass_profile: { centroid: 150, variance: 30, flux: 0.15, type: "sub" as const },
  structure: { segments: [
    { start: 0, end: 30, label: "intro" },
    { start: 30, end: 120, label: "drop" },
    { start: 120, end: 150, label: "outro" },
  ]},
  loudness: { integrated: -8.5, range: 6.2, short_term_max: -4.1 },
  mfcc: { mean: Array(13).fill(0).map((_, i) => -200 + i * 30), std: Array(13).fill(10) },
  spectral_contrast: { mean: [20, 25, 22, 18, 15, 12, 8], std: [5, 4, 3, 3, 2, 2, 1] },
  danceability: { score: 1.8 },
  warnings: [],
};

describe("T2: Preset/Pattern/Scene Generation", () => {
  it("track-analyzer.ts exists", () => {
    expect(fs.existsSync(TRACK_ANALYZER_TS)).toBe(true);
  });

  it("no linear mapRange in source", () => {
    const content = fs.readFileSync(TRACK_ANALYZER_TS, "utf-8");
    expect(content).not.toMatch(/\bmapRange\b/);
  });

  // Dynamic import to avoid failure if file doesn't exist yet
  let mod: Record<string, (...args: unknown[]) => unknown>;

  beforeAll(async () => {
    mod = await import("./track-analyzer") as Record<string, (...args: unknown[]) => unknown>;
  });

  // --- BPM mapping ---
  it("mapBpmToPreset correct range", () => {
    const result = (mod.mapBpmToPreset as (bpm: number) => { min: number; max: number; default: number })(138);
    expect(result.min).toBeLessThan(result.default);
    expect(result.max).toBeGreaterThan(result.default);
    expect(result.default).toBe(138);
  });

  // --- Frequency balance → kick drive ---
  it("mapFreqBalance to kick drive (heavy)", () => {
    const drive = (mod.mapKickDrive as (low: number) => number)(0.9);
    expect(drive).toBeGreaterThanOrEqual(0.8);
  });

  it("mapFreqBalance to kick drive (medium)", () => {
    const drive = (mod.mapKickDrive as (low: number) => number)(0.75);
    expect(drive).toBeGreaterThanOrEqual(0.5);
    expect(drive).toBeLessThanOrEqual(0.7);
  });

  it("mapFreqBalance to kick drive (low)", () => {
    const drive = (mod.mapKickDrive as (low: number) => number)(0.5);
    expect(drive).toBeLessThanOrEqual(0.4);
  });

  // --- Bass type profiles ---
  it("mapBassType acid → high cutoff+res", () => {
    const p = (mod.mapBassType as (t: string) => { cutoff: number; resonance: number })(
      "acid",
    );
    expect(p.cutoff).toBeGreaterThanOrEqual(2000);
    expect(p.resonance).toBeGreaterThanOrEqual(0.7);
  });

  it("mapBassType sub → low cutoff", () => {
    const p = (mod.mapBassType as (t: string) => { cutoff: number })(
      "sub",
    );
    expect(p.cutoff).toBeLessThanOrEqual(500);
  });

  // --- Dynamics → compress ---
  it("mapDynamics high crest → low compress", () => {
    const c = (mod.mapCompress as (crest: number) => number)(6);
    expect(c).toBeLessThanOrEqual(0.3);
  });

  it("mapDynamics low crest → high compress", () => {
    const c = (mod.mapCompress as (crest: number) => number)(2);
    expect(c).toBeGreaterThanOrEqual(0.7);
  });

  // --- Spectral contrast → saturate ---
  it("mapSpectralContrast high → low saturate", () => {
    const s = (mod.mapSaturate as (contrast: number[]) => number)([30, 35, 30, 25, 20, 15, 10]);
    expect(s).toBeLessThanOrEqual(0.3);
  });

  // --- Preset generation ---
  it("generatePreset passes Zod", () => {
    const preset = (mod.generatePreset as (a: typeof MOCK_ANALYSIS, name: string) => unknown)(
      MOCK_ANALYSIS, "test_track",
    );
    expect(() => presetSchema.parse(preset)).not.toThrow();
  });

  it("generatePreset has name field", () => {
    const preset = (mod.generatePreset as (a: typeof MOCK_ANALYSIS, name: string) => { name: string })(
      MOCK_ANALYSIS, "acid-carousel-01",
    );
    expect(preset.name).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it("generatePreset has 14 fxDefaults", () => {
    const preset = (mod.generatePreset as (a: typeof MOCK_ANALYSIS, name: string) => { fxDefaults: Record<string, number> })(
      MOCK_ANALYSIS, "test",
    );
    expect(Object.keys(preset.fxDefaults).length).toBe(14);
  });

  it("generatePreset has stemGroups", () => {
    const preset = (mod.generatePreset as (a: typeof MOCK_ANALYSIS, name: string) => { stemGroups: Record<string, string[]> })(
      MOCK_ANALYSIS, "test",
    );
    expect(typeof preset.stemGroups).toBe("object");
  });

  // --- Pattern generation ---
  it("quantizeOnsets 16-step", () => {
    const pat = (mod.quantizeOnsets as (positions: number[], bpm: number) => string)(
      [0.0, 0.435, 0.87, 1.304], 138,
    );
    expect(pat).toContain("x");
    expect(pat).toContain("~");
  });

  it("generateTidalPattern kick", () => {
    const pat = (mod.generateTidalPattern as (positions: number[], bpm: number) => string)(
      MOCK_ANALYSIS.kick_pattern.positions, 138,
    );
    expect(typeof pat).toBe("string");
    expect(pat.length).toBeGreaterThan(0);
  });

  it("generateTidalPattern hat", () => {
    const pat = (mod.generateTidalPattern as (positions: number[], bpm: number) => string)(
      MOCK_ANALYSIS.hat_pattern.positions, 138,
    );
    expect(typeof pat).toBe("string");
  });

  // --- Section/Scene ---
  it("detectSections from energy", () => {
    const sections = (mod.detectSections as (curve: number[]) => { label: string }[])(
      MOCK_ANALYSIS.energy_curve,
    );
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThan(0);
  });

  it("mapGenre psytrance → trance", () => {
    const g = (mod.mapGenre as (bpm: number) => string)(142);
    expect(g).toBe("trance");
  });

  it("mapGenre melodic_techno → techno", () => {
    const g = (mod.mapGenre as (bpm: number) => string)(128);
    expect(g).toBe("techno");
  });

  it("generateSceneAudio valid", () => {
    const scene = (mod.generateSceneAudio as (a: typeof MOCK_ANALYSIS, presetName: string) => Record<string, unknown>)(
      MOCK_ANALYSIS, "test_preset",
    );
    expect(scene.genre).toBeDefined();
    expect(scene.energy).toBeDefined();
    expect(scene.bpm).toBeDefined();
    expect(scene.preset).toBe("test_preset");
  });

  // --- Onset density → hat openness ---
  it("mapOnsetDensity to hat openness (dense)", () => {
    const o = (mod.mapHatOpenness as (density: number) => number)(9);
    expect(o).toBeLessThanOrEqual(0.05);
  });

  it("mapOnsetDensity to hat openness (sparse)", () => {
    const o = (mod.mapHatOpenness as (density: number) => number)(3);
    expect(o).toBeGreaterThanOrEqual(0.3);
  });

  // --- Bass profile mapping ---
  it("bass_profile.type maps correctly", () => {
    const p = (mod.mapBassType as (t: string) => { cutoff: number; resonance: number; envAmount: number })(
      "rolling",
    );
    expect(p.cutoff).toBeGreaterThan(500);
    expect(p.cutoff).toBeLessThan(2000);
  });

  // --- Danceability → scene energy ---
  it("mapDanceability high → high energy", () => {
    const e = (mod.mapDanceabilityToEnergy as (score: number) => number)(2.5);
    expect(e).toBeGreaterThanOrEqual(0.8);
  });

  it("mapDanceability low → low energy", () => {
    const e = (mod.mapDanceabilityToEnergy as (score: number) => number)(0.5);
    expect(e).toBeLessThanOrEqual(0.4);
  });

  // --- MFCC reference ---
  it("MFCC reference coefficients in analysis", () => {
    // Verify generatePreset handles MFCC data without errors
    const preset = (mod.generatePreset as (a: typeof MOCK_ANALYSIS, name: string) => unknown)(
      MOCK_ANALYSIS, "mfcc_test",
    );
    expect(preset).toBeDefined();
  });
});

// ============================================================================
// T3: demucs Source Separation + Per-Stem Analysis
// ============================================================================
describe("T3: demucs Source Separation", () => {
  const scriptContent = fs.readFileSync(ANALYZER_SCRIPT, "utf-8");

  it("demucs --out flag used", () => {
    expect(scriptContent).toContain("--out");
  });

  it("graceful skip when no demucs", () => {
    expect(scriptContent).toContain("demucs");
    // Script should handle demucs absence without crashing
    expect(scriptContent).toMatch(/has_demucs|HAS_DEMUCS|demucs.*skip|demucs.*not/i);
  });

  it("stem analysis subset drums has onset/kick/hat", () => {
    expect(scriptContent).toContain("drums");
    expect(scriptContent).toContain("kick_pattern");
    expect(scriptContent).toContain("hat_pattern");
  });

  it("stem analysis subset bass has spectral/type", () => {
    expect(scriptContent).toContain("bass");
    expect(scriptContent).toContain("bass_type") || expect(scriptContent).toContain("centroid");
  });

  it("stem analysis subset vocals has dynamics", () => {
    const hasVocals = scriptContent.includes("vocals") || scriptContent.includes("dynamic");
    expect(hasVocals).toBe(true);
  });

  it("stem analysis subset other has spectral/stereo", () => {
    const hasOther = scriptContent.includes("other") || scriptContent.includes("stereo");
    expect(hasOther).toBe(true);
  });

  it("disk space check before demucs", () => {
    expect(scriptContent).toMatch(/disk|space|statvfs|shutil/i);
  });
});

// ============================================================================
// T4: CLI + E2E
// ============================================================================
const CLI_SCRIPT = path.join(PROJECT_ROOT, "scripts", "analyze-track.ts");

describe("T4: CLI + E2E", () => {
  it("analyze-track.ts exists", () => {
    expect(fs.existsSync(CLI_SCRIPT)).toBe(true);
  });

  it("analyze-track.ts uses execFile", () => {
    const content = fs.readFileSync(CLI_SCRIPT, "utf-8");
    expect(content).toContain("execFile");
  });

  it("analyze-track.ts has ENOENT handling", () => {
    const content = fs.readFileSync(CLI_SCRIPT, "utf-8");
    expect(content).toContain("ENOENT");
  });

  it("analyze-track.ts has analyze.lock", () => {
    const content = fs.readFileSync(CLI_SCRIPT, "utf-8");
    expect(content).toContain("analyze.lock");
  });

  it("package.json has analyze:track", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "package.json"), "utf-8"));
    expect(pkg.scripts["analyze:track"]).toBeDefined();
  });

  it("ALLOWED_EXTENSIONS has flac/mp3/aiff", () => {
    const content = fs.readFileSync(
      path.join(PROJECT_ROOT, "scripts", "lib", "validate-file-path.ts"), "utf-8",
    );
    expect(content).toContain(".flac");
    expect(content).toContain(".mp3");
    expect(content).toContain(".aiff");
  });

  it("stale lock auto-cleanup", () => {
    const content = fs.readFileSync(CLI_SCRIPT, "utf-8");
    expect(content).toMatch(/stale|10.*min|600/);
  });

  it("audioSchema genre enum compatibility", async () => {
    const validGenres = ["techno", "trance", "house", "dnb", "ambient"];
    const { mapGenre } = await import("./track-analyzer.js");
    for (const bpm of [128, 142, 118, 170, 80]) {
      expect(validGenres).toContain(mapGenre(bpm));
    }
  });
});
