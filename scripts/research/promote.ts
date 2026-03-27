// promote.ts — Promote current config to baseline
// Saves config snapshot + score + model version to baseline-config.json

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { getDefaultConfig, ResearchConfigSchema } from "./research-config";

const CACHE_DIR = ".cache/research";
const BASELINE_PATH = `${CACHE_DIR}/baseline-config.json`;

export interface BaselineRecord {
  config: Record<string, unknown>;
  qualityScore: number;
  modelVersion: string;
  promotedAt: string;
  previous?: BaselineRecord;
}

export function loadBaseline(): BaselineRecord | null {
  if (!existsSync(BASELINE_PATH)) return null;
  return JSON.parse(readFileSync(BASELINE_PATH, "utf-8"));
}

export function promoteBaseline(
  configPath: string,
  qualityScore: number,
  modelVersion: string,
): BaselineRecord {
  mkdirSync(CACHE_DIR, { recursive: true });

  const previous = loadBaseline();

  let config: Record<string, unknown>;
  if (existsSync(configPath)) {
    const raw = readFileSync(configPath, "utf-8");
    // Extract exported object — simple parse for JSON-like config
    try {
      config = ResearchConfigSchema.parse(JSON.parse(raw));
    } catch {
      config = getDefaultConfig() as Record<string, unknown>;
    }
  } else {
    config = getDefaultConfig() as Record<string, unknown>;
  }

  const record: BaselineRecord = {
    config,
    qualityScore,
    modelVersion,
    promotedAt: new Date().toISOString(),
    previous: previous ?? undefined,
  };

  writeFileSync(BASELINE_PATH, JSON.stringify(record, null, 2));
  console.log(`Baseline promoted: score=${qualityScore.toFixed(4)}, version=${modelVersion}`);
  if (previous) {
    console.log(`Previous baseline: score=${previous.qualityScore.toFixed(4)} (preserved in history)`);
  }

  return record;
}

// CLI entry
if (process.argv[1]?.endsWith("promote.ts")) {
  const score = parseFloat(process.argv[2] ?? "0");
  const version = process.argv[3] ?? "unknown";
  const configPath = "scripts/research/research-config.ts";
  promoteBaseline(configPath, score, version);
}
