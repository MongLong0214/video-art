import { describe, it, expect } from "vitest";
import {
  DAV2_MODEL, DAV2_VERSION,
  SAM3_MODEL, SAM3_VERSION,
  sanitizePrompts, ensureMinPrompts,
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

    // SAM2 constants removed — SAM3 only
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
    it("pads with defaults if < 4", () => {
      const result = ensureMinPrompts(["a"]);
      expect(result.length).toBeGreaterThanOrEqual(4);
      expect(result[0]).toBe("a");
    });
    it("does not pad if >= 4", () => {
      const result = ensureMinPrompts(["a", "b", "c", "d"]);
      expect(result).toEqual(["a", "b", "c", "d"]);
    });
    it("returns defaults for empty array", () => {
      const result = ensureMinPrompts([]);
      expect(result.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("buildSam3Candidate", () => {
    it("creates valid LayerCandidate with correct fields", async () => {
      const { buildSam3Candidate } = await import("./image-decompose.js");
      const sharp = (await import("sharp")).default;
      // Create a 10x10 white mask (full coverage)
      const maskBuf = await sharp({
        create: { width: 10, height: 10, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 255 } },
      }).png().toBuffer();
      const origBuf = await sharp({
        create: { width: 10, height: 10, channels: 4, background: { r: 128, g: 64, b: 32, alpha: 255 } },
      }).png().toBuffer();
      // depth: uniform gray 100
      const depthGray = new Uint8Array(100).fill(100);
      const tmpDir = "/tmp/sam3-test-" + Date.now();
      const fs = await import("node:fs");
      fs.mkdirSync(tmpDir, { recursive: true });
      const candidate = await buildSam3Candidate(maskBuf, origBuf, depthGray, 10, 10, "test object", 0, tmpDir);
      expect(candidate).not.toBeNull();
      expect(candidate!.source).toBe("sam3-semantic");
      expect(candidate!.coverage).toBeGreaterThan(0.9);
      expect(candidate!.meanDepth).toBeCloseTo(100, 0);
      expect(candidate!.bbox).toBeDefined();
      expect(candidate!.centroid).toBeDefined();
      expect(candidate!.componentCount).toBe(1);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("returns null for empty mask (coverage < minCoverage)", async () => {
      const { buildSam3Candidate } = await import("./image-decompose.js");
      const sharp = (await import("sharp")).default;
      // All-black mask = 0 coverage
      const maskBuf = await sharp({
        create: { width: 10, height: 10, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 255 } },
      }).png().toBuffer();
      const origBuf = await sharp({
        create: { width: 10, height: 10, channels: 4, background: { r: 128, g: 64, b: 32, alpha: 255 } },
      }).png().toBuffer();
      const depthGray = new Uint8Array(100).fill(128);
      const tmpDir = "/tmp/sam3-test-empty-" + Date.now();
      const fs = await import("node:fs");
      fs.mkdirSync(tmpDir, { recursive: true });
      const candidate = await buildSam3Candidate(maskBuf, origBuf, depthGray, 10, 10, "nothing", 0, tmpDir);
      expect(candidate).toBeNull();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });

  describe("getSam3Mask", () => {
    it("should be exported", async () => {
      const mod = await import("./image-decompose.js");
      expect(typeof mod.getSam3Mask).toBe("function");
    });
  });

  describe("sortCandidatesForOverlap", () => {
    it("sorts by depth descending (near-first)", async () => {
      const { sortCandidatesForOverlap } = await import("./image-decompose.js");
      const candidates = [
        { meanDepth: 50 }, { meanDepth: 200 }, { meanDepth: 100 },
      ] as any[];
      const sorted = sortCandidatesForOverlap(candidates, true);
      expect(sorted.map((c: any) => c.meanDepth)).toEqual([200, 100, 50]);
    });

    it("falls back to coverage ascending when no depth", async () => {
      const { sortCandidatesForOverlap } = await import("./image-decompose.js");
      const candidates = [
        { coverage: 0.3 }, { coverage: 0.1 }, { coverage: 0.5 },
      ] as any[];
      const sorted = sortCandidatesForOverlap(candidates, false);
      expect(sorted.map((c: any) => c.coverage)).toEqual([0.1, 0.3, 0.5]);
    });

    it("handles undefined meanDepth in depth mode", async () => {
      const { sortCandidatesForOverlap } = await import("./image-decompose.js");
      const candidates = [
        { meanDepth: 50 }, { meanDepth: undefined }, { meanDepth: 200 },
      ] as any[];
      const sorted = sortCandidatesForOverlap(candidates, true);
      // undefined depth goes last (treated as 0)
      expect(sorted[0].meanDepth).toBe(200);
      expect(sorted[1].meanDepth).toBe(50);
    });
  });

  describe("shouldTriggerSecondPass", () => {
    it("returns true when coverage < threshold", async () => {
      const { shouldTriggerSecondPass } = await import("./image-decompose.js");
      expect(shouldTriggerSecondPass(0.7, { secondPassEnabled: true, secondPassThreshold: 0.8 })).toBe(true);
    });

    it("returns false when coverage >= threshold", async () => {
      const { shouldTriggerSecondPass } = await import("./image-decompose.js");
      expect(shouldTriggerSecondPass(0.9, { secondPassEnabled: true, secondPassThreshold: 0.8 })).toBe(false);
    });

    it("returns false when disabled", async () => {
      const { shouldTriggerSecondPass } = await import("./image-decompose.js");
      expect(shouldTriggerSecondPass(0.5, { secondPassEnabled: false, secondPassThreshold: 0.8 })).toBe(false);
    });
  });

  describe("buildSecondPassVlmPrompt", () => {
    it("includes exclusion list", async () => {
      const { buildSecondPassVlmPrompt } = await import("./image-decompose.js");
      const prompt = buildSecondPassVlmPrompt(["buddha", "lotus"], 6);
      expect(prompt).toContain("buddha");
      expect(prompt).toContain("lotus");
    });
  });

  describe("parseCliPrompts", () => {
    it("splits and trims", async () => {
      const { parseCliPrompts } = await import("./image-decompose.js");
      expect(parseCliPrompts("a, b , c")).toEqual(["a", "b", "c"]);
    });
    it("filters empty segments", async () => {
      const { parseCliPrompts } = await import("./image-decompose.js");
      expect(parseCliPrompts("a,,b")).toEqual(["a", "b"]);
    });
    it("returns empty array for empty string", async () => {
      const { parseCliPrompts } = await import("./image-decompose.js");
      expect(parseCliPrompts("")).toEqual([]);
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
