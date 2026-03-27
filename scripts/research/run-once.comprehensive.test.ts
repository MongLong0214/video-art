import { describe, it, expect } from "vitest";
import { makeKeepDecision, formatTsvRow, parseTsvHeader, formatConsoleOutput, countExperiments } from "./run-once.js";
import { computeStats, computeDeltaMin, buildCalibrationResult } from "./calibrate.js";
import { CrashCounter, BudgetTracker } from "./git-automation.js";
import { parseTsvRows, computeReportStats } from "./report.js";
import { ResearchConfigSchema, getDefaultConfig } from "./research-config.js";

// ── Keep/Discard Decision Matrix ───────────────────────────

describe("makeKeepDecision matrix", () => {
  const cases: [boolean, number, number, number, "keep" | "discard"][] = [
    // gate, score, baseline, δ_min, expected
    [true, 0.80, 0.70, 0.02, "keep"],
    [true, 0.72, 0.70, 0.02, "keep"],        // at exact boundary (>= now)
    [true, 0.721, 0.70, 0.02, "keep"],       // just above
    [false, 0.90, 0.70, 0.02, "discard"],    // gate fail
    [true, 0.70, 0.70, 0.02, "discard"],     // equal
    [true, 0.69, 0.70, 0.02, "discard"],     // worse
    [true, 0.50, 0.49, 0.005, "keep"],       // tight margin
    [true, 0.495, 0.49, 0.005, "keep"],      // at boundary (>= now)
    [true, 1.00, 0.99, 0.005, "keep"],       // near ceiling
    [true, 0.001, 0.00, 0.0005, "keep"],     // near floor
    [false, 1.00, 0.00, 0.00, "discard"],    // gate blocks
  ];

  it.each(cases)("gate=%s score=%d base=%d δ=%d → %s", (gate, score, base, delta, expected) => {
    expect(makeKeepDecision(gate, score, base, delta)).toBe(expected);
  });
});

// ── TSV Format Comprehensive ───────────────────────────────

describe("formatTsvRow comprehensive", () => {
  it("handles zero scores", () => {
    const row = formatTsvRow({
      commit: "0000000", qualityScore: 0, gatePassed: false,
      metrics: { M1: 0, M2: 0, M3: 0, M4: 0, M5: 0, M6: 0, M7: 0, M8: 0, M9: 0, M10: 0 },
      modelVersion: "v0", elapsedMs: 0, status: "crash", description: "OOM",
    });
    expect(row.split("\t")[1]).toBe("0.0000");
    expect(row.split("\t")[2]).toBe("0");
    expect(row.split("\t")[15]).toBe("crash");
  });

  it("handles description with special chars", () => {
    const row = formatTsvRow({
      commit: "abc", qualityScore: 0.5, gatePassed: true,
      metrics: { M1: 0.5, M2: 0.5, M3: 0.5, M4: 0.5, M5: 0.5, M6: 0.5, M7: 0.5, M8: 0.5, M9: 0.5, M10: 0.5 },
      modelVersion: "v1", elapsedMs: 100, status: "keep", description: "test, with commas & symbols",
    });
    // Tab-separated means commas in description are fine
    expect(row.split("\t")[16]).toBe("test, with commas & symbols");
  });

  it("all metrics appear in order", () => {
    const row = formatTsvRow({
      commit: "x", qualityScore: 0.5, gatePassed: true,
      metrics: { M1: 0.1, M2: 0.2, M3: 0.3, M4: 0.4, M5: 0.5, M6: 0.6, M7: 0.7, M8: 0.8, M9: 0.9, M10: 1.0 },
      modelVersion: "v1", elapsedMs: 100, status: "keep", description: "ordered",
    });
    const cols = row.split("\t");
    expect(cols[3]).toBe("0.1000"); // M1
    expect(cols[12]).toBe("1.0000"); // M10
  });
});

// ── Console Output Format ──────────────────────────────────

describe("formatConsoleOutput comprehensive", () => {
  it.each([
    [1, 0.5, "keep", 0.1, 1000, "[exp #1]"],
    [100, 0.9999, "keep", 0.0001, 50000, "[exp #100]"],
    [1, 0.0, "discard", -0.5, 100, "[exp #1]"],
    [50, 0.0, "crash", 0.0, 0, "[exp #50]"],
  ] as [number, number, string, number, number, string][])("exp #%d formats correctly", (num, score, status, delta, ms, expectedPrefix) => {
    const out = formatConsoleOutput(num, score, status, delta, ms);
    expect(out).toContain(expectedPrefix);
    expect(out).toContain(status);
  });
});

// ── Count Experiments ──────────────────────────────────────

describe("countExperiments comprehensive", () => {
  it.each([
    ["", 0],
    ["h\n", 0],
    ["h\nr1\n", 1],
    ["h\nr1\nr2\nr3\n", 3],
    ["h\n" + "r\n".repeat(100), 100],
    ["h\n" + "r\n".repeat(1000), 1000],
  ] as [string, number][])("content with %d rows → %d experiments", (_, expected) => {
    const content = _ === "" ? "" : "header\n" + "row\n".repeat(expected);
    expect(countExperiments(content || _)).toBe(expected);
  });
});

// ── Calibration Comprehensive ──────────────────────────────

describe("calibration comprehensive", () => {
  it.each([
    [[0.5], 0, 0.01],
    [[0.5, 0.5, 0.5], 0, 0.01],
    [[0.5, 0.6], 0.0707, 0.1414],
    [[0.1, 0.2, 0.3, 0.4, 0.5], 0.1581, 0.3162],
  ] as [number[], number, number][])("scores %j → std≈%d δ_min≈%d", (scores, expectedStd, expectedDelta) => {
    const stats = computeStats(scores);
    expect(stats.std).toBeCloseTo(expectedStd, 2);
    expect(computeDeltaMin(stats.std)).toBeCloseTo(Math.max(expectedDelta, 0.01), 2);
  });

  it("buildCalibrationResult produces valid structure", () => {
    const mockResults = [0.6, 0.65, 0.62].map((score) => ({
      metrics: { M1: score, M2: score, M3: score, M4: score, M5: score, M6: score, M7: score, M8: score, M9: score, M10: score },
      gatePassed: true,
      qualityScore: score,
    }));
    const r = buildCalibrationResult(mockResults, "model-v1");
    expect(r.baselineScore).toBeCloseTo(0.623, 2);
    expect(r.deltaMin).toBeGreaterThanOrEqual(0.01);
    expect(r.modelVersion).toBe("model-v1");
    expect(r.runCount).toBe(3);
    expect(r.calibratedAt).toMatch(/^\d{4}-/);
    expect(r.perMetricStats).toBeDefined();
    expect(r.perMetricStats.M1.mean).toBeCloseTo(0.623, 2);
  });
});

// ── Crash Counter Comprehensive ────────────────────────────

describe("CrashCounter comprehensive", () => {
  it("sequence: crash×4 → success → crash×5 → stop", () => {
    const c = new CrashCounter();
    for (let i = 0; i < 4; i++) c.recordCrash();
    expect(c.shouldStop()).toBe(false);
    c.recordSuccess();
    expect(c.count).toBe(0);
    for (let i = 0; i < 5; i++) c.recordCrash();
    expect(c.shouldStop()).toBe(true);
  });

  it("alternating crash/success never stops", () => {
    const c = new CrashCounter();
    for (let i = 0; i < 100; i++) {
      c.recordCrash();
      c.recordSuccess();
    }
    expect(c.shouldStop()).toBe(false);
  });
});

// ── Budget Tracker Comprehensive ───────────────────────────

describe("BudgetTracker comprehensive", () => {
  it.each([1, 5, 10, 100])("budget=%d exhausts at correct count", (n) => {
    const b = new BudgetTracker(n);
    for (let i = 0; i < n - 1; i++) b.increment();
    expect(b.isExhausted()).toBe(false);
    b.increment();
    expect(b.isExhausted()).toBe(true);
  });

  it("unlimited never exhausts", () => {
    const b = new BudgetTracker();
    for (let i = 0; i < 10000; i++) b.increment();
    expect(b.isExhausted()).toBe(false);
  });
});

// ── Report Comprehensive ───────────────────────────────────

describe("report comprehensive", () => {
  const makeTsv = (rows: string[]) => "header\n" + rows.join("\n") + "\n";

  it("parseTsvRows handles 100 rows", () => {
    const rows = Array.from({ length: 100 }, (_, i) =>
      `c${i}\t${(0.5 + i * 0.001).toFixed(4)}\t1\t0.5\t0.5\t0.5\t0.5\t0.5\t0.5\t0.5\t0.5\t0.5\t0.5\tv1\t100\tkeep\texp ${i}`
    );
    const parsed = parseTsvRows(makeTsv(rows));
    expect(parsed).toHaveLength(100);
    expect(parsed[99].description).toBe("exp 99");
  });

  it("computeReportStats with all statuses", () => {
    const rows = [
      { commit: "a", qualityScore: 0.8, gatePassed: true, status: "keep" as const, description: "", elapsedMs: 100, modelVersion: "v1" },
      { commit: "b", qualityScore: 0.6, gatePassed: false, status: "discard" as const, description: "", elapsedMs: 100, modelVersion: "v1" },
      { commit: "c", qualityScore: 0, gatePassed: false, status: "crash" as const, description: "", elapsedMs: 0, modelVersion: "v1" },
    ];
    const stats = computeReportStats(rows);
    expect(stats.keepCount).toBe(1);
    expect(stats.discardCount).toBe(1);
    expect(stats.crashCount).toBe(1);
    expect(stats.best.qualityScore).toBe(0.8);
  });
});

// ── Config Comprehensive ───────────────────────────────────

describe("ResearchConfig comprehensive", () => {
  it("default config has all fields", () => {
    const c = getDefaultConfig();
    expect(Object.keys(c).length).toBeGreaterThanOrEqual(28);
  });

  it.each([
    ["numLayers", 2, 12],
    ["alphaThreshold", 1, 254],
    ["minCoverage", 0.001, 0.05],
    ["maxLayers", 3, 16],
    ["iouDedupeThreshold", 0.3, 0.95],
  ] as [string, number, number][])("%s accepts range [%d, %d]", (key, min, max) => {
    expect(() => ResearchConfigSchema.parse({ [key]: min })).not.toThrow();
    expect(() => ResearchConfigSchema.parse({ [key]: max })).not.toThrow();
  });

  it.each([
    ["numLayers", -1],
    ["numLayers", 100],
    ["alphaThreshold", 0],
    ["alphaThreshold", 255],
    ["minCoverage", -0.01],
    ["minCoverage", 0.1],
  ] as [string, number][])("%s rejects %d", (key, val) => {
    expect(() => ResearchConfigSchema.parse({ [key]: val })).toThrow();
  });

  it("constraint: simpleEdgeMax < complexEdgeMin", () => {
    expect(() => ResearchConfigSchema.parse({ simpleEdgeMax: 0.3, complexEdgeMin: 0.1 })).toThrow();
    expect(() => ResearchConfigSchema.parse({ simpleEdgeMax: 0.05, complexEdgeMin: 0.2 })).not.toThrow();
  });

  it("all multipliers default to 1.0", () => {
    const c = getDefaultConfig();
    const muls = ["colorCycleSpeedMul", "parallaxDepthMul", "waveAmplitudeMul", "glowIntensityMul", "saturationBoostMul", "luminanceKeyMul"] as const;
    for (const m of muls) expect(c[m]).toBe(1.0);
  });
});
