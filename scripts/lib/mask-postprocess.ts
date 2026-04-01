import sharp from "sharp";

interface HoleFillConfig {
  enabled?: boolean;
  kernelScale?: number;
}

/**
 * Fill interior holes in a binary mask using Gaussian blur approximation.
 *
 * Algorithm:
 * 1. Dilate: blur(sigma*3) + threshold(32) → expanded boundary for clamping
 * 2. Fill: iterative blur(sigma*N) + threshold(100) → fills interior holes (up to 3x)
 * 3. Clamp: result AND dilated → prevents expansion beyond dilated boundary
 *
 * Note: background-plate layers bypass this entirely — they go through
 * fillBackgroundPlate() which forces alpha=255 on all pixels.
 */
export async function fillMaskHoles(
  maskBuffer: Buffer,
  width: number,
  height: number,
  config: HoleFillConfig = {},
): Promise<Buffer> {
  if (config.enabled === false) return maskBuffer;

  const kernelScale = config.kernelScale ?? 0.01;
  const maxDim = Math.max(width, height);
  const sigma = Math.max(3, Math.min(15, Math.round(maxDim * kernelScale)));

  // Load mask as grayscale
  const rawMask = await sharp(maskBuffer)
    .resize(width, height)
    .grayscale()
    .raw()
    .toBuffer();

  // Check if mask has any holes worth filling
  const pixels = new Uint8Array(rawMask.buffer, rawMask.byteOffset, rawMask.byteLength);
  let opaqueCount = 0;
  for (let i = 0; i < pixels.length; i++) {
    if (pixels[i] > 128) opaqueCount++;
  }
  if (opaqueCount === 0 || opaqueCount === pixels.length) return maskBuffer;

  // Step 1: Create dilated boundary (generous expansion to cover hole areas)
  const dilateSigma = Math.max(sigma * 3, 5);
  const dilated = await sharp(rawMask, { raw: { width, height, channels: 1 } })
    .blur(dilateSigma)
    .threshold(32)
    .raw()
    .toBuffer();

  // Step 2: Iterative fill (up to 3 iterations, increasing sigma each round)
  let current = Buffer.from(rawMask);
  for (let iter = 0; iter < 3; iter++) {
    // Progressively larger blur to fill bigger holes
    const iterSigma = Math.max(sigma * (3 + iter * 3), 5);
    const filled = await sharp(current, { raw: { width, height, channels: 1 } })
      .blur(iterSigma)
      .threshold(100)
      .raw()
      .toBuffer();

    // OR with current mask (accumulate filled pixels), then AND with dilated boundary
    const result = new Uint8Array(width * height);
    const filledArr = new Uint8Array(filled.buffer, filled.byteOffset, filled.byteLength);
    const currentArr = new Uint8Array(current.buffer, current.byteOffset, current.byteLength);
    const dilatedArr = new Uint8Array(dilated.buffer, dilated.byteOffset, dilated.byteLength);

    let changed = false;
    for (let i = 0; i < result.length; i++) {
      const merged = currentArr[i] > 128 || filledArr[i] > 128 ? 255 : 0;
      result[i] = merged > 0 && dilatedArr[i] > 128 ? 255 : 0;
      if (result[i] !== (currentArr[i] > 128 ? 255 : 0)) changed = true;
    }

    current = Buffer.from(result);
    if (!changed) break;
  }

  // Convert back to PNG mask
  return sharp(current, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();
}

interface AlphaMatteConfig {
  enabled?: boolean;
  radiusScale?: number;
}

/**
 * Apply soft edges to a binary mask via Gaussian blur on the alpha channel.
 * Creates a gradient transition at mask boundaries instead of hard 0/255 edges.
 */
export async function applyAlphaMatte(
  maskBuffer: Buffer,
  width: number,
  height: number,
  config: AlphaMatteConfig = {},
): Promise<Buffer> {
  if (config.enabled === false) return maskBuffer;

  const radiusScale = config.radiusScale ?? 0.003;
  const maxDim = Math.max(width, height);
  const radius = Math.max(1, Math.min(8, Math.round(maxDim * radiusScale)));

  // Blur the mask to create soft edges
  return sharp(maskBuffer)
    .resize(width, height)
    .grayscale()
    .blur(radius)
    .png()
    .toBuffer();
}
