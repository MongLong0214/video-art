import { describe, expect, it } from "vitest";
import { Clock } from "./clock";

describe("Clock capture seeking", () => {
  it("uses the requested recording frame on the next deterministic tick", () => {
    const clock = new Clock(30);
    clock.startRecording();

    clock.seekFrame(540);
    const firstFrame = clock.tick();
    const secondFrame = clock.tick();

    expect(firstFrame.time).toBe(18);
    expect(firstFrame.frame).toBe(541);
    expect(secondFrame.time).toBeCloseTo(18 + 1 / 30);
  });
});
