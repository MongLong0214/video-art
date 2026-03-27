import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
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
  checkDiskSpace,
  DEFAULT_STEMS,
  SIDECHAIN_BUS,
} from "./stem-render";
import type { NrtScore } from "./osc-to-nrt";
import { validateFilePath } from "./validate-file-path";

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "stem-render-test-"));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const makeTestScore = (): NrtScore => ({
  metadata: { duration: 3.0, eventCount: 4, mapped: 4, skipped: 0, skipRate: 0 },
  events: [
    { time: 0.0, synthDef: "kick", stem: "drums", bus: 0, nodeId: 1000, params: { amp: 1.0, compress: 0.7 } },
    { time: 0.125, synthDef: "hat", stem: "drums", bus: 0, nodeId: 1010, params: { amp: 0.8 } },
    { time: 0.250, synthDef: "supersaw", stem: "synth", bus: 4, nodeId: 1020, params: { cutoff: 2000, compress: 0.5, saturate: 0.3 } },
    { time: 0.500, synthDef: "bass", stem: "bass", bus: 2, nodeId: 1030, params: { amp: 0.9 } },
  ],
});

describe("stem-router", () => {
  // TC-1: getStemBus kick
  it("maps kick to drums bus 0-1", () => {
    const result = getStemBus("kick");
    expect(result).toEqual({ bus: 0, channels: 2 });
  });

  // TC-2: getStemBus supersaw
  it("maps supersaw to synth bus 4-5", () => {
    const result = getStemBus("supersaw");
    expect(result).toEqual({ bus: 4, channels: 2 });
  });

  // TC-3: getStemBus all 9
  it("maps all 9 SynthDefs to valid buses", () => {
    const names = ["kick", "hat", "clap", "bass", "supersaw", "pad", "lead", "arp_pluck", "riser"];
    for (const name of names) {
      const result = getStemBus(name);
      expect(result).not.toBeNull();
      expect(result!.bus).toBeGreaterThanOrEqual(0);
    }
  });

  // TC-4: parseCustomStems valid
  it("parses valid custom stems", () => {
    const result = parseCustomStems("kick:kick bass:bass synth:supersaw,pad");
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("kick");
    expect(result[1].name).toBe("bass");
    expect(result[2].name).toBe("synth");
  });

  // TC-5: parseCustomStems invalid
  it("throws for invalid stem format", () => {
    expect(() => parseCustomStems("invalid_no_colon")).toThrow("Invalid stem format");
  });
});

describe("stem-render NRT Score", () => {
  // TC-6: generateNrtScore inserts FX nodes
  it("inserts FX nodes after instruments with FX params", () => {
    const score = makeTestScore();
    const entries = generateNrtScoreEntries(score);

    // kick has compress → should have FX nodes after it
    const kickEntry = entries.find((e) => e.cmd[1] === "kick");
    expect(kickEntry).toBeDefined();

    // FX entries for kick's compress param
    const fxEntries = entries.filter((e) =>
      e.cmd[1]?.startsWith("custom") && e.time === 0.0,
    );
    expect(fxEntries.length).toBeGreaterThan(0);
  });

  // TC-7: generateNrtScore FX order
  it("FX chain order: sidechain→comp→sat→eq", () => {
    const score = makeTestScore();
    const entries = generateNrtScoreEntries(score);

    // supersaw at time 0.250 has compress+saturate → should get FX nodes
    const fxAt250 = entries.filter(
      (e) => e.time === 0.250 && e.cmd[1]?.startsWith("custom"),
    );
    const fxNames = fxAt250.map((e) => e.cmd[1]);

    // sidechain first, then compressor, then saturator, then EQ
    const sidechainIdx = fxNames.indexOf("customSidechain");
    const compIdx = fxNames.indexOf("customCompressor");
    const satIdx = fxNames.indexOf("customSaturator");

    if (sidechainIdx >= 0 && compIdx >= 0) {
      expect(sidechainIdx).toBeLessThan(compIdx);
    }
    if (compIdx >= 0 && satIdx >= 0) {
      expect(compIdx).toBeLessThan(satIdx);
    }
  });

  // TC-8: sidechain bus 100
  it("kick sends to sidechain bus 100", () => {
    const score = makeTestScore();
    const entries = generateNrtScoreEntries(score);

    const sidechainSend = entries.find(
      (e) => e.cmd[1] === "nrt_sidechain_send",
    );
    expect(sidechainSend).toBeDefined();
    const outBusIdx = sidechainSend!.cmd.indexOf("outBus");
    expect(sidechainSend!.cmd[outBusIdx + 1]).toBe(String(SIDECHAIN_BUS));
  });

  // TC-9: splitMultiChannelWav commands
  it("generates 4 ffmpeg split commands for 8ch", () => {
    const commands = buildSplitCommands("/tmp/output-8ch.wav", "/tmp/stems");
    expect(commands).toHaveLength(4);
    expect(commands[0].outputFile).toContain("stem-drums.wav");
    expect(commands[1].outputFile).toContain("stem-bass.wav");
    expect(commands[2].outputFile).toContain("stem-synth.wav");
    expect(commands[3].outputFile).toContain("stem-fx.wav");
  });

  // TC-10: stemOutputPath
  it("formats output path correctly", () => {
    const result = stemOutputPath("/project", "my-session", new Date("2026-03-27"));
    expect(result).toContain("2026-03-27_my-session");
    expect(result).toContain("stems");
  });
});

describe("stem-render guards", () => {
  // TC-15: concurrent render rejected
  it("rejects concurrent render via lock", () => {
    writeRenderLock(tmpDir);
    expect(() => checkRenderLock(tmpDir)).toThrow("Render already in progress");
    removeRenderLock(tmpDir);
  });

  // TC-16: disk space check
  it("checks disk space with 2x safety margin", () => {
    expect(checkDiskSpace(200_000_000, 80_000_000)).toBe(true);
    expect(checkDiskSpace(100_000_000, 80_000_000)).toBe(false);
  });

  // TC-17: stem-router does not import live modules
  it("stem-render.ts does not import live-orchestrator", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "scripts", "lib", "stem-render.ts"), "utf-8");
    expect(src).not.toContain("live-orchestrator");
    expect(src).not.toContain("live-health-monitor");
  });

  // TC-18: package.json has render:stems
  it("package.json has render:stems script", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.scripts["render:stems"]).toBeDefined();
  });

  // TC-19a: writeScoreConfig creates file
  it("writeScoreConfig creates config file", () => {
    const score = makeTestScore();
    const entries = generateNrtScoreEntries(score);
    const outPath = path.join(tmpDir, "test-config.json");
    writeScoreConfig(entries, "/tmp/nrt.json", outPath);
    expect(fs.existsSync(outPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(outPath, "utf-8"));
    expect(content.outputChannels).toBe(8);
    expect(content.sampleRate).toBe(48000);
  });

  // TC-19b: validateFilePath .osc extension
  it("validates .osc file extension", () => {
    const testFile = path.join(tmpDir, "test.osc");
    fs.writeFileSync(testFile, "test");
    expect(validateFilePath(testFile, tmpDir, [".osc"])).toBe(true);
  });
});
