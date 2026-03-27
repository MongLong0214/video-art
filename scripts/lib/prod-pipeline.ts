import { execFile as execFileCb } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFileCb);

export interface SessionInfo {
  bpm: number | null;
  key: string | null;
  duration: number;
  stems: string[];
  eventSummary: {
    total: number;
    mapped: number;
    skipped: number;
  };
  createdAt: string;
}

export const generateSessionInfo = (options: {
  bpm?: number | null;
  key?: string | null;
  duration: number;
  stems: string[];
  total: number;
  mapped: number;
  skipped: number;
}): SessionInfo => ({
  bpm: options.bpm ?? null,
  key: options.key ?? null,
  duration: options.duration,
  stems: options.stems,
  eventSummary: {
    total: options.total,
    mapped: options.mapped,
    skipped: options.skipped,
  },
  createdAt: new Date().toISOString(),
});

export const generateImportGuide = (info: SessionInfo): string => {
  const stemList = info.stems.map((s) => `- ${s}`).join("\n");
  return `# DAW Import Guide

## Session Info
- BPM: ${info.bpm ?? "not specified (check session manually)"}
- Key: ${info.key ?? "not specified"}
- Duration: ${info.duration.toFixed(1)}s

## Stems
${stemList}

## Import Steps
1. Create new project in DAW (Ableton / Logic / etc.)
2. Set project BPM to ${info.bpm ?? "detected BPM"}
3. Import all stem WAV files to separate tracks
4. All stems are time-aligned — no manual sync needed
5. master.wav is provided as reference mix (-14 LUFS)

## Format
- Sample Rate: 48kHz
- Bit Depth: 32-bit float (stems), 16-bit (master)
- Channels: Stereo (2ch per stem)
`;
};

export const buildMasteringCommand = (
  stemPaths: string[],
  outputPath: string,
): string[] => {
  // Mix all stems + loudnorm
  const inputs: string[] = [];
  for (const stem of stemPaths) {
    inputs.push("-i", stem);
  }

  const filterParts = stemPaths.map((_, i) => `[${i}:a]`).join("");
  const amerge = `${filterParts}amix=inputs=${stemPaths.length},loudnorm=I=-14:TP=-2:LRA=7`;

  return [
    ...inputs,
    "-filter_complex", amerge,
    "-ar", "48000",
    "-sample_fmt", "s16",
    "-y", outputPath,
  ];
};

export interface LoudnessResult {
  pass: boolean;
  lufs: number;
  tp: number;
  message: string;
}

export const verifyLoudness = (lufs: number, tp: number): LoudnessResult => {
  const lufsOk = Math.abs(lufs - (-14)) <= 0.5;
  const tpOk = tp <= -2;
  const pass = lufsOk && tpOk;

  return {
    pass,
    lufs,
    tp,
    message: pass
      ? `LUFS: ${lufs.toFixed(1)} (OK), TP: ${tp.toFixed(1)} dBTP (OK)`
      : `LUFS: ${lufs.toFixed(1)} (${lufsOk ? "OK" : "FAIL"}), TP: ${tp.toFixed(1)} dBTP (${tpOk ? "OK" : "FAIL"})`,
  };
};

export const createOutputStructure = (outputDir: string): void => {
  fs.mkdirSync(path.join(outputDir, "stems"), { recursive: true });
  fs.mkdirSync(path.join(outputDir, "raw"), { recursive: true });
};

export const copyRawFiles = (
  sources: { path: string; destName: string }[],
  rawDir: string,
): void => {
  for (const { path: src, destName } of sources) {
    try {
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(rawDir, destName));
      }
    } catch {
      console.warn(`[WARN] Failed to copy ${src} to raw/`);
    }
  }
};

export type PipelineStep = "convert" | "stems" | "master";

export const runPipelineSteps = async (
  steps: { name: PipelineStep; fn: () => Promise<void> }[],
): Promise<void> => {
  for (const step of steps) {
    try {
      await step.fn();
    } catch (err) {
      throw new Error(
        `Pipeline failed at step "${step.name}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
};

export const hasExecOrSpawn = (filePath: string): boolean => {
  const content = fs.readFileSync(filePath, "utf-8");
  // Check for exec() or spawn() with shell option — execFile is allowed
  const dangerousPatterns = [
    /\bexec\s*\(/,
    /\bspawn\s*\([^)]*shell\s*:\s*true/,
  ];
  return dangerousPatterns.some((p) => p.test(content));
};
