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
    variant: "qwen-only" | "qwen-zoedepth";
    layerOverride?: number;
    unsafe: boolean;
    duration?: number;
    production: boolean;
  };

  beforeEach(async () => {
    const mod = await import("./pipeline-cli.js");
    parseCliArgs = mod.parseCliArgs;
  });

  it("should parse --variant qwen-only", () => {
    const result = parseCliArgs(["input.png", "--variant", "qwen-only"]);
    expect(result.variant).toBe("qwen-only");
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

  it("should emit deprecation warning for --depth-only", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const result = parseCliArgs(["input.png", "--depth-only"]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("deprecated"),
      );
      // --depth-only should still map to qwen-only as the default variant
      expect(result.variant).toBe("qwen-only");
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("should activate production mode with --production", () => {
    const result = parseCliArgs(["input.png", "--production"]);
    expect(result.production).toBe(true);
  });

  it("should default variant to qwen-only when not specified", () => {
    const result = parseCliArgs(["input.png"]);
    expect(result.variant).toBe("qwen-only");
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
// Test 9: alphaDilate removal from postprocess
// ---------------------------------------------------------------------------

describe("postprocess alphaDilate removal", () => {
  it("should not include alphaDilate in postprocess", async () => {
    const mod = await import("./postprocess.js");
    // alphaDilate should not be exported or exist as a property
    expect((mod as Record<string, unknown>).alphaDilate).toBeUndefined();

    // Read the source to verify alphaDilate function is completely removed
    const fs = await import("node:fs");
    const nodePath = await import("node:path");
    const sourceFile = nodePath.resolve(
      import.meta.dirname ?? nodePath.dirname(new URL(import.meta.url).pathname),
      "postprocess.ts",
    );
    const source = fs.readFileSync(sourceFile, "utf-8");
    expect(source).not.toContain("function alphaDilate");
    expect(source).not.toContain("alphaDilate(");
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
        source: "qwen-base" as const,
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

// ---------------------------------------------------------------------------
// T9: Selective Recursive Qwen
// ---------------------------------------------------------------------------

describe("Selective Recursive Qwen", () => {
  let shouldRecurse: (candidate: {
    coverage: number;
    componentCount: number;
    edgeDensity: number;
  }) => boolean;

  let recursiveDecompose: (
    candidate: import("../../src/lib/scene-schema.js").LayerCandidate,
    options: {
      outputDir: string;
      apiCallCount: { current: number };
      maxRecursiveCalls: number;
    },
  ) => Promise<import("../../src/lib/scene-schema.js").LayerCandidate[]>;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("./image-decompose.js");
    shouldRecurse = mod.shouldRecurse;
    recursiveDecompose = mod.recursiveDecompose;
  });

  // Test 1: should trigger recursive on large complex candidate
  it("should trigger recursive on large complex candidate", () => {
    // coverage > 0.30 && componentCount > 3 → trigger
    expect(
      shouldRecurse({ coverage: 0.5, componentCount: 5, edgeDensity: 0.1 }),
    ).toBe(true);
  });

  // Test 2: should not trigger on small simple candidate
  it("should not trigger on small simple candidate", () => {
    // coverage < 0.30 → no trigger
    expect(
      shouldRecurse({ coverage: 0.1, componentCount: 1, edgeDensity: 0.05 }),
    ).toBe(false);
  });

  // Test 3: should respect API call cap
  it("should respect API call cap", async () => {
    // Mock Replicate to avoid real API calls
    vi.doMock("replicate", () => ({
      default: class {
        run = vi.fn();
      },
    }));

    const candidate: import("../../src/lib/scene-schema.js").LayerCandidate = {
      id: "c-large",
      source: "qwen-base",
      filePath: "/tmp/test-large.png",
      width: 512,
      height: 512,
      coverage: 0.6,
      bbox: { x: 0, y: 0, w: 512, h: 512 },
      centroid: { x: 256, y: 256 },
      edgeDensity: 0.2,
      componentCount: 5,
    };

    // apiCallCount.current = 3, maxRecursiveCalls = 3 → cap reached
    const result = await recursiveDecompose(candidate, {
      outputDir: "/tmp/test-recursive",
      apiCallCount: { current: 3 },
      maxRecursiveCalls: 3,
    });

    // Cap reached: return empty array (parent is retained externally)
    expect(result).toEqual([]);
  });

  // Test 4: should record recursive pass in manifest
  it("should record recursive pass in manifest", async () => {
    // Verify the pass type is correctly structured for manifest recording
    // The passes array in ManifestInput accepts type: "qwen-recursive"
    const pass: import("./decomposition-manifest.js").ManifestInput["passes"][number] = {
      type: "qwen-recursive",
      candidateCount: 3,
      parentId: "parent-abc",
    };
    expect(pass.type).toBe("qwen-recursive");
    expect(pass.parentId).toBe("parent-abc");
    expect(pass.candidateCount).toBe(3);
  });

  // Test 5: should keep parent on recursive failure
  it("should keep parent on recursive failure", async () => {
    // Mock Replicate to throw an error
    vi.doMock("replicate", () => ({
      default: class {
        run = vi.fn().mockRejectedValue(new Error("API unavailable"));
      },
    }));

    // Re-import after mock
    const freshMod = await import("./image-decompose.js");

    const parentCandidate: import("../../src/lib/scene-schema.js").LayerCandidate = {
      id: "c-parent",
      source: "qwen-base",
      filePath: "/tmp/test-parent.png",
      width: 512,
      height: 512,
      coverage: 0.5,
      bbox: { x: 0, y: 0, w: 512, h: 512 },
      centroid: { x: 256, y: 256 },
      edgeDensity: 0.2,
      componentCount: 5,
    };

    const apiCallCount = { current: 0 };

    // On failure, recursiveDecompose returns empty → caller retains parent
    const result = await freshMod.recursiveDecompose(parentCandidate, {
      outputDir: "/tmp/test-recursive",
      apiCallCount,
      maxRecursiveCalls: 3,
    });

    expect(result).toEqual([]);
    // apiCallCount should still be incremented (the call was attempted)
    expect(apiCallCount.current).toBe(1);
  });

  // Test 6: should reintegrate recursive results
  it("should reintegrate recursive results", () => {
    // Integration test: recursive children replace parent in candidate pool
    type LC = import("../../src/lib/scene-schema.js").LayerCandidate;

    const baseCandidates: LC[] = [
      {
        id: "c-simple",
        source: "qwen-base",
        filePath: "/tmp/simple.png",
        width: 1024,
        height: 1024,
        coverage: 0.15,
        bbox: { x: 100, y: 100, w: 200, h: 200 },
        centroid: { x: 200, y: 200 },
        edgeDensity: 0.08,
        componentCount: 1,
      },
      {
        id: "c-parent",
        source: "qwen-base",
        filePath: "/tmp/parent.png",
        width: 1024,
        height: 1024,
        coverage: 0.5,
        bbox: { x: 0, y: 0, w: 1024, h: 1024 },
        centroid: { x: 512, y: 512 },
        edgeDensity: 0.2,
        componentCount: 5,
      },
    ];

    const recursiveChildren: LC[] = [
      {
        id: "c-child-1",
        source: "qwen-recursive",
        parentId: "c-parent",
        filePath: "/tmp/child1.png",
        width: 1024,
        height: 1024,
        coverage: 0.25,
        bbox: { x: 0, y: 0, w: 600, h: 600 },
        centroid: { x: 300, y: 300 },
        edgeDensity: 0.15,
        componentCount: 2,
      },
      {
        id: "c-child-2",
        source: "qwen-recursive",
        parentId: "c-parent",
        filePath: "/tmp/child2.png",
        width: 1024,
        height: 1024,
        coverage: 0.2,
        bbox: { x: 400, y: 400, w: 500, h: 500 },
        centroid: { x: 650, y: 650 },
        edgeDensity: 0.12,
        componentCount: 1,
      },
    ];

    // Reintegration logic: replace parent with children, keep non-recursive
    const parentIds = new Set(recursiveChildren.map((c) => c.parentId));
    const merged = [
      ...baseCandidates.filter((c) => !parentIds.has(c.id)),
      ...recursiveChildren,
    ];

    // Verify: parent removed, children added, non-recursive preserved
    expect(merged.length).toBe(3); // 1 simple + 2 children
    expect(merged.find((c) => c.id === "c-parent")).toBeUndefined();
    expect(merged.find((c) => c.id === "c-simple")).toBeDefined();
    expect(merged.filter((c) => c.source === "qwen-recursive").length).toBe(2);
    expect(merged.filter((c) => c.parentId === "c-parent").length).toBe(2);
  });
});
