import sharp from "sharp";
import path from "node:path";
import crypto from "node:crypto";
import type { LayerCandidate } from "../../src/lib/scene-schema.js";

const ALPHA_THRESHOLD = 128;
const MIN_COVERAGE = 0.005;

/**
 * Extract layer candidates from an RGBA PNG using BFS connected component analysis.
 *
 * Algorithm (two-pass with Uint32Array label map):
 *   Pass 1 -- BFS flood-fill labels every opaque pixel with a component ID.
 *   Pass 2 -- Single scan computes per-label stats (bbox, centroid, coverage, edgeDensity).
 *   Filter  -- Drop components with coverage < 0.5%.
 *   Output  -- Save each retained component as individual PNG.
 */
export async function extractCandidates(
  rgbaPath: string,
  outputDir: string,
): Promise<LayerCandidate[]> {
  const { data, info } = await sharp(rgbaPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const totalPixels = width * height;
  const rgba = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

  // Binarize alpha channel
  const binary = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    binary[i] = rgba[i * 4 + 3] > ALPHA_THRESHOLD ? 1 : 0;
  }

  // --- Pass 1: BFS flood-fill with Uint32Array label map ---
  // Label 0 = unlabeled/background. Labels start at 1.
  const labels = new Uint32Array(totalPixels);
  let nextLabel = 1;

  // Reusable BFS queue (Uint32Array with head pointer -- avoids shift/pop overhead)
  const queue = new Uint32Array(totalPixels);

  for (let startIdx = 0; startIdx < totalPixels; startIdx++) {
    if (binary[startIdx] === 0 || labels[startIdx] !== 0) continue;

    const label = nextLabel++;
    labels[startIdx] = label;
    queue[0] = startIdx;
    let head = 0;
    let tail = 1;

    while (head < tail) {
      const idx = queue[head++];
      const x = idx % width;
      const y = (idx - x) / width;

      // 4-connectivity: up, down, left, right
      if (y > 0) {
        const nIdx = idx - width;
        if (binary[nIdx] === 1 && labels[nIdx] === 0) {
          labels[nIdx] = label;
          queue[tail++] = nIdx;
        }
      }
      if (y < height - 1) {
        const nIdx = idx + width;
        if (binary[nIdx] === 1 && labels[nIdx] === 0) {
          labels[nIdx] = label;
          queue[tail++] = nIdx;
        }
      }
      if (x > 0) {
        const nIdx = idx - 1;
        if (binary[nIdx] === 1 && labels[nIdx] === 0) {
          labels[nIdx] = label;
          queue[tail++] = nIdx;
        }
      }
      if (x < width - 1) {
        const nIdx = idx + 1;
        if (binary[nIdx] === 1 && labels[nIdx] === 0) {
          labels[nIdx] = label;
          queue[tail++] = nIdx;
        }
      }
    }
  }

  const numComponents = nextLabel - 1;
  if (numComponents === 0) return [];

  // --- Pass 2: Compute stats in a single scan ---
  const counts = new Uint32Array(numComponents);
  const minXs = new Uint32Array(numComponents).fill(width);
  const minYs = new Uint32Array(numComponents).fill(height);
  const maxXs = new Int32Array(numComponents).fill(-1);
  const maxYs = new Int32Array(numComponents).fill(-1);
  const sumXs = new Float64Array(numComponents);
  const sumYs = new Float64Array(numComponents);
  const edgeCounts = new Uint32Array(numComponents);

  for (let idx = 0; idx < totalPixels; idx++) {
    const lbl = labels[idx];
    if (lbl === 0) continue;
    const ci = lbl - 1; // component index (0-based)
    const x = idx % width;
    const y = (idx - x) / width;

    counts[ci]++;
    sumXs[ci] += x;
    sumYs[ci] += y;
    if (x < minXs[ci]) minXs[ci] = x;
    if (x > maxXs[ci]) maxXs[ci] = x;
    if (y < minYs[ci]) minYs[ci] = y;
    if (y > maxYs[ci]) maxYs[ci] = y;

    // Edge pixel: has at least one 4-neighbor outside this component
    const isEdge =
      y === 0 || labels[idx - width] !== lbl ||
      y === height - 1 || labels[idx + width] !== lbl ||
      x === 0 || labels[idx - 1] !== lbl ||
      x === width - 1 || labels[idx + 1] !== lbl;
    if (isEdge) edgeCounts[ci]++;
  }

  // --- Filter and build candidates ---
  const candidates: LayerCandidate[] = [];
  let outputIndex = 0;

  for (let ci = 0; ci < numComponents; ci++) {
    const coverage = counts[ci] / totalPixels;
    if (coverage < MIN_COVERAGE) continue;

    const lbl = ci + 1;
    const edgeDensity = counts[ci] > 0 ? edgeCounts[ci] / counts[ci] : 0;

    // Create component PNG: copy only this component's pixels from original RGBA
    const outBuf = Buffer.alloc(totalPixels * 4);
    for (let idx = 0; idx < totalPixels; idx++) {
      if (labels[idx] !== lbl) continue;
      const off = idx * 4;
      outBuf[off] = rgba[off];
      outBuf[off + 1] = rgba[off + 1];
      outBuf[off + 2] = rgba[off + 2];
      outBuf[off + 3] = rgba[off + 3];
    }

    const filePath = path.join(outputDir, `component-${outputIndex}.png`);
    await sharp(outBuf, { raw: { width, height, channels: 4 } })
      .png()
      .toFile(filePath);

    candidates.push({
      id: crypto.randomUUID(),
      source: "qwen-base",
      filePath,
      width,
      height,
      coverage,
      bbox: {
        x: minXs[ci],
        y: minYs[ci],
        w: maxXs[ci] - minXs[ci] + 1,
        h: maxYs[ci] - minYs[ci] + 1,
      },
      centroid: {
        x: sumXs[ci] / counts[ci],
        y: sumYs[ci] / counts[ci],
      },
      edgeDensity,
      componentCount: 1,
    });

    outputIndex++;
  }

  return candidates;
}
