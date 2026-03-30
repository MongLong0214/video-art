/**
 * T7: Pipeline Integration Variant A -- TDD Red Phase
 *
 * Tests for:
 * - CLI arg parsing (--variant, --layers, --unsafe, --production, deprecation)
 * - Replicate call improvements (retry, URL validation, version pin, safety flag)
 * - postprocess alphaDilate removal
 * - API token log suppression
 * - Fallback when all candidates drop
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Test 1-4, 10, 12: CLI arg parsing
// ---------------------------------------------------------------------------

// parseCliArgs will be the new exported function from pipeline-layers.ts
// We import it once implemented. For now tests will fail (RED).

describe("CLI arg parsing", () => {
  // Dynamically import to pick up the module once created
  let parseCliArgs: (argv: string[]) => {
    inputPath: string;
    layerOverride?: number;
    unsafe: boolean;
    duration?: number;
    production: boolean;
  };

  beforeEach(async () => {
    const mod = await import("./pipeline-cli.js");
    parseCliArgs = mod.parseCliArgs;
  });

  it("should parse --layers 6", () => {
    const result = parseCliArgs(["input.png", "--layers", "6"]);
    expect(result.layerOverride).toBe(6);
  });

  it("should parse --unsafe", () => {
    const result = parseCliArgs(["input.png", "--unsafe"]);
    expect(result.unsafe).toBe(true);
  });

  it("should default to safety checker ON", () => {
    const result = parseCliArgs(["input.png"]);
    expect(result.unsafe).toBe(false);
  });

  it("should activate production mode with --production", () => {
    const result = parseCliArgs(["input.png", "--production"]);
    expect(result.production).toBe(true);
  });

  it("should parse inputPath as first positional argument", () => {
    const result = parseCliArgs(["input.png"]);
    expect(result.inputPath).toBe("input.png");
  });
});

// ---------------------------------------------------------------------------
// Test 5: Replicate URL domain validation
// ---------------------------------------------------------------------------

describe("Replicate URL validation", () => {
  let validateReplicateUrl: (url: string) => void;

  beforeEach(async () => {
    const mod = await import("./replicate-utils.js");
    validateReplicateUrl = mod.validateReplicateUrl;
  });

  it("should validate Replicate URL domain", () => {
    // Valid URLs
    expect(() =>
      validateReplicateUrl("https://replicate.delivery/abc/out.png"),
    ).not.toThrow();
    expect(() =>
      validateReplicateUrl("https://api.replicate.com/v1/output.png"),
    ).not.toThrow();
    expect(() =>
      validateReplicateUrl(
        "https://pbxt.replicate.delivery/xyz/image.png",
      ),
    ).not.toThrow();

    // Invalid URLs
    expect(() =>
      validateReplicateUrl("https://evil.com/replicate.delivery/out.png"),
    ).toThrow(/untrusted domain/i);
    expect(() =>
      validateReplicateUrl("https://example.com/image.png"),
    ).toThrow(/untrusted domain/i);
    expect(() => validateReplicateUrl("not-a-url")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Test 6-7, 11: Retry logic
// ---------------------------------------------------------------------------

describe("Replicate retry", () => {
  let withRetry: <T>(
    fn: () => Promise<T>,
    opts?: {
      maxAttempts?: number;
      backoffMs?: number[];
      onRetry?: (attempt: number, delayMs: number) => void;
    },
  ) => Promise<T>;

  beforeEach(async () => {
    const mod = await import("./replicate-utils.js");
    withRetry = mod.withRetry;
  });

  it("should retry on fetch failure (2 fail, 3rd success)", async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error("network error");
      }
      return "success";
    };

    const result = await withRetry(fn, {
      maxAttempts: 3,
      backoffMs: [0, 0, 0],
    });
    expect(result).toBe("success");
    expect(callCount).toBe(3);
  });

  it("should fail after 3 retries", async () => {
    const fn = async () => {
      throw new Error("persistent error");
    };

    await expect(
      withRetry(fn, { maxAttempts: 3, backoffMs: [0, 0, 0] }),
    ).rejects.toThrow(/persistent error/);
  });

  it("should respect Retry-After header", async () => {
    const retryDelays: number[] = [];
    let callCount = 0;

    // retryAfterMs on the error overrides the backoff schedule
    // Use 0ms actual wait so the test is fast, but verify the callback receives the value
    const fn = async () => {
      callCount++;
      if (callCount === 1) {
        const err = new Error("rate limited") as Error & {
          retryAfterMs?: number;
        };
        err.retryAfterMs = 5000; // Simulates Retry-After: 5 from server
        throw err;
      }
      return "success";
    };

    // The withRetry function should pass retryAfterMs (5000) to onRetry
    // even though the setTimeout will wait the full 5000ms.
    // To keep the test fast, we verify the delay value via onRetry callback
    // and use backoffMs=[0] so non-Retry-After attempts are instant.
    // Since retryAfterMs takes priority, the actual setTimeout call will use 5000ms.
    // We need fake timers to avoid waiting.
    vi.useFakeTimers();
    try {
      const resultPromise = withRetry(fn, {
        maxAttempts: 3,
        backoffMs: [10, 10, 10],
        onRetry: (_attempt, delayMs) => {
          retryDelays.push(delayMs);
        },
      });

      // Flush the 5s Retry-After delay
      await vi.advanceTimersByTimeAsync(5100);
      const result = await resultPromise;

      expect(result).toBe("success");
      expect(retryDelays[0]).toBe(5000);
    } finally {
      vi.useRealTimers();
    }
  });
});

// ---------------------------------------------------------------------------
// Test 8, 12 combined: Production mode + version pin
// ---------------------------------------------------------------------------

describe("Production mode version pin", () => {
  let enforceVersionPin: (version: string | undefined, production: boolean) => void;

  beforeEach(async () => {
    const mod = await import("./replicate-utils.js");
    enforceVersionPin = mod.enforceVersionPin;
  });

  it("should hard fail on unpinned version in production", () => {
    expect(() => enforceVersionPin(undefined, true)).toThrow(
      /version must be pinned/i,
    );
    expect(() => enforceVersionPin("latest", true)).toThrow(
      /version must be pinned/i,
    );
  });

  it("should allow unpinned version in non-production mode", () => {
    expect(() => enforceVersionPin(undefined, false)).not.toThrow();
  });

  it("should allow pinned version in production mode", () => {
    expect(() =>
      enforceVersionPin(
        "abc123def456789012345678901234567890123456789012345678901234abcd",
        true,
      ),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Test 13: API token not in logs
// ---------------------------------------------------------------------------

describe("API token log suppression", () => {
  let maskToken: (text: string, token: string) => string;

  beforeEach(async () => {
    const mod = await import("./replicate-utils.js");
    maskToken = mod.maskToken;
  });

  it("should not log API token", () => {
    const token = "r8_abc123secret456";
    const text = `Connecting to Replicate with token ${token} for inference`;
    const masked = maskToken(text, token);
    expect(masked).not.toContain(token);
    expect(masked).toContain("r8_***");
  });

  it("should handle text without token", () => {
    const token = "r8_abc123secret456";
    const text = "No token in this string";
    const masked = maskToken(text, token);
    expect(masked).toBe(text);
  });
});

// ---------------------------------------------------------------------------
// Test 14: Fallback when all candidates drop
// ---------------------------------------------------------------------------

describe("Fallback on all candidates drop", () => {
  it("should guarantee bg-plate even when tiny candidates survive via relaxation", async () => {
    const { applyRetentionRules } = await import("./layer-resolve.js");

    // Single tiny candidate (no bg-plate role): progressive relaxation keeps it,
    // and bg-plate guarantee adds a synthetic plate from original
    const candidates = [
      {
        id: "c0",
        source: "sam2-segment" as const,
        filePath: "/tmp/c0.png",
        width: 100,
        height: 100,
        coverage: 0.001,
        uniqueCoverage: 0,
        bbox: { x: 0, y: 0, w: 10, h: 10 },
        centroid: { x: 5, y: 5 },
        edgeDensity: 0,
        componentCount: 1,
        role: "midground" as const,
      },
    ];

    const result = applyRetentionRules(candidates, 6, "/tmp/original.png");
    const retained = result.filter((c) => !c.droppedReason);

    // bg-plate guaranteed from original
    const bgPlate = retained.find((c) => c.role === "background-plate");
    expect(bgPlate).toBeDefined();
    expect(bgPlate!.id).toBe("fallback-bg-plate");
    // c0 survives via progressive relaxation (only 1 candidate → can't reach MIN_RETAINED)
    expect(retained.find((c) => c.id === "c0")).toBeDefined();
  });
});

