// Config Integration Utilities
// Used by existing pipeline modules to optionally consume ResearchConfig values
// Pattern: resolveParam(config, key, hardcodedDefault) → value

import type { ResearchConfig } from "./research-config";

export function resolveParam<K extends keyof ResearchConfig>(
  config: Partial<ResearchConfig> | undefined,
  key: K,
  defaultValue: ResearchConfig[K],
): ResearchConfig[K] {
  if (!config) return defaultValue;
  const val = config[key];
  return val !== undefined ? val : defaultValue;
}

export function applyMultiplier(
  baseValue: number,
  config: Partial<ResearchConfig> | undefined,
  mulKey: keyof ResearchConfig,
): number {
  if (!config) return baseValue;
  const mul = config[mulKey];
  return typeof mul === "number" ? baseValue * mul : baseValue;
}
