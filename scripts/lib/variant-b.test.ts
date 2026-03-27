/**
 * T10: Variant B (Qwen+ZoeDepth) -- TDD
 *
 * Tests for:
 * - Depth stats computation (meanDepth, depthStd)
 * - Depth tie-breaker ordering
 * - Variant B API budget enforcement
 * - Selective depth split (depthStd > threshold)
 * - No blanket depth split (depthStd <= threshold)
 * - Archive structure parity with Variant A
 * - ZoeDepth failure fallback
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import type { LayerCandidate } from "../../src/lib/scene-schema.js";

// ---------------------------------------------------------------------------
// Helpers: Create synthetic depth map and mask PNGs in temp dirs
// ---------------------------------------------------------------------------

/**
 * Creates a grayscale depth map PNG from a flat array of 0-255 values.
 * Returns the file path.
 */
async function createDepthMapPng(
  values: number[],
  width: number,
  height: number,
  dir: string,
): Promise<string> {
  const buf = Buffer.from(values);
  const fp = path.join(dir, "depth-map.png");
  await sharp(buf, { raw: { width, height, channels: 1 } }).png().toFile(fp);
  return fp;
}

/**
 * Creates an RGBA mask PNG where mask[i]=1 becomes alpha=255, mask[i]=0 becomes alpha=0.
 * RGB channels are set to 128 (gray) for non-transparent pixels.
 */
async function createMaskPng(
  mask: number[],
  width: number,
  height: number,
  dir: string,
  filename = "mask.png",
): Promise<string> {
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    if (mask[i]) {
      rgba[i * 4] = 128;
      rgba[i * 4 + 1] = 128;
      rgba[i * 4 + 2] = 128;
      rgba[i * 4 + 3] = 255;
    }
  }
  const fp = path.join(dir, filename);
  await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toFile(fp);
  return fp;
}

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "variant-b-test-"));
}

function makeCandidate(overrides: Partial<LayerCandidate> & { id: string }): LayerCandidate {
  return {
    source: "qwen-base",
    filePath: "/tmp/fake.png",
    width: 4,
    height: 4,
    coverage: 0.5,
    bbox: { x: 0, y: 0, w: 4, h: 4 },
    centroid: { x: 2, y: 2 },
    edgeDensity: 0.1,
    componentCount: 1,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test 1: should compute meanDepth for candidate
// ---------------------------------------------------------------------------
describe("Variant B depth stats", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  it("should compute meanDepth for candidate", async () => {
    const { computeDepthStats } = await import("./depth-utils.js");

    // 4x4 depth map, all pixels have known values
    // mask covers only the top-left 2x2 quadrant (indices 0,1,4,5)
    const width = 4;
    const height = 4;
    const depthValues = [
      100, 200, 0, 0,
      150, 250, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
    ];
    const mask = [
      1, 1, 0, 0,
      1, 1, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
    ];

    const depthMapPath = await createDepthMapPng(depthValues, width, height, tmpDir);
    const maskPath = await createMaskPng(mask, width, height, tmpDir);

    const candidate = makeCandidate({ id: "c1", filePath: maskPath, width, height });
    const stats = await computeDepthStats(candidate, depthMapPath);

    // masked pixels: 100, 200, 150, 250 => mean = 175
    expect(stats.meanDepth).toBeCloseTo(175, 0);
  });

  // ---------------------------------------------------------------------------
  // Test 2: should compute depthStd for candidate
  // ---------------------------------------------------------------------------
  it("should compute depthStd for candidate", async () => {
    const { computeDepthStats } = await import("./depth-utils.js");

    const width = 4;
    const height = 4;
    const depthValues = [
      100, 200, 0, 0,
      150, 250, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
    ];
    const mask = [
      1, 1, 0, 0,
      1, 1, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
    ];

    const depthMapPath = await createDepthMapPng(depthValues, width, height, tmpDir);
    const maskPath = await createMaskPng(mask, width, height, tmpDir);

    const candidate = makeCandidate({ id: "c2", filePath: maskPath, width, height });
    const stats = await computeDepthStats(candidate, depthMapPath);

    // masked pixels: 100, 200, 150, 250; mean=175
    // variance = ((100-175)^2 + (200-175)^2 + (150-175)^2 + (250-175)^2) / 4
    //          = (5625 + 625 + 625 + 5625) / 4 = 3125
    // std = sqrt(3125) ~= 55.9
    // normalized by 255: 55.9 / 255 ~= 0.219
    expect(stats.depthStd).toBeCloseTo(55.9 / 255, 2);
  });
});

// ---------------------------------------------------------------------------
// Test 3: should use depth as tie-breaker only
// ---------------------------------------------------------------------------
describe("Variant B depth tie-breaker", () => {
  it("should use depth as tie-breaker only", async () => {
    const { orderByRole } = await import("./layer-resolve.js");

    // Two candidates with the SAME role but different meanDepth
    // Lower meanDepth (0=far) should be placed behind (lower z-index)
    // NOTE: candidateB (near, 200) is passed FIRST to ensure we are not
    // relying on stable sort / input order.
    const candidateB = makeCandidate({
      id: "b",
      role: "midground",
      coverage: 0.3,
      meanDepth: 200, // near (bright)
    });
    const candidateA = makeCandidate({
      id: "a",
      role: "midground",
      coverage: 0.3,
      meanDepth: 50,  // far (dark)
    });

    const ordered = orderByRole([candidateB, candidateA]);

    // Same role + same coverage => depth tie-breaker
    // Lower meanDepth (farther) goes first (lower z-index = behind)
    expect(ordered[0].id).toBe("a");
    expect(ordered[1].id).toBe("b");
  });
});

// ---------------------------------------------------------------------------
// Test 4: should respect Variant B API budget
// ---------------------------------------------------------------------------
describe("Variant B API budget", () => {
  it("should respect Variant B API budget", async () => {
    const { VARIANT_B_API_BUDGET } = await import("./depth-utils.js");

    // Variant B: 1 qwen + 1 zoedepth + max 2 recursive = 4 total
    expect(VARIANT_B_API_BUDGET).toEqual({
      qwen: 1,
      zoedepth: 1,
      recursiveMax: 2,
      total: 4,
    });
  });
});

// ---------------------------------------------------------------------------
// Test 5: should not blanket split by depth
// ---------------------------------------------------------------------------
describe("Variant B selective depth split", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  it("should not blanket split by depth", async () => {
    const { selectiveDepthSplit, DEPTH_SPLIT_THRESHOLD } = await import("./depth-utils.js");

    // Large candidate but low depthStd (uniform depth) => no split
    const width = 4;
    const height = 4;
    // Uniform depth: all 128
    const depthValues = Array(16).fill(128);
    const mask = Array(16).fill(1);

    const depthMapPath = await createDepthMapPng(depthValues, width, height, tmpDir);
    const maskPath = await createMaskPng(mask, width, height, tmpDir);

    const candidate = makeCandidate({
      id: "no-split",
      filePath: maskPath,
      width,
      height,
      coverage: 0.8, // large candidate
      depthStd: 0.01, // very low std => below threshold
    });

    const result = await selectiveDepthSplit(candidate, depthMapPath, tmpDir);

    // No split should occur: returns the original candidate unchanged
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("no-split");
  });

  // ---------------------------------------------------------------------------
  // Test 6: should depth-split when depthStd high
  // ---------------------------------------------------------------------------
  it("should depth-split when depthStd high", async () => {
    const { selectiveDepthSplit, DEPTH_SPLIT_THRESHOLD } = await import("./depth-utils.js");

    const width = 4;
    const height = 4;
    // Bimodal depth: first 8 pixels near (200), last 8 far (50)
    const depthValues = [
      200, 200, 200, 200,
      200, 200, 200, 200,
      50, 50, 50, 50,
      50, 50, 50, 50,
    ];
    const mask = Array(16).fill(1);

    const depthMapPath = await createDepthMapPng(depthValues, width, height, tmpDir);
    const maskPath = await createMaskPng(mask, width, height, tmpDir);

    // mean = 125, variance = ((200-125)^2 * 8 + (50-125)^2 * 8) / 16 = 5625
    // std = 75, normalized = 75/255 ~= 0.294 > 0.15 threshold
    const candidate = makeCandidate({
      id: "split-me",
      filePath: maskPath,
      width,
      height,
      coverage: 0.8,
      depthStd: 75 / 255, // ~0.294, above threshold
    });

    const result = await selectiveDepthSplit(candidate, depthMapPath, tmpDir);

    // Should split into 2 sub-candidates
    expect(result.length).toBe(2);
    expect(result.every((c) => c.source === "depth-split")).toBe(true);
    expect(result.every((c) => c.parentId === "split-me")).toBe(true);
    // Each sub-candidate should have meaningful coverage
    expect(result.every((c) => c.coverage > 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test 7: should produce same archive structure as Variant A
// ---------------------------------------------------------------------------
describe("Variant B archive structure", () => {
  it("should produce same archive structure as Variant A", async () => {
    const { getVariantArchiveFiles } = await import("./depth-utils.js");

    // Both variants should produce the same set of expected files
    const variantAFiles = getVariantArchiveFiles("qwen-only");
    const variantBFiles = getVariantArchiveFiles("qwen-zoedepth");

    // Same file tree structure (layer PNGs + scene.json + manifest)
    expect(variantAFiles.sort()).toEqual(variantBFiles.sort());
  });
});

// ---------------------------------------------------------------------------
// Test 8: should fallback to qwen-only on ZoeDepth failure
// ---------------------------------------------------------------------------
describe("Variant B ZoeDepth fallback", () => {
  it("should fallback to qwen-only on ZoeDepth failure", async () => {
    const { runVariantB } = await import("./depth-utils.js");

    // Mock ZoeDepth to reject
    const mockGetDepthMap = vi.fn().mockRejectedValue(new Error("ZoeDepth API down"));
    const mockGetQwenLayers = vi.fn().mockResolvedValue([
      // Return a tiny 2x2 RGBA buffer (opaque white)
      await sharp(
        Buffer.from([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]),
        { raw: { width: 2, height: 2, channels: 4 } },
      ).png().toBuffer(),
    ]);

    const tmpDir = makeTempDir();
    const inputPath = path.join(tmpDir, "input.png");
    // Create a 2x2 white input image
    await sharp(
      Buffer.from([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]),
      { raw: { width: 2, height: 2, channels: 4 } },
    ).png().toFile(inputPath);

    const result = await runVariantB(inputPath, tmpDir, {
      getDepthMap: mockGetDepthMap,
      getQwenLayers: mockGetQwenLayers,
    });

    // ZoeDepth failed => should still produce layers from qwen-only (fallback)
    expect(result.method).toBe("qwen-only-fallback");
    expect(result.files.length).toBeGreaterThan(0);
    // ZoeDepth was called but failed
    expect(mockGetDepthMap).toHaveBeenCalledTimes(1);
    // Qwen was still used
    expect(mockGetQwenLayers).toHaveBeenCalledTimes(1);
  });
});
