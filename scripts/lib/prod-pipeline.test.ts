import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  generateSessionInfo,
  generateImportGuide,
  buildMasteringCommand,
  verifyLoudness,
  createOutputStructure,
  copyRawFiles,
  runPipelineSteps,
  hasExecOrSpawn,
} from "./prod-pipeline";

describe("prod-pipeline", () => {
  // TC-1: generateSessionInfo valid
  it("generates valid session info", () => {
    const info = generateSessionInfo({
      bpm: 128, key: "Am", duration: 180.5,
      stems: ["stem-drums.wav", "stem-bass.wav"],
      total: 100, mapped: 90, skipped: 10,
    });
    expect(info.bpm).toBe(128);
    expect(info.key).toBe("Am");
    expect(info.duration).toBe(180.5);
    expect(info.stems).toHaveLength(2);
    expect(info.eventSummary.total).toBe(100);
  });

  // TC-2: generateSessionInfo missing key
  it("allows null key", () => {
    const info = generateSessionInfo({
      duration: 60, stems: [], total: 10, mapped: 10, skipped: 0,
    });
    expect(info.key).toBeNull();
    expect(info.bpm).toBeNull();
  });

  // TC-3: generateImportGuide
  it("generates import guide with stems", () => {
    const info = generateSessionInfo({
      bpm: 128, key: "Am", duration: 180,
      stems: ["stem-drums.wav", "stem-bass.wav", "stem-synth.wav", "stem-fx.wav"],
      total: 100, mapped: 100, skipped: 0,
    });
    const guide = generateImportGuide(info);
    expect(guide).toContain("128");
    expect(guide).toContain("Am");
    expect(guide).toContain("stem-drums.wav");
    expect(guide).toContain("48kHz");
  });

  // TC-4: masteringCommand correct args
  it("builds mastering command with loudnorm", () => {
    const args = buildMasteringCommand(
      ["/tmp/drums.wav", "/tmp/bass.wav"],
      "/tmp/master.wav",
    );
    const joined = args.join(" ");
    expect(joined).toContain("I=-14");
    expect(joined).toContain("TP=-2");
    expect(joined).toContain("LRA=7");
  });

  // TC-5: masteringCommand output format
  it("specifies 48kHz 16-bit output", () => {
    const args = buildMasteringCommand(["/tmp/a.wav"], "/tmp/master.wav");
    expect(args).toContain("-ar");
    expect(args).toContain("48000");
    expect(args).toContain("-sample_fmt");
    expect(args).toContain("s16");
  });

  // TC-6: pipeline runs all steps
  it("runs pipeline steps in order", async () => {
    const order: string[] = [];
    await runPipelineSteps([
      { name: "convert", fn: async () => { order.push("convert"); } },
      { name: "stems", fn: async () => { order.push("stems"); } },
      { name: "master", fn: async () => { order.push("master"); } },
    ]);
    expect(order).toEqual(["convert", "stems", "master"]);
  });

  // TC-7: pipeline stops on convert error
  it("stops pipeline on step failure", async () => {
    const order: string[] = [];
    await expect(runPipelineSteps([
      { name: "convert", fn: async () => { throw new Error("convert failed"); } },
      { name: "stems", fn: async () => { order.push("stems"); } },
    ])).rejects.toThrow('Pipeline failed at step "convert"');
    expect(order).not.toContain("stems");
  });

  // TC-8: output structure
  it("creates stems/ and raw/ directories", () => {
    const tmpDir = path.join("/tmp", `prod-test-${Date.now()}`);
    createOutputStructure(tmpDir);
    expect(fs.existsSync(path.join(tmpDir, "stems"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, "raw"))).toBe(true);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // TC-10: verifyLoudness pass
  it("passes valid LUFS and TP", () => {
    const result = verifyLoudness(-14.2, -2.5);
    expect(result.pass).toBe(true);
  });

  // TC-11: verifyLoudness fail LUFS
  it("fails when LUFS out of range", () => {
    const result = verifyLoudness(-10, -3);
    expect(result.pass).toBe(false);
    expect(result.message).toContain("FAIL");
  });

  // TC-12: verifyLoudness fail TP
  it("fails when TP too high", () => {
    const result = verifyLoudness(-14, -0.5);
    expect(result.pass).toBe(false);
  });

  // TC-13: no exec or spawn in prod scripts
  it("prod scripts use execFile only", () => {
    const scripts = [
      "scripts/prod-convert.ts",
      "scripts/render-stems.ts",
    ];
    for (const script of scripts) {
      const fullPath = path.join(process.cwd(), script);
      if (fs.existsSync(fullPath)) {
        expect(hasExecOrSpawn(fullPath)).toBe(false);
      }
    }
  });

  // TC-14: render:audio regression
  it("existing render:audio script still exists", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.scripts["render:audio"]).toBeDefined();
  });

  // TC-15: package.json has render:prod
  it("package.json has render:prod script", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.scripts["render:prod"]).toBeDefined();
  });

  // TC-16a: copyRawFiles copies existing files
  it("copies raw files to destination", () => {
    const srcDir = path.join("/tmp", `copy-test-${Date.now()}`);
    fs.mkdirSync(srcDir, { recursive: true });
    const srcFile = path.join(srcDir, "test.osclog");
    fs.writeFileSync(srcFile, "test content");
    const rawDir = path.join(srcDir, "raw");
    fs.mkdirSync(rawDir);

    copyRawFiles([{ path: srcFile, destName: "session.osclog" }], rawDir);
    expect(fs.existsSync(path.join(rawDir, "session.osclog"))).toBe(true);
    fs.rmSync(srcDir, { recursive: true, force: true });
  });

  // TC-16b: pipeline warns on LUFS out of range
  it("loudness check returns warning without crash", () => {
    const result = verifyLoudness(-10, -3);
    expect(result.pass).toBe(false);
    expect(result.message).toBeDefined();
    // No throw — just returns fail result
  });
});
