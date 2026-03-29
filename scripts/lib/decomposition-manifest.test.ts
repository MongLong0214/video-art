import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Will fail until implementation exists
import {
  generateManifest,
  writeManifest,
  copySourceImages,
} from "./decomposition-manifest.js";
import type { ManifestInput } from "./decomposition-manifest.js";
import type { LayerCandidate } from "../../src/lib/scene-schema.js";

// ---------- fixtures ----------

const makeCandidate = (
  overrides: Partial<LayerCandidate> = {},
): LayerCandidate => ({
  id: "cand-0",
  source: "sam2-segment",
  filePath: "/tmp/layer-0.png",
  width: 512,
  height: 512,
  coverage: 0.3,
  bbox: { x: 0, y: 0, w: 512, h: 512 },
  centroid: { x: 256, y: 256 },
  edgeDensity: 0.1,
  componentCount: 1,
  ...overrides,
});

const baseInput: ManifestInput = {
  runId: "run-abc-123",
  pipelineVariant: "sam2",
  sourceImage: "/tmp/source/original.jpg",
  preparedImage: "/tmp/source/prepared.png",
  models: {
    sam2: {
      model: "lucataco/segment-anything-2",
      version: "be7cbde9fdf0eecdc8b20ffec9dd0d1cfeace0832d4d0b58a071d993182e1be0",
      maskLimit: 6,
    },
  },
  passes: [
    { type: "sam2-segment", candidateCount: 4 },
    { type: "luminance-fallback", candidateCount: 2 },
  ],
  retainedLayers: [
    makeCandidate({ id: "layer-0", role: "background-plate", coverage: 0.31 }),
    makeCandidate({ id: "layer-1", role: "subject", coverage: 0.25 }),
  ],
  droppedCandidates: [
    makeCandidate({ id: "cand-7", droppedReason: "redundant-overlap" }),
    makeCandidate({ id: "cand-8", droppedReason: "below-min-coverage" }),
  ],
  unsafeFlag: false,
  productionMode: true,
  requestedLayerCount: 6,
  selectedLayerCount: 4,
};

// ---------- temp directory ----------

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-test-"));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------- tests ----------

describe("decomposition-manifest", () => {
  it("should generate valid manifest JSON", () => {
    const manifest = generateManifest(baseInput);
    const json = JSON.stringify(manifest);

    // Must be valid JSON (round-trip)
    const parsed = JSON.parse(json);
    expect(parsed).toBeDefined();

    // Required top-level fields
    expect(parsed).toHaveProperty("runId");
    expect(parsed).toHaveProperty("pipelineVariant");
    expect(parsed).toHaveProperty("models");
    expect(parsed).toHaveProperty("finalLayers");
  });

  it("should include all required fields", () => {
    const manifest = generateManifest(baseInput);

    expect(manifest).toHaveProperty("sourceImage");
    expect(manifest).toHaveProperty("preparedImage");
    expect(manifest).toHaveProperty("models");
    expect(manifest).toHaveProperty("passes");
    expect(manifest).toHaveProperty("finalLayers");
    expect(manifest).toHaveProperty("droppedCandidates");
    expect(manifest).toHaveProperty("unsafeFlag");
    expect(manifest).toHaveProperty("productionMode");
    expect(manifest).toHaveProperty("layerCounts");

    // layerCounts sub-fields
    expect(manifest.layerCounts).toHaveProperty("requested");
    expect(manifest.layerCounts).toHaveProperty("selected");
    expect(manifest.layerCounts).toHaveProperty("retained");
    expect(manifest.layerCounts).toHaveProperty("dropped");
  });

  it("should reject latest as version", () => {
    const badInput: ManifestInput = {
      ...baseInput,
      models: {
        sam2: {
          model: "lucataco/segment-anything-2",
          version: "latest",
          maskLimit: 6,
        },
      },
    };

    expect(() => generateManifest(badInput)).toThrow(/latest/i);
  });

  it("should record drop reasons", () => {
    const manifest = generateManifest(baseInput);

    expect(manifest.droppedCandidates.length).toBe(2);
    for (const dropped of manifest.droppedCandidates) {
      expect(dropped.reason).toBeDefined();
      expect(typeof dropped.reason).toBe("string");
      expect(dropped.reason.length).toBeGreaterThan(0);
    }
    expect(manifest.droppedCandidates[0].reason).toBe("redundant-overlap");
    expect(manifest.droppedCandidates[1].reason).toBe("below-min-coverage");
  });

  it("should record pipeline variant", () => {
    const manifest = generateManifest(baseInput);
    expect(manifest.pipelineVariant).toBe("sam2");

    const legacyInput: ManifestInput = {
      ...baseInput,
      pipelineVariant: "qwen-zoedepth",
      models: {
        qwenImageLayered: {
          model: "qwen/qwen-image-layered",
          version: "6375723dabc",
          numLayersBase: 4,
        },
        zoeDepth: { model: "cjwbw/zoedepth", version: "6375723dabc" },
      },
    };
    const manifest2 = generateManifest(legacyInput);
    expect(manifest2.pipelineVariant).toBe("qwen-zoedepth");
  });

  it("should copy source and prepared images to archive", () => {
    const archiveDir = path.join(tmpDir, "archive-run");
    fs.mkdirSync(archiveDir, { recursive: true });

    // Create mock source images
    const srcDir = path.join(tmpDir, "src-images");
    fs.mkdirSync(srcDir, { recursive: true });
    const originalPath = path.join(srcDir, "photo.jpg");
    const preparedPath = path.join(srcDir, "prepared.png");
    fs.writeFileSync(originalPath, "fake-jpg-bytes");
    fs.writeFileSync(preparedPath, "fake-png-bytes");

    copySourceImages(originalPath, preparedPath, archiveDir);

    // source/ directory must exist in archive
    const sourceDir = path.join(archiveDir, "source");
    expect(fs.existsSync(sourceDir)).toBe(true);

    // original.* preserves extension
    const originalCopy = path.join(sourceDir, "original.jpg");
    expect(fs.existsSync(originalCopy)).toBe(true);
    expect(fs.readFileSync(originalCopy, "utf-8")).toBe("fake-jpg-bytes");

    // prepared.png
    const preparedCopy = path.join(sourceDir, "prepared.png");
    expect(fs.existsSync(preparedCopy)).toBe(true);
    expect(fs.readFileSync(preparedCopy, "utf-8")).toBe("fake-png-bytes");
  });
});
