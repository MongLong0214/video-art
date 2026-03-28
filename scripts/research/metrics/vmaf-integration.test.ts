// Integration tests: evaluateVideo M7 VMAF fallback behavior
// AC-5: evaluateVideo uses fallback 0.5 when vmaf unavailable
// AC-6: evaluateVideo catches computeVmaf error and falls back

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all heavy dependencies of evaluate.ts
vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    removeAlpha: vi.fn().mockReturnThis(),
    raw: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue({
      data: Buffer.alloc(64 * 64 * 3, 128),
      info: { width: 64, height: 64 },
    }),
    resize: vi.fn().mockReturnThis(),
  })),
}));

vi.mock("fs", () => ({
  existsSync: vi.fn(() => true),
  readdirSync: vi.fn(() => ["frame_p0.png"]),
  readFileSync: vi.fn(() => JSON.stringify({ duration: 2, fps: 30 })),
  mkdirSync: vi.fn(),
  rmSync: vi.fn(),
}));

vi.mock("../frame-extractor.js", () => ({
  getVideoMetadata: vi.fn(() => ({ duration: 2, fps: 30, width: 64, height: 64 })),
  extractSingleFrame: vi.fn(),
  checkFfmpegAvailable: vi.fn(() => true),
  calcProportionalTimestamps: vi.fn(() => [0.5]),
  calcTemporalPairTimestamps: vi.fn(() => []),
  normalizeFramePair: vi.fn(async (a: unknown, b: unknown) => [a, b]),
}));

vi.mock("./color-palette.js", () => ({
  srgbToLab: vi.fn(() => [50, 0, 0] as [number, number, number]),
  computeColorPaletteSimilarity: vi.fn(() => 0.8),
}));

vi.mock("./dominant-color.js", () => ({
  computeDominantColorAccuracy: vi.fn(() => 0.8),
}));

vi.mock("./color-temperature.js", () => ({
  computeColorTemperatureSimilarity: vi.fn(() => 0.8),
}));

vi.mock("./ms-ssim.js", () => ({
  computeMsssimYCbCr: vi.fn(() => 0.8),
}));

vi.mock("./edge-preservation.js", () => ({
  computeEdgePreservation: vi.fn(() => 0.8),
}));

vi.mock("./texture-richness.js", () => ({
  computeTextureRichness: vi.fn(() => 0.8),
}));

vi.mock("./temporal-coherence.js", () => ({
  computeTemporalCoherence: vi.fn(() => 0.8),
}));

vi.mock("./layer-quality.js", () => ({
  computeLayerIndependence: vi.fn(() => 0.8),
  computeRoleCoherence: vi.fn(() => 0.8),
}));

// Mock vmaf module -- controlled per test
vi.mock("./vmaf.js", () => ({
  checkVmafAvailable: vi.fn(),
  computeVmaf: vi.fn(),
}));

import { existsSync, readdirSync, readFileSync } from "fs";
import { evaluateVideo } from "../evaluate.js";
import { checkVmafAvailable, computeVmaf } from "./vmaf.js";

const mockExistsSync = vi.mocked(existsSync);
const mockReaddirSync = vi.mocked(readdirSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockCheckVmaf = vi.mocked(checkVmafAvailable);
const mockComputeVmaf = vi.mocked(computeVmaf);

const baseOpts = {
  videoPath: "/tmp/gen.mp4",
  referenceCacheDir: "/tmp/ref-cache",
  sourceVideoPath: "/tmp/source.mp4",
};

describe("evaluateVideo VMAF fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default fs behavior after clearAllMocks
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(["frame_p0.png"] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ duration: 2, fps: 30 }));
  });

  // AC-5: evaluateVideo uses fallback 0.5 when vmaf unavailable
  it("uses M7=0.5 fallback when VMAF is not available", async () => {
    mockCheckVmaf.mockReturnValue(false);
    mockComputeVmaf.mockReturnValue(0.9);

    const result = await evaluateVideo(baseOpts);

    expect(result.metrics.M7).toBe(0.5);
    expect(mockComputeVmaf).not.toHaveBeenCalled();
  });

  // AC-6: evaluateVideo catches computeVmaf error and falls back
  it("catches computeVmaf error and falls back to M7=0.5", async () => {
    mockCheckVmaf.mockReturnValue(true);
    mockComputeVmaf.mockImplementation(() => {
      throw new Error("ffmpeg VMAF computation failed");
    });

    const result = await evaluateVideo(baseOpts);

    expect(result.metrics.M7).toBe(0.5);
    expect(mockComputeVmaf).toHaveBeenCalledOnce();
  });

  // Positive case: VMAF computed successfully
  it("uses actual VMAF score when available and successful", async () => {
    mockCheckVmaf.mockReturnValue(true);
    mockComputeVmaf.mockReturnValue(0.87);

    const result = await evaluateVideo(baseOpts);

    expect(result.metrics.M7).toBeCloseTo(0.87, 2);
    expect(mockComputeVmaf).toHaveBeenCalledOnce();
  });

  // No sourceVideoPath: should fallback without calling computeVmaf
  it("uses M7=0.5 when no sourceVideoPath provided", async () => {
    mockCheckVmaf.mockReturnValue(true);

    const result = await evaluateVideo({
      videoPath: "/tmp/gen.mp4",
      referenceCacheDir: "/tmp/ref-cache",
    });

    expect(result.metrics.M7).toBe(0.5);
    expect(mockComputeVmaf).not.toHaveBeenCalled();
  });
});
