import { describe, it, expect } from "vitest";
import {
  getManifestVersion,
  isSampleBankManifestV2,
  parseSampleManifest,
  parseStemGroupRef,
  resolveSampleRef,
} from "./sample-utils";

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

  const bankManifest = {
    version: 2 as const,
    samples: [
      {
        id: "C3_saw_accent_rr1",
        file: "audio/samples/303/C3_saw_accent_rr1.wav",
        root_note: "C3",
        midi: 48,
        waveform: "saw",
        articulation: "accent",
        role_tags: ["bass", "riff"],
        duration_ms: 450,
        lufs: -17.8,
        centroid_hz: 1840,
        slide: null,
        round_robin: 1,
      },
    ],
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

  it("resolves v2 ref by id", () => {
    expect(resolveSampleRef("C3_saw_accent_rr1", bankManifest)).toBe(
      "audio/samples/303/C3_saw_accent_rr1.wav",
    );
  });

  it("resolves v2 ref by basename", () => {
    expect(resolveSampleRef("C3_saw_accent_rr1.wav", bankManifest)).toBe(
      "audio/samples/303/C3_saw_accent_rr1.wav",
    );
  });
});

describe("parseSampleManifest", () => {
  it("parses legacy v1 manifest", () => {
    const parsed = parseSampleManifest(JSON.stringify({
      kick: [{ file: "kick_001.wav", duration: 0.35, onset_time: 0 }],
    }));
    expect(getManifestVersion(parsed)).toBe(1);
  });

  it("parses legacy v1 manifest with explicit version", () => {
    const parsed = parseSampleManifest(JSON.stringify({
      version: 1,
      kick: [{ file: "kick_001.wav", duration: 0.35, onset_time: 0 }],
    }));
    expect(getManifestVersion(parsed)).toBe(1);
  });

  it("parses v2 sample bank manifest", () => {
    const parsed = parseSampleManifest(JSON.stringify({
      version: 2,
      samples: [
        {
          id: "C3_saw_normal_rr1",
          file: "audio/samples/303/C3_saw_normal_rr1.wav",
          root_note: "C3",
          midi: 48,
          waveform: "saw",
          articulation: "normal",
          role_tags: ["bass"],
          duration_ms: 400,
          lufs: -18.0,
          centroid_hz: 1800,
          slide: null,
          round_robin: 1,
        },
      ],
    }));
    expect(getManifestVersion(parsed)).toBe(2);
    expect(isSampleBankManifestV2(parsed)).toBe(true);
  });

  it("throws explicit error for unsupported format", () => {
    expect(() => parseSampleManifest(JSON.stringify({
      version: 2,
      samples: [{ file: "broken.wav" }],
    }))).toThrow(/Unsupported sample manifest format/);
  });
});
