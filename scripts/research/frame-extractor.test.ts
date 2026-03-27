import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calcProportionalTimestamps,
  calcTemporalPairTimestamps,
  buildFfmpegExtractArgs,
  parseVideoMetadata,
  normalizeFramePair,
} from "./frame-extractor.js";

describe("calcProportionalTimestamps", () => {
  it("returns 10 timestamps for 10s video at 1fps", () => {
    const ts = calcProportionalTimestamps(10, 1);
    expect(ts).toHaveLength(10);
    expect(ts[0]).toBe(0);
    expect(ts[9]).toBe(9);
  });

  it("returns 20 timestamps for 20s video at 1fps", () => {
    const ts = calcProportionalTimestamps(20, 1);
    expect(ts).toHaveLength(20);
    expect(ts[0]).toBe(0);
    expect(ts[19]).toBe(19);
  });

  it("returns empty array for 0s video", () => {
    const ts = calcProportionalTimestamps(0, 1);
    expect(ts).toHaveLength(0);
  });

  it("handles fractional durations", () => {
    const ts = calcProportionalTimestamps(5.5, 1);
    expect(ts.length).toBeGreaterThanOrEqual(5);
    expect(ts[0]).toBe(0);
  });
});

describe("calcTemporalPairTimestamps", () => {
  it("returns 3 pairs (6 timestamps) for 10s video", () => {
    const pairs = calcTemporalPairTimestamps(10, 30);
    expect(pairs).toHaveLength(3);
    for (const pair of pairs) {
      expect(pair).toHaveLength(2);
      expect(pair[1] - pair[0]).toBeCloseTo(1 / 30, 2);
    }
  });

  it("places pairs at 25%, 50%, 75% of duration", () => {
    const pairs = calcTemporalPairTimestamps(10, 30);
    expect(pairs[0][0]).toBeCloseTo(2.5, 1);
    expect(pairs[1][0]).toBeCloseTo(5.0, 1);
    expect(pairs[2][0]).toBeCloseTo(7.5, 1);
  });

  it("adapts frame gap to fps", () => {
    const pairs60 = calcTemporalPairTimestamps(20, 60);
    expect(pairs60[0][1] - pairs60[0][0]).toBeCloseTo(1 / 60, 3);
  });
});

describe("buildFfmpegExtractArgs", () => {
  it("builds correct ffmpeg args for a timestamp", () => {
    const args = buildFfmpegExtractArgs("/input.mp4", "/out/frame.png", 5.0);
    expect(args).toContain("-ss");
    expect(args).toContain("5");
    expect(args).toContain("-frames:v");
    expect(args).toContain("1");
    expect(args[args.length - 1]).toBe("/out/frame.png");
  });
});

describe("parseVideoMetadata", () => {
  it("parses ffprobe JSON correctly", () => {
    const ffprobeOutput = JSON.stringify({
      streams: [
        {
          codec_type: "video",
          width: 1080,
          height: 1080,
          r_frame_rate: "30/1",
          duration: "10.000000",
        },
      ],
      format: { duration: "10.000000" },
    });
    const meta = parseVideoMetadata(ffprobeOutput);
    expect(meta.width).toBe(1080);
    expect(meta.height).toBe(1080);
    expect(meta.fps).toBe(30);
    expect(meta.duration).toBe(10);
  });

  it("handles fractional fps like 29.97", () => {
    const ffprobeOutput = JSON.stringify({
      streams: [
        {
          codec_type: "video",
          width: 1920,
          height: 1080,
          r_frame_rate: "30000/1001",
          duration: "20.000000",
        },
      ],
      format: { duration: "20.000000" },
    });
    const meta = parseVideoMetadata(ffprobeOutput);
    expect(meta.fps).toBeCloseTo(29.97, 1);
  });
});

describe("normalizeFramePair", () => {
  function makeBuffer(w: number, h: number, channels = 3): Buffer {
    return Buffer.alloc(w * h * channels, 128);
  }

  it("returns unchanged dimensions for same-size frames", async () => {
    const ref = { data: makeBuffer(100, 100), width: 100, height: 100 };
    const gen = { data: makeBuffer(100, 100), width: 100, height: 100 };
    const [normRef, normGen] = await normalizeFramePair(ref, gen);
    expect(normRef.width).toBe(100);
    expect(normGen.width).toBe(100);
  });

  it("resizes to smaller side when resolutions differ", async () => {
    const ref = { data: makeBuffer(100, 100), width: 100, height: 100 };
    const gen = { data: makeBuffer(200, 200), width: 200, height: 200 };
    const [normRef, normGen] = await normalizeFramePair(ref, gen);
    expect(normRef.width).toBe(100);
    expect(normGen.width).toBe(100);
  });

  it("center crops when aspect ratios differ", async () => {
    const ref = { data: makeBuffer(100, 100), width: 100, height: 100 };
    const gen = { data: makeBuffer(200, 100), width: 200, height: 100 };
    const [normRef, normGen] = await normalizeFramePair(ref, gen);
    expect(normRef.width).toBe(normGen.width);
    expect(normRef.height).toBe(normGen.height);
  });

  it("caps at 2048px", async () => {
    const ref = { data: makeBuffer(4096, 4096), width: 4096, height: 4096 };
    const gen = { data: makeBuffer(4096, 4096), width: 4096, height: 4096 };
    const [normRef, normGen] = await normalizeFramePair(ref, gen);
    expect(normRef.width).toBeLessThanOrEqual(2048);
    expect(normGen.width).toBeLessThanOrEqual(2048);
  });
});
