import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PsychedelicFinalGuardError, assertPsychedelicFullRenderGate } from "./psychedelic-final-guard.js";

const temporaryDirectories: string[] = [];

function makeFixture(report: unknown): { readonly scenePath: string; readonly reportPath: string } {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "psychedelic-final-guard-"));
  temporaryDirectories.push(directory);
  const scenePath = path.join(directory, "scene.json");
  const reportPath = path.join(directory, "gate.json");
  fs.writeFileSync(scenePath, "{\"duration\":20}\n");
  fs.writeFileSync(reportPath, `${JSON.stringify(report)}\n`);
  return { scenePath, reportPath };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe("psychedelic full-render guard", () => {
  it("allows a PASS gate report tied to the exact scene", () => {
    const scene = "{\"duration\":20}\n";
    const sceneHash = createHash("sha256").update(scene).digest("hex");
    const fixture = makeFixture({ status: "PASS", scene: { sha256: sceneHash } });

    expect(() => assertPsychedelicFullRenderGate(fixture.reportPath, fixture.scenePath)).not.toThrow();
  });

  it("rejects a non-passing candidate report", () => {
    const fixture = makeFixture({ status: "REJECT", scene: { sha256: "unused" } });

    expect(() => assertPsychedelicFullRenderGate(fixture.reportPath, fixture.scenePath)).toThrow(PsychedelicFinalGuardError);
  });

  it("allows Isaac humanOverride on a REJECT report for the exact scene", () => {
    const scene = "{\"duration\":20}\n";
    const sceneHash = createHash("sha256").update(scene).digest("hex");
    const fixture = makeFixture({
      status: "REJECT",
      scene: { sha256: sceneHash },
      humanOverride: {
        approvedBy: "isaac",
        reason: "explicit candidate selection",
        at: "2026-07-15T00:00:00.000Z",
      },
    });

    expect(() => assertPsychedelicFullRenderGate(fixture.reportPath, fixture.scenePath)).not.toThrow();
  });

  it("rejects a stale report after the scene changes", () => {
    const fixture = makeFixture({ status: "PASS", scene: { sha256: "0".repeat(64) } });

    expect(() => assertPsychedelicFullRenderGate(fixture.reportPath, fixture.scenePath)).toThrow(/does not match/);
  });
});
