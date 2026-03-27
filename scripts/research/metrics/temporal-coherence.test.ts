import { describe, it, expect } from "vitest";
import {
  consecutiveSsim,
  flickerScore,
  computeTemporalCoherence,
} from "./temporal-coherence";

function solidChannel(w: number, h: number, val: number): Float64Array {
  return new Float64Array(w * h).fill(val);
}

function noisyChannel(w: number, h: number, base: number, seed: number): Float64Array {
  const arr = new Float64Array(w * h);
  let s = seed;
  for (let i = 0; i < arr.length; i++) {
    s = (s * 16807 + 0) % 2147483647;
    arr[i] = base + (s / 2147483647) * 20 - 10;
  }
  return arr;
}

describe("consecutiveSsim", () => {
  it("returns 1.0 for identical frames", () => {
    const frame = solidChannel(64, 64, 128);
    expect(consecutiveSsim(frame, frame, 64, 64)).toBeCloseTo(1.0, 2);
  });

  it("returns < 1.0 for different frames", () => {
    const a = solidChannel(64, 64, 100);
    const b = solidChannel(64, 64, 200);
    expect(consecutiveSsim(a, b, 64, 64)).toBeLessThan(1.0);
  });
});

describe("flickerScore", () => {
  it("returns ~1.0 for stable (identical) frames", () => {
    const frame = noisyChannel(64, 64, 128, 42);
    expect(flickerScore(frame, frame, 64, 64)).toBeCloseTo(1.0, 2);
  });

  it("returns low score for alternating black/white", () => {
    const black = solidChannel(64, 64, 0);
    const white = solidChannel(64, 64, 255);
    const score = flickerScore(black, white, 64, 64);
    expect(score).toBeLessThan(0.3);
  });

  it("returns 0-1 range", () => {
    const a = noisyChannel(64, 64, 100, 1);
    const b = noisyChannel(64, 64, 150, 2);
    const score = flickerScore(a, b, 64, 64);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe("computeTemporalCoherence (M8)", () => {
  it("returns 1.0 for identical frame pairs", () => {
    const frame = noisyChannel(64, 64, 128, 42);
    const pairs: [Float64Array, Float64Array][] = [
      [frame, frame],
      [frame, frame],
      [frame, frame],
    ];
    expect(computeTemporalCoherence(pairs, 64, 64)).toBeCloseTo(1.0, 1);
  });

  it("returns low for unstable pairs", () => {
    const a = solidChannel(64, 64, 0);
    const b = solidChannel(64, 64, 255);
    const pairs: [Float64Array, Float64Array][] = [
      [a, b], [b, a], [a, b],
    ];
    const score = computeTemporalCoherence(pairs, 64, 64);
    expect(score).toBeLessThan(0.5);
  });

  it("returns 0-1 range", () => {
    const a = noisyChannel(64, 64, 100, 1);
    const b = noisyChannel(64, 64, 120, 2);
    const pairs: [Float64Array, Float64Array][] = [[a, b]];
    const score = computeTemporalCoherence(pairs, 64, 64);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
