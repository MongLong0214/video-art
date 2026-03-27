import { describe, it, expect } from "vitest";
import {
  makeKeepDecision,
  formatTsvRow,
  parseTsvHeader,
  formatConsoleOutput,
  countExperiments,
} from "./run-once.js";

describe("makeKeepDecision", () => {
  it("returns KEEP when gate passes and score > baseline + δ_min", () => {
    expect(makeKeepDecision(true, 0.8, 0.7, 0.02)).toBe("keep");
  });

  it("returns DISCARD when score within noise margin", () => {
    expect(makeKeepDecision(true, 0.71, 0.7, 0.02)).toBe("discard");
  });

  it("returns DISCARD when gate fails regardless of score", () => {
    expect(makeKeepDecision(false, 0.95, 0.7, 0.02)).toBe("discard");
  });

  it("returns KEEP at exact boundary (baseline + δ_min)", () => {
    expect(makeKeepDecision(true, 0.72, 0.7, 0.02)).toBe("keep");
  });

  it("returns DISCARD just below boundary", () => {
    expect(makeKeepDecision(true, 0.7199, 0.7, 0.02)).toBe("discard");
  });
});

describe("formatTsvRow", () => {
  it("formats all columns correctly", () => {
    const row = formatTsvRow({
      commit: "abc1234",
      qualityScore: 0.6789,
      gatePassed: true,
      metrics: { M1: 0.8, M2: 0.7, M3: 0.6, M4: 0.5, M5: 0.4, M6: 0.3, M7: 0.9, M8: 0.8, M9: 0.7, M10: 0.6 },
      modelVersion: "v1.0",
      elapsedMs: 1234,
      status: "keep",
      description: "test run",
    });
    const cols = row.split("\t");
    expect(cols[0]).toBe("abc1234");
    expect(cols[1]).toBe("0.6789");
    expect(cols[2]).toBe("1"); // gate_pass
    expect(cols.length).toBe(17); // all columns
    expect(cols[16]).toBe("test run");
  });
});

describe("parseTsvHeader", () => {
  it("returns correct header string", () => {
    const header = parseTsvHeader();
    expect(header).toContain("commit");
    expect(header).toContain("quality_score");
    expect(header).toContain("gate_pass");
    expect(header).toContain("M1_palette");
    expect(header).toContain("status");
    expect(header).toContain("description");
    expect(header.split("\t").length).toBe(17);
  });
});

describe("formatConsoleOutput", () => {
  it("formats experiment result line", () => {
    const line = formatConsoleOutput(5, 0.7234, "keep", 0.02, 1500);
    expect(line).toContain("[exp #5]");
    expect(line).toContain("0.7234");
    expect(line).toContain("keep");
    expect(line).toContain("1500ms");
  });
});

describe("countExperiments", () => {
  it("counts lines in TSV content (minus header)", () => {
    const tsv = "header\nrow1\nrow2\nrow3\n";
    expect(countExperiments(tsv)).toBe(3);
  });

  it("returns 0 for header-only", () => {
    expect(countExperiments("header\n")).toBe(0);
  });

  it("returns 0 for empty string", () => {
    expect(countExperiments("")).toBe(0);
  });
});
