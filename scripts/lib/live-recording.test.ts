import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateRecordPath,
  sanitizeTitle,
  checkDiskSpace,
  LiveRecording,
} from "./live-recording";

describe("generateRecordPath", () => {
  it("formats date correctly", () => {
    const result = generateRecordPath("/project", "untitled", new Date("2026-03-26"));
    expect(result).toContain("2026-03-26");
    expect(result).toContain("live-recording.wav");
    expect(result).toContain("out/audio/");
  });

  it("sanitizes title with special chars", () => {
    expect(sanitizeTitle("my live / set #1")).toBe("my-live---set--1");
  });

  it("sanitizes empty title to untitled", () => {
    expect(sanitizeTitle("")).toBe("untitled");
  });
});

describe("checkDiskSpace", () => {
  it("returns true when sufficient", () => {
    const result = checkDiskSpace(10_000_000_000, 1_000_000_000);
    expect(result).toBe(true);
  });

  it("returns false when insufficient (< 2x estimate)", () => {
    const result = checkDiskSpace(500_000_000, 1_000_000_000);
    expect(result).toBe(false);
  });
});

describe("LiveRecording", () => {
  let recording: LiveRecording;
  let onRecordingChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    onRecordingChange = vi.fn();
    recording = new LiveRecording({
      projectRoot: "/fake/project",
      onRecordingChange,
    });
  });

  it("starts recording — state recording", () => {
    recording.start();
    expect(recording.getState()).toBe("recording");
  });

  it("stops recording — state stopped", () => {
    recording.start();
    recording.stop();
    expect(recording.getState()).toBe("stopped");
  });

  it("notifies orchestrator on start", () => {
    recording.start();
    expect(onRecordingChange).toHaveBeenCalledWith(true);
  });

  it("notifies orchestrator on stop", () => {
    recording.start();
    recording.stop();
    expect(onRecordingChange).toHaveBeenCalledWith(false);
  });

  it("start sends correct format (48kHz, WAV, float)", () => {
    const config = recording.getRecordConfig();
    expect(config.sampleRate).toBe(48000);
    expect(config.format).toBe("WAV");
    expect(config.sampleFormat).toBe("float");
  });

  it("disk monitor stops recording on low space", () => {
    recording.start();
    recording.handleLowDiskSpace();
    expect(recording.getState()).toBe("stopped");
    expect(onRecordingChange).toHaveBeenCalledWith(false);
  });
});
