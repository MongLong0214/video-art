/**
 * SC3-plugins runtime detection — check if RLPFD/DFM1 UGens are available.
 * Used to auto-upgrade acid_bass filter from MoogFF to RLPFD (TB303 dedicated filter).
 */

import { execFileSync } from "node:child_process";

const SCLANG = "/Applications/SuperCollider.app/Contents/MacOS/sclang";

let cachedResult: boolean | null = null;

export const hasRLPFD = (): boolean => {
  if (cachedResult !== null) return cachedResult;

  try {
    const result = execFileSync(SCLANG, ["-i", "none", "-e", "RLPFD.ar; 0.exit"], {
      encoding: "utf-8",
      timeout: 10000,
    });
    cachedResult = !result.includes("ERROR");
    return cachedResult;
  } catch {
    cachedResult = false;
    return false;
  }
};

export const hasDFM1 = (): boolean => {
  try {
    const result = execFileSync(SCLANG, ["-i", "none", "-e", "DFM1.ar; 0.exit"], {
      encoding: "utf-8",
      timeout: 10000,
    });
    return !result.includes("ERROR");
  } catch {
    return false;
  }
};
