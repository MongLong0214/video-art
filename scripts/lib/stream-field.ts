const TAU = Math.PI * 2;
const STREAM_WAVELENGTH_PX = 96;
const STREAM_POLISH_ITERATIONS = 12;

export type MaterialFlow = {
  readonly tangentX: Float32Array;
  readonly tangentY: Float32Array;
  readonly coherence: Float32Array;
};

type GridFlow = {
  readonly width: number;
  readonly height: number;
  readonly step: number;
  readonly tangentX: Float32Array;
  readonly tangentY: Float32Array;
  readonly coherence: Float32Array;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function gridIndex(x: number, y: number, width: number): number {
  return y * width + x;
}

function chooseGridStep(width: number, height: number): number {
  return Math.max(2, Math.min(4, Math.round(Math.min(width, height) / 480)));
}

function buildGridFlow(flow: MaterialFlow, width: number, height: number): GridFlow {
  const step = chooseGridStep(width, height);
  const gridWidth = Math.ceil(width / step);
  const gridHeight = Math.ceil(height / step);
  const total = gridWidth * gridHeight;
  const tangentX = new Float32Array(total);
  const tangentY = new Float32Array(total);
  const coherence = new Float32Array(total);

  for (let gridY = 0; gridY < gridHeight; gridY++) {
    const startY = gridY * step;
    const endY = Math.min(height, startY + step);
    for (let gridX = 0; gridX < gridWidth; gridX++) {
      const startX = gridX * step;
      const endX = Math.min(width, startX + step);
      const index = gridIndex(gridX, gridY, gridWidth);
      let sumX = 0;
      let sumY = 0;
      let coherenceSum = 0;
      let samples = 0;
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const sourceIndex = y * width + x;
          const weight = flow.coherence[sourceIndex];
          sumX += flow.tangentX[sourceIndex] * weight;
          sumY += flow.tangentY[sourceIndex] * weight;
          coherenceSum += weight;
          samples++;
        }
      }
      const magnitude = Math.hypot(sumX, sumY);
      if (magnitude > 1e-6) {
        tangentX[index] = sumX / magnitude;
        tangentY[index] = sumY / magnitude;
      }
      coherence[index] = coherenceSum / Math.max(1, samples);
    }
  }

  return { width: gridWidth, height: gridHeight, step, tangentX, tangentY, coherence };
}

function edgeTarget(
  tangent: Float32Array,
  coherence: Float32Array,
  first: number,
  second: number,
  step: number,
): number {
  return 0.5 * (tangent[first] * coherence[first] + tangent[second] * coherence[second]) * step;
}

function directionalCoordinate(
  grid: GridFlow,
  xStart: number,
  xEnd: number,
  xStep: number,
  yStart: number,
  yEnd: number,
  yStep: number,
): Float32Array {
  const coordinate = new Float32Array(grid.width * grid.height);
  for (let y = yStart; y !== yEnd; y += yStep) {
    for (let x = xStart; x !== xEnd; x += xStep) {
      const index = gridIndex(x, y, grid.width);
      let sum = 0;
      let count = 0;
      const previousX = x - xStep;
      const previousY = y - yStep;
      if (previousX >= 0 && previousX < grid.width) {
        const previous = gridIndex(previousX, y, grid.width);
        const target = previousX < x
          ? edgeTarget(grid.tangentX, grid.coherence, previous, index, grid.step)
          : edgeTarget(grid.tangentX, grid.coherence, index, previous, grid.step);
        sum += coordinate[previous] + (previousX < x ? target : -target);
        count++;
      }
      if (previousY >= 0 && previousY < grid.height) {
        const previous = gridIndex(x, previousY, grid.width);
        const target = previousY < y
          ? edgeTarget(grid.tangentY, grid.coherence, previous, index, grid.step)
          : edgeTarget(grid.tangentY, grid.coherence, index, previous, grid.step);
        sum += coordinate[previous] + (previousY < y ? target : -target);
        count++;
      }
      coordinate[index] = count > 0 ? sum / count : 0;
    }
  }
  return coordinate;
}

function meanCentered(coordinate: Float32Array): Float32Array {
  let sum = 0;
  for (const value of coordinate) sum += value;
  const mean = sum / Math.max(1, coordinate.length);
  const centered = new Float32Array(coordinate.length);
  for (let index = 0; index < coordinate.length; index++) centered[index] = coordinate[index] - mean;
  return centered;
}

function directionalSeed(grid: GridFlow): Float32Array {
  const sweeps = [
    directionalCoordinate(grid, 0, grid.width, 1, 0, grid.height, 1),
    directionalCoordinate(grid, grid.width - 1, -1, -1, 0, grid.height, 1),
    directionalCoordinate(grid, 0, grid.width, 1, grid.height - 1, -1, -1),
    directionalCoordinate(grid, grid.width - 1, -1, -1, grid.height - 1, -1, -1),
  ];
  const coordinate = new Float32Array(grid.width * grid.height);
  for (const sweep of sweeps) {
    const centered = meanCentered(sweep);
    for (let index = 0; index < coordinate.length; index++) coordinate[index] += centered[index] / sweeps.length;
  }
  return coordinate;
}

function solveIntegratedCoordinate(grid: GridFlow): Float32Array {
  const total = grid.width * grid.height;
  let current = directionalSeed(grid);
  let next = new Float32Array(total);

  for (let iteration = 0; iteration < STREAM_POLISH_ITERATIONS; iteration++) {
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const index = gridIndex(x, y, grid.width);
        let sum = 0;
        let count = 0;
        if (x < grid.width - 1) {
          const right = gridIndex(x + 1, y, grid.width);
          sum += current[right] - edgeTarget(grid.tangentX, grid.coherence, index, right, grid.step);
          count++;
        }
        if (x > 0) {
          const left = gridIndex(x - 1, y, grid.width);
          sum += current[left] + edgeTarget(grid.tangentX, grid.coherence, left, index, grid.step);
          count++;
        }
        if (y < grid.height - 1) {
          const below = gridIndex(x, y + 1, grid.width);
          sum += current[below] - edgeTarget(grid.tangentY, grid.coherence, index, below, grid.step);
          count++;
        }
        if (y > 0) {
          const above = gridIndex(x, y - 1, grid.width);
          sum += current[above] + edgeTarget(grid.tangentY, grid.coherence, above, index, grid.step);
          count++;
        }
        next[index] = count > 0 ? sum / count : 0;
      }
    }
    const previous = current;
    current = next;
    next = previous;
  }

  return current;
}

function buildCoordinateQuality(grid: GridFlow, coordinate: Float32Array): Float32Array {
  const quality = new Float32Array(coordinate.length);
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const index = gridIndex(x, y, grid.width);
      const left = coordinate[gridIndex(Math.max(0, x - 1), y, grid.width)];
      const right = coordinate[gridIndex(Math.min(grid.width - 1, x + 1), y, grid.width)];
      const above = coordinate[gridIndex(x, Math.max(0, y - 1), grid.width)];
      const below = coordinate[gridIndex(x, Math.min(grid.height - 1, y + 1), grid.width)];
      const gradientX = (right - left) / (2 * grid.step);
      const gradientY = (below - above) / (2 * grid.step);
      const gradientLength = Math.hypot(gradientX, gradientY);
      const alignment = gradientLength > 1e-6
        ? Math.abs((gradientX * grid.tangentX[index] + gradientY * grid.tangentY[index]) / gradientLength)
        : 0;
      const magnitude = clamp01((gradientLength - 0.1) / 0.8);
      quality[index] = clamp01(
        grid.coherence[index] * (0.35 + 0.65 * alignment) * (0.35 + 0.65 * magnitude),
      );
    }
  }
  return quality;
}

function sampleGrid(field: Float32Array, grid: GridFlow, x: number, y: number): number {
  const gridX = Math.min(grid.width - 1, Math.max(0, x / grid.step));
  const gridY = Math.min(grid.height - 1, Math.max(0, y / grid.step));
  const left = Math.floor(gridX);
  const top = Math.floor(gridY);
  const right = Math.min(grid.width - 1, left + 1);
  const bottom = Math.min(grid.height - 1, top + 1);
  const horizontal = gridX - left;
  const vertical = gridY - top;
  const topValue = field[gridIndex(left, top, grid.width)] * (1 - horizontal) + field[gridIndex(right, top, grid.width)] * horizontal;
  const bottomValue = field[gridIndex(left, bottom, grid.width)] * (1 - horizontal) + field[gridIndex(right, bottom, grid.width)] * horizontal;
  return topValue * (1 - vertical) + bottomValue * vertical;
}

export function buildIntegratedStreamField(flow: MaterialFlow, width: number, height: number): Buffer {
  const grid = buildGridFlow(flow, width, height);
  const coordinate = solveIntegratedCoordinate(grid);
  const quality = buildCoordinateQuality(grid, coordinate);
  const rgb = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 3;
      const phase = TAU * sampleGrid(coordinate, grid, x, y) / STREAM_WAVELENGTH_PX;
      rgb[index] = clampByte((0.5 + 0.5 * Math.cos(phase)) * 255);
      rgb[index + 1] = clampByte((0.5 + 0.5 * Math.sin(phase)) * 255);
      rgb[index + 2] = clampByte(sampleGrid(quality, grid, x, y) * 255);
    }
  }
  return rgb;
}
