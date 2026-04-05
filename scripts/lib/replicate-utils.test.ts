import { describe, it, expect, afterEach } from "vitest";
import {
  getToken,
  validateReplicateUrl,
  maskToken,
  enforceVersionPin,
} from "./replicate-utils.js";

describe("getToken (replicate)", () => {
  const original = process.env.REPLICATE_API_TOKEN;

  afterEach(() => {
    if (original) process.env.REPLICATE_API_TOKEN = original;
    else delete process.env.REPLICATE_API_TOKEN;
  });

  it("returns token when set", () => {
    process.env.REPLICATE_API_TOKEN = "r8_test123";
    expect(getToken()).toBe("r8_test123");
  });

  it("throws when not set", () => {
    delete process.env.REPLICATE_API_TOKEN;
    expect(() => getToken()).toThrow("REPLICATE_API_TOKEN");
  });
});

describe("validateReplicateUrl", () => {
  it("still works for replicate URLs", () => {
    expect(() => validateReplicateUrl("https://pbxt.replicate.delivery/abc.png")).not.toThrow();
  });
});

describe("maskToken", () => {
  it("masks replicate token", () => {
    expect(maskToken("token is r8_abc123", "r8_abc123")).toBe("token is r8_***");
  });
});

describe("enforceVersionPin", () => {
  it("passes valid SHA in production", () => {
    const sha = "a".repeat(64);
    expect(() => enforceVersionPin(sha, true)).not.toThrow();
  });

  it("rejects latest in production", () => {
    expect(() => enforceVersionPin("latest", true)).toThrow("pinned");
  });
});
