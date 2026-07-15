export type ReferenceTextureInput = {
  readonly data: Buffer;
  readonly width: number;
  readonly height: number;
  readonly fps: number;
};

export type ReferenceTextureMetrics = {
  readonly frameCount: number;
  readonly adjacentLumaMotion: number;
  readonly adjacentChromaMotion: number;
  readonly chromaToLumaMotion: number;
  readonly hueStep95: number;
  readonly hueDegreesPerSecond95: number;
  readonly activeTextureCoverage: number;
  readonly connectedMotionCoverage: number;
  readonly globalChromaMotionShare: number;
  readonly edgeMotionRatio: number;
  readonly edgePersistence: number;
  readonly temporalCoherence: number;
  readonly fineMotionRatio: number;
  readonly loopClosureRatio: number;
};

export class ReferenceTextureInputError extends Error {
  override readonly name = "ReferenceTextureInputError";
}

type Planes = {
  readonly y: Float32Array;
  readonly u: Float32Array;
  readonly v: Float32Array;
};

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function fillPlanes(data: Buffer, frameOffset: number, planes: Planes): void {
  for (let cell = 0; cell < planes.y.length; cell++) {
    const offset = frameOffset + cell * 3;
    const r = data[offset] / 255;
    const g = data[offset + 1] / 255;
    const b = data[offset + 2] / 255;
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    planes.y[cell] = y;
    planes.u[cell] = b - y;
    planes.v[cell] = r - y;
  }
}

function gradientMap(luma: Float32Array, width: number, height: number): Float32Array {
  const result = new Float32Array(luma.length);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const cell = y * width + x;
      const dx = luma[cell + 1] - luma[cell - 1];
      const dy = luma[cell + width] - luma[cell - width];
      result[cell] = Math.hypot(dx, dy);
    }
  }
  return result;
}

function correlation(a: Float32Array, b: Float32Array, width: number, height: number, dx = 0, dy = 0): number {
  let count = 0;
  let sumA = 0;
  let sumB = 0;
  let sumAA = 0;
  let sumBB = 0;
  let sumAB = 0;
  const xStart = Math.max(1, -dx + 1);
  const xEnd = Math.min(width - 1, width - dx - 1);
  const yStart = Math.max(1, -dy + 1);
  const yEnd = Math.min(height - 1, height - dy - 1);
  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      const valueA = a[y * width + x];
      const valueB = b[(y + dy) * width + x + dx];
      sumA += valueA;
      sumB += valueB;
      sumAA += valueA * valueA;
      sumBB += valueB * valueB;
      sumAB += valueA * valueB;
      count++;
    }
  }
  if (count === 0) return 0;
  const covariance = sumAB - (sumA * sumB) / count;
  const varianceA = sumAA - (sumA * sumA) / count;
  const varianceB = sumBB - (sumB * sumB) / count;
  if (varianceA <= 1e-12 || varianceB <= 1e-12) {
    return varianceA <= 1e-12 && varianceB <= 1e-12 ? 1 : 0;
  }
  return covariance / Math.sqrt(varianceA * varianceB);
}

function shiftedCorrelation(a: Float32Array, b: Float32Array, width: number, height: number): number {
  let best = -1;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) best = Math.max(best, correlation(a, b, width, height, dx, dy));
  }
  return Math.max(0, best);
}

function edgeBands(edge: Float32Array, width: number, height: number): { readonly high: Uint8Array; readonly low: Uint8Array } {
  const cells: number[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) cells.push(y * width + x);
  }
  cells.sort((a, b) => edge[b] - edge[a]);
  const bandSize = Math.max(1, Math.floor(cells.length * 0.3));
  const high = new Uint8Array(edge.length);
  const low = new Uint8Array(edge.length);
  for (let index = 0; index < bandSize; index++) {
    high[cells[index]] = 1;
    low[cells[cells.length - 1 - index]] = 1;
  }
  return { high, low };
}

function percentileFromHistogram(histogram: Uint32Array, percentile: number): number {
  const total = histogram.reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0;
  const target = total * percentile;
  let cumulative = 0;
  for (let bin = 0; bin < histogram.length; bin++) {
    cumulative += histogram[bin];
    if (cumulative >= target) return bin;
  }
  return histogram.length - 1;
}

function fineMotion(motion: Float32Array, width: number, height: number): number {
  let residual = 0;
  let energy = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const cell = y * width + x;
      const local = (motion[cell - 1] + motion[cell + 1] + motion[cell - width] + motion[cell + width]) * 0.25;
      residual += Math.abs(motion[cell] - local);
      energy += motion[cell];
      count++;
    }
  }
  if (count === 0 || energy <= 1e-12) return 0;
  return residual / energy;
}

function connectedMotionCoverage(motion: Float32Array, width: number, height: number): number {
  const innerWidth = Math.max(0, width - 2);
  const innerHeight = Math.max(0, height - 2);
  const innerCells = innerWidth * innerHeight;
  if (innerCells === 0) return 0;

  let sum = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) sum += motion[y * width + x];
  }
  const threshold = Math.max(0.008, (sum / innerCells) * 0.65);
  const visited = new Uint8Array(motion.length);
  const queue = new Int32Array(innerCells);
  let largest = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const start = y * width + x;
      if (visited[start] === 1 || motion[start] < threshold) continue;
      let head = 0;
      let tail = 0;
      let size = 0;
      visited[start] = 1;
      queue[tail++] = start;
      while (head < tail) {
        const cell = queue[head++];
        size++;
        const neighbors = [cell - 1, cell + 1, cell - width, cell + width];
        for (const neighbor of neighbors) {
          const neighborX = neighbor % width;
          const neighborY = Math.floor(neighbor / width);
          if (
            neighborX <= 0 || neighborX >= width - 1 ||
            neighborY <= 0 || neighborY >= height - 1 ||
            visited[neighbor] === 1 || motion[neighbor] < threshold
          ) continue;
          visited[neighbor] = 1;
          queue[tail++] = neighbor;
        }
      }
      largest = Math.max(largest, size);
    }
  }
  return largest / innerCells;
}

function frameDistance(a: Planes, b: Planes): number {
  let sum = 0;
  for (let cell = 0; cell < a.y.length; cell++) {
    sum += Math.hypot(a.y[cell] - b.y[cell], a.u[cell] - b.u[cell], a.v[cell] - b.v[cell]);
  }
  return sum / a.y.length;
}

export function analyzeReferenceTexture(input: ReferenceTextureInput): ReferenceTextureMetrics {
  const cellCount = input.width * input.height;
  const frameBytes = cellCount * 3;
  const frameCount = Math.floor(input.data.length / frameBytes);
  if (frameCount < 2) throw new ReferenceTextureInputError("reference texture analysis requires at least two frames");
  const createPlanes = (): Planes => ({ y: new Float32Array(cellCount), u: new Float32Array(cellCount), v: new Float32Array(cellCount) });
  const first = createPlanes();
  const previous = createPlanes();
  const current = createPlanes();
  fillPlanes(input.data, 0, first);
  fillPlanes(input.data, 0, previous);
  const firstEdge = gradientMap(first.y, input.width, input.height);
  const bands = edgeBands(firstEdge, input.width, input.height);
  const meanU = new Float64Array(first.u);
  const meanV = new Float64Array(first.v);
  const m2U = new Float64Array(cellCount);
  const m2V = new Float64Array(cellCount);
  const hueHistogram = new Uint32Array(181);
  const lumaMotion: number[] = [];
  const chromaMotion: number[] = [];
  const edgePersistence: number[] = [];
  const temporalCoherence: number[] = [];
  const fineMotionRatios: number[] = [];
  const connectedMotionCoverages: number[] = [];
  const globalChromaMotionShares: number[] = [];
  let previousMotion: Float32Array | undefined;
  let highMotion = 0;
  let lowMotion = 0;
  let highCount = 0;
  let lowCount = 0;

  for (let frame = 1; frame < frameCount; frame++) {
    fillPlanes(input.data, frame * frameBytes, current);
    const motion = new Float32Array(cellCount);
    let frameLuma = 0;
    let frameChroma = 0;
    let frameChromaU = 0;
    let frameChromaV = 0;
    for (let cell = 0; cell < cellCount; cell++) {
      const dy = Math.abs(current.y[cell] - previous.y[cell]);
      const dc = Math.hypot(current.u[cell] - previous.u[cell], current.v[cell] - previous.v[cell]);
      frameChromaU += current.u[cell] - previous.u[cell];
      frameChromaV += current.v[cell] - previous.v[cell];
      motion[cell] = dc;
      frameLuma += dy;
      frameChroma += dc;
      const angleA = Math.atan2(previous.v[cell], previous.u[cell]);
      const angleB = Math.atan2(current.v[cell], current.u[cell]);
      const angle = Math.abs(Math.atan2(Math.sin(angleB - angleA), Math.cos(angleB - angleA))) * (180 / Math.PI);
      hueHistogram[Math.min(180, Math.floor(angle))]++;
      if (bands.high[cell] === 1) {
        highMotion += dc;
        highCount++;
      }
      if (bands.low[cell] === 1) {
        lowMotion += dc;
        lowCount++;
      }
      const sampleCount = frame + 1;
      const deltaU = current.u[cell] - meanU[cell];
      const deltaV = current.v[cell] - meanV[cell];
      meanU[cell] += deltaU / sampleCount;
      meanV[cell] += deltaV / sampleCount;
      m2U[cell] += deltaU * (current.u[cell] - meanU[cell]);
      m2V[cell] += deltaV * (current.v[cell] - meanV[cell]);
    }
    lumaMotion.push(frameLuma / cellCount);
    chromaMotion.push(frameChroma / cellCount);
    connectedMotionCoverages.push(connectedMotionCoverage(motion, input.width, input.height));
    globalChromaMotionShares.push(
      Math.hypot(frameChromaU / cellCount, frameChromaV / cellCount) /
      Math.max(1e-6, frameChroma / cellCount),
    );
    edgePersistence.push(correlation(firstEdge, gradientMap(current.y, input.width, input.height), input.width, input.height));
    if (previousMotion !== undefined) temporalCoherence.push(shiftedCorrelation(previousMotion, motion, input.width, input.height));
    fineMotionRatios.push(fineMotion(motion, input.width, input.height));
    previousMotion = motion;
    previous.y.set(current.y);
    previous.u.set(current.u);
    previous.v.set(current.v);
  }

  let activeCells = 0;
  for (let cell = 0; cell < cellCount; cell++) {
    const chromaStd = Math.sqrt((m2U[cell] + m2V[cell]) / Math.max(1, frameCount - 1));
    if (chromaStd >= 0.025) activeCells++;
  }
  const adjacentLumaMotion = mean(lumaMotion);
  const adjacentChromaMotion = mean(chromaMotion);
  const loopDistance = frameDistance(first, current);
  const adjacentDistance = Math.hypot(adjacentLumaMotion, adjacentChromaMotion);
  const hueStep95 = percentileFromHistogram(hueHistogram, 0.95);
  return {
    frameCount,
    adjacentLumaMotion,
    adjacentChromaMotion,
    chromaToLumaMotion: adjacentChromaMotion / Math.max(1e-6, adjacentLumaMotion),
    hueStep95,
    hueDegreesPerSecond95: hueStep95 * input.fps,
    activeTextureCoverage: activeCells / cellCount,
    connectedMotionCoverage: mean(connectedMotionCoverages),
    globalChromaMotionShare: mean(globalChromaMotionShares),
    edgeMotionRatio: (highMotion / Math.max(1, highCount)) / Math.max(1e-6, lowMotion / Math.max(1, lowCount)),
    edgePersistence: mean(edgePersistence),
    temporalCoherence: mean(temporalCoherence),
    fineMotionRatio: mean(fineMotionRatios),
    loopClosureRatio: loopDistance / Math.max(1e-6, adjacentDistance),
  };
}
