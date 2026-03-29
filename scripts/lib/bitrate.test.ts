import { describe, it, expect } from "vitest";
import { getBitrate } from "./bitrate.js";

describe("getBitrate", () => {
  it("returns 8M for 720p", () => {
    expect(getBitrate([1280, 720])).toBe("8M");
  });

  it("returns 15M for 1080p", () => {
    expect(getBitrate([1920, 1080])).toBe("15M");
  });

  it("returns 25M for 1440p", () => {
    expect(getBitrate([2560, 1440])).toBe("25M");
  });

  it("returns 40M for 4K", () => {
    expect(getBitrate([3840, 2160])).toBe("40M");
  });

  it("clamps below 720p to 8M", () => {
    expect(getBitrate([640, 480])).toBe("8M");
  });

  it("clamps above 4K to 40M", () => {
    expect(getBitrate([7680, 4320])).toBe("40M");
  });

  it("interpolates between 1080p and 1440p", () => {
    // 2560x1080 = 2,764,800 px
    // 15 + (25-15) * (2764800-2073600) / (3686400-2073600) = 15 + 10 * 0.4286 = 19.28 → floor → 19
    expect(getBitrate([2560, 1080])).toBe("19M");
  });

  it("portrait equals landscape", () => {
    expect(getBitrate([1080, 1920])).toBe(getBitrate([1920, 1080]));
  });

  it("exact 1080p backwards compat", () => {
    expect(getBitrate([1920, 1080])).toBe("15M");
  });
});
