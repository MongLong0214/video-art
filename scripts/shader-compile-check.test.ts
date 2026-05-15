/// <reference types="node" />
import { describe, it, expect } from "vitest";
import {
  ERROR_PATTERNS,
  MODES,
  detectShaderError,
  type CheckMode,
} from "./shader-compile-check.js";

describe("shader-compile-check: constants", () => {
  it("lists all expected modes (layered + 5 sketches including psychedelic)", () => {
    // Expected modes: layered default, layered T13 baseline, psychedelic sketch, 4 new sketches
    const names = MODES.map((m: CheckMode) => m.name);
    expect(names).toContain("layered-default");
    expect(names).toContain("layered-baseline");
    expect(names).toContain("sketch-psychedelic");
    expect(names).toContain("sketch-cellular");
    expect(names).toContain("sketch-volumetric");
    expect(names).toContain("sketch-particles");
    expect(names).toContain("sketch-fractal-cave");
    expect(names).toContain("mode-dmt");
    expect(names).toContain("mode-dmt-ig");
    expect(names).toContain("mode-dmt-trip");
    expect(names).toContain("mode-dmt-trip-v66");
    expect(names).toContain("mode-dmt-trip-v67");
    expect(names).toContain("mode-dmt-trip-v68");
    expect(names).toContain("mode-dmt-trip-v69");
    expect(names).toContain("mode-dmt-trip-v70");
    expect(names).toContain("mode-dmt-trip-v71");
    expect(names).toContain("mode-dmt-trip-v72");
    expect(names).toContain("mode-dmt-trip-v73");
    expect(names).toContain("mode-dmt-trip-v74");
    expect(names).toContain("mode-dmt-trip-v75");
    expect(names).toContain("mode-dmt-trip-v76");
    expect(names).toContain("mode-dmt-trip-v77");
    expect(names).toContain("mode-dmt-trip-v78");
    expect(names).toContain("mode-dmt-trip-v79");
    expect(names).toContain("mode-dmt-trip-v80");
    expect(names).toContain("mode-dmt-trip-v81");
    expect(names).toContain("mode-dmt-trip-v82");
    expect(names).toContain("mode-dmt-trip-v83");
    expect(names).toContain("mode-dmt-trip-v84");
    expect(names).toContain("mode-dmt-trip-v85");
    expect(names).toContain("mode-dmt-trip-v86");
    expect(names).toContain("mode-dmt-trip-v88");
    expect(names).toContain("mode-dmt-trip-v88-20s");
    expect(names).toContain("mode-dmt-trip-v89-core-breath-20s");
    expect(MODES.length).toBeGreaterThanOrEqual(7);
  });

  it("each mode has a URL path starting with /", () => {
    for (const m of MODES) {
      expect(m.url.startsWith("/")).toBe(true);
    }
  });

  it("ERROR_PATTERNS covers the 5 canonical GL compile failure signatures", () => {
    const joined = ERROR_PATTERNS.map((p) => p.source).join(" ");
    expect(joined).toMatch(/program not valid/);
    expect(joined).toMatch(/compile.*failed/i);
    expect(joined).toMatch(/no matching overloaded function/i);
    expect(joined).toMatch(/undeclared identifier/i);
    expect(joined).toMatch(/INVALID_OPERATION.*useProgram/i);
  });
});

describe("shader-compile-check: detectShaderError", () => {
  it("returns null for benign console output", () => {
    expect(detectShaderError("Hello world")).toBeNull();
    expect(detectShaderError("[info] vite hmr update")).toBeNull();
  });

  it("detects 'useProgram: program not valid'", () => {
    const msg = "WebGL: INVALID_OPERATION: useProgram: program not valid";
    expect(detectShaderError(msg)).not.toBeNull();
  });

  it("detects 'no matching overloaded function found'", () => {
    expect(
      detectShaderError(
        "ERROR: 0:225: 'hash12' : no matching overloaded function found",
      ),
    ).not.toBeNull();
  });

  it("detects 'undeclared identifier'", () => {
    expect(
      detectShaderError("ERROR: 0:12: 'uFoo' : undeclared identifier"),
    ).not.toBeNull();
  });
});
