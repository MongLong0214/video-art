import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";

import type { LayerCandidate } from "../../src/lib/scene-schema.js";

// Will fail until implementation exists
import {
  deduplicateCandidates,
  resolveExclusiveOwnership,
  computePairwiseOverlap,
  assignRoles,
  orderByRole,
  applyRetentionRules,
  fillBackgroundPlate,
} from "./layer-resolve.js";

// ---------- helpers ----------

/** Create an RGBA buffer of given dimensions, all pixels transparent */
function createRgbaBuffer(width: number, height: number): Buffer {
  return Buffer.alloc(width * height * 4);
}

/** Paint a filled rectangle into an RGBA buffer */
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

/** Helper to save an RGBA buffer as PNG and build a minimal LayerCandidate */
async function makeCandidate(
  buf: Buffer,
  width: number,
  height: number,
  filePath: string,
  overrides: Partial<LayerCandidate> = {},
): Promise<LayerCandidate> {
  await sharp(buf, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(filePath);

  // Compute coverage from alpha channel
  const totalPixels = width * height;
  let opaqueCount = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (buf[i * 4 + 3] > 128) opaqueCount++;
  }
  const coverage = opaqueCount / totalPixels;

  return {
    id: overrides.id ?? `cand-${path.basename(filePath, ".png")}`,
    source: "qwen-base",
    filePath,
    width,
    height,
    coverage,
    bbox: overrides.bbox ?? { x: 0, y: 0, w: width, h: height },
    centroid: overrides.centroid ?? { x: width / 2, y: height / 2 },
    edgeDensity: overrides.edgeDensity ?? 0.1,
    componentCount: overrides.componentCount ?? 1,
    ...overrides,
  };
}

// ---------- test fixtures ----------

let tmpDir: string;

// Candidate PNG paths
let highOverlapAPath: string;
let highOverlapBPath: string;
let lowOverlapAPath: string;
let lowOverlapBPath: string;
let ownershipAPath: string;
let ownershipBPath: string;

const W = 200;
const H = 200;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "layer-resolve-test-"));

  // --- High overlap (90%): nearly identical masks ---
  // A: cols 0-179, rows 0-199 (180x200 = 36000 opaque)
  // B: cols 10-189, rows 0-199 (180x200 = 36000 opaque)
  // Intersection: cols 10-179, rows 0-199 = 170x200 = 34000
  // Union: cols 0-189, rows 0-199 = 190x200 = 38000
  // IoU = 34000/38000 = 0.8947 > 0.85
  const highA = createRgbaBuffer(W, H);
  paintRect(highA, W, { x: 0, y: 0, w: 180, h: 200 }, { r: 255, g: 0, b: 0, a: 255 });
  highOverlapAPath = path.join(tmpDir, "high-a.png");
  await sharp(highA, { raw: { width: W, height: H, channels: 4 } }).png().toFile(highOverlapAPath);

  const highB = createRgbaBuffer(W, H);
  paintRect(highB, W, { x: 10, y: 0, w: 180, h: 200 }, { r: 0, g: 0, b: 255, a: 255 });
  highOverlapBPath = path.join(tmpDir, "high-b.png");
  await sharp(highB, { raw: { width: W, height: H, channels: 4 } }).png().toFile(highOverlapBPath);

  // --- Low overlap (30%): clearly separate ---
  // A: cols 0-99, rows 0-199 (100x200 = 20000 opaque)
  // B: cols 70-169, rows 0-199 (100x200 = 20000 opaque)
  // Intersection: cols 70-99, rows 0-199 = 30x200 = 6000
  // Union: cols 0-169, rows 0-199 = 170x200 = 34000
  // IoU = 6000/34000 = 0.176 < 0.85
  const lowA = createRgbaBuffer(W, H);
  paintRect(lowA, W, { x: 0, y: 0, w: 100, h: 200 }, { r: 255, g: 0, b: 0, a: 255 });
  lowOverlapAPath = path.join(tmpDir, "low-a.png");
  await sharp(lowA, { raw: { width: W, height: H, channels: 4 } }).png().toFile(lowOverlapAPath);

  const lowB = createRgbaBuffer(W, H);
  paintRect(lowB, W, { x: 70, y: 0, w: 100, h: 200 }, { r: 0, g: 0, b: 255, a: 255 });
  lowOverlapBPath = path.join(tmpDir, "low-b.png");
  await sharp(lowB, { raw: { width: W, height: H, channels: 4 } }).png().toFile(lowOverlapBPath);

  // --- Ownership test (50% overlap) ---
  // A: cols 0-149, rows 0-199 (150x200 = 30000 opaque)
  // B: cols 50-199, rows 0-199 (150x200 = 30000 opaque)
  // Overlap region: cols 50-149 = 100x200 = 20000
  const ownA = createRgbaBuffer(W, H);
  paintRect(ownA, W, { x: 0, y: 0, w: 150, h: 200 }, { r: 255, g: 0, b: 0, a: 255 });
  ownershipAPath = path.join(tmpDir, "own-a.png");
  await sharp(ownA, { raw: { width: W, height: H, channels: 4 } }).png().toFile(ownershipAPath);

  const ownB = createRgbaBuffer(W, H);
  paintRect(ownB, W, { x: 50, y: 0, w: 150, h: 200 }, { r: 0, g: 0, b: 255, a: 255 });
  ownershipBPath = path.join(tmpDir, "own-b.png");
  await sharp(ownB, { raw: { width: W, height: H, channels: 4 } }).png().toFile(ownershipBPath);
});

afterAll(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ---------- tests ----------

describe("deduplicateCandidates", () => {
  it("should merge candidates with IoU > 0.85", async () => {
    const candA = await makeCandidate(
      (() => {
        const b = createRgbaBuffer(W, H);
        paintRect(b, W, { x: 0, y: 0, w: 180, h: 200 }, { r: 255, g: 0, b: 0, a: 255 });
        return b;
      })(),
      W,
      H,
      highOverlapAPath,
      { id: "high-a", bbox: { x: 0, y: 0, w: 180, h: 200 }, centroid: { x: 89.5, y: 99.5 } },
    );
    const candB = await makeCandidate(
      (() => {
        const b = createRgbaBuffer(W, H);
        paintRect(b, W, { x: 10, y: 0, w: 180, h: 200 }, { r: 0, g: 0, b: 255, a: 255 });
        return b;
      })(),
      W,
      H,
      highOverlapBPath,
      { id: "high-b", bbox: { x: 10, y: 0, w: 180, h: 200 }, centroid: { x: 99.5, y: 99.5 } },
    );

    const result = await deduplicateCandidates([candA, candB]);

    const retained = result.filter((c) => !c.droppedReason);
    const dropped = result.filter((c) => c.droppedReason);

    expect(retained).toHaveLength(1);
    expect(dropped).toHaveLength(1);
  });

  it("should keep candidates with IoU < 0.85", async () => {
    const candA = await makeCandidate(
      (() => {
        const b = createRgbaBuffer(W, H);
        paintRect(b, W, { x: 0, y: 0, w: 100, h: 200 }, { r: 255, g: 0, b: 0, a: 255 });
        return b;
      })(),
      W,
      H,
      lowOverlapAPath,
      { id: "low-a", bbox: { x: 0, y: 0, w: 100, h: 200 }, centroid: { x: 49.5, y: 99.5 } },
    );
    const candB = await makeCandidate(
      (() => {
        const b = createRgbaBuffer(W, H);
        paintRect(b, W, { x: 70, y: 0, w: 100, h: 200 }, { r: 0, g: 0, b: 255, a: 255 });
        return b;
      })(),
      W,
      H,
      lowOverlapBPath,
      { id: "low-b", bbox: { x: 70, y: 0, w: 100, h: 200 }, centroid: { x: 119.5, y: 99.5 } },
    );

    const result = await deduplicateCandidates([candA, candB]);

    const retained = result.filter((c) => !c.droppedReason);

    expect(retained).toHaveLength(2);
  });

  it("should record drop reasons for dedupe", async () => {
    const candA = await makeCandidate(
      (() => {
        const b = createRgbaBuffer(W, H);
        paintRect(b, W, { x: 0, y: 0, w: 180, h: 200 }, { r: 255, g: 0, b: 0, a: 255 });
        return b;
      })(),
      W,
      H,
      highOverlapAPath,
      { id: "drop-a", bbox: { x: 0, y: 0, w: 180, h: 200 }, centroid: { x: 89.5, y: 99.5 } },
    );
    const candB = await makeCandidate(
      (() => {
        const b = createRgbaBuffer(W, H);
        paintRect(b, W, { x: 10, y: 0, w: 180, h: 200 }, { r: 0, g: 0, b: 255, a: 255 });
        return b;
      })(),
      W,
      H,
      highOverlapBPath,
      { id: "drop-b", bbox: { x: 10, y: 0, w: 180, h: 200 }, centroid: { x: 99.5, y: 99.5 } },
    );

    const result = await deduplicateCandidates([candA, candB]);

    const dropped = result.filter((c) => c.droppedReason);

    expect(dropped).toHaveLength(1);
    expect(dropped[0].droppedReason).toBeTruthy();
    expect(dropped[0].droppedReason).toContain("dedupe");
  });
});

describe("resolveExclusiveOwnership", () => {
  it("should enforce exclusive ownership", async () => {
    const candA = await makeCandidate(
      (() => {
        const b = createRgbaBuffer(W, H);
        paintRect(b, W, { x: 0, y: 0, w: 150, h: 200 }, { r: 255, g: 0, b: 0, a: 255 });
        return b;
      })(),
      W,
      H,
      ownershipAPath,
      { id: "own-a" },
    );
    const candB = await makeCandidate(
      (() => {
        const b = createRgbaBuffer(W, H);
        paintRect(b, W, { x: 50, y: 0, w: 150, h: 200 }, { r: 0, g: 0, b: 255, a: 255 });
        return b;
      })(),
      W,
      H,
      ownershipBPath,
      { id: "own-b" },
    );

    const result = await resolveExclusiveOwnership([candA, candB], W, H);

    // Both should have uniqueCoverage assigned
    expect(result[0].uniqueCoverage).toBeDefined();
    expect(result[1].uniqueCoverage).toBeDefined();

    // A claims first -> gets all 150 cols. B gets only unclaimed cols 150-199.
    // A exclusive: cols 0-149 = 150*200 = 30000. uniqueCoverage = 30000/40000 = 0.75
    // B exclusive: cols 150-199 = 50*200 = 10000. uniqueCoverage = 10000/40000 = 0.25
    expect(result[0].uniqueCoverage!).toBeCloseTo(0.75, 2);
    expect(result[1].uniqueCoverage!).toBeCloseTo(0.25, 2);

    // Exclusive masks must not overlap: A's unique + B's unique = their combined unique total
    // This means exclusive_A intersection exclusive_B = 0
    const totalUnique = result[0].uniqueCoverage! + result[1].uniqueCoverage!;
    // Total unique should equal the union coverage (not exceed 1.0)
    expect(totalUnique).toBeLessThanOrEqual(1.0);
  });

  it("should compute uniqueCoverage for each candidate", async () => {
    const candA = await makeCandidate(
      (() => {
        const b = createRgbaBuffer(W, H);
        paintRect(b, W, { x: 0, y: 0, w: 150, h: 200 }, { r: 255, g: 0, b: 0, a: 255 });
        return b;
      })(),
      W,
      H,
      ownershipAPath,
      { id: "uc-a" },
    );
    const candB = await makeCandidate(
      (() => {
        const b = createRgbaBuffer(W, H);
        paintRect(b, W, { x: 50, y: 0, w: 150, h: 200 }, { r: 0, g: 0, b: 255, a: 255 });
        return b;
      })(),
      W,
      H,
      ownershipBPath,
      { id: "uc-b" },
    );

    const result = await resolveExclusiveOwnership([candA, candB], W, H);

    for (const c of result) {
      expect(c.uniqueCoverage).toBeDefined();
      expect(c.uniqueCoverage).toBeGreaterThan(0);
    }
  });
});

describe("computePairwiseOverlap", () => {
  it("should compute pairwise overlap <= 5% after exclusive ownership", async () => {
    const candA = await makeCandidate(
      (() => {
        const b = createRgbaBuffer(W, H);
        paintRect(b, W, { x: 0, y: 0, w: 150, h: 200 }, { r: 255, g: 0, b: 0, a: 255 });
        return b;
      })(),
      W,
      H,
      ownershipAPath,
      { id: "pw-a" },
    );
    const candB = await makeCandidate(
      (() => {
        const b = createRgbaBuffer(W, H);
        paintRect(b, W, { x: 50, y: 0, w: 150, h: 200 }, { r: 0, g: 0, b: 255, a: 255 });
        return b;
      })(),
      W,
      H,
      ownershipBPath,
      { id: "pw-b" },
    );

    // First resolve exclusive ownership
    const resolved = await resolveExclusiveOwnership([candA, candB], W, H);

    // Then compute pairwise overlap on the resolved masks
    const overlaps = await computePairwiseOverlap(resolved, W, H);

    // After exclusive ownership, pairwise overlap should be 0 (or at most <= 5%)
    for (const entry of overlaps) {
      expect(entry.overlap).toBeLessThanOrEqual(0.05);
    }
  });
});

// ==========================================================================
// T5: Role Assignment + Background Plate + Final Drop/Cap
// ==========================================================================

// ---------- T5 fixtures ----------

let bgPlatePath: string;
let subjectPath: string;
let fgOccluderPath: string;
let midgroundPath: string;
let detailPath: string;
let backgroundPath: string;
let originalImagePath: string;

beforeAll(async () => {
  // Background plate: covers most of image (180x180 starting from 10,10)
  const bgBuf = createRgbaBuffer(W, H);
  paintRect(bgBuf, W, { x: 10, y: 10, w: 180, h: 180 }, { r: 100, g: 150, b: 200, a: 255 });
  bgPlatePath = path.join(tmpDir, "t5-bg-plate.png");
  await sharp(bgBuf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(bgPlatePath);

  // Subject: central region (60x60 centered at 100,100)
  const subBuf = createRgbaBuffer(W, H);
  paintRect(subBuf, W, { x: 70, y: 70, w: 60, h: 60 }, { r: 255, g: 100, b: 100, a: 255 });
  subjectPath = path.join(tmpDir, "t5-subject.png");
  await sharp(subBuf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(subjectPath);

  // Foreground occluder: touches bottom edge (180x30 at y=170)
  const fgBuf = createRgbaBuffer(W, H);
  paintRect(fgBuf, W, { x: 10, y: 170, w: 180, h: 30 }, { r: 50, g: 50, b: 50, a: 255 });
  fgOccluderPath = path.join(tmpDir, "t5-fg-occluder.png");
  await sharp(fgBuf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(fgOccluderPath);

  // Midground: medium area, not central (80x60 at top-left quadrant)
  const midBuf = createRgbaBuffer(W, H);
  paintRect(midBuf, W, { x: 20, y: 30, w: 80, h: 60 }, { r: 150, g: 200, b: 100, a: 255 });
  midgroundPath = path.join(tmpDir, "t5-midground.png");
  await sharp(midBuf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(midgroundPath);

  // Detail: small isolated element (20x20)
  const detBuf = createRgbaBuffer(W, H);
  paintRect(detBuf, W, { x: 160, y: 20, w: 20, h: 20 }, { r: 255, g: 255, b: 0, a: 255 });
  detailPath = path.join(tmpDir, "t5-detail.png");
  await sharp(detBuf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(detailPath);

  // Background: second-widest area (120x120)
  const bgBuf2 = createRgbaBuffer(W, H);
  paintRect(bgBuf2, W, { x: 30, y: 30, w: 120, h: 120 }, { r: 80, g: 120, b: 160, a: 255 });
  backgroundPath = path.join(tmpDir, "t5-background.png");
  await sharp(bgBuf2, { raw: { width: W, height: H, channels: 4 } }).png().toFile(backgroundPath);

  // Original image: fully opaque (used for hole fill)
  const origBuf = createRgbaBuffer(W, H);
  paintRect(origBuf, W, { x: 0, y: 0, w: W, h: H }, { r: 200, g: 200, b: 200, a: 255 });
  originalImagePath = path.join(tmpDir, "t5-original.png");
  await sharp(origBuf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(originalImagePath);
});

describe("assignRoles", () => {
  it("should assign background-plate to widest back layer", async () => {
    const bgPlate = await makeCandidate(
      createRgbaBuffer(W, H), W, H, bgPlatePath,
      {
        id: "bg-plate",
        coverage: 0.81, // 180*180 / 200*200
        bbox: { x: 10, y: 10, w: 180, h: 180 },
        centroid: { x: 100, y: 100 },
      },
    );
    const subject = await makeCandidate(
      createRgbaBuffer(W, H), W, H, subjectPath,
      {
        id: "subject",
        coverage: 0.09, // 60*60 / 40000
        bbox: { x: 70, y: 70, w: 60, h: 60 },
        centroid: { x: 100, y: 100 },
      },
    );

    const result = assignRoles([bgPlate, subject], W, H);
    const plate = result.find((c) => c.id === "bg-plate");
    expect(plate?.role).toBe("background-plate");
  });

  it("should assign subject to central bbox", async () => {
    const bgPlate = await makeCandidate(
      createRgbaBuffer(W, H), W, H, bgPlatePath,
      {
        id: "bg-plate",
        coverage: 0.81,
        bbox: { x: 10, y: 10, w: 180, h: 180 },
        centroid: { x: 100, y: 100 },
      },
    );
    const subject = await makeCandidate(
      createRgbaBuffer(W, H), W, H, subjectPath,
      {
        id: "subject",
        coverage: 0.09,
        bbox: { x: 70, y: 70, w: 60, h: 60 },
        centroid: { x: 100, y: 100 },
      },
    );

    const result = assignRoles([bgPlate, subject], W, H);
    const sub = result.find((c) => c.id === "subject");
    expect(sub?.role).toBe("subject");
  });

  it("should assign foreground-occluder to edge-touching front", async () => {
    const bgPlate = await makeCandidate(
      createRgbaBuffer(W, H), W, H, bgPlatePath,
      {
        id: "bg-plate",
        coverage: 0.81,
        bbox: { x: 10, y: 10, w: 180, h: 180 },
        centroid: { x: 100, y: 100 },
      },
    );
    const fgOccluder = await makeCandidate(
      createRgbaBuffer(W, H), W, H, fgOccluderPath,
      {
        id: "fg-occ",
        coverage: 0.135, // 180*30 / 40000
        bbox: { x: 10, y: 170, w: 180, h: 30 },
        centroid: { x: 100, y: 185 },
      },
    );

    const result = assignRoles([bgPlate, fgOccluder], W, H);
    const fg = result.find((c) => c.id === "fg-occ");
    expect(fg?.role).toBe("foreground-occluder");
  });
});

describe("orderByRole", () => {
  it("should place bg-plate at lowest zIndex", () => {
    const candidates: LayerCandidate[] = [
      {
        id: "mid", source: "qwen-base", filePath: midgroundPath,
        width: W, height: H, coverage: 0.12, edgeDensity: 0.1, componentCount: 1,
        bbox: { x: 20, y: 30, w: 80, h: 60 }, centroid: { x: 60, y: 60 },
        role: "midground",
      },
      {
        id: "bg", source: "qwen-base", filePath: bgPlatePath,
        width: W, height: H, coverage: 0.81, edgeDensity: 0.05, componentCount: 1,
        bbox: { x: 10, y: 10, w: 180, h: 180 }, centroid: { x: 100, y: 100 },
        role: "background-plate",
      },
      {
        id: "sub", source: "qwen-base", filePath: subjectPath,
        width: W, height: H, coverage: 0.09, edgeDensity: 0.15, componentCount: 1,
        bbox: { x: 70, y: 70, w: 60, h: 60 }, centroid: { x: 100, y: 100 },
        role: "subject",
      },
    ];

    const ordered = orderByRole(candidates);
    expect(ordered[0].role).toBe("background-plate");
    expect(ordered[0].id).toBe("bg");
  });

  it("should place fg-occluder at highest zIndex", () => {
    const candidates: LayerCandidate[] = [
      {
        id: "bg", source: "qwen-base", filePath: bgPlatePath,
        width: W, height: H, coverage: 0.81, edgeDensity: 0.05, componentCount: 1,
        bbox: { x: 10, y: 10, w: 180, h: 180 }, centroid: { x: 100, y: 100 },
        role: "background-plate",
      },
      {
        id: "fg", source: "qwen-base", filePath: fgOccluderPath,
        width: W, height: H, coverage: 0.135, edgeDensity: 0.2, componentCount: 1,
        bbox: { x: 10, y: 170, w: 180, h: 30 }, centroid: { x: 100, y: 185 },
        role: "foreground-occluder",
      },
      {
        id: "sub", source: "qwen-base", filePath: subjectPath,
        width: W, height: H, coverage: 0.09, edgeDensity: 0.15, componentCount: 1,
        bbox: { x: 70, y: 70, w: 60, h: 60 }, centroid: { x: 100, y: 100 },
        role: "subject",
      },
    ];

    const ordered = orderByRole(candidates);
    const last = ordered[ordered.length - 1];
    expect(last.role).toBe("foreground-occluder");
    expect(last.id).toBe("fg");
  });

  it("should not order by coverage alone", () => {
    // A small subject should appear above a large background in z-order
    const candidates: LayerCandidate[] = [
      {
        id: "large-bg", source: "qwen-base", filePath: bgPlatePath,
        width: W, height: H, coverage: 0.81, edgeDensity: 0.05, componentCount: 1,
        bbox: { x: 10, y: 10, w: 180, h: 180 }, centroid: { x: 100, y: 100 },
        role: "background-plate",
      },
      {
        id: "small-sub", source: "qwen-base", filePath: subjectPath,
        width: W, height: H, coverage: 0.09, edgeDensity: 0.15, componentCount: 1,
        bbox: { x: 70, y: 70, w: 60, h: 60 }, centroid: { x: 100, y: 100 },
        role: "subject",
      },
    ];

    const ordered = orderByRole(candidates);
    const bgIdx = ordered.findIndex((c) => c.id === "large-bg");
    const subIdx = ordered.findIndex((c) => c.id === "small-sub");
    // Subject must have higher z-index (later in array) than background
    expect(subIdx).toBeGreaterThan(bgIdx);
  });
});

describe("fillBackgroundPlate", () => {
  it("should fill bg plate holes with unclaimed pixels", async () => {
    // Background plate: only covers right half (100x200)
    const bgBuf = createRgbaBuffer(W, H);
    paintRect(bgBuf, W, { x: 100, y: 0, w: 100, h: 200 }, { r: 100, g: 150, b: 200, a: 255 });
    const partialBgPath = path.join(tmpDir, "t5-partial-bg.png");
    await sharp(bgBuf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(partialBgPath);

    // Claimed mask: right half is claimed by the bg plate
    const claimedMask = new Uint8Array(W * H);
    for (let row = 0; row < H; row++) {
      for (let col = 100; col < W; col++) {
        claimedMask[row * W + col] = 1;
      }
    }

    const bgCandidate: LayerCandidate = {
      id: "bg-partial", source: "qwen-base", filePath: partialBgPath,
      width: W, height: H, coverage: 0.5, edgeDensity: 0.05, componentCount: 1,
      bbox: { x: 100, y: 0, w: 100, h: 200 }, centroid: { x: 150, y: 100 },
      role: "background-plate",
    };

    const outputDir = path.join(tmpDir, "t5-fill-output");
    fs.mkdirSync(outputDir, { recursive: true });

    const result = await fillBackgroundPlate(
      bgCandidate, originalImagePath, claimedMask, W, H, outputDir,
    );

    // Result should have updated filePath pointing to the filled plate
    expect(result.filePath).not.toBe(partialBgPath);
    expect(fs.existsSync(result.filePath)).toBe(true);

    // Verify the filled plate has pixels in the previously-unclaimed left half
    const { data } = await sharp(result.filePath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const rgba = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

    // Check a pixel in the left half (col=50, row=100) is now opaque
    const testPixelIdx = (100 * W + 50) * 4;
    expect(rgba[testPixelIdx + 3]).toBeGreaterThan(128);
  });

  it("should warn when hole > 50%", async () => {
    // Background plate: only covers 40% (cols 120-199, all rows = 80*200 = 16000 / 40000 = 0.4)
    const bgBuf = createRgbaBuffer(W, H);
    paintRect(bgBuf, W, { x: 120, y: 0, w: 80, h: 200 }, { r: 100, g: 150, b: 200, a: 255 });
    const smallBgPath = path.join(tmpDir, "t5-small-bg.png");
    await sharp(bgBuf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(smallBgPath);

    // Claimed mask: only the bg region is claimed
    const claimedMask = new Uint8Array(W * H);
    for (let row = 0; row < H; row++) {
      for (let col = 120; col < W; col++) {
        claimedMask[row * W + col] = 1;
      }
    }

    const bgCandidate: LayerCandidate = {
      id: "bg-small", source: "qwen-base", filePath: smallBgPath,
      width: W, height: H, coverage: 0.4, edgeDensity: 0.05, componentCount: 1,
      bbox: { x: 120, y: 0, w: 80, h: 200 }, centroid: { x: 160, y: 100 },
      role: "background-plate",
    };

    const outputDir = path.join(tmpDir, "t5-warn-output");
    fs.mkdirSync(outputDir, { recursive: true });

    const result = await fillBackgroundPlate(
      bgCandidate, originalImagePath, claimedMask, W, H, outputDir,
    );

    // hole is 60% > 50% so warning should be flagged
    expect(result.warning).toBe(true);
  });
});

describe("applyRetentionRules", () => {
  it("should drop uniqueCoverage < 2% non-critical", () => {
    const candidates: LayerCandidate[] = [
      {
        id: "bg", source: "qwen-base", filePath: bgPlatePath,
        width: W, height: H, coverage: 0.81, uniqueCoverage: 0.5,
        edgeDensity: 0.05, componentCount: 1,
        bbox: { x: 10, y: 10, w: 180, h: 180 }, centroid: { x: 100, y: 100 },
        role: "background-plate",
      },
      {
        id: "tiny-detail", source: "qwen-base", filePath: detailPath,
        width: W, height: H, coverage: 0.01, uniqueCoverage: 0.01,
        edgeDensity: 0.1, componentCount: 1,
        bbox: { x: 160, y: 20, w: 20, h: 20 }, centroid: { x: 170, y: 30 },
        role: "detail",
      },
    ];

    const result = applyRetentionRules(candidates);
    const retained = result.filter((c) => !c.droppedReason);
    const dropped = result.filter((c) => c.droppedReason);

    expect(retained).toHaveLength(1);
    expect(retained[0].id).toBe("bg");
    expect(dropped).toHaveLength(1);
    expect(dropped[0].id).toBe("tiny-detail");
    expect(dropped[0].droppedReason).toContain("uniqueCoverage");
  });

  it("should keep role-critical despite low uniqueCoverage", () => {
    const candidates: LayerCandidate[] = [
      {
        id: "bg", source: "qwen-base", filePath: bgPlatePath,
        width: W, height: H, coverage: 0.81, uniqueCoverage: 0.5,
        edgeDensity: 0.05, componentCount: 1,
        bbox: { x: 10, y: 10, w: 180, h: 180 }, centroid: { x: 100, y: 100 },
        role: "background-plate",
      },
      {
        id: "sub", source: "qwen-base", filePath: subjectPath,
        width: W, height: H, coverage: 0.09, uniqueCoverage: 0.01,
        edgeDensity: 0.15, componentCount: 1,
        bbox: { x: 70, y: 70, w: 60, h: 60 }, centroid: { x: 100, y: 100 },
        role: "subject",
      },
    ];

    const result = applyRetentionRules(candidates);
    const retained = result.filter((c) => !c.droppedReason);

    // Subject is role-critical, must be retained even with 1% uniqueCoverage
    expect(retained).toHaveLength(2);
    expect(retained.find((c) => c.id === "sub")).toBeDefined();
  });

  it("should cap at 8 layers by role priority", () => {
    // Create 12 candidates with various roles
    const roles: Array<{ id: string; role: LayerCandidate["role"]; coverage: number; uniqueCoverage: number }> = [
      { id: "bg-plate", role: "background-plate", coverage: 0.8, uniqueCoverage: 0.5 },
      { id: "sub-1", role: "subject", coverage: 0.15, uniqueCoverage: 0.1 },
      { id: "fg-1", role: "foreground-occluder", coverage: 0.1, uniqueCoverage: 0.08 },
      { id: "bg-1", role: "background", coverage: 0.3, uniqueCoverage: 0.15 },
      { id: "mid-1", role: "midground", coverage: 0.12, uniqueCoverage: 0.06 },
      { id: "mid-2", role: "midground", coverage: 0.10, uniqueCoverage: 0.05 },
      { id: "det-1", role: "detail", coverage: 0.04, uniqueCoverage: 0.03 },
      { id: "det-2", role: "detail", coverage: 0.03, uniqueCoverage: 0.025 },
      { id: "det-3", role: "detail", coverage: 0.02, uniqueCoverage: 0.02 },
      { id: "det-4", role: "detail", coverage: 0.02, uniqueCoverage: 0.02 },
      { id: "mid-3", role: "midground", coverage: 0.08, uniqueCoverage: 0.04 },
      { id: "bg-2", role: "background", coverage: 0.2, uniqueCoverage: 0.1 },
    ];

    const candidates: LayerCandidate[] = roles.map((r) => ({
      id: r.id, source: "qwen-base" as const, filePath: bgPlatePath,
      width: W, height: H, coverage: r.coverage, uniqueCoverage: r.uniqueCoverage,
      edgeDensity: 0.1, componentCount: 1,
      bbox: { x: 0, y: 0, w: W, h: H }, centroid: { x: W / 2, y: H / 2 },
      role: r.role,
    }));

    const result = applyRetentionRules(candidates, 8);
    const retained = result.filter((c) => !c.droppedReason);

    expect(retained.length).toBeLessThanOrEqual(8);
    // High-priority roles must survive
    expect(retained.find((c) => c.role === "background-plate")).toBeDefined();
    expect(retained.find((c) => c.role === "subject")).toBeDefined();
    expect(retained.find((c) => c.role === "foreground-occluder")).toBeDefined();
  });

  it("should fallback to original as bg plate when all drop", () => {
    // All candidates have uniqueCoverage < 2% and none are role-critical
    const candidates: LayerCandidate[] = [
      {
        id: "det-a", source: "qwen-base", filePath: detailPath,
        width: W, height: H, coverage: 0.01, uniqueCoverage: 0.005,
        edgeDensity: 0.1, componentCount: 1,
        bbox: { x: 160, y: 20, w: 20, h: 20 }, centroid: { x: 170, y: 30 },
        role: "detail",
      },
      {
        id: "det-b", source: "qwen-base", filePath: detailPath,
        width: W, height: H, coverage: 0.01, uniqueCoverage: 0.005,
        edgeDensity: 0.1, componentCount: 1,
        bbox: { x: 10, y: 10, w: 20, h: 20 }, centroid: { x: 20, y: 20 },
        role: "detail",
      },
    ];

    const result = applyRetentionRules(candidates, 8, originalImagePath);
    const retained = result.filter((c) => !c.droppedReason);

    // Fallback: should produce exactly 1 background-plate from original
    expect(retained).toHaveLength(1);
    expect(retained[0].role).toBe("background-plate");
    expect(retained[0].coverage).toBe(1.0);
  });
});
