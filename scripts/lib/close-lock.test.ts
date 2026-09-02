import { describe, expect, it } from "vitest";
import { buildLockEntry, gatePermits, upsertLockEntry } from "./close-lock.js";

const SHA = "c".repeat(64);

describe("gatePermits", () => {
  it("accepts PASS and REJECT+isaac override, refuses bare REJECT", () => {
    expect(gatePermits({ status: "PASS", scene: { sha256: SHA } }).ok).toBe(true);
    const over = gatePermits({ status: "REJECT", scene: { sha256: SHA }, humanOverride: { approvedBy: "isaac", reason: "맘에든다", at: "t" } });
    expect(over.ok).toBe(true);
    expect(over.overrideReason).toBe("맘에든다");
    expect(gatePermits({ status: "REJECT", scene: { sha256: SHA } }).ok).toBe(false);
    expect(gatePermits({ nope: 1 }).ok).toBe(false);
  });
});

describe("buildLockEntry", () => {
  it("writes the exact scaffold / exportFull commands 02 §3 expects", () => {
    const entry = buildLockEntry({
      slug: "r346-eye-mandala-sitter",
      sourceName: "r346-eye-mandala-sitter.png",
      sourceSha256: SHA,
      sceneSha256: SHA,
      audio: "Adhana @5:06",
      gateStatus: "REJECT",
      overrideReason: "플렌더",
      plates: "node scripts/locks/r346-build-halo.mjs",
    });
    expect(entry.source).toBe("sources/approved/r346-eye-mandala-sitter.png");
    expect(entry.lock).toBe("recipes/locks/r346-eye-mandala-sitter.json");
    expect(entry.gate).toBe("recipes/locks/r346-eye-mandala-sitter.gate.json");
    expect(entry.scaffold).toBe(
      "npx tsx scripts/scaffold-layered-run.ts --source sources/approved/r346-eye-mandala-sitter.png --slug r346-eye-mandala-sitter --recipe recipes/locks/r346-eye-mandala-sitter.json --work-dir out/manual-runs/r346-eye-mandala-sitter",
    );
    expect(entry.exportFull).toContain("--full-res --gate-report recipes/locks/r346-eye-mandala-sitter.gate.json");
    expect(entry.plates).toBe("node scripts/locks/r346-build-halo.mjs");
    expect(entry.notes).toContain("humanOverride: 플렌더");
    expect(entry.notes).toContain("run plates then cp lock");
  });

  it("rejects slugs that do not follow rNNN-topic", () => {
    expect(() =>
      buildLockEntry({ slug: "final", sourceName: "a.png", sourceSha256: SHA, sceneSha256: SHA, audio: "none", gateStatus: "PASS" }),
    ).toThrow(/slug/);
  });
});

describe("upsertLockEntry", () => {
  it("replaces an entry with the same slug and keeps the others", () => {
    const a = buildLockEntry({ slug: "r001-a", sourceName: "a.png", sourceSha256: SHA, sceneSha256: SHA, audio: "none", gateStatus: "PASS" });
    const b = buildLockEntry({ slug: "r002-b", sourceName: "b.png", sourceSha256: SHA, sceneSha256: SHA, audio: "none", gateStatus: "PASS" });
    const a2 = { ...a, audio: "X @1:00" };
    const out = upsertLockEntry({ approved: [a, b] }, a2);
    expect(out.approved.map((e) => e.slug)).toEqual(["r002-b", "r001-a"]);
    expect((out.approved[1] as typeof a2).audio).toBe("X @1:00");
  });
});
