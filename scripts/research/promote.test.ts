import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadBaseline, promoteBaseline, type BaselineRecord } from "./promote";

vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof import("fs")>("fs");
  return { ...actual, existsSync: vi.fn(), readFileSync: vi.fn(), writeFileSync: vi.fn(), mkdirSync: vi.fn() };
});

import { existsSync, readFileSync, writeFileSync } from "fs";

beforeEach(() => { vi.clearAllMocks(); });

describe("loadBaseline", () => {
  it("returns null when file missing", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    expect(loadBaseline()).toBeNull();
  });

  it("returns parsed record when file exists", () => {
    const record: BaselineRecord = {
      config: { numLayers: 4 },
      qualityScore: 0.65,
      modelVersion: "v1",
      promotedAt: "2026-03-27T00:00:00Z",
    };
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(record));
    const result = loadBaseline();
    expect(result?.qualityScore).toBe(0.65);
    expect(result?.modelVersion).toBe("v1");
  });
});

describe("promoteBaseline", () => {
  it("creates baseline with correct fields", () => {
    vi.mocked(existsSync).mockReturnValue(false); // no previous, no config file
    const result = promoteBaseline("config.ts", 0.72, "v2");
    expect(result.qualityScore).toBe(0.72);
    expect(result.modelVersion).toBe("v2");
    expect(result.promotedAt).toBeTruthy();
    expect(result.previous).toBeUndefined();
  });

  it("preserves previous baseline in history chain", () => {
    const previous: BaselineRecord = {
      config: { numLayers: 4 },
      qualityScore: 0.65,
      modelVersion: "v1",
      promotedAt: "2026-03-27T00:00:00Z",
    };
    vi.mocked(existsSync).mockImplementation((p) => {
      if (String(p).includes("baseline-config")) return true;
      return false;
    });
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(previous));

    const result = promoteBaseline("config.ts", 0.72, "v2");
    expect(result.previous?.qualityScore).toBe(0.65);
    expect(result.previous?.modelVersion).toBe("v1");
  });

  it("writes JSON to baseline-config.json", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    promoteBaseline("config.ts", 0.72, "v2");
    expect(vi.mocked(writeFileSync)).toHaveBeenCalledWith(
      expect.stringContaining("baseline-config.json"),
      expect.stringContaining("0.72"),
    );
  });

  it("uses default config when config file missing", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const result = promoteBaseline("/nonexistent.ts", 0.5, "v1");
    expect(result.config).toBeTruthy();
    expect(Object.keys(result.config).length).toBeGreaterThan(10);
  });
});
