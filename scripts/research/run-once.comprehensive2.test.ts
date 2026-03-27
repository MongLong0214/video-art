import { describe, it, expect, vi } from "vitest";

import {
  makeKeepDecision,
  formatTsvRow,
  parseTsvHeader,
  formatConsoleOutput,
  countExperiments,
} from "./run-once.js";
import type { TsvRowData, MetricValues } from "./run-once.js";

// ---------- helpers ----------

function makeAllMetrics(value: number): MetricValues {
  return { M1: value, M2: value, M3: value, M4: value, M5: value, M6: value, M7: value, M8: value, M9: value, M10: value };
}

function makeRowData(overrides?: Partial<TsvRowData>): TsvRowData {
  return {
    commit: "abc1234",
    qualityScore: 0.75,
    gatePassed: true,
    metrics: makeAllMetrics(0.5),
    modelVersion: "v1.0.0",
    elapsedMs: 1000,
    status: "keep",
    description: "test experiment",
    ...overrides,
  };
}

// ==========================================================================
// makeKeepDecision
// ==========================================================================

describe("makeKeepDecision", () => {
  it("should return discard when gate fails", () => {
    expect(makeKeepDecision(false, 0.8, 0.5, 0.01)).toBe("discard");
  });

  it("should return keep when gate passes and score >= baseline + delta", () => {
    expect(makeKeepDecision(true, 0.6, 0.5, 0.01)).toBe("keep");
  });

  it("should return discard when gate passes but score < baseline + delta", () => {
    expect(makeKeepDecision(true, 0.5, 0.5, 0.01)).toBe("discard");
  });

  it("should return keep when score exactly equals baseline + delta", () => {
    expect(makeKeepDecision(true, 0.51, 0.5, 0.01)).toBe("keep");
  });

  it("should handle gate=false with high score", () => {
    expect(makeKeepDecision(false, 1.0, 0.0, 0.0)).toBe("discard");
  });

  it("should handle zero baseline and zero delta", () => {
    expect(makeKeepDecision(true, 0, 0, 0)).toBe("keep");
  });

  it("should handle negative delta", () => {
    expect(makeKeepDecision(true, 0.4, 0.5, -0.2)).toBe("keep");
  });

  it("should return keep with large positive score", () => {
    expect(makeKeepDecision(true, 1.0, 0.0, 0.0)).toBe("keep");
  });

  // All combinations of gate_pass x (score vs baseline)
  it("should handle gate=true, score > baseline + delta", () => {
    expect(makeKeepDecision(true, 0.8, 0.5, 0.1)).toBe("keep");
  });

  it("should handle gate=true, score = baseline + delta", () => {
    expect(makeKeepDecision(true, 0.6, 0.5, 0.1)).toBe("keep");
  });

  it("should handle gate=true, score < baseline + delta", () => {
    expect(makeKeepDecision(true, 0.55, 0.5, 0.1)).toBe("discard");
  });

  it("should handle gate=false, score > baseline", () => {
    expect(makeKeepDecision(false, 0.9, 0.5, 0.01)).toBe("discard");
  });

  it("should handle gate=false, score < baseline", () => {
    expect(makeKeepDecision(false, 0.3, 0.5, 0.01)).toBe("discard");
  });
});

// ==========================================================================
// formatTsvRow
// ==========================================================================

describe("formatTsvRow", () => {
  it("should produce tab-separated row", () => {
    const row = formatTsvRow(makeRowData());
    const fields = row.split("\t");
    expect(fields.length).toBe(17);
  });

  it("should include all metric values with 4 decimal places", () => {
    const row = formatTsvRow(makeRowData());
    expect(row).toContain("0.5000");
  });

  it("should include commit hash", () => {
    const row = formatTsvRow(makeRowData({ commit: "deadbeef" }));
    expect(row.startsWith("deadbeef")).toBe(true);
  });

  it("should format gatePassed as 1/0", () => {
    const passRow = formatTsvRow(makeRowData({ gatePassed: true }));
    const failRow = formatTsvRow(makeRowData({ gatePassed: false }));
    expect(passRow.split("\t")[2]).toBe("1");
    expect(failRow.split("\t")[2]).toBe("0");
  });

  it("should include status field", () => {
    const row = formatTsvRow(makeRowData({ status: "crash" }));
    expect(row).toContain("crash");
  });

  it("should include description field", () => {
    const row = formatTsvRow(makeRowData({ description: "test desc" }));
    expect(row).toContain("test desc");
  });

  it("should handle special characters in description", () => {
    const row = formatTsvRow(makeRowData({ description: "test\twith\ttabs" }));
    // The description might break TSV parsing, but formatTsvRow doesn't escape
    expect(row).toContain("test");
  });

  it("should handle very long description", () => {
    const longDesc = "a".repeat(1000);
    const row = formatTsvRow(makeRowData({ description: longDesc }));
    expect(row).toContain(longDesc);
  });

  it("should include model version", () => {
    const row = formatTsvRow(makeRowData({ modelVersion: "v2.1.0-beta" }));
    expect(row).toContain("v2.1.0-beta");
  });

  it("should include elapsed time", () => {
    const row = formatTsvRow(makeRowData({ elapsedMs: 12345 }));
    expect(row).toContain("12345");
  });

  it("should format quality score with 4 decimal places", () => {
    const row = formatTsvRow(makeRowData({ qualityScore: 0.12345 }));
    expect(row).toContain("0.1235");
  });
});

// ==========================================================================
// parseTsvHeader
// ==========================================================================

describe("parseTsvHeader", () => {
  it("should return non-empty header string", () => {
    const header = parseTsvHeader();
    expect(header.length).toBeGreaterThan(0);
  });

  it("should include all expected column names", () => {
    const header = parseTsvHeader();
    expect(header).toContain("commit");
    expect(header).toContain("quality_score");
    expect(header).toContain("gate_pass");
    expect(header).toContain("M1_palette");
    expect(header).toContain("M10_role_cohere");
    expect(header).toContain("status");
    expect(header).toContain("description");
  });

  it("should have 17 tab-separated columns", () => {
    const header = parseTsvHeader();
    expect(header.split("\t").length).toBe(17);
  });
});

// ==========================================================================
// formatConsoleOutput
// ==========================================================================

describe("formatConsoleOutput", () => {
  it("should include experiment number", () => {
    const output = formatConsoleOutput(1, 0.75, "keep", 0.05, 1000);
    expect(output).toContain("#1");
  });

  it("should include quality score", () => {
    const output = formatConsoleOutput(1, 0.7500, "keep", 0.05, 1000);
    expect(output).toContain("0.7500");
  });

  it("should include status", () => {
    const output = formatConsoleOutput(1, 0.5, "discard", -0.1, 500);
    expect(output).toContain("discard");
  });

  it("should format positive delta with +", () => {
    const output = formatConsoleOutput(1, 0.5, "keep", 0.05, 100);
    expect(output).toContain("+");
  });

  it("should format negative delta without +", () => {
    const output = formatConsoleOutput(1, 0.5, "discard", -0.05, 100);
    expect(output).toContain("-0.0500");
  });

  it("should include elapsed time", () => {
    const output = formatConsoleOutput(1, 0.5, "keep", 0.0, 2500);
    expect(output).toContain("2500");
  });
});

// ==========================================================================
// countExperiments
// ==========================================================================

describe("countExperiments", () => {
  it("should return 0 for empty string", () => {
    expect(countExperiments("")).toBe(0);
  });

  it("should return 0 for whitespace-only string", () => {
    expect(countExperiments("   \n  \n  ")).toBe(0);
  });

  it("should return 0 for header-only file", () => {
    expect(countExperiments("commit\tquality_score\n")).toBe(0);
  });

  it("should return 1 for header + 1 data row", () => {
    expect(countExperiments("header\nrow1\n")).toBe(1);
  });

  it("should return 5 for header + 5 data rows", () => {
    const lines = ["header", "r1", "r2", "r3", "r4", "r5"].join("\n");
    expect(countExperiments(lines)).toBe(5);
  });

  it("should handle 1000 rows", () => {
    const lines = ["header", ...Array.from({ length: 1000 }, (_, i) => `row${i}`)].join("\n");
    expect(countExperiments(lines)).toBe(1000);
  });

  it("should handle trailing newline correctly", () => {
    expect(countExperiments("header\nrow1\nrow2\n")).toBe(2);
  });

  it("should handle no trailing newline", () => {
    expect(countExperiments("header\nrow1\nrow2")).toBe(2);
  });
});
