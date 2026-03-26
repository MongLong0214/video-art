import { describe, it, expect } from "vitest";
import { generateBootTidal, validateGhcVersion } from "./tidal-utils";

describe("generateBootTidal", () => {
  it("sets target 127.0.0.1", () => {
    const content = generateBootTidal();
    expect(content).toContain("127.0.0.1");
  });

  it("rejects 0.0.0.0", () => {
    expect(() => generateBootTidal({ oscTarget: "0.0.0.0" })).toThrow();
  });

  it("rejects localhost string", () => {
    expect(() => generateBootTidal({ oscTarget: "localhost" })).toThrow();
  });

  it("rejects non-loopback IP", () => {
    expect(() => generateBootTidal({ oscTarget: "127.0.0.2" })).toThrow();
    expect(() => generateBootTidal({ oscTarget: "192.168.1.1" })).toThrow();
  });

  it("sets port 57120", () => {
    const content = generateBootTidal();
    expect(content).toContain("57120");
  });

  it("includes custom FX params (compress, saturate)", () => {
    const content = generateBootTidal();
    expect(content).toContain("compress");
    expect(content).toContain("saturate");
  });

  it("includes SynthDef params (cutoff)", () => {
    const content = generateBootTidal();
    expect(content).toContain("cutoff");
  });

  it("includes import Sound.Tidal.Context", () => {
    const content = generateBootTidal();
    expect(content).toContain("import Sound.Tidal.Context");
  });
});

describe("validateGhcVersion", () => {
  it("accepts 9.6.4", () => {
    expect(validateGhcVersion("9.6.4")).toBe(true);
  });

  it("accepts 9.4.0", () => {
    expect(validateGhcVersion("9.4.0")).toBe(true);
  });

  it("accepts 9.8.1", () => {
    expect(validateGhcVersion("9.8.1")).toBe(true);
  });

  it("rejects 9.2.8", () => {
    expect(validateGhcVersion("9.2.8")).toBe(false);
  });

  it("rejects 8.10.7", () => {
    expect(validateGhcVersion("8.10.7")).toBe(false);
  });

  it("accepts 10.0.0", () => {
    expect(validateGhcVersion("10.0.0")).toBe(true);
  });
});
