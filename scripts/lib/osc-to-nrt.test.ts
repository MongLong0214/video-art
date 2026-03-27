import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  parseOscLog,
  listOscLogFiles,
  mergeMultiPart,
  convertToNrt,
  generateSummary,
  writeNrtScore,
} from "./osc-to-nrt";
import { mapSynthDef, normalizeParams, SUPPORTED_SYNTHDEFS } from "./synth-stem-map";
import { validateFilePath } from "./validate-file-path";

// Test fixtures
let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "osc-nrt-test-"));

  // Single file fixture
  fs.writeFileSync(
    path.join(tmpDir, "test.osclog"),
    [
      '{"ts":0.0,"s":"kick","n":0,"orbit":0,"gain":1.0}',
      '{"ts":0.125,"s":"hat","n":0,"orbit":1,"gain":0.8}',
      '{"ts":0.250,"s":"supersaw","n":4,"orbit":2,"cutoff":2000,"compress":0.7}',
      '{"ts":0.500,"s":"808","n":0,"orbit":0,"gain":0.9}',
      '{broken json line}',
    ].join("\n"),
  );

  // Multi-part fixtures
  const partsDir = path.join(tmpDir, "session");
  fs.mkdirSync(partsDir);
  fs.writeFileSync(
    path.join(partsDir, "session_2026-03-27_21-00_part0.osclog"),
    '{"ts":0.0,"s":"kick","n":0}\n{"ts":1.0,"s":"bass","n":0}\n',
  );
  fs.writeFileSync(
    path.join(partsDir, "session_2026-03-27_21-00_part1.osclog"),
    '{"ts":0.0,"s":"pad","n":3}\n{"ts":0.5,"s":"lead","n":7}\n',
  );
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("synth-stem-map", () => {
  // TC-1: mapSynthDef known kick
  it("maps kick to drums stem", () => {
    const result = mapSynthDef("kick");
    expect(result).not.toBeNull();
    expect(result!.stem).toBe("drums");
    expect(result!.bus).toBe(0);
  });

  // TC-2: mapSynthDef unknown 808
  it("returns null for unknown SynthDef (808)", () => {
    expect(mapSynthDef("808")).toBeNull();
    expect(mapSynthDef("bd")).toBeNull();
  });

  // TC-3: mapSynthDef all 9 custom
  it("maps all 9 custom SynthDefs", () => {
    const names = ["kick", "hat", "clap", "bass", "supersaw", "pad", "lead", "arp_pluck", "riser"];
    for (const name of names) {
      expect(mapSynthDef(name)).not.toBeNull();
    }
    expect(SUPPORTED_SYNTHDEFS.size).toBe(9);
  });

  // TC-8: normalizeParams gain to amp
  it("normalizes gain to amp", () => {
    const { normalized } = normalizeParams({ gain: 0.8 });
    expect(normalized.amp).toBe(0.8);
    expect(normalized.gain).toBeUndefined();
  });

  // TC-9: normalizeParams unknown preserved with warning
  it("preserves unknown params", () => {
    const { normalized, warnings } = normalizeParams({ customThing: 42, orbit: 0 });
    expect(normalized.customThing).toBe(42);
    expect(normalized.orbit).toBe(0);
  });
});

describe("osc-to-nrt", () => {
  // TC-4: convertTimestamp session-relative
  it("converts timestamps to session-relative", () => {
    const events = parseOscLog(path.join(tmpDir, "test.osclog"));
    const nrt = convertToNrt(events);
    expect(nrt.events[0].time).toBe(0);
    expect(nrt.events[1].time).toBe(0.125);
  });

  // TC-5: convertTimestamp first event is 0
  it("first event time is 0.0", () => {
    const events = parseOscLog(path.join(tmpDir, "test.osclog"));
    const nrt = convertToNrt(events);
    expect(nrt.events[0].time).toBe(0);
  });

  // TC-6: preserveFxParams compress
  it("preserves FX params like compress", () => {
    const events = parseOscLog(path.join(tmpDir, "test.osclog"));
    const nrt = convertToNrt(events);
    const sawEvent = nrt.events.find((e) => e.synthDef === "supersaw");
    expect(sawEvent?.params.compress).toBe(0.7);
  });

  // TC-7: preserveFxParams saturate+eq
  it("preserves cutoff params", () => {
    const events = parseOscLog(path.join(tmpDir, "test.osclog"));
    const nrt = convertToNrt(events);
    const sawEvent = nrt.events.find((e) => e.synthDef === "supersaw");
    expect(sawEvent?.params.cutoff).toBe(2000);
  });

  // TC-10: generateSummary counts
  it("generates correct summary counts", () => {
    const result = generateSummary(100, 80, 20);
    expect(result.total).toBe(100);
    expect(result.mapped).toBe(80);
    expect(result.skipped).toBe(20);
    expect(result.skipRate).toBe(20);
  });

  // TC-11: generateSummary skip warning 15%
  it("warns when skip rate > 10%", () => {
    const result = generateSummary(100, 85, 15);
    expect(result.level).toBe("warning");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  // TC-12: generateSummary skip error 60%
  it("throws error when skip rate > 50%", () => {
    expect(() => generateSummary(100, 40, 60)).toThrow("50% threshold");
  });

  // TC-13: mergeMultiPart 3 files
  it("merges multi-part files with timestamp offsets", () => {
    const events = mergeMultiPart(path.join(tmpDir, "session"));
    expect(events).toHaveLength(4);
    // Part 0: ts 0, 1. Part 1 offset from 1.0: ts 1.0, 1.5
    expect(events[0].ts).toBe(0);
    expect(events[1].ts).toBe(1.0);
    expect(events[2].ts).toBeCloseTo(1.0, 1); // offset applied
    expect(events[3].ts).toBeCloseTo(1.5, 1);
  });

  // TC-14: mergeMultiPart sorted by filename
  it("merges files sorted by filename", () => {
    const files = listOscLogFiles(path.join(tmpDir, "session"));
    expect(files[0]).toContain("part0");
    expect(files[1]).toContain("part1");
  });

  // TC-15: convertToScore valid output
  it("produces valid NRT score with metadata", () => {
    const events = parseOscLog(path.join(tmpDir, "test.osclog"));
    const nrt = convertToNrt(events);

    expect(nrt.metadata.eventCount).toBe(4); // 4 valid JSON (broken line pre-filtered)
    expect(nrt.metadata.mapped).toBe(3); // kick, hat, supersaw
    expect(nrt.metadata.skipped).toBe(1); // 808
    expect(nrt.events).toHaveLength(3);

    // Write and verify
    const outPath = path.join(tmpDir, "output.nrt.json");
    writeNrtScore(nrt, outPath);
    expect(fs.existsSync(outPath)).toBe(true);

    const written = JSON.parse(fs.readFileSync(outPath, "utf-8"));
    expect(written.events).toHaveLength(3);
  });

  // TC-16: validateFilePath osclog extension
  it("validates .osclog file extension", () => {
    const testFile = path.join(tmpDir, "test.osclog");
    expect(validateFilePath(testFile, tmpDir, [".osclog"])).toBe(true);
  });

  // TC-17: validateFilePath rejects txt
  it("rejects .txt file extension", () => {
    const txtFile = path.join(tmpDir, "test.txt");
    fs.writeFileSync(txtFile, "test");
    expect(validateFilePath(txtFile, tmpDir, [".osclog"])).toBe(false);
    fs.unlinkSync(txtFile);
  });

  // TC-18: directory input globs all osclog files
  it("lists all .osclog files in directory", () => {
    const files = listOscLogFiles(path.join(tmpDir, "session"));
    expect(files).toHaveLength(2);
    expect(files.every((f) => f.endsWith(".osclog"))).toBe(true);
  });

  // TC-19a: convertToNrt throws on empty events
  it("convertToNrt throws for empty events", () => {
    expect(() => convertToNrt([])).toThrow("no events found");
  });

  // TC-19b: mergeMultiPart throws on empty directory
  it("mergeMultiPart throws for empty directory", () => {
    const emptyDir = path.join(tmpDir, "empty");
    fs.mkdirSync(emptyDir, { recursive: true });
    expect(() => mergeMultiPart(emptyDir)).toThrow("no .osclog files found");
  });

  // TC-20: package.json has prod:convert script
  it("package.json has prod:convert script", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.scripts["prod:convert"]).toBeDefined();
  });
});
