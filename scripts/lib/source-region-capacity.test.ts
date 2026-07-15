import { describe, expect, it } from "vitest";
import { analyzeSourceRegionCapacity, buildSourceRegionAffinityField } from "./source-region-capacity.js";

function bands(width: number, height: number): Float32Array {
  const luma = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      luma[y * width + x] = 0.45 + 0.25 * Math.sin((x + y * 0.45) * 0.38);
    }
  }
  return luma;
}

function isolatedPoints(width: number, height: number): Float32Array {
  const luma = new Float32Array(width * height).fill(0.5);
  for (let y = 4; y < height - 4; y += 11) {
    for (let x = 4; x < width - 4; x += 13) luma[y * width + x] = 1;
  }
  return luma;
}

describe("source region capacity", () => {
  it("recognizes broad connected source texture as viable region-affinity transport material", () => {
    // Large interior textured disk on a flat field: coarse boundary stays at the rim,
    // so the smooth affinity field has a big connected active component.
    const width = 96;
    const height = 144;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.38;
    const luma = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dist = Math.hypot(x - cx, y - cy);
        luma[y * width + x] =
          dist < radius
            ? 0.4 + 0.35 * Math.sin(x * 0.9) * Math.cos(y * 0.75)
            : 0.5;
      }
    }
    const result = analyzeSourceRegionCapacity({
      luma,
      width,
      height,
      sourcePixelsPerCell: 6,
    });

    expect(result.affinityActiveCoverage).toBeGreaterThan(0.08);
    expect(result.affinityConnectedCoverage).toBeGreaterThan(0.06);
    expect(result.canCarryConnectedTransport).toBe(true);
  });

  it("does not mistake isolated source speckles for a connected material region", () => {
    const result = analyzeSourceRegionCapacity({
      luma: isolatedPoints(80, 120),
      width: 80,
      height: 120,
      sourcePixelsPerCell: 8,
    });

    expect(result.affinityConnectedCoverage).toBeLessThan(0.06);
    expect(result.canCarryConnectedTransport).toBe(false);
  });

  it("builds a broad source-derived affinity field while keeping semantic boundaries inactive", () => {
    const width = 80;
    const height = 120;
    const luma = bands(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 40; x < width; x++) luma[y * width + x] *= 0.18;
    }

    const field = buildSourceRegionAffinityField({ luma, width, height, sourcePixelsPerCell: 8 });

    expect(field.connectedCoverage).toBeGreaterThan(0.06);
    expect(field.values[60 * width + 39]).toBeLessThan(field.values[60 * width + 22]);
  });

  it("uses smooth affinity authority, not binary median support, for canCarryConnectedTransport", () => {
    // Sparse micro-bands: binary diagnostics can still report non-trivial support,
    // but smooth affinity authority (shader field) remains too fragmented for preview.
    const width = 96;
    const height = 144;
    const luma = new Float32Array(width * height).fill(0.5);
    for (let y = 8; y < height - 8; y += 18) {
      for (let x = 4; x < width - 4; x++) {
        luma[y * width + x] = 0.5 + 0.5 * Math.sin(x * 0.9);
        if (y + 1 < height) luma[(y + 1) * width + x] = 0.5 + 0.5 * Math.sin(x * 0.9 + 1.2);
      }
    }

    const result = analyzeSourceRegionCapacity({
      luma,
      width,
      height,
      sourcePixelsPerCell: 8,
    });

    expect(result.affinityConnectedCoverage).toBeLessThan(0.06);
    expect(result.canCarryConnectedTransport).toBe(false);
    // Binary diagnostic fields remain available for audit trails.
    expect(result.midBandSupportCoverage).toBeGreaterThanOrEqual(0);
    expect(result.connectedSupportCoverage).toBeGreaterThanOrEqual(0);
  });
});
