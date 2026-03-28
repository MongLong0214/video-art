import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseVmafJson, normalizeVmafScore } from "./vmaf.js";

// Mock child_process for checkVmafAvailable and computeVmaf tests
vi.mock("child_process", () => ({
  execFileSync: vi.fn(),
}));

// Mock fs for computeVmaf file read/cleanup
vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  existsSync: vi.fn(() => true),
}));

// Import after mocks are set up
import { execFileSync } from "child_process";
import { readFileSync, unlinkSync } from "fs";
import { checkVmafAvailable, computeVmaf } from "./vmaf.js";

const mockExecFileSync = vi.mocked(execFileSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockUnlinkSync = vi.mocked(unlinkSync);

describe("parseVmafJson", () => {
  it("extracts mean VMAF score from ffmpeg JSON output", () => {
    const json = JSON.stringify({
      pooled_metrics: { vmaf: { mean: 85.432 } },
    });
    expect(parseVmafJson(json)).toBeCloseTo(85.432, 2);
  });

  it("handles nested log format", () => {
    const json = JSON.stringify({
      pooled_metrics: { vmaf: { mean: 92.1 } },
      frames: [],
    });
    expect(parseVmafJson(json)).toBeCloseTo(92.1, 1);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseVmafJson("not json")).toThrow();
  });

  it("throws on missing vmaf key", () => {
    expect(() => parseVmafJson(JSON.stringify({ pooled_metrics: {} }))).toThrow();
  });
});

describe("normalizeVmafScore", () => {
  it("normalizes 85 to 0.85", () => {
    expect(normalizeVmafScore(85)).toBeCloseTo(0.85, 2);
  });

  it("clamps 105 to 1.0", () => {
    expect(normalizeVmafScore(105)).toBe(1.0);
  });

  it("clamps -5 to 0.0", () => {
    expect(normalizeVmafScore(-5)).toBe(0.0);
  });

  it("normalizes 0 to 0.0", () => {
    expect(normalizeVmafScore(0)).toBe(0.0);
  });
});

// AC-1: checkVmafAvailable returns true when libvmaf present
describe("checkVmafAvailable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when libvmaf present in ffmpeg filters output", () => {
    mockExecFileSync.mockReturnValue(
      "T.. libvmaf            Calculate the VMAF between two video streams.\n" as unknown as Buffer,
    );
    expect(checkVmafAvailable()).toBe(true);
    expect(mockExecFileSync).toHaveBeenCalledWith(
      "ffmpeg",
      ["-filters"],
      expect.objectContaining({ encoding: "utf-8" }),
    );
  });

  // AC-2: checkVmafAvailable returns false when libvmaf absent
  it("returns false when libvmaf absent from ffmpeg filters output", () => {
    mockExecFileSync.mockReturnValue(
      "T.. scale            Scale the input video size.\n" as unknown as Buffer,
    );
    expect(checkVmafAvailable()).toBe(false);
  });

  it("returns false when ffmpeg not installed (execFileSync throws)", () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error("ENOENT: ffmpeg not found");
    });
    expect(checkVmafAvailable()).toBe(false);
  });
});

// AC-3, AC-7: computeVmaf returns normalized 0-1 score via JSON parse
describe("computeVmaf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns normalized 0-1 score from ffmpeg VMAF JSON output", () => {
    // First call: checkVmafAvailable (ffmpeg -filters)
    // Second call: actual ffmpeg VMAF computation
    mockExecFileSync
      .mockReturnValueOnce("T.. libvmaf" as unknown as Buffer) // checkVmafAvailable
      .mockReturnValueOnce("" as unknown as Buffer); // ffmpeg VMAF run

    const vmafJson = JSON.stringify({
      pooled_metrics: { vmaf: { mean: 85.3 } },
    });
    mockReadFileSync.mockReturnValue(vmafJson);
    mockUnlinkSync.mockReturnValue(undefined);

    const score = computeVmaf("/ref.mp4", "/gen.mp4");
    expect(score).toBeCloseTo(0.853, 3);
  });

  it("returns 1.0 for perfect VMAF score of 100", () => {
    mockExecFileSync
      .mockReturnValueOnce("T.. libvmaf" as unknown as Buffer)
      .mockReturnValueOnce("" as unknown as Buffer);

    mockReadFileSync.mockReturnValue(
      JSON.stringify({ pooled_metrics: { vmaf: { mean: 100 } } }),
    );
    mockUnlinkSync.mockReturnValue(undefined);

    expect(computeVmaf("/ref.mp4", "/gen.mp4")).toBe(1.0);
  });

  // AC-4 (partial): computeVmaf throws when libvmaf not available
  it("throws when libvmaf not available", () => {
    mockExecFileSync.mockReturnValue("T.. scale" as unknown as Buffer);
    expect(() => computeVmaf("/ref.mp4", "/gen.mp4")).toThrow("libvmaf not available");
  });

  // AC-4: computeVmaf throws on ffmpeg failure during computation
  it("throws on ffmpeg failure during VMAF computation", () => {
    mockExecFileSync
      .mockReturnValueOnce("T.. libvmaf" as unknown as Buffer) // checkVmafAvailable passes
      .mockImplementationOnce(() => {
        throw new Error("ffmpeg exited with code 1");
      }); // ffmpeg VMAF run fails

    expect(() => computeVmaf("/ref.mp4", "/gen.mp4")).toThrow("ffmpeg exited with code 1");
  });

  it("cleans up temp file on success", () => {
    mockExecFileSync
      .mockReturnValueOnce("T.. libvmaf" as unknown as Buffer)
      .mockReturnValueOnce("" as unknown as Buffer);

    mockReadFileSync.mockReturnValue(
      JSON.stringify({ pooled_metrics: { vmaf: { mean: 70 } } }),
    );
    mockUnlinkSync.mockReturnValue(undefined);

    computeVmaf("/ref.mp4", "/gen.mp4");
    expect(mockUnlinkSync).toHaveBeenCalled();
  });
});
