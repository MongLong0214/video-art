import { describe, it, expect } from "vitest";

// JS ports of GLSL HSV conversion functions (mirrors layer.frag rgb2hsv/hsv2rgb)
const rgb2hsv = (r: number, g: number, b: number): [number, number, number] => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h, s, v];
};

const hsv2rgb = (h: number, s: number, v: number): [number, number, number] => {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: return [v, t, p];
    case 1: return [q, v, p];
    case 2: return [p, v, t];
    case 3: return [p, q, v];
    case 4: return [t, p, v];
    case 5: return [v, p, q];
    default: return [0, 0, 0];
  }
};

describe("HSV color conversion (JS port of layer.frag)", () => {
  it("rgb2hsv roundtrip: RGB→HSV→RGB error < 0.001", () => {
    const colors = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [0.5, 0.3, 0.8],
      [0.1, 0.9, 0.5],
      [1, 1, 1],
      [0, 0, 0],
    ];
    for (const [r, g, b] of colors) {
      const [h, s, v] = rgb2hsv(r, g, b);
      const [r2, g2, b2] = hsv2rgb(h, s, v);
      expect(Math.abs(r - r2)).toBeLessThan(0.001);
      expect(Math.abs(g - g2)).toBeLessThan(0.001);
      expect(Math.abs(b - b2)).toBeLessThan(0.001);
    }
  });

  it("hsv hue shift wrapping stays in 0-1 range", () => {
    const shifts = [0.1, 0.5, 0.9, 1.3, 2.7, -0.5];
    for (const shift of shifts) {
      const h = 0.7;
      const wrapped = ((h + shift) % 1 + 1) % 1;
      expect(wrapped).toBeGreaterThanOrEqual(0);
      expect(wrapped).toBeLessThanOrEqual(1);
    }
  });

  it("luminanceKey=1.0 dark pixels shift faster than bright", () => {
    const key = 1.0;
    const darkLumFactor = Math.pow(1 - 0.1, 1 + key);
    const brightLumFactor = Math.pow(1 - 0.9, 1 + key);
    expect(darkLumFactor).toBeGreaterThan(brightLumFactor * 5);
  });

  it("luminanceKey=0 gives uniform shift (lumFactor=1.0 for all lum)", () => {
    const lumValues = [0, 0.3, 0.5, 0.8, 1.0];
    const key = 0;
    for (const lum of lumValues) {
      const lumFactor = key > 0.001 ? Math.pow(1 - lum, 1 + key) : 1.0;
      expect(lumFactor).toBe(1.0);
    }
  });
});
