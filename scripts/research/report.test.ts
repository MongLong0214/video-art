import { describe, it, expect } from "vitest";
import { parseTsvRows, computeReportStats, type ExperimentRow } from "./report";

const SAMPLE_TSV = `commit\tquality_score\tgate_pass\tM1\tM2\tM3\tM4\tM5\tM6\tM7\tM8\tM9\tM10\tmodel\tms\tstatus\tdesc
abc1234\t0.65\t1\t0.8\t0.7\t0.6\t0.5\t0.6\t0.5\t0.7\t0.8\t0.6\t0.5\tv1\t1200\tkeep\tbaseline
bcd2345\t0.70\t1\t0.85\t0.75\t0.65\t0.55\t0.65\t0.55\t0.75\t0.85\t0.65\t0.55\tv1\t1300\tkeep\tincrease layers
cde3456\t0.60\t0\t0.1\t0.7\t0.6\t0.5\t0.6\t0.5\t0.7\t0.8\t0.6\t0.5\tv1\t1100\tdiscard\tbad config
def4567\t0.00\t0\t0\t0\t0\t0\t0\t0\t0\t0\t0\t0\tv1\t500\tcrash\tOOM`;

describe("parseTsvRows", () => {
  it("parses valid TSV", () => {
    const rows = parseTsvRows(SAMPLE_TSV);
    expect(rows).toHaveLength(4);
    expect(rows[0].commit).toBe("abc1234");
    expect(rows[0].qualityScore).toBe(0.65);
    expect(rows[0].status).toBe("keep");
  });

  it("returns empty for header-only", () => {
    expect(parseTsvRows("header\n")).toHaveLength(0);
  });

  it("returns empty for empty string", () => {
    expect(parseTsvRows("")).toHaveLength(0);
  });
});

describe("computeReportStats", () => {
  it("computes best/worst/mean correctly", () => {
    const rows = parseTsvRows(SAMPLE_TSV);
    const stats = computeReportStats(rows);
    expect(stats.best.qualityScore).toBe(0.70);
    expect(stats.worst.qualityScore).toBe(0.00);
    expect(stats.mean).toBeCloseTo(0.4875, 2);
    expect(stats.keepCount).toBe(2);
    expect(stats.discardCount).toBe(1);
    expect(stats.crashCount).toBe(1);
    expect(stats.totalCount).toBe(4);
  });

  it("handles single row", () => {
    const rows: ExperimentRow[] = [{
      commit: "a", qualityScore: 0.5, gatePassed: true, status: "keep",
      description: "test", elapsedMs: 100, modelVersion: "v1",
    }];
    const stats = computeReportStats(rows);
    expect(stats.best.qualityScore).toBe(0.5);
    expect(stats.totalCount).toBe(1);
  });

  it("handles empty rows", () => {
    const stats = computeReportStats([]);
    expect(stats.totalCount).toBe(0);
    expect(stats.mean).toBe(0);
  });
});
