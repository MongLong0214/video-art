// Report: parse results.tsv + compute experiment statistics

export interface ExperimentRow {
  commit: string;
  qualityScore: number;
  gatePassed: boolean;
  status: "keep" | "discard" | "crash";
  description: string;
  elapsedMs: number;
  modelVersion: string;
}

export interface ReportStats {
  totalCount: number;
  keepCount: number;
  discardCount: number;
  crashCount: number;
  best: ExperimentRow;
  worst: ExperimentRow;
  mean: number;
  trend: number[]; // last 10 scores
}

const EMPTY_ROW: ExperimentRow = {
  commit: "", qualityScore: 0, gatePassed: false,
  status: "crash", description: "", elapsedMs: 0, modelVersion: "",
};

export function parseTsvRows(tsvContent: string): ExperimentRow[] {
  const lines = tsvContent.trim().split("\n");
  if (lines.length <= 1) return [];

  return lines.slice(1).filter((l) => l.trim()).map((line) => {
    const cols = line.split("\t");
    return {
      commit: cols[0] ?? "",
      qualityScore: parseFloat(cols[1]) || 0,
      gatePassed: cols[2] === "1",
      status: (cols[15] as "keep" | "discard" | "crash") ?? "crash",
      description: cols[16] ?? "",
      elapsedMs: parseInt(cols[14]) || 0,
      modelVersion: cols[13] ?? "",
    };
  });
}

export function computeReportStats(rows: ExperimentRow[]): ReportStats {
  if (rows.length === 0) {
    return {
      totalCount: 0, keepCount: 0, discardCount: 0, crashCount: 0,
      best: EMPTY_ROW, worst: EMPTY_ROW, mean: 0, trend: [],
    };
  }

  const sorted = [...rows].sort((a, b) => b.qualityScore - a.qualityScore);
  const scores = rows.map((r) => r.qualityScore);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;

  return {
    totalCount: rows.length,
    keepCount: rows.filter((r) => r.status === "keep").length,
    discardCount: rows.filter((r) => r.status === "discard").length,
    crashCount: rows.filter((r) => r.status === "crash").length,
    best: sorted[0],
    worst: sorted[sorted.length - 1],
    mean,
    trend: scores.slice(-10),
  };
}
