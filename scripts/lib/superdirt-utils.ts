import * as fs from "node:fs";
import * as path from "node:path";

const PHASE_A_SYNTHDEFS = [
  "kick", "bass", "hat", "clap", "supersaw", "pad", "lead", "arp_pluck", "riser",
] as const;

interface BootConfig {
  numOrbits: number;
  synthDefNames: readonly string[];
  synthDefsDir: string;
  samplesDir: string;
}

export const validateSamplePath = (
  samplePath: string,
  projectRoot: string,
): boolean => {
  const allowedDir = path.join(projectRoot, "audio", "samples");
  try {
    const resolved = fs.realpathSync(samplePath);
    return resolved.startsWith(allowedDir + path.sep) || resolved === allowedDir;
  } catch {
    return false;
  }
};

export const generateBootConfig = (projectRoot: string): BootConfig => ({
  numOrbits: 8,
  synthDefNames: PHASE_A_SYNTHDEFS,
  synthDefsDir: path.join(projectRoot, "audio", "sc", "synthdefs"),
  samplesDir: path.join(projectRoot, "audio", "samples"),
});
