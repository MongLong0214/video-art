import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getToken,
  getProviderToken,
  validateReplicateUrl,
  validateProviderUrl,
  maskToken,
  enforceVersionPin,
  PROVIDER_DOMAINS,
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

describe("getProviderToken", () => {
  const origReplicate = process.env.REPLICATE_API_TOKEN;
  const origFal = process.env.FAL_KEY;

  afterEach(() => {
    if (origReplicate) process.env.REPLICATE_API_TOKEN = origReplicate;
    else delete process.env.REPLICATE_API_TOKEN;
    if (origFal) process.env.FAL_KEY = origFal;
    else delete process.env.FAL_KEY;
  });

  it("returns FAL_KEY for fal provider", () => {
    process.env.FAL_KEY = "fal_test_key";
    expect(getProviderToken("fal")).toBe("fal_test_key");
  });

  it("returns REPLICATE_API_TOKEN for replicate provider", () => {
    process.env.REPLICATE_API_TOKEN = "r8_test";
    expect(getProviderToken("replicate")).toBe("r8_test");
  });

  it("throws when FAL_KEY not set", () => {
    delete process.env.FAL_KEY;
    expect(() => getProviderToken("fal")).toThrow("FAL_KEY");
  });
});

describe("validateProviderUrl", () => {
  it("accepts replicate.delivery", () => {
    expect(() => validateProviderUrl("https://pbxt.replicate.delivery/abc/out.png", "replicate")).not.toThrow();
  });

  it("accepts fal.run", () => {
    expect(() => validateProviderUrl("https://queue.fal.run/fal-ai/sam-3/image", "fal")).not.toThrow();
  });

  it("accepts fal.ai", () => {
    expect(() => validateProviderUrl("https://v3.fal.ai/files/output.png", "fal")).not.toThrow();
  });

  it("rejects unknown domain for replicate", () => {
    expect(() => validateProviderUrl("https://evil.com/mask.png", "replicate")).toThrow("Untrusted");
  });

  it("rejects unknown domain for fal", () => {
    expect(() => validateProviderUrl("https://evil.com/mask.png", "fal")).toThrow("Untrusted");
  });

  it("rejects replicate domain when provider is fal", () => {
    expect(() => validateProviderUrl("https://pbxt.replicate.delivery/abc.png", "fal")).toThrow("Untrusted");
  });
});

describe("validateReplicateUrl (backward compat)", () => {
  it("still works for replicate URLs", () => {
    expect(() => validateReplicateUrl("https://pbxt.replicate.delivery/abc.png")).not.toThrow();
  });
});

describe("maskToken", () => {
  it("masks replicate token", () => {
    expect(maskToken("token is r8_abc123", "r8_abc123")).toBe("token is r8_***");
  });

  it("masks fal key", () => {
    expect(maskToken("key is 75ef18e7-xxx", "75ef18e7-xxx")).toBe("key is 75e***");
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
