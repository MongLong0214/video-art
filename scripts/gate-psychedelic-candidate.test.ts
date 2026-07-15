import { describe, expect, it } from "vitest";
import { PsychedelicGateCliError, parsePsychedelicGateCli } from "./gate-psychedelic-candidate.js";

describe("gate-psychedelic-candidate CLI", () => {
  it("requires candidate provenance, references, and an explicit search primitive", () => {
    expect(parsePsychedelicGateCli([
      "--candidate", "candidate-preview.mp4",
      "--source", "source.png",
      "--reference", "reference-a.mp4",
      "--reference", "reference-b.mp4",
      "--work-dir", "out/manual-runs/r208",
      "--axis", "source-detail-residual",
      "--primitive", "wide-band-detail-travel",
    ])).toEqual({
      candidatePath: "candidate-preview.mp4",
      sourcePath: "source.png",
      referencePaths: ["reference-a.mp4", "reference-b.mp4"],
      workDir: "out/manual-runs/r208",
      axis: "source-detail-residual",
      primitive: "wide-band-detail-travel",
      reportPath: undefined,
      ledgerPath: undefined,
    });
  });

  it("rejects a candidate without a reference pair", () => {
    expect(() => parsePsychedelicGateCli([
      "--candidate", "candidate-preview.mp4",
      "--source", "source.png",
      "--reference", "reference-a.mp4",
      "--work-dir", "out/manual-runs/r208",
      "--axis", "source-detail-residual",
      "--primitive", "wide-band-detail-travel",
    ])).toThrow(PsychedelicGateCliError);
  });
});
