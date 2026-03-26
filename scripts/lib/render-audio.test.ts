import { describe, it, expect, afterEach } from "vitest";
import { generateConfig, acquireLock, releaseLock, checkDiskSpace } from "./render-audio-utils.js";
import { existsSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

describe("render-audio-utils", () => {
  const tmpLock = join(import.meta.dirname, ".test-lock");

  afterEach(() => {
    try { unlinkSync(tmpLock); } catch { /* ignore */ }
  });

  it("generateConfig — default techno from scene without audio", () => {
    const config = generateConfig({ duration: 10 }, "/tmp/out");
    expect(config.duration).toBe(10);
    expect(config.bpm).toBeGreaterThan(0);
    expect(config.bars).toBeGreaterThanOrEqual(2);
    expect(config.genre).toBe("techno");
    expect(config.key).toBe("Am");
    expect(config.scale).toBe("minor");
    expect(config.energy).toBe(0.7);
    expect(config.outputDir).toBe("/tmp/out");
  });

  it("generateConfig — with audio override", () => {
    const config = generateConfig(
      { duration: 30, audio: { bpm: 140, genre: "trance", key: "Cm", energy: 0.9 } },
      "/tmp/out",
    );
    expect(config.bpm).toBe(140);
    expect(config.genre).toBe("trance");
    expect(config.key).toBe("Cm");
    expect(config.energy).toBe(0.9);
  });

  it("generateConfig — config contains duration/bpm/key/scale fields", () => {
    const config = generateConfig({ duration: 15 }, "/tmp/out");
    expect(config).toHaveProperty("duration");
    expect(config).toHaveProperty("bpm");
    expect(config).toHaveProperty("key");
    expect(config).toHaveProperty("scale");
    expect(config).toHaveProperty("genre");
    expect(config).toHaveProperty("bars");
  });

  it("acquireLock — creates lock file", () => {
    acquireLock(tmpLock);
    expect(existsSync(tmpLock)).toBe(true);
  });

  it("acquireLock — throws if already locked", () => {
    writeFileSync(tmpLock, "12345");
    expect(() => acquireLock(tmpLock)).toThrow("already in progress");
  });

  it("releaseLock — removes lock file", () => {
    writeFileSync(tmpLock, "12345");
    releaseLock(tmpLock);
    expect(existsSync(tmpLock)).toBe(false);
  });

  it("checkDiskSpace — does not throw when enough space", () => {
    expect(() => checkDiskSpace("/tmp", 1024)).not.toThrow();
  });

  it("checkDiskSpace — does not throw for missing dir", () => {
    expect(() => checkDiskSpace("/tmp/nonexistent-dir-xyz", 1024)).not.toThrow();
  });

  it("checkDiskSpace — throws when requesting absurd space", () => {
    expect(() => checkDiskSpace("/tmp", Number.MAX_SAFE_INTEGER)).toThrow("Insufficient");
  });

  it("generateConfig — manual bpm still satisfies duration invariant", () => {
    const config = generateConfig(
      { duration: 10, audio: { bpm: 140 } },
      "/tmp/out",
    );
    const computedDuration = (config.bars * 4 * 60) / config.bpm;
    expect(Math.abs(computedDuration - 10)).toBeLessThan(0.5);
  });

  it("generateConfig — auto bpm satisfies strict invariant", () => {
    const config = generateConfig({ duration: 10 }, "/tmp/out");
    const computedDuration = (config.bars * 4 * 60) / config.bpm;
    expect(Math.abs(computedDuration - 10)).toBeLessThan(0.001);
  });
});
