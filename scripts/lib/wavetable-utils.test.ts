import { describe, it, expect } from "vitest";
import { generateWavetableCommands } from "./wavetable-utils";

describe("generateWavetableCommands", () => {
  it("returns 16 messages (8 b_alloc + 8 b_gen)", () => {
    const cmds = generateWavetableCommands(8);
    expect(cmds).toHaveLength(16);
  });

  it("all commands at time=0", () => {
    const cmds = generateWavetableCommands(8);
    for (const cmd of cmds) {
      expect(cmd.time).toBe(0);
    }
  });

  it("b_alloc messages have correct bufNums", () => {
    const cmds = generateWavetableCommands(8);
    const allocs = cmds.filter((c) => c.msg[0] === "/b_alloc");
    expect(allocs).toHaveLength(8);
    expect(allocs[0].msg[1]).toBe(8);
    expect(allocs[7].msg[1]).toBe(15);
  });

  it("b_gen messages use sine1 with progressive harmonics", () => {
    const cmds = generateWavetableCommands(8);
    const gens = cmds.filter((c) => c.msg[0] === "/b_gen");
    expect(gens).toHaveLength(8);
    // First buffer: 1 harmonic (numHarmonics = 1^2 = 1)
    expect(gens[0].msg.length).toBe(4 + 1); // /b_gen, bufNum, "sine1", 7, ...1 amp
    // Last buffer: 64 harmonics (numHarmonics = 8^2 = 64)
    expect(gens[7].msg.length).toBe(4 + 64);
  });

  it("uses custom bufBase", () => {
    const cmds = generateWavetableCommands(16);
    const allocs = cmds.filter((c) => c.msg[0] === "/b_alloc");
    expect(allocs[0].msg[1]).toBe(16);
  });
});
