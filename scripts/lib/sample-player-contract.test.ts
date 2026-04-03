import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  SAMPLE_PLAYER_V2_DEFAULTS,
  buildSamplePlayerV2Params,
} from "./sample-player-contract.js";

describe("sample-player v2 contract", () => {
  it("builds params with stable defaults", () => {
    const params = buildSamplePlayerV2Params({ buf: 100, dur: 0.4 });
    expect(params.buf).toBe(100);
    expect(params.dur).toBe(0.4);
    expect(params.loopMode).toBe(SAMPLE_PLAYER_V2_DEFAULTS.loopMode);
    expect(params.xfade).toBe(SAMPLE_PLAYER_V2_DEFAULTS.xfade);
    expect(params.slideTime).toBe(SAMPLE_PLAYER_V2_DEFAULTS.slideTime);
  });

  it("allows explicit playback overrides", () => {
    const params = buildSamplePlayerV2Params({
      buf: 101,
      rate: 0.5,
      loopMode: 1,
      legato: 1,
      slide: 1,
      slideTime: 0.12,
      rateLag: 0.04,
      sustainLevel: 0.85,
    });
    expect(params.rate).toBe(0.5);
    expect(params.loopMode).toBe(1);
    expect(params.legato).toBe(1);
    expect(params.slide).toBe(1);
    expect(params.slideTime).toBe(0.12);
    expect(params.rateLag).toBe(0.04);
    expect(params.sustainLevel).toBe(0.85);
  });

  it("sample_player.scd exposes v2 playback parameters", () => {
    const synthdefPath = path.resolve(import.meta.dirname, "../../audio/sc/synthdefs/sample_player.scd");
    const content = fs.readFileSync(synthdefPath, "utf-8");

    expect(content).toContain("loopMode");
    expect(content).toContain("xfade");
    expect(content).toContain("sustainLevel");
    expect(content).toContain("rateLag");
    expect(content).toContain("legato");
    expect(content).toContain("slide");
    expect(content).toContain("slideTime");
    expect(content).toContain("Lag.kr");
    expect(content).toContain("loop: loopFlag");
  });
});
