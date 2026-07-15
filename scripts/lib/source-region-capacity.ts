export type SourceRegionCapacityInput = {
  readonly luma: Float32Array;
  readonly width: number;
  readonly height: number;
  readonly sourcePixelsPerCell: number;
};

export type SourceRegionCapacity = {
  readonly analysisWidth: number;
  readonly analysisHeight: number;
  readonly sourcePixelsPerCell: number;
  /** Binary median-mask support (diagnostic only — not the shader authority). */
  readonly midBandSupportCoverage: number;
  /** Binary transport interior connected coverage (diagnostic only). */
  readonly connectedSupportCoverage: number;
  readonly transportInteriorCoverage: number;
  readonly coarseBoundaryConflict: number;
  /** Smooth affinity field active coverage at the shader threshold 0.22. */
  readonly affinityActiveCoverage: number;
  /** Largest connected component of the smooth affinity field at threshold 0.22. */
  readonly affinityConnectedCoverage: number;
  /**
   * Preview permission for region-affinity transport.
   * Uses the same smooth affinity field the shader receives, not the binary capacity mask.
   */
  readonly canCarryConnectedTransport: boolean;
};

export type SourceRegionAffinityField = {
  readonly width: number;
  readonly height: number;
  readonly values: Float32Array;
  readonly connectedCoverage: number;
};

type SourceRegionSignals = {
  readonly localSupport: Float32Array;
  readonly distance: Float32Array;
  readonly supportThreshold: number;
  readonly interiorRadius: number;
};

/** Shader support starts rising near 0.10 and is treated as active near 0.22. */
export const AFFINITY_ACTIVE_THRESHOLD = 0.22;
const AFFINITY_ACTIVE_COVERAGE_FLOOR = 0.08;
const AFFINITY_CONNECTED_COVERAGE_FLOOR = 0.06;

function percentile(values: Float32Array, ratio: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  if (sorted.length === 0) return 0;
  const index = Math.min(1, Math.max(0, ratio)) * (sorted.length - 1);
  const low = Math.floor(index);
  const high = Math.ceil(index);
  return sorted[low] * (high - index) + sorted[high] * (index - low);
}

function boxBlur(input: Float32Array, width: number, height: number, radius: number): Float32Array {
  const horizontal = new Float32Array(input.length);
  const output = new Float32Array(input.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let dx = -radius; dx <= radius; dx++) {
        const sampleX = Math.min(width - 1, Math.max(0, x + dx));
        sum += input[y * width + sampleX];
        count++;
      }
      horizontal[y * width + x] = sum / count;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const sampleY = Math.min(height - 1, Math.max(0, y + dy));
        sum += horizontal[sampleY * width + x];
        count++;
      }
      output[y * width + x] = sum / count;
    }
  }
  return output;
}

function gradient(input: Float32Array, width: number, height: number): Float32Array {
  const output = new Float32Array(input.length);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const cell = y * width + x;
      output[cell] = Math.hypot(input[cell + 1] - input[cell - 1], input[cell + width] - input[cell - width]);
    }
  }
  return output;
}

function distanceToBoundary(boundary: Uint8Array, width: number, height: number): Float32Array {
  const infinity = 1_000_000;
  const distance = new Float32Array(boundary.length);
  for (let cell = 0; cell < distance.length; cell++) distance[cell] = boundary[cell] === 1 ? 0 : infinity;
  const sample = (x: number, y: number): number => {
    if (x < 0 || y < 0 || x >= width || y >= height) return infinity;
    return distance[y * width + x];
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = y * width + x;
      distance[cell] = Math.min(distance[cell], sample(x - 1, y) + 1, sample(x, y - 1) + 1, sample(x - 1, y - 1) + 1.414, sample(x + 1, y - 1) + 1.414);
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const cell = y * width + x;
      distance[cell] = Math.min(distance[cell], sample(x + 1, y) + 1, sample(x, y + 1) + 1, sample(x + 1, y + 1) + 1.414, sample(x - 1, y + 1) + 1.414);
    }
  }
  return distance;
}

function largestComponentCoverage(mask: Uint8Array, width: number, height: number): number {
  const innerCells = Math.max(0, width - 2) * Math.max(0, height - 2);
  if (innerCells === 0) return 0;
  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(innerCells);
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
        const cellX = cell % width;
        const cellY = Math.floor(cell / width);
        for (let offsetY = -1; offsetY <= 1; offsetY++) {
          for (let offsetX = -1; offsetX <= 1; offsetX++) {
            if (offsetX === 0 && offsetY === 0) continue;
            const nextX = cellX + offsetX;
            const nextY = cellY + offsetY;
            if (nextX <= 0 || nextX >= width - 1 || nextY <= 0 || nextY >= height - 1) continue;
            const next = nextY * width + nextX;
            if (mask[next] === 0 || visited[next] === 1) continue;
            visited[next] = 1;
            queue[tail++] = next;
          }
        }
      }
      largest = Math.max(largest, size);
    }
  }
  return largest / innerCells;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const normalized = Math.min(1, Math.max(0, (value - edge0) / Math.max(1e-6, edge1 - edge0)));
  return normalized * normalized * (3 - 2 * normalized);
}

function sourceRegionSignals(input: SourceRegionCapacityInput): SourceRegionSignals {
  const semanticBoundaryRadius = Math.max(4, Math.round(64 / input.sourcePixelsPerCell));
  const materialRegionRadius = Math.max(2, Math.round(20 / input.sourcePixelsPerCell));
  const fineGradient = gradient(input.luma, input.width, input.height);
  const coarseGradient = gradient(boxBlur(input.luma, input.width, input.height, semanticBoundaryRadius), input.width, input.height);
  const midBand = new Float32Array(input.luma.length);
  for (let cell = 0; cell < midBand.length; cell++) midBand[cell] = Math.max(0, fineGradient[cell] - coarseGradient[cell] * 0.45);
  const localSupport = boxBlur(midBand, input.width, input.height, materialRegionRadius);
  const supportThreshold = percentile(localSupport, 0.5);
  const boundaryThreshold = percentile(coarseGradient, 0.88);
  const boundary = new Uint8Array(input.luma.length);
  for (let cell = 0; cell < boundary.length; cell++) boundary[cell] = coarseGradient[cell] >= boundaryThreshold ? 1 : 0;
  return {
    localSupport,
    distance: distanceToBoundary(boundary, input.width, input.height),
    supportThreshold,
    interiorRadius: Math.max(1, Math.round(8 / input.sourcePixelsPerCell)),
  };
}

export function buildSourceRegionAffinityField(input: SourceRegionCapacityInput): SourceRegionAffinityField {
  if (input.luma.length !== input.width * input.height) throw new Error("source-region-affinity requires a complete luminance grid");
  const signals = sourceRegionSignals(input);
  const supportCeiling = Math.max(signals.supportThreshold + 1e-6, percentile(signals.localSupport, 0.85));
  const safetyRadius = Math.max(signals.interiorRadius + 1, Math.round(28 / input.sourcePixelsPerCell));
  const values = new Float32Array(input.luma.length);
  const active = new Uint8Array(input.luma.length);
  for (let cell = 0; cell < values.length; cell++) {
    const material = smoothstep(signals.supportThreshold, supportCeiling, signals.localSupport[cell]);
    const interior = smoothstep(signals.interiorRadius, safetyRadius, signals.distance[cell]);
    values[cell] = material * interior;
    active[cell] = values[cell] >= AFFINITY_ACTIVE_THRESHOLD ? 1 : 0;
  }
  return {
    width: input.width,
    height: input.height,
    values,
    connectedCoverage: largestComponentCoverage(active, input.width, input.height),
  };
}

export function analyzeSourceRegionCapacity(input: SourceRegionCapacityInput): SourceRegionCapacity {
  if (input.luma.length !== input.width * input.height) throw new Error("source-region-capacity requires a complete luminance grid");
  const signals = sourceRegionSignals(input);
  const support = new Uint8Array(input.luma.length);
  for (let cell = 0; cell < support.length; cell++) support[cell] = signals.localSupport[cell] > Math.max(0.0001, signals.supportThreshold) ? 1 : 0;
  const transport = new Uint8Array(input.luma.length);
  let supportCount = 0;
  let transportCount = 0;
  let conflictCount = 0;
  for (let y = 1; y < input.height - 1; y++) {
    for (let x = 1; x < input.width - 1; x++) {
      const cell = y * input.width + x;
      if (support[cell] === 0) continue;
      supportCount++;
      if (signals.distance[cell] < signals.interiorRadius) {
        conflictCount++;
        continue;
      }
      transport[cell] = 1;
      transportCount++;
    }
  }
  const innerCells = Math.max(1, (input.width - 2) * (input.height - 2));
  const midBandSupportCoverage = supportCount / innerCells;
  const connectedSupportCoverage = largestComponentCoverage(transport, input.width, input.height);
  const transportInteriorCoverage = transportCount / innerCells;

  // Renderer-equivalent authority: the smooth affinity field the shader actually multiplies.
  const affinity = buildSourceRegionAffinityField(input);
  let affinityActiveCount = 0;
  for (let y = 1; y < input.height - 1; y++) {
    for (let x = 1; x < input.width - 1; x++) {
      if (affinity.values[y * input.width + x] >= AFFINITY_ACTIVE_THRESHOLD) affinityActiveCount++;
    }
  }
  const affinityActiveCoverage = affinityActiveCount / innerCells;
  const affinityConnectedCoverage = affinity.connectedCoverage;

  return {
    analysisWidth: input.width,
    analysisHeight: input.height,
    sourcePixelsPerCell: input.sourcePixelsPerCell,
    midBandSupportCoverage,
    connectedSupportCoverage,
    transportInteriorCoverage,
    coarseBoundaryConflict: conflictCount / Math.max(1, supportCount),
    affinityActiveCoverage,
    affinityConnectedCoverage,
    canCarryConnectedTransport:
      affinityActiveCoverage >= AFFINITY_ACTIVE_COVERAGE_FLOOR &&
      affinityConnectedCoverage >= AFFINITY_CONNECTED_COVERAGE_FLOOR,
  };
}
