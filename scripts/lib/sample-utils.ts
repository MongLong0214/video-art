// Sample utilities — manifest parsing + NRT buffer loading + hybrid stemGroup resolution
// Phase 2 §4.3.1 + AC-10.6

import * as fs from "node:fs";
import * as path from "node:path";
import type { BufferAllocator } from "./buffer-allocator.js";
import type { NrtCommand } from "./wavetable-utils.js";

export interface StemGroupRef {
  synthDef: string;
  sampleRef?: string;
}

export interface LegacySampleHit {
  file: string;
  duration: number;
  onset_time: number;
}

export interface SampleBankSlideV2 {
  from: string;
  to: string;
  type?: string;
}

export interface SampleBankEntryV2 {
  id: string;
  file: string;
  root_note: string;
  midi: number;
  waveform: string;
  articulation: string;
  role_tags: string[];
  duration_ms: number;
  lufs: number;
  centroid_hz: number;
  transient_strength?: number;
  recommended_rate_range?: {
    min: number;
    max: number;
  };
  slide: SampleBankSlideV2 | null;
  round_robin: number;
  source_bank_version?: string;
}

export interface SampleBankManifestV2 {
  version: 2;
  samples: SampleBankEntryV2[];
}

export interface LegacySampleManifest {
  [type: string]: LegacySampleHit[];
}

export type SampleManifest = LegacySampleManifest | SampleBankManifestV2;

export const parseStemGroupRef = (ref: string): StemGroupRef => {
  const colonIdx = ref.indexOf(":");
  if (colonIdx === -1) {
    return { synthDef: ref };
  }
  return {
    synthDef: ref.slice(0, colonIdx),
    sampleRef: ref.slice(colonIdx + 1),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isLegacySampleHit = (value: unknown): value is LegacySampleHit => {
  if (!isRecord(value)) return false;
  return typeof value.file === "string"
    && typeof value.duration === "number"
    && typeof value.onset_time === "number";
};

export const isLegacySampleManifest = (
  value: unknown,
): value is LegacySampleManifest => {
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([key, hits]) => {
    if (key === "version") return hits === 1;
    return Array.isArray(hits) && hits.every(isLegacySampleHit);
  });
};

const isSampleBankSlideV2 = (value: unknown): value is SampleBankSlideV2 => {
  if (!isRecord(value)) return false;
  return typeof value.from === "string" && typeof value.to === "string"
    && (value.type === undefined || typeof value.type === "string");
};

const isSampleBankEntryV2 = (value: unknown): value is SampleBankEntryV2 => {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && typeof value.file === "string"
    && typeof value.root_note === "string"
    && typeof value.midi === "number"
    && typeof value.waveform === "string"
    && typeof value.articulation === "string"
    && Array.isArray(value.role_tags)
    && value.role_tags.every((tag) => typeof tag === "string")
    && typeof value.duration_ms === "number"
    && typeof value.lufs === "number"
    && typeof value.centroid_hz === "number"
    && (value.transient_strength === undefined || typeof value.transient_strength === "number")
    && (
      value.recommended_rate_range === undefined
      || (
        isRecord(value.recommended_rate_range)
        && typeof value.recommended_rate_range.min === "number"
        && typeof value.recommended_rate_range.max === "number"
      )
    )
    && (value.slide === null || isSampleBankSlideV2(value.slide))
    && typeof value.round_robin === "number"
    && (value.source_bank_version === undefined
      || typeof value.source_bank_version === "string");
};

export const isSampleBankManifestV2 = (
  value: unknown,
): value is SampleBankManifestV2 => {
  if (!isRecord(value)) return false;
  return value.version === 2
    && Array.isArray(value.samples)
    && value.samples.every(isSampleBankEntryV2);
};

export const parseSampleManifest = (raw: string): SampleManifest => {
  const parsed: unknown = JSON.parse(raw);
  if (isSampleBankManifestV2(parsed) || isLegacySampleManifest(parsed)) {
    return parsed;
  }
  throw new Error("Unsupported sample manifest format");
};

export const readSampleManifest = (
  manifestPath: string,
): SampleManifest | null => {
  if (!fs.existsSync(manifestPath)) return null;
  return parseSampleManifest(fs.readFileSync(manifestPath, "utf-8"));
};

export const getManifestVersion = (manifest: SampleManifest): 1 | 2 =>
  isSampleBankManifestV2(manifest) ? 2 : 1;

export const listManifestFiles = (manifest: SampleManifest): string[] => {
  if (isSampleBankManifestV2(manifest)) {
    return manifest.samples.map((entry) => entry.file);
  }
  return Object.values(manifest).flat().map((hit) => hit.file);
};

export const resolveManifestFilePath = (
  file: string,
  basePath: string,
): string => {
  if (path.isAbsolute(file)) return file;

  const fromBase = path.join(basePath, file);
  if (fs.existsSync(fromBase)) return fromBase;

  const fromCwd = path.join(process.cwd(), file);
  if (fs.existsSync(fromCwd)) return fromCwd;

  return fromBase;
};

export const groupSampleBankEntriesByRole = (
  manifest: SampleBankManifestV2,
): Record<string, SampleBankEntryV2[]> => {
  const grouped: Record<string, SampleBankEntryV2[]> = {};
  for (const entry of manifest.samples) {
    for (const role of entry.role_tags) {
      grouped[role] ??= [];
      grouped[role].push(entry);
    }
  }
  return grouped;
};

export const generateSampleBufferCommands = (
  manifestPath: string,
  allocator: BufferAllocator,
  basePath: string,
): NrtCommand[] => {
  if (!fs.existsSync(manifestPath)) return [];

  const manifest = readSampleManifest(manifestPath);
  if (!manifest) return [];
  const commands: NrtCommand[] = [];

  for (const file of listManifestFiles(manifest)) {
    const bufNum = allocator.allocate("samples", file);
    const absPath = resolveManifestFilePath(file, path.dirname(manifestPath));
    const relPath = path.relative(basePath, absPath);
    commands.push({
      time: 0,
      msg: ["/b_allocRead", bufNum, relPath, 0, 0],
    });
  }

  return commands;
};

export const resolveSampleRef = (
  sampleRef: string,
  manifest: SampleManifest,
): string | null => {
  const withExt = sampleRef.endsWith(".wav") ? sampleRef : `${sampleRef}.wav`;

  if (isSampleBankManifestV2(manifest)) {
    for (const entry of manifest.samples) {
      const basename = path.basename(entry.file);
      if (
        entry.id === sampleRef
        || entry.file === sampleRef
        || entry.file === withExt
        || basename === sampleRef
        || basename === withExt
      ) {
        return entry.file;
      }
    }
    return null;
  }

  for (const hits of Object.values(manifest)) {
    const match = hits.find((h) => h.file === withExt || h.file === sampleRef);
    if (match) return match.file;
  }
  return null;
};
