import { describe, it, expect } from "vitest";
import { BufferAllocator, BUFFER_RANGES, MAX_BUFFERS } from "./buffer-allocator";

describe("BufferAllocator", () => {
  it("wavetable range starts at 8 (0-7 SC reserved)", () => {
    expect(BUFFER_RANGES.wavetable.start).toBe(8);
    expect(BUFFER_RANGES.wavetable.end).toBe(39);
  });

  it("samples range 100-299", () => {
    expect(BUFFER_RANGES.samples.start).toBe(100);
    expect(BUFFER_RANGES.samples.end).toBe(299);
  });

  it("granular range 300-319", () => {
    expect(BUFFER_RANGES.granular.start).toBe(300);
  });

  it("allocateConsecutive(wavetable, 8) returns 8", () => {
    const alloc = new BufferAllocator();
    expect(alloc.allocateConsecutive("wavetable", 8, "wt")).toBe(8);
  });

  it("allocate(samples) returns 100", () => {
    const alloc = new BufferAllocator();
    expect(alloc.allocate("samples", "kick_001")).toBe(100);
  });

  it("allocate increments", () => {
    const alloc = new BufferAllocator();
    expect(alloc.allocate("samples", "a")).toBe(100);
    expect(alloc.allocate("samples", "b")).toBe(101);
  });

  it("allocateConsecutive blocks next consecutive", () => {
    const alloc = new BufferAllocator();
    alloc.allocateConsecutive("wavetable", 8, "set1");
    expect(alloc.allocateConsecutive("wavetable", 8, "set2")).toBe(16);
  });

  it("exhaustion throws", () => {
    const alloc = new BufferAllocator();
    // granular has 20 slots (300-319)
    for (let i = 0; i < 20; i++) {
      alloc.allocate("granular", `g${i}`);
    }
    expect(() => alloc.allocate("granular", "overflow")).toThrow("exhausted");
  });

  it("MAX_BUFFERS is 1024", () => {
    expect(MAX_BUFFERS).toBe(1024);
  });
});
