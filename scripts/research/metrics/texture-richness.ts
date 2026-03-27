// M6: Bidirectional Texture Richness
// 8×8 block local variance → Shannon entropy
// Bidirectional: clamp01(1 - |log(gen/ref)|)

const BLOCK_SIZE = 8;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function blockVarianceEntropy(
  gray: Float64Array, w: number, h: number,
): number {
  const bw = Math.floor(w / BLOCK_SIZE);
  const bh = Math.floor(h / BLOCK_SIZE);
  if (bw === 0 || bh === 0) return 0;

  const variances: number[] = [];

  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let sum = 0, sum2 = 0, count = 0;
      for (let dy = 0; dy < BLOCK_SIZE; dy++) {
        for (let dx = 0; dx < BLOCK_SIZE; dx++) {
          const val = gray[(by * BLOCK_SIZE + dy) * w + (bx * BLOCK_SIZE + dx)];
          sum += val;
          sum2 += val * val;
          count++;
        }
      }
      const mean = sum / count;
      const variance = sum2 / count - mean * mean;
      variances.push(Math.max(0, variance));
    }
  }

  // Shannon entropy of variance distribution (binned)
  const maxVar = Math.max(...variances, 1);
  const numBins = 64;
  const bins = new Float64Array(numBins);

  for (const v of variances) {
    const bin = Math.min(Math.floor((v / maxVar) * numBins), numBins - 1);
    bins[bin]++;
  }

  const total = variances.length;
  let entropy = 0;
  for (let i = 0; i < numBins; i++) {
    if (bins[i] > 0) {
      const p = bins[i] / total;
      entropy -= p * Math.log2(p);
    }
  }

  return entropy;
}

export function computeTextureRichness(
  refGray: Float64Array,
  genGray: Float64Array,
  w: number,
  h: number,
): number {
  const refEntropy = blockVarianceEntropy(refGray, w, h);
  const genEntropy = blockVarianceEntropy(genGray, w, h);

  // Both flat (0 entropy) → identical texture quality
  if (refEntropy < 0.01 && genEntropy < 0.01) return 1.0;

  // One flat, other not → 0.5 (ref=0 means log undefined)
  if (refEntropy < 0.01 || genEntropy < 0.01) {
    return 0.5;
  }

  // Bidirectional: penalize both loss and excess
  const logRatio = Math.abs(Math.log(genEntropy / refEntropy));
  return clamp01(1 - logRatio);
}
