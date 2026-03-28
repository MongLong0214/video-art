import { describe, it, expect } from "vitest";
import { buildNrtScore, type ExtendedNrtScore, type SectionOverride } from "./nrt-builder";

const makeBaseScore = (events: ExtendedNrtScore["events"] = []): ExtendedNrtScore => ({
  metadata: { duration: 10, eventCount: events.length, mapped: events.length, skipped: 0, skipRate: 0 },
  events,
});

describe("buildNrtScore", () => {
  it("merges buffer commands at time=0", () => {
    const base = makeBaseScore();
    const bufCmds = [{ time: 0, msg: ["/b_alloc", 8, 2048, 1] }];
    const result = buildNrtScore(base, bufCmds, []);
    expect(result.bufferCommands).toHaveLength(1);
    expect(result.bufferCommands![0].msg[0]).toBe("/b_alloc");
  });

  it("empty sections → no controlEvents", () => {
    const result = buildNrtScore(makeBaseScore(), [], []);
    expect(result.controlEvents).toHaveLength(0);
  });

  it("generates n_set at section boundary for active nodes", () => {
    const events = [{
      time: 0, synthDef: "acid_bass", stem: "bass", bus: 2, nodeId: 1000,
      params: { freq: 110, amp: 0.7, dur: 8 },
    }];
    const sections: SectionOverride[] = [{
      label: "drop", start: 4, end: 8,
      synthOverrides: { acid_bass: { cutoff: 3000, dist: 0.5 } },
    }];
    const result = buildNrtScore(makeBaseScore(events), [], sections);
    expect(result.controlEvents).toHaveLength(1);
    expect(result.controlEvents![0].type).toBe("n_set");
    expect(result.controlEvents![0].nodeId).toBe(1000);
    expect(result.controlEvents![0].params.cutoff).toBe(3000);
  });

  it("overlapping sections → Error", () => {
    const sections: SectionOverride[] = [
      { label: "a", start: 0, end: 5 },
      { label: "b", start: 3, end: 8 },
    ];
    expect(() => buildNrtScore(makeBaseScore(), [], sections)).toThrow("Overlapping");
  });

  it("negative section.start → clamped to 0", () => {
    const sections: SectionOverride[] = [{ label: "a", start: -1, end: 5 }];
    const result = buildNrtScore(makeBaseScore(), [], sections);
    expect(result.controlEvents).toHaveLength(0); // no active nodes
  });

  it("does not target expired nodes", () => {
    const events = [{
      time: 0, synthDef: "kick", stem: "drums", bus: 0, nodeId: 100,
      params: { freq: 50, amp: 0.8, dur: 0.5 },
    }];
    const sections: SectionOverride[] = [{
      label: "drop", start: 2, end: 6,
      synthOverrides: { kick: { drive: 0.8 } },
    }];
    const result = buildNrtScore(makeBaseScore(events), [], sections);
    expect(result.controlEvents).toHaveLength(0); // kick ended at 0.5s, section starts at 2s
  });
});
