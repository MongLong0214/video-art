import { describe, it, expect, vi, beforeEach } from "vitest";
import { prepareReference } from "./prepare.js";

vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof import("fs")>("fs");
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    rmSync: vi.fn(),
  };
});
vi.mock("./frame-extractor", () => ({
  calcProportionalTimestamps: vi.fn(() => [0, 1, 2]),
  calcTemporalPairTimestamps: vi.fn(() => [[2.5, 2.533], [5.0, 5.033], [7.5, 7.533]]),
  getVideoMetadata: vi.fn(() => ({ width: 1080, height: 1080, fps: 30, duration: 10 })),
  extractSingleFrame: vi.fn(),
  checkFfmpegAvailable: vi.fn(() => true),
}));
vi.mock("./contract.js", () => ({
  REFERENCE_CACHE_DIR: ".cache/research/reference",
  REFERENCE_METADATA_PATH: ".cache/research/reference/metadata.json",
  REFERENCE_INPUT_PATH: ".cache/research/reference/input.png",
  computeFileFingerprint: vi.fn(() => "fingerprint-123"),
}));

import { existsSync, readFileSync, rmSync, writeFileSync } from "fs";
import { extractSingleFrame, checkFfmpegAvailable } from "./frame-extractor.js";
import { computeFileFingerprint } from "./contract.js";

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

    // 3 keyframes + 6 temporal pair frames + 1 canonical input frame
    expect(vi.mocked(extractSingleFrame).mock.calls.length).toBeGreaterThanOrEqual(10);
  });

  it("skips existing frame files", () => {
    vi.mocked(existsSync).mockReturnValue(true); // all exist
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        sourcePath: "/test.mp4",
        sourceFingerprint: "fingerprint-123",
        researchInputPath: ".cache/research/reference/input.png",
        researchInputFingerprint: "fingerprint-123",
      }),
    );
    vi.mocked(checkFfmpegAvailable).mockReturnValue(true);

    prepareReference("/test.mp4");

    expect(vi.mocked(extractSingleFrame)).not.toHaveBeenCalled();
  });

  it("writes metadata.json", () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      if (String(p).endsWith(".mp4")) return true;
      return true; // frames exist (skip extraction)
    });
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        sourcePath: "/different.mp4",
        sourceFingerprint: "stale-fingerprint",
        researchInputPath: ".cache/research/reference/input.png",
        researchInputFingerprint: "stale-fingerprint",
      }),
    );
    vi.mocked(checkFfmpegAvailable).mockReturnValue(true);

    prepareReference("/test.mp4");

    expect(vi.mocked(writeFileSync)).toHaveBeenCalledWith(
      expect.stringContaining("metadata.json"),
      expect.stringContaining("duration"),
    );
    expect(vi.mocked(writeFileSync)).toHaveBeenCalledWith(
      expect.stringContaining("metadata.json"),
      expect.stringContaining("sourceFingerprint"),
    );
    expect(vi.mocked(writeFileSync)).toHaveBeenCalledWith(
      expect.stringContaining("metadata.json"),
      expect.stringContaining("researchInputFingerprint"),
    );
  });

  it("refreshes cached frames when the source fingerprint changes", () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      if (String(p).endsWith(".mp4")) return true;
      return true;
    });
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        sourcePath: "/test.mp4",
        sourceFingerprint: "old-fingerprint",
        researchInputPath: ".cache/research/reference/input.png",
        researchInputFingerprint: "old-fingerprint",
      }),
    );

    prepareReference("/test.mp4");

    expect(vi.mocked(computeFileFingerprint)).toHaveBeenCalledWith("/test.mp4");
    expect(vi.mocked(rmSync)).toHaveBeenCalledWith(
      ".cache/research/reference",
      { recursive: true, force: true },
    );
    expect(vi.mocked(extractSingleFrame)).toHaveBeenCalled();
  });
});
