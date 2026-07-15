import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import {
  AFFINITY_ACTIVE_THRESHOLD,
  buildSourceRegionAffinityField,
} from "./source-region-capacity.js";

export type RegionAffinityAuthorityAudit = {
  readonly version: 1;
  readonly status: "PASS" | "REJECT";
  readonly createdAt: string;
  readonly source: { readonly path: string; readonly sha256: string };
  readonly scene: { readonly path: string; readonly sha256: string };
  readonly metrics: {
    readonly analysisWidth: number;
    readonly analysisHeight: number;
    readonly affinityCoverageAt10: number;
    readonly affinityCoverageAt22: number;
    readonly affinityLargestAt22: number;
    readonly affinityFlowCoverageAt10: number | null;
    readonly affinityFlowLargestAt10: number | null;
    readonly affinityFlowStreamCoverageAt10: number | null;
    readonly affinityFlowStreamLargestAt10: number | null;
  };
  readonly failures: readonly string[];
  readonly floors: {
    readonly affinityCoverageAt22: number;
    readonly affinityLargestAt22: number;
    readonly affinityFlowStreamLargestAt10: number;
  };
};

const auditSchema = z.object({
  version: z.literal(1),
  status: z.union([z.literal("PASS"), z.literal("REJECT")]),
  scene: z.object({ sha256: z.string().regex(/^[a-f0-9]{64}$/) }),
});

export class RegionAffinityAuthorityError extends Error {
  override readonly name = "RegionAffinityAuthorityError";
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function largestComponent(mask: Uint8Array, width: number, height: number): number {
  const inner = Math.max(0, width - 2) * Math.max(0, height - 2);
  if (inner === 0) return 0;
  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(inner);
  let largest = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const start = y * width + x;
      if (mask[start] === 0 || visited[start] === 1) continue;
      visited[start] = 1;
      let head = 0;
      let tail = 0;
      let size = 0;
      queue[tail++] = start;
      while (head < tail) {
        const cell = queue[head++];
        size++;
        const cx = cell % width;
        const cy = Math.floor(cell / width);
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            if (ox === 0 && oy === 0) continue;
            const nx = cx + ox;
            const ny = cy + oy;
            if (nx <= 0 || nx >= width - 1 || ny <= 0 || ny >= height - 1) continue;
            const next = ny * width + nx;
            if (mask[next] === 0 || visited[next] === 1) continue;
            visited[next] = 1;
            queue[tail++] = next;
          }
        }
      }
      largest = Math.max(largest, size);
    }
  }
  return largest / inner;
}

function coverage(mask: Uint8Array, width: number, height: number): number {
  const inner = Math.max(1, (width - 2) * (height - 2));
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (mask[y * width + x] === 1) count++;
    }
  }
  return count / inner;
}

async function loadLumaGrid(sourcePath: string, width: number, height: number): Promise<Float32Array> {
  const { data, info } = await sharp(sourcePath).resize(width, height, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const luma = new Float32Array(info.width * info.height);
  for (let cell = 0; cell < luma.length; cell++) {
    const offset = cell * info.channels;
    luma[cell] = (0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2]) / 255;
  }
  return luma;
}

async function loadConfidenceMap(
  filePath: string | undefined,
  width: number,
  height: number,
  channel: "max" | "blue" = "max",
): Promise<Float32Array | null> {
  if (filePath === undefined || !fs.existsSync(filePath)) return null;
  const { data, info } = await sharp(filePath).resize(width, height, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = new Float32Array(info.width * info.height);
  for (let cell = 0; cell < out.length; cell++) {
    const offset = cell * info.channels;
    if (channel === "blue") {
      out[cell] = data[offset + 2] / 255;
    } else {
      out[cell] = Math.max(data[offset], data[offset + 1], data[offset + 2]) / 255;
    }
  }
  return out;
}

export type RegionAffinityAuthorityInput = {
  readonly sourcePath: string;
  readonly scenePath: string;
  readonly workDir: string;
  readonly flowFieldRel?: string;
  readonly streamFieldRel?: string;
  readonly analysisWidth?: number;
};

/**
 * Machine-readable authority audit for source-region-affinity previews.
 * Uses the same smooth affinity field definition as the shader/renderer path.
 */
export async function runRegionAffinityAuthorityAudit(input: RegionAffinityAuthorityInput): Promise<RegionAffinityAuthorityAudit> {
  const sourcePath = path.resolve(input.sourcePath);
  const scenePath = path.resolve(input.scenePath);
  if (!fs.existsSync(sourcePath)) throw new RegionAffinityAuthorityError(`source not found: ${sourcePath}`);
  if (!fs.existsSync(scenePath)) throw new RegionAffinityAuthorityError(`scene not found: ${scenePath}`);

  const meta = await sharp(sourcePath).metadata();
  if (meta.width === undefined || meta.height === undefined) throw new RegionAffinityAuthorityError("source has no dimensions");
  const analysisWidth = input.analysisWidth ?? Math.min(240, meta.width);
  const analysisHeight = Math.max(2, Math.round((meta.height / meta.width) * analysisWidth));
  const sourcePixelsPerCell = (meta.width / analysisWidth + meta.height / analysisHeight) * 0.5;

  const luma = await loadLumaGrid(sourcePath, analysisWidth, analysisHeight);
  const affinity = buildSourceRegionAffinityField({
    luma,
    width: analysisWidth,
    height: analysisHeight,
    sourcePixelsPerCell,
  });

  const mask10 = new Uint8Array(affinity.values.length);
  const mask22 = new Uint8Array(affinity.values.length);
  for (let cell = 0; cell < affinity.values.length; cell++) {
    mask10[cell] = affinity.values[cell] >= 0.1 ? 1 : 0;
    mask22[cell] = affinity.values[cell] >= AFFINITY_ACTIVE_THRESHOLD ? 1 : 0;
  }

  const flowPath = input.flowFieldRel ? path.join(input.workDir, input.flowFieldRel) : undefined;
  const streamPath = input.streamFieldRel ? path.join(input.workDir, input.streamFieldRel) : undefined;
  const flow = await loadConfidenceMap(flowPath, analysisWidth, analysisHeight, "max");
  const stream = await loadConfidenceMap(streamPath, analysisWidth, analysisHeight, "blue");

  let affinityFlowCoverageAt10: number | null = null;
  let affinityFlowLargestAt10: number | null = null;
  let affinityFlowStreamCoverageAt10: number | null = null;
  let affinityFlowStreamLargestAt10: number | null = null;

  if (flow !== null) {
    const af = new Uint8Array(affinity.values.length);
    for (let cell = 0; cell < af.length; cell++) {
      af[cell] = affinity.values[cell] >= 0.1 && flow[cell] >= 0.32 ? 1 : 0;
    }
    affinityFlowCoverageAt10 = coverage(af, analysisWidth, analysisHeight);
    affinityFlowLargestAt10 = largestComponent(af, analysisWidth, analysisHeight);

    if (stream !== null) {
      const afs = new Uint8Array(affinity.values.length);
      for (let cell = 0; cell < afs.length; cell++) {
        afs[cell] = affinity.values[cell] >= 0.1 && flow[cell] >= 0.32 && stream[cell] >= 0.32 ? 1 : 0;
      }
      affinityFlowStreamCoverageAt10 = coverage(afs, analysisWidth, analysisHeight);
      affinityFlowStreamLargestAt10 = largestComponent(afs, analysisWidth, analysisHeight);
    }
  }

  const floors = {
    affinityCoverageAt22: 0.08,
    affinityLargestAt22: 0.06,
    affinityFlowStreamLargestAt10: 0.04,
  };

  const affinityCoverageAt10 = coverage(mask10, analysisWidth, analysisHeight);
  const affinityCoverageAt22 = coverage(mask22, analysisWidth, analysisHeight);
  const affinityLargestAt22 = largestComponent(mask22, analysisWidth, analysisHeight);

  const failures: string[] = [];
  if (affinityCoverageAt22 < floors.affinityCoverageAt22) failures.push("affinity-active-coverage");
  if (affinityLargestAt22 < floors.affinityLargestAt22) failures.push("affinity-connected-component");
  if (affinityFlowStreamLargestAt10 !== null && affinityFlowStreamLargestAt10 < floors.affinityFlowStreamLargestAt10) {
    failures.push("affinity-flow-stream-connected-component");
  }

  return {
    version: 1,
    status: failures.length === 0 ? "PASS" : "REJECT",
    createdAt: new Date().toISOString(),
    source: { path: sourcePath, sha256: sha256File(sourcePath) },
    scene: { path: scenePath, sha256: sha256File(scenePath) },
    metrics: {
      analysisWidth,
      analysisHeight,
      affinityCoverageAt10,
      affinityCoverageAt22,
      affinityLargestAt22,
      affinityFlowCoverageAt10,
      affinityFlowLargestAt10,
      affinityFlowStreamCoverageAt10,
      affinityFlowStreamLargestAt10,
    },
    failures,
    floors,
  };
}

export function assertRegionAffinityAuthorityAudit(reportPath: string, scenePath: string): void {
  if (!fs.existsSync(reportPath)) throw new RegionAffinityAuthorityError(`authority audit report not found: ${reportPath}`);
  if (!fs.existsSync(scenePath)) throw new RegionAffinityAuthorityError(`scene not found: ${scenePath}`);
  const parsed = auditSchema.safeParse(JSON.parse(fs.readFileSync(reportPath, "utf8")) as unknown);
  if (!parsed.success) throw new RegionAffinityAuthorityError(`invalid authority audit report: ${reportPath}`);
  if (parsed.data.status !== "PASS") {
    throw new RegionAffinityAuthorityError("region-affinity preview blocked: authority audit did not PASS");
  }
  if (parsed.data.scene.sha256 !== sha256File(scenePath)) {
    throw new RegionAffinityAuthorityError("region-affinity preview blocked: authority audit does not match current scene.json");
  }
}

export function sceneUsesRegionAffinity(scene: {
  readonly layers?: readonly { readonly animation?: { readonly sourceRegionAffinity?: { readonly amount?: number } } }[];
}): boolean {
  return (scene.layers ?? []).some((layer) => (layer.animation?.sourceRegionAffinity?.amount ?? 0) > 0);
}
