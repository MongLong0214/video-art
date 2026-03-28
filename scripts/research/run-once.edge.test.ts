// T7 edge case: modelVersion mismatch in run-once main()
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs", () => ({
  existsSync: vi.fn((p: string) => {
    if (String(p).includes("calibration.json")) return true;
    if (String(p).includes("baseline-config.json")) return false;
    if (String(p).includes("results.tsv")) return false;
    if (String(p).includes("crash-count")) return false;
    if (String(p).includes("experiment-count")) return false;
    return false;
  }),
  readFileSync: vi.fn((p: string) => {
    if (String(p).includes("calibration.json")) {
      return JSON.stringify({
        baselineScore: 0.7,
        deltaMin: 0.02,
        compositeStats: { mean: 0.7, std: 0.01, min: 0.69, max: 0.71 },
        perMetricStats: {},
        modelVersion: "model-v2",
        runCount: 5,
        calibratedAt: "2026-01-01T00:00:00Z",
      });
    }
    return "";
  }),
  appendFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock("./promote.js", () => ({
  loadBaseline: vi.fn(() => ({
    qualityScore: 0.7,
    modelVersion: "model-v1",
    commit: "abc",
    calibratedAt: "2026-01-01",
  })),
}));

vi.mock("./research-config.js", () => ({
  loadConfig: vi.fn(() => ({})),
}));

vi.mock("./git-automation.js", () => {
  class MockCrashCounter {
    count = 0;
    errors: string[] = [];
    static persisted() { return new MockCrashCounter(); }
    recordCrash() { this.count++; }
    recordSuccess() { this.count = 0; this.errors = []; }
    shouldStop() { return false; }
    getErrorSummary() { return ""; }
  }

  class MockBudgetTracker {
    current = 0;
    static persisted() { return new MockBudgetTracker(); }
    increment() { this.current++; }
    isExhausted() { return false; }
  }

  return {
    checkDirty: vi.fn(() => false),
    ensureBranch: vi.fn(),
    gitCommitConfig: vi.fn(() => "abc1234"),
    gitRestoreConfig: vi.fn(),
    registerSigintHandler: vi.fn(),
    CrashCounter: MockCrashCounter,
    BudgetTracker: MockBudgetTracker,
  };
});

vi.mock("./pipeline-runner.js", () => ({
  runFullPipeline: vi.fn(),
  resolveInputImagePath: vi.fn(() => "input.png"),
}));

vi.mock("./evaluate.js", () => ({
  evaluateVideo: vi.fn(),
}));

import { main } from "./run-once.js";

describe("run-once aborts on modelVersion mismatch", () => {
  it("throws when calibration and baseline modelVersions differ", async () => {
    // calibration.modelVersion = "model-v2", baseline.modelVersion = "model-v1"
    await expect(main()).rejects.toThrow("Model version mismatch");
    await expect(main()).rejects.toThrow("calibration=model-v2");
    await expect(main()).rejects.toThrow("baseline=model-v1");
  });

  it("error message suggests recalibration", async () => {
    await expect(main()).rejects.toThrow("npm run research:calibrate");
  });
});
