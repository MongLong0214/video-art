/**
 * Isaac sees axis-aligned hold rectangles immediately (r325 knee nx≈0.88, r342 sky box nx≈0.12).
 * Hold must be a silhouette / ellipse / color mask — never a constant nx/ny wall.
 */
import sharp from "sharp";

export type HoldWallHit = {
  readonly axis: "vertical" | "horizontal";
  readonly position: number;
  readonly span: number;
  readonly std: number;
  readonly meanDrop: number;
  readonly samples: number;
};

export type HoldWallResult = {
  readonly ok: boolean;
  readonly reasons: string[];
  readonly hits: readonly HoldWallHit[];
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

function cluster1d(
  samples: readonly { readonly pos: number; readonly drop: number; readonly along: number }[],
  maxStd: number,
  minSpan: number,
  minDrop: number,
  minCount: number,
): HoldWallHit[] {
  const hits: HoldWallHit[] = [];
  const used = new Uint8Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    if (used[i] || samples[i].drop < minDrop) continue;
    const members = [i];
    for (let j = 0; j < samples.length; j++) {
      if (j === i || used[j]) continue;
      if (Math.abs(samples[j].pos - samples[i].pos) <= 0.028 && samples[j].drop >= minDrop * 0.7) {
        members.push(j);
      }
    }
    if (members.length < minCount) continue;
    let mean = 0;
    let meanDrop = 0;
    let minAlong = 1;
    let maxAlong = 0;
    for (const idx of members) {
      mean += samples[idx].pos;
      meanDrop += samples[idx].drop;
      minAlong = Math.min(minAlong, samples[idx].along);
      maxAlong = Math.max(maxAlong, samples[idx].along);
    }
    mean /= members.length;
    meanDrop /= members.length;
    let varr = 0;
    for (const idx of members) varr += (samples[idx].pos - mean) ** 2;
    const std = Math.sqrt(varr / members.length);
    const span = maxAlong - minAlong;
    if (std <= maxStd && span >= minSpan && meanDrop >= minDrop) {
      for (const idx of members) used[idx] = 1;
      hits.push({
        axis: "vertical",
        position: Math.round(mean * 10_000) / 10_000,
        span: Math.round(span * 10_000) / 10_000,
        std: Math.round(std * 10_000) / 10_000,
        meanDrop: Math.round(meanDrop * 10) / 10,
        samples: members.length,
      });
    }
  }
  return hits;
}

export function scanHoldWalls(alpha: Float32Array, width: number, height: number): HoldWallResult {
  if (alpha.length !== width * height) {
    throw new Error(`scanHoldWalls expected ${width * height} alphas, got ${alpha.length}`);
  }
  const verticalSamples: { pos: number; drop: number; along: number }[] = [];
  const y0 = Math.floor(height * 0.12);
  const y1 = Math.floor(height * 0.88);
  const stepY = Math.max(2, Math.floor(height / 80));
  for (let y = y0; y <= y1; y += stepY) {
    let maxDrop = 0;
    let maxX = 0;
    let prev = alpha[y * width + Math.floor(width * 0.04)] * 255;
    const x0 = Math.floor(width * 0.04);
    const x1 = Math.floor(width * 0.96);
    for (let x = x0; x <= x1; x++) {
      const a = alpha[y * width + x] * 255;
      const drop = Math.abs(a - prev);
      if (drop > maxDrop) {
        maxDrop = drop;
        maxX = x;
      }
      prev = a;
    }
    if (maxDrop >= 28) {
      verticalSamples.push({ pos: maxX / width, drop: maxDrop, along: y / height });
    }
  }

  const vHits = cluster1d(verticalSamples, 0.016, 0.18, 48, 5).map((hit) => ({ ...hit, axis: "vertical" as const }));
  // Horizontal-only edges (water line, seated base) are legal. Isaac's rejects were
  // axis-aligned *rectangles* — those always have a constant-nx vertical wall.
  const hits = vHits;
  const reasons = hits.map(
    (hit) =>
      `${hit.axis} wall at ${hit.axis === "vertical" ? "nx" : "ny"}=${hit.position.toFixed(3)} span=${hit.span.toFixed(2)} std=${hit.std.toFixed(3)} drop=${hit.meanDrop}`,
  );
  return { ok: hits.length === 0, reasons, hits };
}

export function alphaAt(alpha: Float32Array, width: number, height: number, nx: number, ny: number): number {
  const x = Math.min(width - 1, Math.max(0, Math.floor(clamp01(nx) * (width - 1))));
  const y = Math.min(height - 1, Math.max(0, Math.floor(clamp01(ny) * (height - 1))));
  return alpha[y * width + x];
}

export async function loadHoldAlpha(filePath: string): Promise<{ readonly alpha: Float32Array; readonly width: number; readonly height: number }> {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = new Float32Array(info.width * info.height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3] / 255;
  return { alpha, width: info.width, height: info.height };
}

export async function scanHoldPng(filePath: string): Promise<HoldWallResult> {
  const { alpha, width, height } = await loadHoldAlpha(filePath);
  return scanHoldWalls(alpha, width, height);
}

export function fillBoxAlpha(width: number, height: number, x0: number, y0: number, x1: number, y1: number): Float32Array {
  const alpha = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const ny = y / Math.max(1, height - 1);
    for (let x = 0; x < width; x++) {
      const nx = x / Math.max(1, width - 1);
      alpha[y * width + x] = nx >= x0 && nx <= x1 && ny >= y0 && ny <= y1 ? 1 : 0;
    }
  }
  return alpha;
}

export function fillEllipseAlpha(width: number, height: number, ecx: number, ecy: number, rx: number, ry: number): Float32Array {
  const alpha = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const ny = y / Math.max(1, height - 1);
    for (let x = 0; x < width; x++) {
      const nx = x / Math.max(1, width - 1);
      const d = Math.hypot((nx - ecx) / rx, (ny - ecy) / ry);
      alpha[y * width + x] = d < 1 ? clamp01(1 - (d - 0.82) / 0.18) : 0;
    }
  }
  return alpha;
}
