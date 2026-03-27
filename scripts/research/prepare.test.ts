import { describe, it, expect, vi, beforeEach } from "vitest";
import { prepareReference } from "./prepare";

vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof import("fs")>("fs");
  return { ...actual, existsSync: vi.fn(), mkdirSync: vi.fn(), writeFileSync: vi.fn() };
});
vi.mock("./frame-extractor", () => ({
  calcProportionalTimestamps: vi.fn(() => [0, 1, 2]),
  calcTemporalPairTimestamps: vi.fn(() => [[2.5, 2.533], [5.0, 5.033], [7.5, 7.533]]),
  getVideoMetadata: vi.fn(() => ({ width: 1080, height: 1080, fps: 30, duration: 10 })),
  extractSingleFrame: vi.fn(),
  checkFfmpegAvailable: vi.fn(() => true),
}));

import { existsSync, writeFileSync } from "fs";
import { extractSingleFrame, checkFfmpegAvailable } from "./frame-extractor";

beforeEach(() => { vi.clearAllMocks(); });

describe("prepareReference", () => {
  it("throws when source file not found", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    expect(() => prepareReference("/nonexistent.mp4")).toThrow("Source video not found");
  });

  it("throws when ffmpeg not available", () => {
    vi.mocked(existsSync).mockImplementation((p) => String(p).endsWith(".mp4"));
    vi.mocked(checkFfmpegAvailable).mockReturnValue(false);
    expect(() => prepareReference("/test.mp4")).toThrow("ffmpeg not found");
  });

  it("extracts keyframes and temporal pairs", () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      if (String(p).endsWith(".mp4")) return true;
      return false; // frames don't exist yet
    });
    vi.mocked(checkFfmpegAvailable).mockReturnValue(true);

    prepareReference("/test.mp4");

    // 3 keyframes + 6 temporal pair frames = 9 extractSingleFrame calls
    expect(vi.mocked(extractSingleFrame).mock.calls.length).toBeGreaterThanOrEqual(9);
  });

  it("skips existing frame files", () => {
    vi.mocked(existsSync).mockReturnValue(true); // all exist
    vi.mocked(checkFfmpegAvailable).mockReturnValue(true);

    prepareReference("/test.mp4");

    expect(vi.mocked(extractSingleFrame)).not.toHaveBeenCalled();
  });

  it("writes metadata.json", () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      if (String(p).endsWith(".mp4")) return true;
      return true; // frames exist (skip extraction)
    });
    vi.mocked(checkFfmpegAvailable).mockReturnValue(true);

    prepareReference("/test.mp4");

    expect(vi.mocked(writeFileSync)).toHaveBeenCalledWith(
      expect.stringContaining("metadata.json"),
      expect.stringContaining("duration"),
    );
  });
});
