import { describe, expect, it } from "vitest";
import { PsychedelicNextPlanCliError, parsePsychedelicNextPlanCli } from "./plan-psychedelic-next.js";

describe("plan psychedelic next CLI", () => {
  it("parses source, evidence reports, and an explicit output path", () => {
    const args = parsePsychedelicNextPlanCli([
      "--source", "portrait.png",
      "--report", "r207.json",
      "--report", "r208.json",
      "--output", "next.json",
    ]);

    expect(args).toEqual({
      sourcePath: "portrait.png",
      reportPaths: ["r207.json", "r208.json"],
      ledgerPath: undefined,
      outputPath: "next.json",
    });
  });

  it("requires at least one evidence source", () => {
    expect(() => parsePsychedelicNextPlanCli(["--source", "portrait.png"])).toThrow(PsychedelicNextPlanCliError);
  });
});
