/**
 * T16: Hybrid sample render — manifest read → buffer alloc → sample_player scheduling
 * v0.5.2 contract: sample_player amp=0.6
 */
import * as fs from "node:fs";
import { BufferAllocator } from "./buffer-allocator.js";
import { buildSamplePlayerV2Params } from "./sample-player-contract.js";
import {
  isSampleBankManifestV2,
  listManifestFiles,
  readSampleManifest,
  resolveManifestFilePath,
  type LegacySampleManifest,
  type SampleManifest,
} from "./sample-utils.js";

const hasSchedulableSampleEvents = (
  manifest: SampleManifest,
): manifest is LegacySampleManifest => !isSampleBankManifestV2(manifest);

// AC-1: Read manifest or return null for synthesis-only fallback
export const readManifest = (manifestPath: string): SampleManifest | null => {
  if (!fs.existsSync(manifestPath)) {
    console.warn(`[hybrid] manifest not found: ${manifestPath} — falling back to synthesis-only`);
    return null;
  }
  try {
    return readSampleManifest(manifestPath);
  } catch (error) {
    console.warn(
      `[hybrid] manifest parse error: ${manifestPath} — ${
        error instanceof Error ? error.message : "falling back to synthesis-only"
      }`,
    );
    return null;
  }
};

// AC-2/6: Generate b_allocRead NRT commands + buffer map
export const generateSampleBufferCommands = (
  manifest: SampleManifest,
  allocator: BufferAllocator,
  analysisDir: string,
): { bufCmds: string[]; bufMap: Map<string, number> } => {
  const bufCmds: string[] = [];
  const bufMap = new Map<string, number>();

  if (!hasSchedulableSampleEvents(manifest)) {
    console.warn("[hybrid] manifest v2 is metadata-only — skipping hybrid sample buffers");
    return { bufCmds, bufMap };
  }

  for (const file of listManifestFiles(manifest)) {
    const bufNum = allocator.allocate("samples", file);
    bufMap.set(file, bufNum);
    const wavPath = resolveManifestFilePath(file, analysisDir);
    bufCmds.push(`[0, [\\b_allocRead, ${bufNum}, "${wavPath}"]]`);
  }

  return { bufCmds, bufMap };
};

// AC-3/4/7: Schedule sample_player events at onset times
export const scheduleSampleEvents = (
  manifest: SampleManifest,
  bufMap: Map<string, number>,
  addEvent: (time: number, synthDef: string, params: Record<string, number>) => void,
  duration: number,
): void => {
  if (!hasSchedulableSampleEvents(manifest)) {
    return;
  }

  for (const [_type, hits] of Object.entries(manifest)) {
    for (const hit of hits) {
      if (hit.onset_time < 0 || hit.onset_time >= duration) continue;
      const buf = bufMap.get(hit.file) ?? -1; // sentinel: silent when unallocated
      addEvent(hit.onset_time, "sample_player", buildSamplePlayerV2Params({
        buf,
        amp: 0.6, // v0.5.2 gain staging contract
        dur: hit.duration,
      }));
    }
  }
};
