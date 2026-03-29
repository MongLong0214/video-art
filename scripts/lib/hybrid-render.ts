/**
 * T16: Hybrid sample render — manifest read → buffer alloc → sample_player scheduling
 * v0.5.2 contract: sample_player amp=0.6
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { BufferAllocator } from "./buffer-allocator.js";

interface SampleHit {
  file: string;
  duration: number;
  onset_time: number;
}

interface Manifest {
  [type: string]: SampleHit[];
}

// AC-1: Read manifest or return null for synthesis-only fallback
export const readManifest = (manifestPath: string): Manifest | null => {
  if (!fs.existsSync(manifestPath)) {
    console.warn(`[hybrid] manifest not found: ${manifestPath} — falling back to synthesis-only`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as Manifest;
  } catch {
    console.warn(`[hybrid] manifest parse error: ${manifestPath} — falling back to synthesis-only`);
    return null;
  }
};

// AC-2/6: Generate b_allocRead NRT commands + buffer map
export const generateSampleBufferCommands = (
  manifest: Manifest,
  allocator: BufferAllocator,
  analysisDir: string,
): { bufCmds: string[]; bufMap: Map<string, number> } => {
  const bufCmds: string[] = [];
  const bufMap = new Map<string, number>();

  for (const [_type, hits] of Object.entries(manifest)) {
    for (const hit of hits) {
      const bufNum = allocator.allocate("samples", hit.file);
      bufMap.set(hit.file, bufNum);
      const wavPath = path.join(analysisDir, hit.file);
      bufCmds.push(`[0, [\\b_allocRead, ${bufNum}, "${wavPath}"]]`);
    }
  }

  return { bufCmds, bufMap };
};

// AC-3/4/7: Schedule sample_player events at onset times
export const scheduleSampleEvents = (
  manifest: Manifest,
  bufMap: Map<string, number>,
  addEvent: (time: number, synthDef: string, params: Record<string, number>) => void,
  duration: number,
): void => {
  for (const [_type, hits] of Object.entries(manifest)) {
    for (const hit of hits) {
      if (hit.onset_time < 0 || hit.onset_time >= duration) continue;
      const buf = bufMap.get(hit.file) ?? -1; // sentinel: silent when unallocated
      addEvent(hit.onset_time, "sample_player", {
        buf,
        amp: 0.6, // v0.5.2 gain staging contract
        dur: hit.duration,
      });
    }
  }
};
