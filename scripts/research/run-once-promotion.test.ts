import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  appendFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn((p: string) => {
    if (String(p).includes("calibration.json")) {
      return JSON.stringify({
        baselineScore: 0.5668,
        deltaMin: 0.01,
        compositeStats: { mean: 0.5668, std: 0, min: 0.5668, max: 0.5668 },
        perMetricStats: {},
        modelVersion: "local-2026-03-29",
        runCount: 3,
        calibratedAt: "2026-03-29T00:00:00.000Z",
        evalSchemaVersion: "2026-03-29-v2",
        gateThreshold: 0.15,
        referenceFingerprint: "ref-123",
        referenceInputFingerprint: "input-123",
        vmafMode: "libvmaf",
      });
    }
    if (String(p).includes("results.tsv")) {
      return "commit\tquality_score\tgate_pass\tM1_palette\tM2_dominant\tM3_cct\tM4_msssim\tM5_edge\tM6_texture\tM7_vmaf\tM8_temporal\tM9_layer_indep\tM10_role_cohere\tmodel_version\telapsed_ms\tstatus\tdescription\n";
    }
    return "";
  }),
  loadBaseline: vi.fn(() => ({
    qualityScore: 0.5668,
    modelVersion: "local-2026-03-29",
    evalSchemaVersion: "2026-03-29-v2",
    gateThreshold: 0.15,
    referenceFingerprint: "ref-123",
    referenceInputFingerprint: "input-123",
    vmafMode: "libvmaf",
    config: {},
    promotedAt: "2026-03-29T00:00:00.000Z",
  })),
  promoteBaseline: vi.fn(),
  gitCommitConfig: vi.fn(() => ({ hash: "keep1234", committed: true })),
}));

vi.mock("fs", () => ({
  existsSync: vi.fn((p: string) => {
    if (String(p).includes("calibration.json")) return true;
    if (String(p).includes("results.tsv")) return true;
    return false;
  }),
  readFileSync: mocks.readFileSync,
  appendFileSync: mocks.appendFileSync,
  mkdirSync: mocks.mkdirSync,
}));

vi.mock("./promote.js", () => ({
  loadBaseline: mocks.loadBaseline,
  promoteBaseline: mocks.promoteBaseline,
}));

vi.mock("./research-config.js", () => ({
  loadConfig: vi.fn(() => ({})),
}));

vi.mock("./git-automation.js", () => {
  class MockCrashCounter {
    count = 0;
    errors: string[] = [];
    static persisted() { return new MockCrashCounter(); }
    recordCrash() {}
    recordSuccess() {}
    shouldStop() { return false; }
    getErrorSummary() { return ""; }
  }

  class MockBudgetTracker {
    static persisted() { return new MockBudgetTracker(); }
    increment() {}
    isExhausted() { return false; }
  }

  return {
    checkDirty: vi.fn(() => false),
    ensureBranch: vi.fn(),
    gitCommitConfig: mocks.gitCommitConfig,
    gitRestoreConfig: vi.fn(),
    registerSigintHandler: vi.fn(),
    CrashCounter: MockCrashCounter,
    BudgetTracker: MockBudgetTracker,
  };
});

vi.mock("./pipeline-runner.js", () => ({
  runFullPipeline: vi.fn(async () => ({
    videoPath: ".cache/research/current/video.mp4",
    elapsedMs: 1234,
  })),
}));

vi.mock("./evaluate.js", () => ({
  evaluateVideo: vi.fn(async () => ({
    gatePassed: true,
    qualityScore: 0.597,
    metrics: {
      M1: 0.61, M2: 0.69, M3: 0.58, M4: 0.26, M5: 0.59,
      M6: 0.83, M7: 0.17, M8: 0.99, M9: 0.32, M10: 0.87,
    },
  })),
}));

vi.mock("./contract.js", () => ({
  CALIBRATION_PATH: ".cache/research/calibration.json",
  RESULTS_TSV_PATH: ".cache/research/results.tsv",
  REFERENCE_CACHE_DIR: ".cache/research/reference",
  buildRuntimeEvaluationContract: vi.fn(() => ({
    evalSchemaVersion: "2026-03-29-v2",
    gateThreshold: 0.15,
    referenceFingerprint: "ref-123",
    referenceInputFingerprint: "input-123",
    vmafMode: "libvmaf",
  })),
  validatePreparedReference: vi.fn(() => ({
    sourcePath: "/source.mp4",
    sourceFingerprint: "ref-123",
    researchInputPath: ".cache/research/reference/input.png",
    researchInputFingerprint: "input-123",
  })),
  assertEvaluationContractCompatible: vi.fn(),
  formatReferenceFingerprint: vi.fn(() => "ref-123"),
}));

import { main } from "./run-once.js";

describe("run-once keep path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.argv = ["node", "run-once.ts", "--tag", "verify"];
  });

  it("promotes the winning config to the new baseline after commit", async () => {
    await expect(main()).resolves.toBeUndefined();

    expect(mocks.gitCommitConfig).toHaveBeenCalledTimes(1);
    expect(mocks.promoteBaseline).toHaveBeenCalledWith(
      "scripts/research/research-config.ts",
      0.597,
      "local-2026-03-29",
      expect.objectContaining({
        evalSchemaVersion: "2026-03-29-v2",
        referenceFingerprint: "ref-123",
      }),
    );
    expect(mocks.appendFileSync).toHaveBeenCalled();
  });

  it("still promotes the baseline when keep reuses the existing commit", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    mocks.gitCommitConfig.mockReturnValueOnce({ hash: "head1234", committed: false });

    await expect(main()).resolves.toBeUndefined();

    expect(mocks.promoteBaseline).toHaveBeenCalledWith(
      "scripts/research/research-config.ts",
      0.597,
      "local-2026-03-29",
      expect.objectContaining({
        evalSchemaVersion: "2026-03-29-v2",
        referenceFingerprint: "ref-123",
      }),
    );
    expect(
      logSpy.mock.calls.some(
        ([msg]) =>
          typeof msg === "string" &&
          msg.includes("KEEP — baseline advanced on existing commit head1234"),
      ),
    ).toBe(true);

    logSpy.mockRestore();
  });
});
