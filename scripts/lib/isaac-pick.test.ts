import { describe, expect, it } from "vitest";
import { buildPickRecord, buildPickReport } from "./isaac-pick.js";

const SHA = "a".repeat(64);
const OTHER = "b".repeat(64);

describe("buildPickReport", () => {
  it("creates a REJECT+override stub when no gate was run", () => {
    const report = buildPickReport(undefined, SHA, "이게 젤 나아 풀버전으로", "2026-09-02T00:00:00Z");
    expect(report.status).toBe("REJECT");
    expect(report.scene.sha256).toBe(SHA);
    expect(report.humanOverride).toEqual({ approvedBy: "isaac", reason: "이게 젤 나아 풀버전으로", at: "2026-09-02T00:00:00Z" });
  });

  it("keeps an existing PASS gate for the same scene and adds the quote", () => {
    const existing = { status: "PASS", scene: { sha256: SHA, path: "x" }, gate: { failures: [] } };
    const report = buildPickReport(existing, SHA, "ㅇㅇ 풀렌더", "t");
    expect(report.status).toBe("PASS");
    expect(report.scene).toEqual({ sha256: SHA, path: "x" });
    expect(report.gate).toEqual({ failures: [] });
    expect(report.humanOverride.reason).toBe("ㅇㅇ 풀렌더");
  });

  it("discards a gate report from a different scene sha", () => {
    const existing = { status: "PASS", scene: { sha256: OTHER } };
    const report = buildPickReport(existing, SHA, "맘에든다", "t");
    expect(report.status).toBe("REJECT");
    expect(report.scene.sha256).toBe(SHA);
  });

  it("refuses an empty quote or a bad sha", () => {
    expect(() => buildPickReport(undefined, SHA, "   ", "t")).toThrow(/quote/);
    expect(() => buildPickReport(undefined, "nope", "ok", "t")).toThrow(/sha/);
  });
});

describe("buildPickRecord", () => {
  it("requires an explicit audio start (never guessed)", () => {
    expect(() => buildPickRecord({ quote: "q", at: "t", sceneSha256: SHA, audio: "Mama India" })).toThrow(/@/);
    expect(buildPickRecord({ quote: "q", at: "t", sceneSha256: SHA, audio: "Mama India @6:27" }).audio).toBe("Mama India @6:27");
    expect(buildPickRecord({ quote: "q", at: "t", sceneSha256: SHA, audio: "none" }).audio).toBe("none");
  });
});
