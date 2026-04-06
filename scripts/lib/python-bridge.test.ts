import { describe, it, expect } from "vitest";
import { parsePythonOutput } from "./python-bridge.js";

describe("parsePythonOutput", () => {
  it("parses JSON from single line stdout", () => {
    const result = parsePythonOutput<{ count: number }>(
      '{"count": 42}',
    );
    expect(result.count).toBe(42);
  });

  it("parses JSON from last line of multi-line stdout", () => {
    const result = parsePythonOutput<{ count: number }>(
      'WARNING: something\nProcessing...\n{"count": 42}',
    );
    expect(result.count).toBe(42);
  });

  it("handles whitespace around JSON", () => {
    const result = parsePythonOutput<{ ok: boolean }>(
      '  \n  {"ok": true}  \n  ',
    );
    expect(result.ok).toBe(true);
  });

  it("throws on invalid JSON", () => {
    expect(() => parsePythonOutput("not json")).toThrow();
  });
});
