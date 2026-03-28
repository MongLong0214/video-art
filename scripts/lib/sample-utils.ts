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

export interface SampleManifest {
  [type: string]: { file: string; duration: number; onset_time: number }[];
}

export const generateSampleBufferCommands = (
  manifestPath: string,
  allocator: BufferAllocator,
  basePath: string,
): NrtCommand[] => {
  if (!fs.existsSync(manifestPath)) return [];

  const manifest: SampleManifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf-8"),
  );
  const commands: NrtCommand[] = [];

  for (const [_type, hits] of Object.entries(manifest)) {
    for (const hit of hits) {
      const bufNum = allocator.allocate("samples", hit.file);
      const absPath = path.join(path.dirname(manifestPath), hit.file);
      const relPath = path.relative(basePath, absPath);
      commands.push({
        time: 0,
        msg: ["/b_allocRead", bufNum, relPath, 0, 0],
      });
    }
  }

  return commands;
};

export const resolveSampleRef = (
  sampleRef: string,
  manifest: SampleManifest,
): string | null => {
  for (const hits of Object.values(manifest)) {
    const match = hits.find(
      (h) => h.file === `${sampleRef}.wav` || h.file === sampleRef,
    );
    if (match) return match.file;
  }
  return null;
};
