import { describe, it, expect } from "vitest";
import { DAV2_MODEL, DAV2_VERSION, SAM2_MODEL, SAM2_VERSION } from "./image-decompose.js";
import type { DecomposeResult } from "./image-decompose.js";

describe("image-decompose", () => {
  describe("model constants", () => {
    it("DAV2_MODEL is chenxwh/depth-anything-v2", () => {
      expect(DAV2_MODEL).toBe("chenxwh/depth-anything-v2");
    });

    it("DAV2_VERSION is a 64-char hex string", () => {
      expect(DAV2_VERSION).toMatch(/^[a-f0-9]{64}$/);
    });

    it("SAM2_MODEL is lucataco/segment-anything-2", () => {
      expect(SAM2_MODEL).toBe("lucataco/segment-anything-2");
    });

    it("SAM2_VERSION is a 64-char hex string", () => {
      expect(SAM2_VERSION).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("getDepthMap", () => {
    it("should be exported", async () => {
      const mod = await import("./image-decompose.js");
      expect(typeof mod.getDepthMap).toBe("function");
    });

    it("should return null on file read failure (graceful fallback)", async () => {
      const { getDepthMap } = await import("./image-decompose.js");
      const Replicate = (await import("replicate")).default;
      const mockReplicate = new Replicate({ auth: "test-token" });

      // Non-existent file triggers fs.readFileSync error → caught → returns null
      const result = await getDepthMap(mockReplicate, "/nonexistent/image.png");
      expect(result).toBeNull();
    });
  });

  describe("DecomposeResult type", () => {
    it("should include optional depthMap field", () => {
      const result: DecomposeResult = {
        files: [],
        coverages: [],
        method: "sam2",
        fileMeta: [],
        depthMap: undefined,
      };
      expect(result.depthMap).toBeUndefined();

      const withDepth: DecomposeResult = {
        files: [],
        coverages: [],
        method: "sam2",
        fileMeta: [],
        depthMap: Buffer.from([0, 128, 255]),
      };
      expect(withDepth.depthMap).toBeInstanceOf(Buffer);
    });
  });
});
