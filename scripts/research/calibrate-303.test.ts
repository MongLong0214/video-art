import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";

const TMP_DIR = fs.mkdtempSync("/tmp/calibrate-303-");
const CWD = path.resolve(import.meta.dirname, "../..");

const ABSTRACTION = {
  version: 1,
  source: "fixtures/reference.wav",
  bpm: { value: 140, confidence: 0.9 },
  root: { value: "A", mode: "minor", midi: 57, confidence: 0.8 },
  sections: [
    { start: 0, end: 8, label: "intro", energy: 0.2 },
    { start: 8, end: 24, label: "drop", energy: 0.8 },
    { start: 24, end: 30, label: "outro", energy: 0.4 },
  ],
  roles: {
    bass: { strategy: "pitch_contour", confidence: 0.8, note_events: [], positions: [], transition_times: [] },
    riff: { strategy: "derived_from_bass", confidence: 0.4, note_events: [], positions: [], transition_times: [] },
    top: { strategy: "density_proxy", confidence: 0.5, note_events: [], positions: [8, 8.5, 9], transition_times: [] },
    fx: { strategy: "section_boundaries", confidence: 0.9, note_events: [], positions: [], transition_times: [8, 24] },
  },
  macro: {
    energy_curve: [0.2, 0.5, 0.8, 0.5],
    cutoff_curve: [0.2, 0.4, 0.7, 0.3],
    density_curve: [0.1, 0.4, 0.8, 0.3],
  },
  fallbacks: { root: null, bass: null, riff: "derived_from_bass", top: "density_proxy_grid", fx: null },
  warnings: [],
};

const IR = {
  version: 1,
  mode: "303_only",
  seed: 42,
  bpm: 140,
  root_midi: 57,
  voices: [
    { role: "bass", events: [{ time: 8, duration: 0.3, note_midi: 57, freq: 220, articulation: "normal", velocity: 0.7, slide: false, source_role: "bass", source_strategy: "pitch_contour", fallback_used: null }] },
    { role: "riff", events: [{ time: 8.5, duration: 0.18, note_midi: 69, freq: 440, articulation: "stab", velocity: 0.6, slide: false, source_role: "riff", source_strategy: "derived_from_bass", fallback_used: "derived_from_bass" }] },
    { role: "pseudo_hat", events: [{ time: 8, duration: 0.08, note_midi: null, freq: null, articulation: "click", velocity: 0.55, slide: false, source_role: "top", source_strategy: "density_proxy", fallback_used: "density_proxy_grid" }] },
    { role: "fx", events: [{ time: 24, duration: 0.8, note_midi: 81, freq: 880, articulation: "sweep", velocity: 0.65, slide: false, source_role: "fx", source_strategy: "section_boundaries", fallback_used: null }] },
  ],
  automation: {
    master_energy: [0.2, 0.5, 0.8, 0.4],
    filter_open: [0.2, 0.4, 0.7, 0.3],
    density: [0.1, 0.4, 0.8, 0.3],
  },
  fallbacks: { root: null, bass: null, riff: "derived_from_bass", top: "density_proxy_grid", fx: null },
};

const AUDIT = {
  version: 1,
  mode: "303_only",
  seed: 42,
  bank_manifest: "audio/samples/303/manifest.json",
  all_within_bank: true,
  selected_source_count: 4,
  unique_source_count: 4,
  stems_mode: false,
  sources: [
    {
      role: "bass",
      time: 8,
      requested_articulation: "normal",
      selected_id: "A3_saw_normal_rr1",
      selected_file: "audio/samples/303/A3_saw_normal_rr1.wav",
      fallback: null,
      note_midi: 57,
      selected_midi: 57,
      rate: 1,
      source_strategy: "pitch_contour",
    },
  ],
};

describe("calibrate-303 CLI", () => {
  beforeAll(() => {
    fs.writeFileSync(path.join(TMP_DIR, "reference-abstraction.json"), JSON.stringify(ABSTRACTION, null, 2));
    fs.writeFileSync(path.join(TMP_DIR, "composition-ir.json"), JSON.stringify(IR, null, 2));
    fs.writeFileSync(path.join(TMP_DIR, "source-purity-audit.json"), JSON.stringify(AUDIT, null, 2));
  });

  it("writes evaluation-303.json from render-303 artifacts", () => {
    const output = execFileSync(
      "npx",
      ["tsx", "scripts/research/calibrate-303.ts", TMP_DIR],
      { encoding: "utf-8", timeout: 15000, cwd: CWD },
    );

    expect(output).toContain("303 evaluation saved");
    const result = JSON.parse(fs.readFileSync(path.join(TMP_DIR, "evaluation-303.json"), "utf-8"));
    expect(result.total_score).toBeGreaterThan(0);
    expect(result.breakdown.groove).toBeGreaterThanOrEqual(0);
  });

  afterAll(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });
});
