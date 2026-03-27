import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";

import type { LayerCandidate, LayerRole } from "../../src/lib/scene-schema.js";

import {
  deduplicateCandidates,
  resolveExclusiveOwnership,
  computePairwiseOverlap,
  buildExclusiveMasks,
  assignRoles,
  orderByRole,
  applyRetentionRules,
  fillBackgroundPlate,
} from "./layer-resolve.js";

// ---------- helpers ----------

function createRgbaBuffer(width: number, height: number): Buffer {
  return Buffer.alloc(width * height * 4);
}

function paintRect(
  buf: Buffer,
  width: number,
  rect: { x: number; y: number; w: number; h: number },
  color: { r: number; g: number; b: number; a: number },
): void {
  for (let row = rect.y; row < rect.y + rect.h; row++) {
    for (let col = rect.x; col < rect.x + rect.w; col++) {
      const idx = (row * width + col) * 4;
      buf[idx] = color.r;
      buf[idx + 1] = color.g;
      buf[idx + 2] = color.b;
      buf[idx + 3] = color.a;
    }
  }
}

function fillBuffer(buf: Buffer, color: { r: number; g: number; b: number; a: number }): void {
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = color.r;
    buf[i + 1] = color.g;
    buf[i + 2] = color.b;
    buf[i + 3] = color.a;
  }
}

const W = 100;
const H = 100;
const OPAQUE = { r: 255, g: 0, b: 0, a: 255 };
const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lr-comp-"));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function savePng(buf: Buffer, width: number, height: number, name: string): Promise<string> {
  const filePath = path.join(tmpDir, name);
  await sharp(buf, { raw: { width, height, channels: 4 } }).png().toFile(filePath);
  return filePath;
}

function makeCandidate(
  overrides: Partial<LayerCandidate> & { id: string },
): LayerCandidate {
  return {
    source: "qwen-base",
    filePath: "",
    width: W,
    height: H,
    coverage: 0.5,
    bbox: { x: 0, y: 0, w: W, h: H },
    centroid: { x: W / 2, y: H / 2 },
    edgeDensity: 0.1,
    componentCount: 1,
    ...overrides,
  };
}

// ==========================================================================
// computeIoU (tested indirectly through deduplicateCandidates)
// ==========================================================================

describe("computeIoU (via deduplicateCandidates)", () => {
  it("should yield IoU=1.0 for identical masks (both dropped or kept)", async () => {
    const buf = createRgbaBuffer(W, H);
    fillBuffer(buf, OPAQUE);
    const f1 = await savePng(buf, W, H, "iou-ident-1.png");
    const f2 = await savePng(buf, W, H, "iou-ident-2.png");

    const result = await deduplicateCandidates([
      makeCandidate({ id: "a", filePath: f1, coverage: 1.0 }),
      makeCandidate({ id: "b", filePath: f2, coverage: 0.9 }),
    ]);
    const dropped = result.filter((c) => c.droppedReason);
    expect(dropped.length).toBe(1);
    expect(dropped[0].id).toBe("b");
  });

  it("should yield IoU=0 for completely disjoint masks", async () => {
    const buf1 = createRgbaBuffer(W, H);
    paintRect(buf1, W, { x: 0, y: 0, w: 50, h: H }, OPAQUE);
    const buf2 = createRgbaBuffer(W, H);
    paintRect(buf2, W, { x: 50, y: 0, w: 50, h: H }, OPAQUE);
    const f1 = await savePng(buf1, W, H, "iou-disj-1.png");
    const f2 = await savePng(buf2, W, H, "iou-disj-2.png");

    const result = await deduplicateCandidates([
      makeCandidate({ id: "a", filePath: f1, coverage: 0.5 }),
      makeCandidate({ id: "b", filePath: f2, coverage: 0.5 }),
    ]);
    const dropped = result.filter((c) => c.droppedReason);
    expect(dropped.length).toBe(0);
  });

  it("should handle ~25% overlap correctly", async () => {
    // A: 0-60 columns, B: 40-100 columns => overlap 20 cols
    // A area=60*100=6000, B area=60*100=6000, intersection=20*100=2000
    // union=6000+6000-2000=10000, IoU=0.2 < 0.85
    const buf1 = createRgbaBuffer(W, H);
    paintRect(buf1, W, { x: 0, y: 0, w: 60, h: H }, OPAQUE);
    const buf2 = createRgbaBuffer(W, H);
    paintRect(buf2, W, { x: 40, y: 0, w: 60, h: H }, OPAQUE);
    const f1 = await savePng(buf1, W, H, "iou-25-1.png");
    const f2 = await savePng(buf2, W, H, "iou-25-2.png");

    const result = await deduplicateCandidates([
      makeCandidate({ id: "a", filePath: f1, coverage: 0.6 }),
      makeCandidate({ id: "b", filePath: f2, coverage: 0.6 }),
    ]);
    expect(result.filter((c) => c.droppedReason).length).toBe(0);
  });

  it("should handle ~50% overlap correctly", async () => {
    // A: full image, B: left half => intersection=5000, union=10000 => IoU=0.5
    const buf1 = createRgbaBuffer(W, H);
    fillBuffer(buf1, OPAQUE);
    const buf2 = createRgbaBuffer(W, H);
    paintRect(buf2, W, { x: 0, y: 0, w: 50, h: H }, OPAQUE);
    const f1 = await savePng(buf1, W, H, "iou-50-1.png");
    const f2 = await savePng(buf2, W, H, "iou-50-2.png");

    const result = await deduplicateCandidates([
      makeCandidate({ id: "a", filePath: f1, coverage: 1.0 }),
      makeCandidate({ id: "b", filePath: f2, coverage: 0.5 }),
    ]);
    expect(result.filter((c) => c.droppedReason).length).toBe(0);
  });

  it("should handle single pixel masks", async () => {
    const buf1 = createRgbaBuffer(W, H);
    paintRect(buf1, W, { x: 0, y: 0, w: 1, h: 1 }, OPAQUE);
    const buf2 = createRgbaBuffer(W, H);
    paintRect(buf2, W, { x: 0, y: 0, w: 1, h: 1 }, OPAQUE);
    const f1 = await savePng(buf1, W, H, "iou-px-1.png");
    const f2 = await savePng(buf2, W, H, "iou-px-2.png");

    const result = await deduplicateCandidates([
      makeCandidate({ id: "a", filePath: f1, coverage: 0.0001 }),
      makeCandidate({ id: "b", filePath: f2, coverage: 0.00005 }),
    ]);
    const dropped = result.filter((c) => c.droppedReason);
    expect(dropped.length).toBe(1);
  });

  it("should handle empty masks (all transparent)", async () => {
    const buf1 = createRgbaBuffer(W, H);
    const buf2 = createRgbaBuffer(W, H);
    const f1 = await savePng(buf1, W, H, "iou-empty-1.png");
    const f2 = await savePng(buf2, W, H, "iou-empty-2.png");

    const result = await deduplicateCandidates([
      makeCandidate({ id: "a", filePath: f1, coverage: 0 }),
      makeCandidate({ id: "b", filePath: f2, coverage: 0 }),
    ]);
    // IoU = 0 (union=0), so no dedup
    expect(result.filter((c) => c.droppedReason).length).toBe(0);
  });

  it("should handle full masks (all opaque)", async () => {
    const buf1 = createRgbaBuffer(W, H);
    fillBuffer(buf1, OPAQUE);
    const buf2 = createRgbaBuffer(W, H);
    fillBuffer(buf2, OPAQUE);
    const f1 = await savePng(buf1, W, H, "iou-full-1.png");
    const f2 = await savePng(buf2, W, H, "iou-full-2.png");

    const result = await deduplicateCandidates([
      makeCandidate({ id: "a", filePath: f1, coverage: 1.0 }),
      makeCandidate({ id: "b", filePath: f2, coverage: 0.9 }),
    ]);
    expect(result.filter((c) => c.droppedReason).length).toBe(1);
  });

  it("should handle 1x1 image", async () => {
    const buf1 = Buffer.from([255, 0, 0, 255]);
    const buf2 = Buffer.from([255, 0, 0, 255]);
    const f1 = await savePng(buf1, 1, 1, "iou-1x1-1.png");
    const f2 = await savePng(buf2, 1, 1, "iou-1x1-2.png");

    const result = await deduplicateCandidates([
      makeCandidate({ id: "a", filePath: f1, width: 1, height: 1, coverage: 1.0 }),
      makeCandidate({ id: "b", filePath: f2, width: 1, height: 1, coverage: 0.5 }),
    ]);
    expect(result.filter((c) => c.droppedReason).length).toBe(1);
  });
});

// ==========================================================================
// deduplicateCandidates
// ==========================================================================

describe("deduplicateCandidates", () => {
  it("should return empty array for 0 candidates", async () => {
    const result = await deduplicateCandidates([]);
    expect(result).toEqual([]);
  });

  it("should return single candidate unchanged for 1 candidate", async () => {
    const buf = createRgbaBuffer(W, H);
    fillBuffer(buf, OPAQUE);
    const f = await savePng(buf, W, H, "dedup-single.png");

    const result = await deduplicateCandidates([
      makeCandidate({ id: "only", filePath: f }),
    ]);
    expect(result.length).toBe(1);
    expect(result[0].droppedReason).toBeUndefined();
  });

  it("should exempt depth-split siblings (same parentId)", async () => {
    const buf = createRgbaBuffer(W, H);
    fillBuffer(buf, OPAQUE);
    const f1 = await savePng(buf, W, H, "dedup-sib-1.png");
    const f2 = await savePng(buf, W, H, "dedup-sib-2.png");

    const result = await deduplicateCandidates([
      makeCandidate({ id: "a", filePath: f1, coverage: 1.0, parentId: "parent-1" }),
      makeCandidate({ id: "b", filePath: f2, coverage: 0.9, parentId: "parent-1" }),
    ]);
    const dropped = result.filter((c) => c.droppedReason);
    expect(dropped.length).toBe(0);
  });

  it("should NOT exempt when parentIds differ", async () => {
    const buf = createRgbaBuffer(W, H);
    fillBuffer(buf, OPAQUE);
    const f1 = await savePng(buf, W, H, "dedup-diff-1.png");
    const f2 = await savePng(buf, W, H, "dedup-diff-2.png");

    const result = await deduplicateCandidates([
      makeCandidate({ id: "a", filePath: f1, coverage: 1.0, parentId: "p1" }),
      makeCandidate({ id: "b", filePath: f2, coverage: 0.9, parentId: "p2" }),
    ]);
    expect(result.filter((c) => c.droppedReason).length).toBe(1);
  });

  it("should NOT exempt when one has no parentId", async () => {
    const buf = createRgbaBuffer(W, H);
    fillBuffer(buf, OPAQUE);
    const f1 = await savePng(buf, W, H, "dedup-nop-1.png");
    const f2 = await savePng(buf, W, H, "dedup-nop-2.png");

    const result = await deduplicateCandidates([
      makeCandidate({ id: "a", filePath: f1, coverage: 1.0, parentId: "p1" }),
      makeCandidate({ id: "b", filePath: f2, coverage: 0.9 }),
    ]);
    expect(result.filter((c) => c.droppedReason).length).toBe(1);
  });

  it("should drop the lower-coverage candidate when IoU high", async () => {
    const buf = createRgbaBuffer(W, H);
    fillBuffer(buf, OPAQUE);
    const f1 = await savePng(buf, W, H, "dedup-cov-1.png");
    const f2 = await savePng(buf, W, H, "dedup-cov-2.png");

    const result = await deduplicateCandidates([
      makeCandidate({ id: "high", filePath: f1, coverage: 0.9 }),
      makeCandidate({ id: "low", filePath: f2, coverage: 0.3 }),
    ]);
    const dropped = result.filter((c) => c.droppedReason);
    expect(dropped.length).toBe(1);
    expect(dropped[0].id).toBe("low");
  });

  it("should handle 10+ candidates pairwise", async () => {
    const candidates: LayerCandidate[] = [];
    for (let i = 0; i < 10; i++) {
      // Each occupies a 10-pixel-wide vertical strip -- disjoint
      const buf = createRgbaBuffer(W, H);
      paintRect(buf, W, { x: i * 10, y: 0, w: 10, h: H }, OPAQUE);
      const f = await savePng(buf, W, H, `dedup-10-${i}.png`);
      candidates.push(makeCandidate({ id: `c${i}`, filePath: f, coverage: 0.1 }));
    }

    const result = await deduplicateCandidates(candidates);
    expect(result.filter((c) => c.droppedReason).length).toBe(0);
  });

  it("should drop all duplicates when all identical", async () => {
    const buf = createRgbaBuffer(W, H);
    fillBuffer(buf, OPAQUE);
    const files = await Promise.all(
      Array.from({ length: 5 }, (_, i) => savePng(buf, W, H, `dedup-all-${i}.png`)),
    );

    const candidates = files.map((f, i) =>
      makeCandidate({ id: `c${i}`, filePath: f, coverage: 1.0 - i * 0.01 }),
    );
    const result = await deduplicateCandidates(candidates);
    // First one (highest coverage) should survive, rest dropped
    const dropped = result.filter((c) => c.droppedReason);
    expect(dropped.length).toBe(4);
    expect(result[0].droppedReason).toBeUndefined();
  });

  it("should include drop reason string containing IoU threshold", async () => {
    const buf = createRgbaBuffer(W, H);
    fillBuffer(buf, OPAQUE);
    const f1 = await savePng(buf, W, H, "dedup-reason-1.png");
    const f2 = await savePng(buf, W, H, "dedup-reason-2.png");

    const result = await deduplicateCandidates([
      makeCandidate({ id: "a", filePath: f1, coverage: 1.0 }),
      makeCandidate({ id: "b", filePath: f2, coverage: 0.5 }),
    ]);
    const dropped = result.find((c) => c.droppedReason);
    expect(dropped?.droppedReason).toContain("0.85");
  });
});

// ==========================================================================
// resolveExclusiveOwnership
// ==========================================================================

describe("resolveExclusiveOwnership", () => {
  it("should assign uniqueCoverage for non-overlapping layers", async () => {
    const buf1 = createRgbaBuffer(W, H);
    paintRect(buf1, W, { x: 0, y: 0, w: 50, h: H }, OPAQUE);
    const buf2 = createRgbaBuffer(W, H);
    paintRect(buf2, W, { x: 50, y: 0, w: 50, h: H }, OPAQUE);
    const f1 = await savePng(buf1, W, H, "excl-nonoverlap-1.png");
    const f2 = await savePng(buf2, W, H, "excl-nonoverlap-2.png");

    const result = await resolveExclusiveOwnership(
      [
        makeCandidate({ id: "a", filePath: f1, coverage: 0.5 }),
        makeCandidate({ id: "b", filePath: f2, coverage: 0.5 }),
      ],
      W, H,
    );
    expect(result[0].uniqueCoverage).toBeCloseTo(0.5, 2);
    expect(result[1].uniqueCoverage).toBeCloseTo(0.5, 2);
  });

  it("should handle fully overlapping layers (first gets all)", async () => {
    const buf = createRgbaBuffer(W, H);
    fillBuffer(buf, OPAQUE);
    const f1 = await savePng(buf, W, H, "excl-overlap-1.png");
    const f2 = await savePng(buf, W, H, "excl-overlap-2.png");

    const result = await resolveExclusiveOwnership(
      [
        makeCandidate({ id: "a", filePath: f1, coverage: 1.0 }),
        makeCandidate({ id: "b", filePath: f2, coverage: 1.0 }),
      ],
      W, H,
    );
    expect(result[0].uniqueCoverage).toBeCloseTo(1.0, 2);
    expect(result[1].uniqueCoverage).toBeCloseTo(0.0, 2);
  });

  it("should handle partial overlap (first claims shared pixels)", async () => {
    // A: 0-60, B: 40-100 => A gets 60 cols, B gets 40 cols
    const buf1 = createRgbaBuffer(W, H);
    paintRect(buf1, W, { x: 0, y: 0, w: 60, h: H }, OPAQUE);
    const buf2 = createRgbaBuffer(W, H);
    paintRect(buf2, W, { x: 40, y: 0, w: 60, h: H }, OPAQUE);
    const f1 = await savePng(buf1, W, H, "excl-partial-1.png");
    const f2 = await savePng(buf2, W, H, "excl-partial-2.png");

    const result = await resolveExclusiveOwnership(
      [
        makeCandidate({ id: "a", filePath: f1, coverage: 0.6 }),
        makeCandidate({ id: "b", filePath: f2, coverage: 0.6 }),
      ],
      W, H,
    );
    expect(result[0].uniqueCoverage).toBeCloseTo(0.6, 2);
    expect(result[1].uniqueCoverage).toBeCloseTo(0.4, 2);
  });

  it("should handle single layer", async () => {
    const buf = createRgbaBuffer(W, H);
    fillBuffer(buf, OPAQUE);
    const f = await savePng(buf, W, H, "excl-single.png");

    const result = await resolveExclusiveOwnership(
      [makeCandidate({ id: "a", filePath: f, coverage: 1.0 })],
      W, H,
    );
    expect(result[0].uniqueCoverage).toBeCloseTo(1.0, 2);
  });

  it("should handle 8 non-overlapping strips", async () => {
    const stripW = Math.floor(W / 8);
    const candidates: LayerCandidate[] = [];
    for (let i = 0; i < 8; i++) {
      const buf = createRgbaBuffer(W, H);
      paintRect(buf, W, { x: i * stripW, y: 0, w: stripW, h: H }, OPAQUE);
      const f = await savePng(buf, W, H, `excl-8strip-${i}.png`);
      candidates.push(makeCandidate({ id: `s${i}`, filePath: f, coverage: stripW * H / (W * H) }));
    }

    const result = await resolveExclusiveOwnership(candidates, W, H);
    const totalUC = result.reduce((sum, c) => sum + (c.uniqueCoverage ?? 0), 0);
    // 8 strips of 12 cols = 96 cols out of 100 (some pixels unclaimed at the end)
    expect(totalUC).toBeLessThanOrEqual(1.0);
    expect(totalUC).toBeGreaterThan(0.9);
  });

  it("should ensure uniqueCoverage sum <= 1.0", async () => {
    const buf1 = createRgbaBuffer(W, H);
    fillBuffer(buf1, OPAQUE);
    const buf2 = createRgbaBuffer(W, H);
    paintRect(buf2, W, { x: 20, y: 20, w: 60, h: 60 }, OPAQUE);
    const f1 = await savePng(buf1, W, H, "excl-sum-1.png");
    const f2 = await savePng(buf2, W, H, "excl-sum-2.png");

    const result = await resolveExclusiveOwnership(
      [
        makeCandidate({ id: "a", filePath: f1, coverage: 1.0 }),
        makeCandidate({ id: "b", filePath: f2, coverage: 0.36 }),
      ],
      W, H,
    );
    const totalUC = result.reduce((sum, c) => sum + (c.uniqueCoverage ?? 0), 0);
    expect(totalUC).toBeLessThanOrEqual(1.0 + 1e-6);
  });
});

// ==========================================================================
// assignRoles
// ==========================================================================

describe("assignRoles", () => {
  it("should return empty for empty candidates", () => {
    expect(assignRoles([], W, H)).toEqual([]);
  });

  it("should assign background-plate to highest-coverage candidate with large bbox", () => {
    const result = assignRoles(
      [
        makeCandidate({ id: "big", coverage: 0.8, bbox: { x: 0, y: 0, w: W, h: H } }),
        makeCandidate({ id: "small", coverage: 0.1, bbox: { x: 40, y: 40, w: 20, h: 20 } }),
      ],
      W, H,
    );
    expect(result.find((c) => c.id === "big")?.role).toBe("background-plate");
  });

  it("should NOT assign background-plate when bbox is small", () => {
    const result = assignRoles(
      [
        makeCandidate({
          id: "big-cov-small-bbox",
          coverage: 0.8,
          bbox: { x: 40, y: 40, w: 20, h: 20 },
        }),
      ],
      W, H,
    );
    expect(result[0].role).not.toBe("background-plate");
  });

  it("should assign subject to central candidate", () => {
    const result = assignRoles(
      [
        makeCandidate({
          id: "bg",
          coverage: 0.9,
          bbox: { x: 0, y: 0, w: W, h: H },
          centroid: { x: W / 2, y: H / 2 },
        }),
        makeCandidate({
          id: "subj",
          coverage: 0.15,
          bbox: { x: 30, y: 30, w: 40, h: 40 },
          centroid: { x: W / 2, y: H / 2 },
        }),
      ],
      W, H,
    );
    expect(result.find((c) => c.id === "subj")?.role).toBe("subject");
  });

  it("should assign foreground-occluder to edge-touching non-central small candidate", () => {
    const result = assignRoles(
      [
        makeCandidate({
          id: "bg",
          coverage: 0.9,
          bbox: { x: 0, y: 0, w: W, h: H },
          centroid: { x: W / 2, y: H / 2 },
        }),
        makeCandidate({
          id: "fg",
          coverage: 0.15,
          bbox: { x: 0, y: 0, w: 30, h: 30 },
          centroid: { x: 15, y: 15 },
        }),
      ],
      W, H,
    );
    expect(result.find((c) => c.id === "fg")?.role).toBe("foreground-occluder");
  });

  it("should assign detail to tiny coverage candidate", () => {
    // Centroid must be outside centrality threshold (>25% from center)
    // to avoid being classified as "subject". Place at corner.
    const result = assignRoles(
      [
        makeCandidate({
          id: "bg",
          coverage: 0.9,
          bbox: { x: 0, y: 0, w: W, h: H },
        }),
        makeCandidate({
          id: "tiny",
          coverage: 0.02,
          bbox: { x: 80, y: 80, w: 5, h: 5 },
          centroid: { x: 82, y: 82 },
        }),
      ],
      W, H,
    );
    expect(result.find((c) => c.id === "tiny")?.role).toBe("detail");
  });

  it("should assign midground to medium candidates that match no other rule", () => {
    // Centroid must be outside centrality threshold (>25% from center)
    // to avoid "subject". Also not edge-touching. Coverage 0.1 > 0.05
    // so not "detail". bboxRatio = 15*15/10000 = 0.0225 < 0.2 so not "background".
    const result = assignRoles(
      [
        makeCandidate({
          id: "bg",
          coverage: 0.9,
          bbox: { x: 0, y: 0, w: W, h: H },
        }),
        makeCandidate({
          id: "mid",
          coverage: 0.1,
          bbox: { x: 5, y: 5, w: 15, h: 15 },
          centroid: { x: 12, y: 12 },
        }),
      ],
      W, H,
    );
    expect(result.find((c) => c.id === "mid")?.role).toBe("midground");
  });

  it("should assign background to second-widest with large bbox ratio", () => {
    // "background" requires: bboxRatio >= 0.2 AND coverage >= 0.15.
    // Must NOT be edge-touching or central (which would trigger earlier rules).
    // Centroid at (15,15) => dx=0.35 > 0.25 (not central).
    // bbox starts at x=10, y=10 (not within 2px of edge).
    const result = assignRoles(
      [
        makeCandidate({
          id: "bg-plate",
          coverage: 0.95,
          bbox: { x: 0, y: 0, w: W, h: H },
          centroid: { x: W / 2, y: H / 2 },
        }),
        makeCandidate({
          id: "bg",
          coverage: 0.3,
          bbox: { x: 10, y: 10, w: 50, h: 50 },
          centroid: { x: 15, y: 15 },
        }),
      ],
      W, H,
    );
    expect(result.find((c) => c.id === "bg")?.role).toBe("background");
  });

  it("should handle single candidate", () => {
    const result = assignRoles(
      [makeCandidate({ id: "solo", coverage: 0.5, bbox: { x: 0, y: 0, w: W, h: H } })],
      W, H,
    );
    expect(result.length).toBe(1);
    expect(result[0].role).toBeDefined();
  });

  it("should handle all candidates same size and coverage", () => {
    const candidates = Array.from({ length: 4 }, (_, i) =>
      makeCandidate({
        id: `c${i}`,
        coverage: 0.25,
        bbox: { x: 0, y: 0, w: W, h: H },
        centroid: { x: W / 2, y: H / 2 },
      }),
    );
    const result = assignRoles(candidates, W, H);
    expect(result.every((c) => c.role !== undefined)).toBe(true);
  });

  it("should assign edge-touching detection with 2px tolerance", () => {
    // bbox at x=1 (within 2px of left edge)
    const result = assignRoles(
      [
        makeCandidate({
          id: "bg",
          coverage: 0.9,
          bbox: { x: 0, y: 0, w: W, h: H },
        }),
        makeCandidate({
          id: "near-edge",
          coverage: 0.1,
          bbox: { x: 1, y: 50, w: 20, h: 20 },
          centroid: { x: 11, y: 60 },
        }),
      ],
      W, H,
    );
    expect(result.find((c) => c.id === "near-edge")?.role).toBe("foreground-occluder");
  });

  it("should NOT detect edge-touching at 3px from border", () => {
    // bbox at x=3 (outside 2px tolerance)
    const result = assignRoles(
      [
        makeCandidate({
          id: "bg",
          coverage: 0.9,
          bbox: { x: 0, y: 0, w: W, h: H },
        }),
        makeCandidate({
          id: "not-edge",
          coverage: 0.1,
          bbox: { x: 3, y: 10, w: 10, h: 10 },
          centroid: { x: 8, y: 15 },
        }),
      ],
      W, H,
    );
    expect(result.find((c) => c.id === "not-edge")?.role).not.toBe("foreground-occluder");
  });

  it("should detect centrality within 25% threshold", () => {
    // Center = (50, 50), 25% = 25px tolerance
    // Centroid at (75, 75) => dx/W = 25/100 = 0.25 (right at boundary)
    const result = assignRoles(
      [
        makeCandidate({
          id: "bg",
          coverage: 0.9,
          bbox: { x: 0, y: 0, w: W, h: H },
        }),
        makeCandidate({
          id: "central",
          coverage: 0.15,
          bbox: { x: 50, y: 50, w: 40, h: 40 },
          centroid: { x: 75, y: 75 },
        }),
      ],
      W, H,
    );
    expect(result.find((c) => c.id === "central")?.role).toBe("subject");
  });

  it("should compute bbox coverage ratio correctly", () => {
    // bbox 50x50 in 100x100 => ratio 0.25 < 0.3 => not bg-plate
    const result = assignRoles(
      [
        makeCandidate({
          id: "not-bg",
          coverage: 0.9,
          bbox: { x: 25, y: 25, w: 50, h: 50 },
          centroid: { x: 50, y: 50 },
        }),
      ],
      W, H,
    );
    expect(result[0].role).not.toBe("background-plate");
  });
});

// ==========================================================================
// orderByRole
// ==========================================================================

describe("orderByRole", () => {
  it("should order background-plate at z=0 (first)", () => {
    const input = [
      makeCandidate({ id: "subj", role: "subject" as LayerRole, coverage: 0.3 }),
      makeCandidate({ id: "bg", role: "background-plate" as LayerRole, coverage: 0.9 }),
      makeCandidate({ id: "fg", role: "foreground-occluder" as LayerRole, coverage: 0.1 }),
    ];
    const sorted = orderByRole(input);
    expect(sorted[0].role).toBe("background-plate");
    expect(sorted[sorted.length - 1].role).toBe("foreground-occluder");
  });

  it("should place all roles in correct z-order", () => {
    const roles: LayerRole[] = [
      "foreground-occluder",
      "detail",
      "subject",
      "midground",
      "background",
      "background-plate",
    ];
    const input = roles.map((role, i) =>
      makeCandidate({ id: `c${i}`, role, coverage: 0.5 - i * 0.01 }),
    );
    const sorted = orderByRole(input);
    const sortedRoles = sorted.map((c) => c.role);
    expect(sortedRoles).toEqual([
      "background-plate",
      "background",
      "midground",
      "subject",
      "detail",
      "foreground-occluder",
    ]);
  });

  it("should break ties by coverage (larger behind smaller)", () => {
    const input = [
      makeCandidate({ id: "small", role: "midground" as LayerRole, coverage: 0.1 }),
      makeCandidate({ id: "large", role: "midground" as LayerRole, coverage: 0.5 }),
    ];
    const sorted = orderByRole(input);
    expect(sorted[0].id).toBe("large");
    expect(sorted[1].id).toBe("small");
  });

  it("should break ties by depth when coverage matches", () => {
    const input = [
      makeCandidate({ id: "far", role: "midground" as LayerRole, coverage: 0.3, meanDepth: 50 }),
      makeCandidate({ id: "near", role: "midground" as LayerRole, coverage: 0.3, meanDepth: 200 }),
    ];
    const sorted = orderByRole(input);
    expect(sorted[0].id).toBe("far");
    expect(sorted[1].id).toBe("near");
  });

  it("should handle empty array", () => {
    expect(orderByRole([])).toEqual([]);
  });

  it("should handle single element", () => {
    const input = [makeCandidate({ id: "solo", role: "subject" as LayerRole })];
    const sorted = orderByRole(input);
    expect(sorted.length).toBe(1);
  });

  it("should default to midground z-order when role is undefined", () => {
    const input = [
      makeCandidate({ id: "bg", role: "background-plate" as LayerRole, coverage: 0.9 }),
      makeCandidate({ id: "norole", coverage: 0.3 }),
    ];
    const sorted = orderByRole(input);
    expect(sorted[0].role).toBe("background-plate");
  });

  it("should use meanDepth default of 128 when undefined", () => {
    const input = [
      makeCandidate({ id: "noDepth", role: "midground" as LayerRole, coverage: 0.3 }),
      makeCandidate({ id: "shallow", role: "midground" as LayerRole, coverage: 0.3, meanDepth: 200 }),
    ];
    const sorted = orderByRole(input);
    // noDepth defaults to 128, shallow is 200 => noDepth placed before
    expect(sorted[0].id).toBe("noDepth");
  });
});

// ==========================================================================
// applyRetentionRules
// ==========================================================================

describe("applyRetentionRules", () => {
  it("should keep all candidates above threshold", () => {
    const candidates = Array.from({ length: 4 }, (_, i) =>
      makeCandidate({
        id: `c${i}`,
        role: "midground" as LayerRole,
        uniqueCoverage: 0.1,
      }),
    );
    const result = applyRetentionRules(candidates);
    expect(result.filter((c) => !c.droppedReason).length).toBe(4);
  });

  it("should drop uniqueCoverage below 2% (non-critical)", () => {
    const candidates = [
      makeCandidate({ id: "good1", role: "midground" as LayerRole, uniqueCoverage: 0.1 }),
      makeCandidate({ id: "good2", role: "detail" as LayerRole, uniqueCoverage: 0.05 }),
      makeCandidate({ id: "good3", role: "midground" as LayerRole, uniqueCoverage: 0.03 }),
      makeCandidate({ id: "bad", role: "detail" as LayerRole, uniqueCoverage: 0.01 }),
    ];
    const result = applyRetentionRules(candidates);
    const retained = result.filter((c) => !c.droppedReason);
    expect(retained.length).toBe(3);
    expect(result.find((c) => c.id === "bad")?.droppedReason).toBeDefined();
  });

  it("should keep uniqueCoverage exactly at 2%", () => {
    const candidates = [
      makeCandidate({ id: "at2", role: "midground" as LayerRole, uniqueCoverage: 0.02 }),
      makeCandidate({ id: "above", role: "midground" as LayerRole, uniqueCoverage: 0.1 }),
      makeCandidate({ id: "above2", role: "midground" as LayerRole, uniqueCoverage: 0.05 }),
    ];
    const result = applyRetentionRules(candidates);
    expect(result.find((c) => c.id === "at2")?.droppedReason).toBeUndefined();
  });

  it("should drop uniqueCoverage just below 2% (1.9%)", () => {
    const candidates = [
      makeCandidate({ id: "below", role: "midground" as LayerRole, uniqueCoverage: 0.019 }),
      makeCandidate({ id: "above1", role: "midground" as LayerRole, uniqueCoverage: 0.1 }),
      makeCandidate({ id: "above2", role: "midground" as LayerRole, uniqueCoverage: 0.05 }),
      makeCandidate({ id: "above3", role: "detail" as LayerRole, uniqueCoverage: 0.03 }),
    ];
    const result = applyRetentionRules(candidates);
    expect(result.find((c) => c.id === "below")?.droppedReason).toBeDefined();
  });

  it("should keep role-critical (background-plate) even at 0.5%", () => {
    const candidates = [
      makeCandidate({ id: "bg", role: "background-plate" as LayerRole, uniqueCoverage: 0.005 }),
      makeCandidate({ id: "g1", role: "midground" as LayerRole, uniqueCoverage: 0.1 }),
      makeCandidate({ id: "g2", role: "detail" as LayerRole, uniqueCoverage: 0.05 }),
      makeCandidate({ id: "g3", role: "midground" as LayerRole, uniqueCoverage: 0.03 }),
    ];
    const result = applyRetentionRules(candidates);
    expect(result.find((c) => c.id === "bg")?.droppedReason).toBeUndefined();
  });

  it("should keep role-critical (subject) even at low uniqueCoverage", () => {
    const candidates = [
      makeCandidate({ id: "subj", role: "subject" as LayerRole, uniqueCoverage: 0.001 }),
      makeCandidate({ id: "g1", role: "midground" as LayerRole, uniqueCoverage: 0.1 }),
      makeCandidate({ id: "g2", role: "detail" as LayerRole, uniqueCoverage: 0.05 }),
      makeCandidate({ id: "g3", role: "midground" as LayerRole, uniqueCoverage: 0.03 }),
    ];
    const result = applyRetentionRules(candidates);
    expect(result.find((c) => c.id === "subj")?.droppedReason).toBeUndefined();
  });

  it("should apply progressive relaxation when retained < MIN_RETAINED=3", () => {
    // All non-critical candidates have very low uniqueCoverage
    const candidates = [
      makeCandidate({ id: "c1", role: "midground" as LayerRole, uniqueCoverage: 0.015 }),
      makeCandidate({ id: "c2", role: "detail" as LayerRole, uniqueCoverage: 0.012 }),
      makeCandidate({ id: "c3", role: "midground" as LayerRole, uniqueCoverage: 0.008 }),
    ];
    const result = applyRetentionRules(candidates);
    const retained = result.filter((c) => !c.droppedReason);
    // Progressive relaxation should keep at least 3
    expect(retained.length).toBe(3);
  });

  it("should cap at maxLayers (default 8) with priority ladder", () => {
    const candidates = Array.from({ length: 12 }, (_, i) =>
      makeCandidate({
        id: `c${i}`,
        role: (i < 2 ? "background-plate" : i < 4 ? "subject" : "detail") as LayerRole,
        uniqueCoverage: 0.1,
      }),
    );
    const result = applyRetentionRules(candidates, 8);
    const retained = result.filter((c) => !c.droppedReason);
    expect(retained.length).toBeLessThanOrEqual(8);
  });

  it("should cap at custom maxLayers", () => {
    const candidates = Array.from({ length: 6 }, (_, i) =>
      makeCandidate({
        id: `c${i}`,
        role: "midground" as LayerRole,
        uniqueCoverage: 0.1,
      }),
    );
    const result = applyRetentionRules(candidates, 4);
    const retained = result.filter((c) => !c.droppedReason);
    expect(retained.length).toBeLessThanOrEqual(4);
  });

  it("should drop lowest-priority roles first when capping", () => {
    const candidates = [
      makeCandidate({ id: "bg", role: "background-plate" as LayerRole, uniqueCoverage: 0.1 }),
      makeCandidate({ id: "subj", role: "subject" as LayerRole, uniqueCoverage: 0.1 }),
      makeCandidate({ id: "d1", role: "detail" as LayerRole, uniqueCoverage: 0.1 }),
      makeCandidate({ id: "d2", role: "detail" as LayerRole, uniqueCoverage: 0.1 }),
    ];
    const result = applyRetentionRules(candidates, 2);
    const retained = result.filter((c) => !c.droppedReason);
    // bg-plate (priority 6) and subject (priority 5) should survive
    const retainedIds = retained.map((c) => c.id);
    expect(retainedIds).toContain("bg");
    expect(retainedIds).toContain("subj");
  });

  it("should synthesize fallback bg-plate from originalImagePath when none exists", () => {
    const candidates = [
      makeCandidate({ id: "subj", role: "subject" as LayerRole, uniqueCoverage: 0.1 }),
      makeCandidate({ id: "mid", role: "midground" as LayerRole, uniqueCoverage: 0.05 }),
      makeCandidate({ id: "det", role: "detail" as LayerRole, uniqueCoverage: 0.03 }),
    ];
    const result = applyRetentionRules(candidates, 8, "/path/to/original.png");
    const bgPlate = result.find((c) => c.id === "fallback-bg-plate");
    expect(bgPlate).toBeDefined();
    expect(bgPlate?.role).toBe("background-plate");
    expect(bgPlate?.coverage).toBe(1.0);
    expect(bgPlate?.filePath).toBe("/path/to/original.png");
  });

  it("should NOT synthesize bg-plate when one already exists", () => {
    const candidates = [
      makeCandidate({ id: "bg", role: "background-plate" as LayerRole, uniqueCoverage: 0.1 }),
      makeCandidate({ id: "mid", role: "midground" as LayerRole, uniqueCoverage: 0.05 }),
      makeCandidate({ id: "det", role: "detail" as LayerRole, uniqueCoverage: 0.03 }),
    ];
    const result = applyRetentionRules(candidates, 8, "/path/to/original.png");
    expect(result.find((c) => c.id === "fallback-bg-plate")).toBeUndefined();
  });

  it("should NOT synthesize bg-plate when no originalImagePath", () => {
    const candidates = [
      makeCandidate({ id: "subj", role: "subject" as LayerRole, uniqueCoverage: 0.1 }),
      makeCandidate({ id: "mid", role: "midground" as LayerRole, uniqueCoverage: 0.05 }),
      makeCandidate({ id: "det", role: "detail" as LayerRole, uniqueCoverage: 0.03 }),
    ];
    const result = applyRetentionRules(candidates);
    expect(result.find((c) => c.id === "fallback-bg-plate")).toBeUndefined();
  });

  it("should treat missing uniqueCoverage as 0", () => {
    const candidates = [
      makeCandidate({ id: "nouc", role: "midground" as LayerRole }),
      makeCandidate({ id: "g1", role: "midground" as LayerRole, uniqueCoverage: 0.1 }),
      makeCandidate({ id: "g2", role: "detail" as LayerRole, uniqueCoverage: 0.05 }),
      makeCandidate({ id: "g3", role: "midground" as LayerRole, uniqueCoverage: 0.03 }),
    ];
    const result = applyRetentionRules(candidates);
    // nouc has undefined uniqueCoverage → treated as 0 → dropped
    expect(result.find((c) => c.id === "nouc")?.droppedReason).toBeDefined();
  });

  it("should include drop reason for capped candidates", () => {
    const candidates = Array.from({ length: 10 }, (_, i) =>
      makeCandidate({
        id: `c${i}`,
        role: "detail" as LayerRole,
        uniqueCoverage: 0.1,
      }),
    );
    const result = applyRetentionRules(candidates, 5);
    const dropped = result.filter((c) => c.droppedReason?.includes("cap"));
    expect(dropped.length).toBe(5);
  });
});

// ==========================================================================
// buildExclusiveMasks
// ==========================================================================

describe("buildExclusiveMasks", () => {
  it("should accumulate claimed mask correctly", async () => {
    const buf1 = createRgbaBuffer(10, 10);
    paintRect(buf1, 10, { x: 0, y: 0, w: 5, h: 10 }, OPAQUE);
    const buf2 = createRgbaBuffer(10, 10);
    paintRect(buf2, 10, { x: 3, y: 0, w: 7, h: 10 }, OPAQUE);
    const f1 = await savePng(buf1, 10, 10, "bm-1.png");
    const f2 = await savePng(buf2, 10, 10, "bm-2.png");

    const { exclusiveCounts, claimedMask } = await buildExclusiveMasks(
      [
        makeCandidate({ id: "a", filePath: f1, width: 10, height: 10 }),
        makeCandidate({ id: "b", filePath: f2, width: 10, height: 10 }),
      ],
      10, 10,
    );

    // a claims 50 pixels, b claims 50 (7*10 - 20 shared = 50)
    expect(exclusiveCounts[0]).toBe(50);
    expect(exclusiveCounts[1]).toBe(50);

    // Total claimed = 100
    const claimed = claimedMask.reduce((sum, v) => sum + v, 0);
    expect(claimed).toBe(100);
  });
});

// ==========================================================================
// fillBackgroundPlate
// ==========================================================================

describe("fillBackgroundPlate", () => {
  it("should not warn when hole ratio <= 50%", async () => {
    const bgBuf = createRgbaBuffer(10, 10);
    paintRect(bgBuf, 10, { x: 0, y: 0, w: 10, h: 6 }, OPAQUE);
    const bgPath = await savePng(bgBuf, 10, 10, "fill-bg-low.png");

    const origBuf = createRgbaBuffer(10, 10);
    fillBuffer(origBuf, OPAQUE);
    const origPath = await savePng(origBuf, 10, 10, "fill-orig-low.png");

    // claimed mask: top 6 rows claimed
    const claimed = new Uint8Array(100);
    for (let i = 0; i < 60; i++) claimed[i] = 1;

    const result = await fillBackgroundPlate(
      makeCandidate({ id: "bg", filePath: bgPath, width: 10, height: 10, role: "background-plate" as LayerRole }),
      origPath, claimed, 10, 10, tmpDir,
    );
    expect(result.warning).toBe(false);
  });

  it("should warn when hole ratio > 50%", async () => {
    const bgBuf = createRgbaBuffer(10, 10);
    paintRect(bgBuf, 10, { x: 0, y: 0, w: 10, h: 4 }, OPAQUE);
    const bgPath = await savePng(bgBuf, 10, 10, "fill-bg-high.png");

    const origBuf = createRgbaBuffer(10, 10);
    fillBuffer(origBuf, OPAQUE);
    const origPath = await savePng(origBuf, 10, 10, "fill-orig-high.png");

    // claimed: only 30 of 100 pixels
    const claimed = new Uint8Array(100);
    for (let i = 0; i < 30; i++) claimed[i] = 1;

    const result = await fillBackgroundPlate(
      makeCandidate({ id: "bg", filePath: bgPath, width: 10, height: 10, role: "background-plate" as LayerRole }),
      origPath, claimed, 10, 10, tmpDir,
    );
    expect(result.warning).toBe(true);
  });

  it("should set coverage to 1.0 after filling", async () => {
    const bgBuf = createRgbaBuffer(10, 10);
    paintRect(bgBuf, 10, { x: 0, y: 0, w: 10, h: 5 }, OPAQUE);
    const bgPath = await savePng(bgBuf, 10, 10, "fill-bg-cov.png");

    const origBuf = createRgbaBuffer(10, 10);
    fillBuffer(origBuf, OPAQUE);
    const origPath = await savePng(origBuf, 10, 10, "fill-orig-cov.png");

    const claimed = new Uint8Array(100);
    for (let i = 0; i < 50; i++) claimed[i] = 1;

    const result = await fillBackgroundPlate(
      makeCandidate({ id: "bg", filePath: bgPath, width: 10, height: 10, coverage: 0.5, role: "background-plate" as LayerRole }),
      origPath, claimed, 10, 10, tmpDir,
    );
    expect(result.coverage).toBe(1.0);
  });

  it("should produce a valid PNG file", async () => {
    const bgBuf = createRgbaBuffer(10, 10);
    fillBuffer(bgBuf, OPAQUE);
    const bgPath = await savePng(bgBuf, 10, 10, "fill-bg-valid.png");

    const origBuf = createRgbaBuffer(10, 10);
    fillBuffer(origBuf, OPAQUE);
    const origPath = await savePng(origBuf, 10, 10, "fill-orig-valid.png");

    const claimed = new Uint8Array(100).fill(1);

    const result = await fillBackgroundPlate(
      makeCandidate({ id: "bg", filePath: bgPath, width: 10, height: 10, role: "background-plate" as LayerRole }),
      origPath, claimed, 10, 10, tmpDir,
    );
    expect(fs.existsSync(result.filePath)).toBe(true);
    const meta = await sharp(result.filePath).metadata();
    expect(meta.width).toBe(10);
    expect(meta.height).toBe(10);
  });

  it("should handle 0% holes (all claimed)", async () => {
    const bgBuf = createRgbaBuffer(10, 10);
    fillBuffer(bgBuf, OPAQUE);
    const bgPath = await savePng(bgBuf, 10, 10, "fill-bg-0hole.png");
    const origBuf = createRgbaBuffer(10, 10);
    fillBuffer(origBuf, OPAQUE);
    const origPath = await savePng(origBuf, 10, 10, "fill-orig-0hole.png");

    const claimed = new Uint8Array(100).fill(1);
    const result = await fillBackgroundPlate(
      makeCandidate({ id: "bg", filePath: bgPath, width: 10, height: 10, role: "background-plate" as LayerRole }),
      origPath, claimed, 10, 10, tmpDir,
    );
    expect(result.warning).toBe(false);
  });

  it("should handle 100% holes (none claimed)", async () => {
    const bgBuf = createRgbaBuffer(10, 10);
    const bgPath = await savePng(bgBuf, 10, 10, "fill-bg-100hole.png");
    const origBuf = createRgbaBuffer(10, 10);
    fillBuffer(origBuf, OPAQUE);
    const origPath = await savePng(origBuf, 10, 10, "fill-orig-100hole.png");

    const claimed = new Uint8Array(100);
    const result = await fillBackgroundPlate(
      makeCandidate({ id: "bg", filePath: bgPath, width: 10, height: 10, role: "background-plate" as LayerRole }),
      origPath, claimed, 10, 10, tmpDir,
    );
    expect(result.warning).toBe(true);
  });
});
