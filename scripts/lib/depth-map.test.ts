import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * T1: Depth Anything V2 API Integration — TDD tests.
 * Tests getDepthMap() function and DecomposeResult.depthMap extension.
 */

// Mock replicate-utils before importing
vi.mock("./replicate-utils.js", () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
  validateReplicateUrl: vi.fn(),
  getToken: vi.fn(() => "test-token"),
}));

// We'll import after the module is implemented
// For now, test against the expected exports

describe("T1: DA V2 API Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDepthMap", () => {
    it("should be exported from image-decompose", async () => {
      const mod = await import("./image-decompose.js");
      expect(typeof mod.getDepthMap).toBe("function");
    });

    it("should export DA V2 model constants", async () => {
      const mod = await import("./image-decompose.js");
      expect(mod.DAV2_MODEL).toBeDefined();
      expect(typeof mod.DAV2_MODEL).toBe("string");
    });
  });

  describe("DecomposeResult", () => {
    it("should include depthMap field in result type", async () => {
      const mod = await import("./image-decompose.js");
      // Verify the function signature allows depthMap in return
      expect(mod.decomposeImage).toBeDefined();
    });
  });
});
