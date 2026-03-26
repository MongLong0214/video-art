import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateSamplePath, generateBootConfig } from "./superdirt-utils";
import * as fs from "node:fs";
import * as path from "node:path";

vi.mock("node:fs");

const PROJECT_ROOT = path.resolve(import.meta.dirname, "../..");
const SAMPLES_DIR = path.join(PROJECT_ROOT, "audio", "samples");

describe("validateSamplePath", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("allows audio/samples subdir", () => {
    const samplePath = path.join(SAMPLES_DIR, "kicks", "kick01.wav");
    vi.mocked(fs.realpathSync).mockReturnValue(samplePath);
    expect(validateSamplePath(samplePath, PROJECT_ROOT)).toBe(true);
  });

  it("blocks traversal", () => {
    const traversalPath = path.join(SAMPLES_DIR, "..", "..", "etc", "passwd");
    vi.mocked(fs.realpathSync).mockReturnValue("/etc/passwd");
    expect(validateSamplePath(traversalPath, PROJECT_ROOT)).toBe(false);
  });

  it("blocks absolute path outside samples", () => {
    vi.mocked(fs.realpathSync).mockReturnValue("/etc/passwd");
    expect(validateSamplePath("/etc/passwd", PROJECT_ROOT)).toBe(false);
  });

  it("blocks symlink escape", () => {
    const symlinkPath = path.join(SAMPLES_DIR, "evil-link");
    vi.mocked(fs.realpathSync).mockReturnValue("/usr/local/secret");
    expect(validateSamplePath(symlinkPath, PROJECT_ROOT)).toBe(false);
  });
});

describe("generateBootConfig", () => {
  const PHASE_A_SYNTHDEFS = [
    "kick", "bass", "hat", "clap", "supersaw", "pad", "lead", "arp_pluck", "riser",
  ];

  it("includes all 9 synthdefs", () => {
    const config = generateBootConfig(PROJECT_ROOT);
    for (const name of PHASE_A_SYNTHDEFS) {
      expect(config.synthDefNames).toContain(name);
    }
    expect(config.synthDefNames).toHaveLength(9);
  });

  it("sets 8 orbits", () => {
    const config = generateBootConfig(PROJECT_ROOT);
    expect(config.numOrbits).toBe(8);
  });

  it("includes samples directory path", () => {
    const config = generateBootConfig(PROJECT_ROOT);
    expect(config.samplesDir).toBe(SAMPLES_DIR);
  });

  it("includes synthdefs directory path", () => {
    const config = generateBootConfig(PROJECT_ROOT);
    expect(config.synthDefsDir).toContain("audio/sc/synthdefs");
  });
});
