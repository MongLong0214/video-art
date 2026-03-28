import { describe, it, expect } from "vitest";
import { parseStemGroupRef, resolveSampleRef } from "./sample-utils";

describe("parseStemGroupRef", () => {
  it("parses hybrid ref", () => {
    const result = parseStemGroupRef("sample_player:kick_001");
    expect(result.synthDef).toBe("sample_player");
    expect(result.sampleRef).toBe("kick_001");
  });

  it("parses plain ref (no colon)", () => {
    const result = parseStemGroupRef("acid_bass");
    expect(result.synthDef).toBe("acid_bass");
    expect(result.sampleRef).toBeUndefined();
  });

  it("handles colon in sampleRef", () => {
    const result = parseStemGroupRef("sample_player:kick_001:extra");
    expect(result.synthDef).toBe("sample_player");
    expect(result.sampleRef).toBe("kick_001:extra");
  });
});

describe("resolveSampleRef", () => {
  const manifest = {
    kick: [{ file: "kick_001.wav", duration: 0.35, onset_time: 0 }],
    snare: [{ file: "snare_001.wav", duration: 0.28, onset_time: 0.5 }],
  };

  it("resolves existing ref", () => {
    expect(resolveSampleRef("kick_001", manifest)).toBe("kick_001.wav");
  });

  it("resolves with .wav extension", () => {
    expect(resolveSampleRef("kick_001.wav", manifest)).toBe("kick_001.wav");
  });

  it("returns null for missing ref", () => {
    expect(resolveSampleRef("nonexistent", manifest)).toBeNull();
  });
});
