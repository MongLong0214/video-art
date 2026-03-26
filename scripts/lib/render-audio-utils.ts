import { execFile as execFileCb, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, writeFileSync, unlinkSync } from "node:fs";
import { calculateBpm } from "../../src/lib/bpm-calculator.js";

const execFile = promisify(execFileCb);

const SCLANG = "/Applications/SuperCollider.app/Contents/MacOS/sclang";
const SCSYNTH = "/Applications/SuperCollider.app/Contents/Resources/scsynth";

export const checkDependencies = (): void => {
  const deps = [
    { cmd: SCLANG, name: "sclang" },
    { cmd: SCSYNTH, name: "scsynth" },
    { cmd: "ffmpeg", name: "ffmpeg" },
    { cmd: "sox", name: "sox" },
  ];

  for (const dep of deps) {
    if (!existsSync(dep.cmd) && !commandExists(dep.cmd)) {
      throw new Error(
        `${dep.name} not found. Run: npm run audio:setup`,
      );
    }
  }
};

const commandExists = (cmd: string): boolean => {
  try {
    execFileSync("which", [cmd], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

interface AudioConfig {
  duration: number;
  bpm: number;
  bars: number;
  key: string;
  scale: string;
  genre: string;
  energy: number;
  outputDir: string;
  sclangPath: string;
  scsynthPath: string;
}

export const generateConfig = (
  sceneJson: {
    duration: number;
    audio?: {
      bpm?: number;
      key?: string;
      scale?: string;
      genre?: "techno" | "trance";
      energy?: number;
    };
  },
  outputDir: string,
): AudioConfig => {
  const audio = sceneJson.audio ?? {};
  const genre = audio.genre ?? "techno";
  const { bpm, bars } = audio.bpm
    ? { bpm: audio.bpm, bars: Math.max(2, Math.round((audio.bpm * sceneJson.duration) / 240)) }
    : calculateBpm(sceneJson.duration, genre);

  return {
    duration: sceneJson.duration,
    bpm,
    bars,
    key: audio.key ?? "Am",
    scale: audio.scale ?? "minor",
    genre,
    energy: audio.energy ?? 0.7,
    outputDir,
    sclangPath: SCLANG,
    scsynthPath: SCSYNTH,
  };
};

export const checkDiskSpace = (outputDir: string, estimatedBytes: number = 0): void => {
  if (!existsSync(outputDir)) return;
  try {
    const dfOut = execFileSync("df", ["-k", outputDir], { encoding: "utf-8" });
    const lines = dfOut.trim().split("\n");
    if (lines.length < 2) return;
    const cols = lines[1].split(/\s+/);
    const availKB = parseInt(cols[3], 10);
    if (isNaN(availKB)) return;
    const requiredKB = Math.ceil((estimatedBytes * 2) / 1024);
    if (availKB < requiredKB) {
      throw new Error(
        `Insufficient disk space. Available: ${Math.round(availKB / 1024)}MB, Required: ${Math.round(requiredKB / 1024)}MB (2x safety margin)`,
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("Insufficient")) throw e;
  }
};

export const acquireLock = (lockPath: string): void => {
  if (existsSync(lockPath)) {
    throw new Error(`Render already in progress. Lock: ${lockPath}`);
  }
  writeFileSync(lockPath, String(process.pid));
};

export const releaseLock = (lockPath: string): void => {
  try {
    unlinkSync(lockPath);
  } catch {
    // ignore
  }
};

export const generateScConfig = (config: AudioConfig, configPath: string): void => {
  const scCode = `
~audioConfig = (
  duration: ${config.duration},
  bpm: ${config.bpm},
  bars: ${config.bars},
  key: "${config.key}",
  scale: \\${config.scale},
  genre: \\${config.genre},
  energy: ${config.energy},
  outputDir: "${config.outputDir}",
  scsynthPath: "${config.scsynthPath}"
);
`;
  writeFileSync(configPath, scCode);
};

export const runSclang = async (
  scriptPath: string,
  args: string[] = [],
): Promise<{ stdout: string; stderr: string }> => {
  const result = await execFile(SCLANG, ["-i", "none", scriptPath, ...args], {
    timeout: 120_000,
  });

  if (result.stdout.includes("ERROR") || result.stderr.includes("ERROR")) {
    throw new Error(`sclang error: ${result.stdout}\n${result.stderr}`);
  }

  return result;
};

export const runFfmpeg = async (args: string[]): Promise<void> => {
  await execFile("ffmpeg", args, { timeout: 120_000 });
};
