import sharp from "sharp";
import { ALPHA_THRESHOLD } from "./pipeline-constants.js";
import type { LayerCandidate } from "../../src/lib/scene-schema.js";

/**
 * Build a per-candidate binary mask cache.
 * Each mask is a Uint8Array where 1 = opaque, 0 = transparent.
 * Used to avoid repeated sharp decoding in resolveExclusiveOwnership calls.
 */
export async function buildMaskCache(
  candidates: LayerCandidate[],
  width: number,
  height: number,
  alphaThreshold: number = ALPHA_THRESHOLD,
): Promise<Map<string, Uint8Array>> {
  const cache = new Map<string, Uint8Array>();
  const totalPixels = width * height;

  for (const candidate of candidates) {
    const { data } = await sharp(candidate.filePath)
      .resize(width, height)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const rgba = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const mask = new Uint8Array(totalPixels);

    for (let i = 0; i < totalPixels; i++) {
      mask[i] = rgba[i * 4 + 3] > alphaThreshold ? 1 : 0;
    }

    cache.set(candidate.id, mask);
  }

  return cache;
}
