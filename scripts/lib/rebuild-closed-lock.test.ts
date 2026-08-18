import { describe, expect, it } from "vitest";
import {
  assertSafePlateCommand,
  findClosedLock,
  splitPlateCommands,
} from "./rebuild-closed-lock.js";

const manifest = {
  approved: [
    {
      slug: "r325-ganesha-rainbow-rings-master",
      source: "sources/approved/r325-ganesha-rainbow-rings.png",
      sourceSha256: "aa",
      lock: "recipes/locks/r325-ganesha-rainbow-rings-master.json",
      sceneSha256: "bb",
      gate: "recipes/locks/r325-ganesha-rainbow-rings-master.gate.json",
      plates:
        "node scripts/locks/r325-build-halo-plates.mjs && node scripts/locks/r325-build-counterflow.mjs && cp out/manual-runs/r325-ganesha-rainbow-rings-master/layers/deity.png out/manual-runs/r325-ganesha-rainbow-rings-master/layers/deity-v8.png && node scripts/locks/r325-build-knee-hold.mjs",
    },
    {
      slug: "r242-handface-phase-river-gatepass",
      source: "sources/approved/r242-hand-face.png",
      sourceSha256: "cc",
      lock: "recipes/locks/r242-handface-phase-river-gatepass.json",
      sceneSha256: "dd",
      gate: "recipes/locks/r242-handface-phase-river-gatepass.gate.json",
    },
  ],
};

describe("findClosedLock", () => {
  it("resolves a unique prefix", () => {
    expect(findClosedLock(manifest, "r325").slug).toBe("r325-ganesha-rainbow-rings-master");
  });

  it("throws when missing", () => {
    expect(() => findClosedLock(manifest, "r999")).toThrow(/no lock/);
  });
});

describe("splitPlateCommands", () => {
  it("returns empty when plates omitted", () => {
    expect(splitPlateCommands(undefined)).toEqual([]);
  });

  it("splits r325 plates into node + workdir cp only", () => {
    const cmds = splitPlateCommands(manifest.approved[0].plates);
    expect(cmds).toHaveLength(4);
    for (const cmd of cmds) expect(() => assertSafePlateCommand(cmd)).not.toThrow();
  });

  it("rejects a shell pipe", () => {
    expect(() => assertSafePlateCommand("node scripts/locks/x.mjs | rm -rf /")).toThrow(/unsafe/);
  });
});
