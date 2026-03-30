import { describe, it, expect } from "vitest";
import {
  DAV2_MODEL, DAV2_VERSION, SAM2_MODEL, SAM2_VERSION,
  SAM3_MODEL, SAM3_VERSION, VLM_MODEL, VLM_VERSION,
  parseVlmResponse, sanitizePrompts, ensureMinPrompts,
} from "./image-decompose.js";
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

  describe("SAM3/VLM model constants", () => {
    it("SAM3_MODEL is mattsays/sam3-image", () => {
      expect(SAM3_MODEL).toBe("mattsays/sam3-image");
    });
    it("SAM3_VERSION is 64-char hex", () => {
      expect(SAM3_VERSION).toMatch(/^[a-f0-9]{64}$/);
    });
    it("VLM_MODEL is lucataco/qwen3-vl-8b-instruct", () => {
      expect(VLM_MODEL).toBe("lucataco/qwen3-vl-8b-instruct");
    });
    it("VLM_VERSION is 64-char hex", () => {
      expect(VLM_VERSION).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("parseVlmResponse", () => {
    it("parses valid JSON array", () => {
      expect(parseVlmResponse('["a","b","c"]')).toEqual(["a", "b", "c"]);
    });
    it("extracts JSON array from prose", () => {
      expect(parseVlmResponse('Here are the regions: ["a","b"]')).toEqual(["a", "b"]);
    });
    it("returns null for no JSON", () => {
      expect(parseVlmResponse("no array here")).toBeNull();
    });
    it("returns null for malformed JSON", () => {
      expect(parseVlmResponse('["a", b]')).toBeNull();
    });
    it("returns null for non-string array", () => {
      expect(parseVlmResponse("[1, 2, 3]")).toBeNull();
    });
  });

  describe("sanitizePrompts", () => {
    it("strips control characters", () => {
      expect(sanitizePrompts(["hello\x00world"], 10)).toEqual(["helloworld"]);
    });
    it("truncates > 100 chars", () => {
      const long = "a".repeat(120);
      expect(sanitizePrompts([long], 10)[0].length).toBe(100);
    });
    it("filters empty strings", () => {
      expect(sanitizePrompts(["", "a", ""], 10)).toEqual(["a"]);
    });
    it("caps at maxCount", () => {
      const prompts = Array.from({ length: 10 }, (_, i) => `p${i}`);
      expect(sanitizePrompts(prompts, 6)).toHaveLength(6);
    });
    it("trims whitespace", () => {
      expect(sanitizePrompts(["  hello  "], 10)).toEqual(["hello"]);
    });
  });

  describe("ensureMinPrompts", () => {
    it("pads with defaults if < 3", () => {
      const result = ensureMinPrompts(["a"]);
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result[0]).toBe("a");
    });
    it("does not pad if >= 3", () => {
      const result = ensureMinPrompts(["a", "b", "c"]);
      expect(result).toEqual(["a", "b", "c"]);
    });
    it("returns defaults for empty array", () => {
      const result = ensureMinPrompts([]);
      expect(result.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("buildSam3Candidate", () => {
    it("should be exported", async () => {
      const mod = await import("./image-decompose.js");
      expect(typeof mod.buildSam3Candidate).toBe("function");
    });
  });

  describe("getSam3Mask", () => {
    it("should be exported", async () => {
      const mod = await import("./image-decompose.js");
      expect(typeof mod.getSam3Mask).toBe("function");
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
