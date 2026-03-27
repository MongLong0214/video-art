import sharp from "sharp";
import type { ResearchConfig } from "../research/research-config.js";

// Sobel kernels for edge detection
const SOBEL_X = {
  width: 3,
  height: 3,
  kernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
};

const SOBEL_Y = {
  width: 3,
  height: 3,
  kernel: [-1, -2, -1, 0, 0, 0, 1, 2, 1],
};

// Sobel magnitude threshold for classifying a pixel as an edge
const DEFAULT_EDGE_PIXEL_THRESHOLD = 30;

// Tier classification thresholds
const DEFAULT_SIMPLE_EDGE_MAX = 0.10;
const DEFAULT_SIMPLE_ENTROPY_MAX = 5.5;
const DEFAULT_COMPLEX_EDGE_MIN = 0.20;
const DEFAULT_COMPLEX_ENTROPY_MIN = 7.0;

// Hue histogram resolution (10 degrees per bin)
const HUE_BINS = 36;

// Minimum chroma delta to count a pixel as chromatic (avoids noise in gray regions)
const ACHROMATIC_DELTA = 0.01;

interface ComplexityResult {
  edgeDensity: number;
  colorEntropy: number;
  tier: "simple" | "medium" | "complex";
  layerCount: 3 | 4 | 6;
}

/**
 * Compute edge density via Sobel convolution.
 * Returns ratio of edge pixels to total pixels (0..1).
 */
async function computeEdgeDensity(imagePath: string, edgePixelThreshold: number): Promise<number> {
  const base = sharp(imagePath).grayscale();

  // Apply horizontal and vertical Sobel kernels
  const [gxResult, gyResult] = await Promise.all([
    base.clone().convolve(SOBEL_X).raw().toBuffer({ resolveWithObject: true }),
    base.clone().convolve(SOBEL_Y).raw().toBuffer({ resolveWithObject: true }),
  ]);

  const gx = gxResult.data;
  const gy = gyResult.data;
  const total = gxResult.info.width * gxResult.info.height;

  let edgeCount = 0;
  for (let i = 0; i < total; i++) {
    // sharp convolve clamps to 0-255 unsigned: 0 = no gradient (uniform regions)
    const magnitude = Math.sqrt(gx[i] * gx[i] + gy[i] * gy[i]);
    if (magnitude > edgePixelThreshold) {
      edgeCount++;
    }
  }

  return edgeCount / total;
}

/**
 * Compute Shannon entropy of hue histogram (36 bins, 10 degrees each).
 * Converts RGB to HSV, bins hue channel, computes entropy in bits.
 */
async function computeColorEntropy(imagePath: string): Promise<number> {
  const { data, info } = await sharp(imagePath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const total = info.width * info.height;
  const histogram = new Float64Array(HUE_BINS);

  for (let i = 0; i < total; i++) {
    const offset = i * 3;
    const r = data[offset] / 255;
    const g = data[offset + 1] / 255;
    const b = data[offset + 2] / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    if (delta < ACHROMATIC_DELTA) continue;

    let hue = 0;
    if (max === r) {
      hue = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      hue = 60 * ((b - r) / delta + 2);
    } else {
      hue = 60 * ((r - g) / delta + 4);
    }
    if (hue < 0) hue += 360;

    const bin = Math.min(Math.floor(hue / 10), HUE_BINS - 1);
    histogram[bin]++;
  }

  // Shannon entropy
  let chromaPixels = 0;
  for (let i = 0; i < HUE_BINS; i++) {
    chromaPixels += histogram[i];
  }

  if (chromaPixels === 0) return 0;

  let entropy = 0;
  for (let i = 0; i < HUE_BINS; i++) {
    if (histogram[i] === 0) continue;
    const p = histogram[i] / chromaPixels;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

export async function scoreComplexity(
  imagePath: string,
  config?: Partial<ResearchConfig>,
): Promise<ComplexityResult> {
  const edgePixelThreshold = config?.edgePixelThreshold ?? DEFAULT_EDGE_PIXEL_THRESHOLD;
  const simpleEdgeMax = config?.simpleEdgeMax ?? DEFAULT_SIMPLE_EDGE_MAX;
  const simpleEntropyMax = config?.simpleEntropyMax ?? DEFAULT_SIMPLE_ENTROPY_MAX;
  const complexEdgeMin = config?.complexEdgeMin ?? DEFAULT_COMPLEX_EDGE_MIN;
  const complexEntropyMin = config?.complexEntropyMin ?? DEFAULT_COMPLEX_ENTROPY_MIN;

  const [edgeDensity, colorEntropy] = await Promise.all([
    computeEdgeDensity(imagePath, edgePixelThreshold),
    computeColorEntropy(imagePath),
  ]);

  let tier: "simple" | "medium" | "complex";
  let layerCount: 3 | 4 | 6;

  if (edgeDensity < simpleEdgeMax && colorEntropy < simpleEntropyMax) {
    tier = "simple";
    layerCount = 3;
  } else if (edgeDensity > complexEdgeMin || colorEntropy > complexEntropyMin) {
    tier = "complex";
    layerCount = 6;
  } else {
    tier = "medium";
    layerCount = 4;
  }

  return { edgeDensity, colorEntropy, tier, layerCount };
}
