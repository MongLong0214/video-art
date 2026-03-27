import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import type { LayerCandidate, LayerRole } from "../../src/lib/scene-schema.js";
import {
  generateManifest,
  writeManifest,
  copySourceImages,
} from "./decomposition-manifest.js";
import type { ManifestInput, ManifestData } from "./decomposition-manifest.js";

// ---------- helpers ----------

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dm-comp-"));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeCandidate(overrides: Partial<LayerCandidate> & { id: string }): LayerCandidate {
  return {
    source: "qwen-base",
    filePath: "/tmp/test.png",
    width: 100,
    height: 100,
    coverage: 0.5,
    bbox: { x: 0, y: 0, w: 100, h: 100 },
    centroid: { x: 50, y: 50 },
    edgeDensity: 0.1,
    componentCount: 1,
    ...overrides,
  };
}

function makeBaseInput(overrides?: Partial<ManifestInput>): ManifestInput {
  return {
    runId: "test-run-001",
    pipelineVariant: "qwen-only",
    sourceImage: "/tmp/source.jpg",
    preparedImage: "/tmp/prepared.png",
    models: {
      qwenImageLayered: { model: "qwen-vl", version: "v1.0.0", numLayersBase: 4 },
    },
    passes: [{ type: "qwen-base", candidateCount: 4 }],
    retainedLayers: [
      makeCandidate({ id: "l1", role: "background-plate" as LayerRole, uniqueCoverage: 0.4 }),
      makeCandidate({ id: "l2", role: "subject" as LayerRole, uniqueCoverage: 0.3 }),
    ],
    droppedCandidates: [
      makeCandidate({ id: "d1", droppedReason: "uniqueCoverage 0.5% < 2.0%" }),
    ],
    unsafeFlag: false,
    productionMode: false,
    selectedLayerCount: 4,
    ...overrides,
  };
}

// ==========================================================================
// generateManifest
// ==========================================================================

describe("generateManifest", () => {
  it("should generate valid manifest from complete input", () => {
    const input = makeBaseInput();
    const manifest = generateManifest(input);
    expect(manifest.runId).toBe("test-run-001");
    expect(manifest.pipelineVariant).toBe("qwen-only");
    expect(manifest.createdAt).toBeDefined();
    expect(manifest.sourceImage).toBe("/tmp/source.jpg");
    expect(manifest.preparedImage).toBe("/tmp/prepared.png");
  });

  it("should throw for latest version in production mode", () => {
    const input = makeBaseInput({
      productionMode: true,
      models: {
        qwenImageLayered: { model: "qwen-vl", version: "latest", numLayersBase: 4 },
      },
    });
    expect(() => generateManifest(input)).toThrow(/latest/i);
  });

  it("should NOT throw for latest version in non-production mode", () => {
    const input = makeBaseInput({
      productionMode: false,
      models: {
        qwenImageLayered: { model: "qwen-vl", version: "latest", numLayersBase: 4 },
      },
    });
    expect(() => generateManifest(input)).not.toThrow();
  });

  it("should throw for latest zoeDepth version in production mode", () => {
    const input = makeBaseInput({
      productionMode: true,
      pipelineVariant: "qwen-zoedepth",
      models: {
        qwenImageLayered: { model: "qwen-vl", version: "v1.0.0", numLayersBase: 4 },
        zoeDepth: { model: "zoe-depth", version: "latest" },
      },
    });
    expect(() => generateManifest(input)).toThrow(/latest/i);
  });

  it("should populate all finalLayers fields", () => {
    const input = makeBaseInput();
    const manifest = generateManifest(input);
    expect(manifest.finalLayers.length).toBe(2);
    expect(manifest.finalLayers[0].id).toBe("l1");
    expect(manifest.finalLayers[0].role).toBe("background-plate");
    expect(manifest.finalLayers[0].coverage).toBe(0.5);
    expect(manifest.finalLayers[0].uniqueCoverage).toBe(0.4);
  });

  it("should populate droppedCandidates with reason", () => {
    const input = makeBaseInput();
    const manifest = generateManifest(input);
    expect(manifest.droppedCandidates.length).toBe(1);
    expect(manifest.droppedCandidates[0].id).toBe("d1");
    expect(manifest.droppedCandidates[0].reason).toContain("uniqueCoverage");
  });

  it("should use 'unknown' for dropped candidates without reason", () => {
    const input = makeBaseInput({
      droppedCandidates: [makeCandidate({ id: "d-noreason" })],
    });
    const manifest = generateManifest(input);
    expect(manifest.droppedCandidates[0].reason).toBe("unknown");
  });

  it("should handle empty retained layers", () => {
    const input = makeBaseInput({ retainedLayers: [] });
    const manifest = generateManifest(input);
    expect(manifest.finalLayers).toEqual([]);
    expect(manifest.layerCounts.retained).toBe(0);
  });

  it("should handle empty dropped candidates", () => {
    const input = makeBaseInput({ droppedCandidates: [] });
    const manifest = generateManifest(input);
    expect(manifest.droppedCandidates).toEqual([]);
    expect(manifest.layerCounts.dropped).toBe(0);
  });

  it("should handle 0 retained and 0 dropped", () => {
    const input = makeBaseInput({ retainedLayers: [], droppedCandidates: [] });
    const manifest = generateManifest(input);
    expect(manifest.layerCounts.retained).toBe(0);
    expect(manifest.layerCounts.dropped).toBe(0);
  });

  it("should handle 20 retained layers", () => {
    const layers = Array.from({ length: 20 }, (_, i) =>
      makeCandidate({ id: `l${i}`, uniqueCoverage: 0.05 }),
    );
    const input = makeBaseInput({ retainedLayers: layers });
    const manifest = generateManifest(input);
    expect(manifest.finalLayers.length).toBe(20);
    expect(manifest.layerCounts.retained).toBe(20);
  });

  it("should set requestedLayerCount to null when undefined", () => {
    const input = makeBaseInput();
    const manifest = generateManifest(input);
    expect(manifest.layerCounts.requested).toBeNull();
  });

  it("should pass through requestedLayerCount when provided", () => {
    const input = makeBaseInput({ requestedLayerCount: 6 });
    const manifest = generateManifest(input);
    expect(manifest.layerCounts.requested).toBe(6);
  });

  it("should set correct selectedLayerCount", () => {
    const input = makeBaseInput({ selectedLayerCount: 5 });
    const manifest = generateManifest(input);
    expect(manifest.layerCounts.selected).toBe(5);
  });

  it("should include createdAt as valid ISO date", () => {
    const input = makeBaseInput();
    const manifest = generateManifest(input);
    const date = new Date(manifest.createdAt);
    expect(date.toISOString()).toBe(manifest.createdAt);
  });

  it("should pass through unsafeFlag", () => {
    const input = makeBaseInput({ unsafeFlag: true });
    const manifest = generateManifest(input);
    expect(manifest.unsafeFlag).toBe(true);
  });

  it("should pass through productionMode", () => {
    const input = makeBaseInput({ productionMode: true });
    const manifest = generateManifest(input);
    expect(manifest.productionMode).toBe(true);
  });

  it("should include passes data", () => {
    const input = makeBaseInput({
      passes: [
        { type: "qwen-base", candidateCount: 4 },
        { type: "qwen-recursive", candidateCount: 2, parentId: "l1" },
      ],
    });
    const manifest = generateManifest(input);
    expect(manifest.passes.length).toBe(2);
    expect(manifest.passes[1].parentId).toBe("l1");
  });

  it("should include models data with zoeDepth", () => {
    const input = makeBaseInput({
      pipelineVariant: "qwen-zoedepth",
      models: {
        qwenImageLayered: { model: "qwen-vl", version: "v1.0.0", numLayersBase: 4 },
        zoeDepth: { model: "zoe-depth", version: "v2.0.0" },
      },
    });
    const manifest = generateManifest(input);
    expect(manifest.models.zoeDepth?.version).toBe("v2.0.0");
  });

  it("should handle case-insensitive 'Latest' in production mode", () => {
    const input = makeBaseInput({
      productionMode: true,
      models: {
        qwenImageLayered: { model: "qwen-vl", version: "Latest", numLayersBase: 4 },
      },
    });
    expect(() => generateManifest(input)).toThrow();
  });

  it("should handle case-insensitive 'LATEST' in production mode", () => {
    const input = makeBaseInput({
      productionMode: true,
      models: {
        qwenImageLayered: { model: "qwen-vl", version: "LATEST", numLayersBase: 4 },
      },
    });
    expect(() => generateManifest(input)).toThrow();
  });

  it("should include meanDepth in finalLayers", () => {
    const input = makeBaseInput({
      retainedLayers: [
        makeCandidate({ id: "l1", meanDepth: 128 }),
      ],
    });
    const manifest = generateManifest(input);
    expect(manifest.finalLayers[0].meanDepth).toBe(128);
  });
});

// ==========================================================================
// writeManifest
// ==========================================================================

describe("writeManifest", () => {
  it("should create archive directory", () => {
    const archiveDir = path.join(tmpDir, "write-test-1");
    const manifest = generateManifest(makeBaseInput());
    writeManifest(manifest, archiveDir);
    expect(fs.existsSync(archiveDir)).toBe(true);
  });

  it("should write valid JSON file", () => {
    const archiveDir = path.join(tmpDir, "write-test-2");
    const manifest = generateManifest(makeBaseInput());
    writeManifest(manifest, archiveDir);
    const content = fs.readFileSync(
      path.join(archiveDir, "decomposition-manifest.json"),
      "utf-8",
    );
    const parsed = JSON.parse(content);
    expect(parsed.runId).toBe("test-run-001");
  });

  it("should overwrite existing manifest file", () => {
    const archiveDir = path.join(tmpDir, "write-test-3");
    const manifest1 = generateManifest(makeBaseInput({ runId: "run-1" }));
    writeManifest(manifest1, archiveDir);
    const manifest2 = generateManifest(makeBaseInput({ runId: "run-2" }));
    writeManifest(manifest2, archiveDir);
    const content = fs.readFileSync(
      path.join(archiveDir, "decomposition-manifest.json"),
      "utf-8",
    );
    const parsed = JSON.parse(content);
    expect(parsed.runId).toBe("run-2");
  });

  it("should create nested directory structure", () => {
    const archiveDir = path.join(tmpDir, "write-deep", "nested", "dir");
    const manifest = generateManifest(makeBaseInput());
    writeManifest(manifest, archiveDir);
    expect(
      fs.existsSync(path.join(archiveDir, "decomposition-manifest.json")),
    ).toBe(true);
  });

  it("should write pretty-printed JSON (indented)", () => {
    const archiveDir = path.join(tmpDir, "write-test-4");
    const manifest = generateManifest(makeBaseInput());
    writeManifest(manifest, archiveDir);
    const content = fs.readFileSync(
      path.join(archiveDir, "decomposition-manifest.json"),
      "utf-8",
    );
    // Pretty-printed JSON has newlines
    expect(content).toContain("\n");
    expect(content.split("\n").length).toBeGreaterThan(2);
  });
});

// ==========================================================================
// copySourceImages
// ==========================================================================

describe("copySourceImages", () => {
  it("should create source/ directory", () => {
    const origPath = path.join(tmpDir, "copy-orig.jpg");
    const prepPath = path.join(tmpDir, "copy-prep.png");
    fs.writeFileSync(origPath, "fake-jpg");
    fs.writeFileSync(prepPath, "fake-png");

    const archiveDir = path.join(tmpDir, "copy-test-1");
    copySourceImages(origPath, prepPath, archiveDir);

    expect(fs.existsSync(path.join(archiveDir, "source"))).toBe(true);
  });

  it("should copy both files with correct names", () => {
    const origPath = path.join(tmpDir, "copy-orig2.jpg");
    const prepPath = path.join(tmpDir, "copy-prep2.png");
    fs.writeFileSync(origPath, "fake-jpg-2");
    fs.writeFileSync(prepPath, "fake-png-2");

    const archiveDir = path.join(tmpDir, "copy-test-2");
    copySourceImages(origPath, prepPath, archiveDir);

    expect(
      fs.existsSync(path.join(archiveDir, "source", "original.jpg")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(archiveDir, "source", "prepared.png")),
    ).toBe(true);
  });

  it("should preserve original file extension", () => {
    const origPath = path.join(tmpDir, "copy-orig3.webp");
    const prepPath = path.join(tmpDir, "copy-prep3.png");
    fs.writeFileSync(origPath, "fake-webp");
    fs.writeFileSync(prepPath, "fake-png-3");

    const archiveDir = path.join(tmpDir, "copy-test-3");
    copySourceImages(origPath, prepPath, archiveDir);

    expect(
      fs.existsSync(path.join(archiveDir, "source", "original.webp")),
    ).toBe(true);
  });

  it("should handle same path for original and prepared", () => {
    const samePath = path.join(tmpDir, "copy-same.png");
    fs.writeFileSync(samePath, "same-content");

    const archiveDir = path.join(tmpDir, "copy-test-4");
    copySourceImages(samePath, samePath, archiveDir);

    expect(
      fs.existsSync(path.join(archiveDir, "source", "original.png")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(archiveDir, "source", "prepared.png")),
    ).toBe(true);
  });

  it("should preserve file content", () => {
    const origPath = path.join(tmpDir, "copy-content-orig.jpg");
    const prepPath = path.join(tmpDir, "copy-content-prep.png");
    fs.writeFileSync(origPath, "original-data");
    fs.writeFileSync(prepPath, "prepared-data");

    const archiveDir = path.join(tmpDir, "copy-test-5");
    copySourceImages(origPath, prepPath, archiveDir);

    const origContent = fs.readFileSync(
      path.join(archiveDir, "source", "original.jpg"),
      "utf-8",
    );
    expect(origContent).toBe("original-data");
  });
});

// ==========================================================================
// ManifestInput field combinations
// ==========================================================================

describe("ManifestInput combinations", () => {
  it("should handle qwen-zoedepth variant", () => {
    const input = makeBaseInput({
      pipelineVariant: "qwen-zoedepth",
      models: {
        qwenImageLayered: { model: "qwen-vl", version: "v1.0.0", numLayersBase: 4 },
        zoeDepth: { model: "zoe-depth", version: "v2.0.0" },
      },
    });
    const manifest = generateManifest(input);
    expect(manifest.pipelineVariant).toBe("qwen-zoedepth");
  });

  it("should handle multiple passes", () => {
    const input = makeBaseInput({
      passes: [
        { type: "qwen-base", candidateCount: 4 },
        { type: "qwen-recursive", candidateCount: 2, parentId: "l1" },
        { type: "depth-split", candidateCount: 3 },
      ],
    });
    const manifest = generateManifest(input);
    expect(manifest.passes.length).toBe(3);
  });

  it("should handle large number of passes", () => {
    const passes = Array.from({ length: 10 }, (_, i) => ({
      type: "qwen-base" as const,
      candidateCount: i + 1,
    }));
    const input = makeBaseInput({ passes });
    const manifest = generateManifest(input);
    expect(manifest.passes.length).toBe(10);
  });
});
