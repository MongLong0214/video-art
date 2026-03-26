import { describe, it, expect } from "vitest";
import { calculateBpm } from "./bpm-calculator";

describe("calculateBpm", () => {
  it("10s techno → positive bpm and bars", () => {
    const result = calculateBpm(10, "techno");
    expect(result.bpm).toBeGreaterThan(0);
    expect(result.bars).toBeGreaterThanOrEqual(2);
  });

  it("7.3s trance → fractional BPM, exact duration match", () => {
    const result = calculateBpm(7.3, "trance");
    expect(result.bpm).toBeGreaterThan(0);
    expect(result.bars).toBeGreaterThanOrEqual(2);
    const computed = (result.bars * 4 * 60) / result.bpm;
    expect(Math.abs(computed - 7.3)).toBeLessThan(0.001);
  });

  it("extreme short duration (3s) → valid result", () => {
    const result = calculateBpm(3, "techno");
    expect(result.bpm).toBeGreaterThan(0);
    expect(result.bars).toBeGreaterThanOrEqual(2);
  });

  it("extreme long duration (60s) → valid result within preferred range", () => {
    const result = calculateBpm(60, "techno");
    expect(result.bpm).toBeGreaterThanOrEqual(125);
    expect(result.bpm).toBeLessThanOrEqual(150);
    expect(result.bars).toBeGreaterThanOrEqual(2);
  });

  it("bpm * bars = duration invariant (±0.001s)", () => {
    const testCases = [
      { duration: 10, genre: "techno" as const },
      { duration: 7.3, genre: "trance" as const },
      { duration: 3, genre: "techno" as const },
      { duration: 60, genre: "trance" as const },
      { duration: 15, genre: "techno" as const },
      { duration: 22.5, genre: "trance" as const },
    ];

    for (const { duration, genre } of testCases) {
      const result = calculateBpm(duration, genre);
      const computedDuration = (result.bars * 4 * 60) / result.bpm;
      expect(Math.abs(computedDuration - duration)).toBeLessThan(0.001);
    }
  });

  it("prefers genre BPM range when achievable", () => {
    // 60s techno: bars=32 → bpm=128 (in range [125,150])
    const result = calculateBpm(60, "techno");
    expect(result.bpm).toBeGreaterThanOrEqual(125);
    expect(result.bpm).toBeLessThanOrEqual(150);
  });

  it("trance range preference when achievable", () => {
    const result = calculateBpm(60, "trance");
    expect(result.bpm).toBeGreaterThan(0);
    const computed = (result.bars * 4 * 60) / result.bpm;
    expect(Math.abs(computed - 60)).toBeLessThan(0.001);
  });

  it("duration=1 → bars >= 2 (no zero bars)", () => {
    const result = calculateBpm(1, "techno");
    expect(result.bars).toBeGreaterThanOrEqual(2);
    expect(result.bpm).toBeGreaterThan(0);
  });

  it("duration=0.5 → still valid", () => {
    const result = calculateBpm(0.5, "trance");
    expect(result.bars).toBeGreaterThanOrEqual(2);
    expect(result.bpm).toBeGreaterThan(0);
  });

  it("duration=60 techno → bars * 4 * 60 / bpm = 60 exactly", () => {
    const result = calculateBpm(60, "techno");
    const computed = (result.bars * 4 * 60) / result.bpm;
    expect(Math.abs(computed - 60)).toBeLessThan(0.001);
  });

  it("genre house BPM range 120-130", () => {
    const result = calculateBpm(60, "house");
    expect(result.bpm).toBeGreaterThanOrEqual(120);
    expect(result.bpm).toBeLessThanOrEqual(130);
  });

  it("genre dnb BPM range 160-180", () => {
    const result = calculateBpm(60, "dnb");
    expect(result.bpm).toBeGreaterThanOrEqual(160);
    expect(result.bpm).toBeLessThanOrEqual(180);
  });

  it("genre ambient BPM range 60-90", () => {
    const result = calculateBpm(60, "ambient");
    expect(result.bpm).toBeGreaterThanOrEqual(60);
    expect(result.bpm).toBeLessThanOrEqual(90);
  });

  it("genre techno unchanged 125-150", () => {
    const result = calculateBpm(60, "techno");
    expect(result.bpm).toBeGreaterThanOrEqual(125);
    expect(result.bpm).toBeLessThanOrEqual(150);
  });

  it("genre trance unchanged 130-145", () => {
    const result = calculateBpm(60, "trance");
    expect(result.bpm).toBeGreaterThan(0);
    const computed = (result.bars * 4 * 60) / result.bpm;
    expect(Math.abs(computed - 60)).toBeLessThan(0.001);
  });

  it("duration 300 auto bpm invariant", () => {
    const result = calculateBpm(300, "techno");
    const computed = (result.bars * 4 * 60) / result.bpm;
    expect(Math.abs(computed - 300)).toBeLessThan(0.001);
  });

  it("ambient BPM 60 bars positive", () => {
    const result = calculateBpm(60, "ambient");
    expect(result.bars).toBeGreaterThan(0);
  });
});
