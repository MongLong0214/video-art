// M5: Canny Edge Preservation with 2px dilation tolerance
// Canny: Gaussian smooth → Sobel gradient → NMS → hysteresis
// F1 score on dilated edge maps

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// ── Canny Edge Detection ───────────────────────────────────

function gaussianBlur(img: Float64Array, w: number, h: number, sigma: number): Float64Array {
  const ks = Math.ceil(sigma * 3) * 2 + 1;
  const half = Math.floor(ks / 2);
  const kernel = new Float64Array(ks);
  let sum = 0;
  for (let i = 0; i < ks; i++) {
    kernel[i] = Math.exp(-((i - half) ** 2) / (2 * sigma * sigma));
    sum += kernel[i];
  }
  for (let i = 0; i < ks; i++) kernel[i] /= sum;

  // Separable: horizontal then vertical
  const tmp = new Float64Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = 0; k < ks; k++) {
        const sx = Math.min(Math.max(x + k - half, 0), w - 1);
        s += img[y * w + sx] * kernel[k];
      }
      tmp[y * w + x] = s;
    }

  const out = new Float64Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = 0; k < ks; k++) {
        const sy = Math.min(Math.max(y + k - half, 0), h - 1);
        s += tmp[sy * w + x] * kernel[k];
      }
      out[y * w + x] = s;
    }
  return out;
}

function sobelGradient(
  img: Float64Array, w: number, h: number,
): { magnitude: Float64Array; direction: Float64Array } {
  const mag = new Float64Array(w * h);
  const dir = new Float64Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx =
        -img[(y - 1) * w + (x - 1)] + img[(y - 1) * w + (x + 1)] +
        -2 * img[y * w + (x - 1)] + 2 * img[y * w + (x + 1)] +
        -img[(y + 1) * w + (x - 1)] + img[(y + 1) * w + (x + 1)];
      const gy =
        -img[(y - 1) * w + (x - 1)] - 2 * img[(y - 1) * w + x] - img[(y - 1) * w + (x + 1)] +
        img[(y + 1) * w + (x - 1)] + 2 * img[(y + 1) * w + x] + img[(y + 1) * w + (x + 1)];
      mag[y * w + x] = Math.sqrt(gx * gx + gy * gy);
      dir[y * w + x] = Math.atan2(gy, gx);
    }
  }
  return { magnitude: mag, direction: dir };
}

function nonMaxSuppression(
  mag: Float64Array, dir: Float64Array, w: number, h: number,
): Float64Array {
  const out = new Float64Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const angle = ((dir[y * w + x] * 180) / Math.PI + 180) % 180;
      const m = mag[y * w + x];
      let n1 = 0, n2 = 0;

      if (angle < 22.5 || angle >= 157.5) {
        n1 = mag[y * w + (x - 1)]; n2 = mag[y * w + (x + 1)];
      } else if (angle < 67.5) {
        n1 = mag[(y - 1) * w + (x + 1)]; n2 = mag[(y + 1) * w + (x - 1)];
      } else if (angle < 112.5) {
        n1 = mag[(y - 1) * w + x]; n2 = mag[(y + 1) * w + x];
      } else {
        n1 = mag[(y - 1) * w + (x - 1)]; n2 = mag[(y + 1) * w + (x + 1)];
      }

      out[y * w + x] = m >= n1 && m >= n2 ? m : 0;
    }
  }
  return out;
}

function hysteresisThreshold(
  nms: Float64Array, w: number, h: number, lowRatio: number = 0.1, highRatio: number = 0.3,
): Uint8Array {
  let maxVal = 0;
  for (let i = 0; i < nms.length; i++) if (nms[i] > maxVal) maxVal = nms[i];

  if (maxVal < 1e-6) return new Uint8Array(w * h); // no gradients at all

  const high = maxVal * highRatio;
  const low = maxVal * lowRatio;
  const edges = new Uint8Array(w * h);

  // Strong edges
  for (let i = 0; i < w * h; i++) {
    if (nms[i] >= high) edges[i] = 1;
  }

  // Weak edges connected to strong
  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        if (edges[y * w + x] === 0 && nms[y * w + x] >= low) {
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++)
              if (edges[(y + dy) * w + (x + dx)] === 1) {
                edges[y * w + x] = 1;
                changed = true;
              }
        }
      }
    }
  }

  return edges;
}

export function cannyEdgeDetect(
  gray: Float64Array, w: number, h: number, sigma: number = 1.4,
): Uint8Array {
  const blurred = gaussianBlur(gray, w, h, sigma);
  const { magnitude, direction } = sobelGradient(blurred, w, h);
  const nms = nonMaxSuppression(magnitude, direction, w, h);
  return hysteresisThreshold(nms, w, h);
}

// ── Morphological Dilation ─────────────────────────────────

export function dilateEdgeMap(
  edges: Uint8Array, w: number, h: number, radius: number = 2,
): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (edges[y * w + x] === 1) {
        for (let dy = -radius; dy <= radius; dy++)
          for (let dx = -radius; dx <= radius; dx++) {
            const ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < h && nx >= 0 && nx < w)
              out[ny * w + nx] = 1;
          }
      }
    }
  }
  return out;
}

// ── F1 Score ───────────────────────────────────────────────

export function edgeF1Score(ref: Uint8Array, gen: Uint8Array): number {
  let tp = 0, fp = 0, fn = 0;
  let refCount = 0, genCount = 0;

  for (let i = 0; i < ref.length; i++) {
    if (ref[i] === 1) refCount++;
    if (gen[i] === 1) genCount++;
    if (ref[i] === 1 && gen[i] === 1) tp++;
    else if (gen[i] === 1 && ref[i] === 0) fp++;
    else if (ref[i] === 1 && gen[i] === 0) fn++;
  }

  if (refCount === 0 && genCount === 0) return 1.0;
  if (tp === 0) return 0;

  const precision = tp / (tp + fp);
  const recall = tp / (tp + fn);
  return (2 * precision * recall) / (precision + recall);
}

// ── M5: Composite ──────────────────────────────────────────

export function computeEdgePreservation(
  refGray: Float64Array, genGray: Float64Array, w: number, h: number,
): number {
  const refEdges = cannyEdgeDetect(refGray, w, h);
  const genEdges = cannyEdgeDetect(genGray, w, h);

  const refDilated = dilateEdgeMap(refEdges, w, h, 2);
  const genDilated = dilateEdgeMap(genEdges, w, h, 2);

  return clamp01(edgeF1Score(refDilated, genDilated));
}
