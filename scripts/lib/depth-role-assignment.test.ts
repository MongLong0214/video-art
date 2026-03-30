import { describe, it, expect } from "vitest";
import type { LayerCandidate } from "../../src/lib/scene-schema.js";
import { assignRoles, orderByRole } from "./layer-resolve.js";

/**
 * T4: Depth-Enhanced Role Assignment — TDD tests.
 */

function makeCandidate(overrides: Partial<LayerCandidate>): LayerCandidate {
  return {
    id: "test-" + Math.random().toString(36).slice(2, 6),
    source: "sam2-segment",
    filePath: "test.png",
    width: 100,
    height: 100,
    coverage: 0.1,
    bbox: { x: 25, y: 25, w: 50, h: 50 },
    centroid: { x: 50, y: 50 },
    edgeDensity: 0.1,
    componentCount: 1,
    ...overrides,
  };
}

describe("T4: Depth-Enhanced Role Assignment", () => {
  const W = 100, H = 100;

  describe("depthRoleWeight=0 backward compatibility", () => {
    it("should produce identical roles as heuristic-only", () => {
      const candidates = [
        makeCandidate({ id: "bg", coverage: 0.6, bbox: { x: 0, y: 0, w: 100, h: 100 }, centroid: { x: 50, y: 50 }, meanDepth: 30 }),
        makeCandidate({ id: "subj", coverage: 0.15, bbox: { x: 25, y: 25, w: 50, h: 50 }, centroid: { x: 50, y: 50 }, meanDepth: 220 }),
        makeCandidate({ id: "det", coverage: 0.02, bbox: { x: 80, y: 80, w: 10, h: 10 }, centroid: { x: 85, y: 85 }, meanDepth: 180 }),
      ];
      const withoutDepth = assignRoles(candidates, W, H, { depthRoleWeight: 0 });
      const heuristicOnly = assignRoles(candidates, W, H);
      expect(withoutDepth.map(c => c.role)).toEqual(heuristicOnly.map(c => c.role));
    });
  });

  describe("depthRoleWeight > 0 modifies roles", () => {
    it("should relax centrality for high-depth (near) candidates", () => {
      // Candidate slightly off-center but very close (high depth)
      const candidates = [
        makeCandidate({ id: "bg", coverage: 0.6, bbox: { x: 0, y: 0, w: 100, h: 100 }, centroid: { x: 50, y: 50 }, meanDepth: 20 }),
        makeCandidate({
          id: "near-offcenter", coverage: 0.12,
          bbox: { x: 5, y: 30, w: 40, h: 40 }, centroid: { x: 25, y: 50 },  // off-center
          meanDepth: 240,  // very near
        }),
      ];
      const withDepth = assignRoles(candidates, W, H, { depthRoleWeight: 1.0, depthForegroundThreshold: 0.3 });
      const nearCandidate = withDepth.find(c => c.id === "near-offcenter");
      expect(nearCandidate?.role).toBe("subject");
    });
  });

  describe("depthActive fallback", () => {
    it("should use heuristic only when all depths are identical (stddev=0)", () => {
      const candidates = [
        makeCandidate({ id: "bg", coverage: 0.6, bbox: { x: 0, y: 0, w: 100, h: 100 }, centroid: { x: 50, y: 50 }, meanDepth: 128 }),
        makeCandidate({ id: "subj", coverage: 0.15, bbox: { x: 25, y: 25, w: 50, h: 50 }, centroid: { x: 50, y: 50 }, meanDepth: 128 }),
      ];
      const withDepth = assignRoles(candidates, W, H, { depthRoleWeight: 1.0 });
      const withoutDepth = assignRoles(candidates, W, H, { depthRoleWeight: 0 });
      expect(withDepth.map(c => c.role)).toEqual(withoutDepth.map(c => c.role));
    });

    it("should use heuristic only when stddev < 5", () => {
      const candidates = [
        makeCandidate({ id: "a", coverage: 0.6, bbox: { x: 0, y: 0, w: 100, h: 100 }, centroid: { x: 50, y: 50 }, meanDepth: 126 }),
        makeCandidate({ id: "b", coverage: 0.15, bbox: { x: 25, y: 25, w: 50, h: 50 }, centroid: { x: 50, y: 50 }, meanDepth: 130 }),
      ];
      const withDepth = assignRoles(candidates, W, H, { depthRoleWeight: 1.0 });
      const withoutDepth = assignRoles(candidates, W, H, { depthRoleWeight: 0 });
      expect(withDepth.map(c => c.role)).toEqual(withoutDepth.map(c => c.role));
    });
  });

  describe("background-plate unaffected by depth", () => {
    it("should always assign bg-plate to widest candidate regardless of depth", () => {
      const candidates = [
        makeCandidate({ id: "wide", coverage: 0.7, bbox: { x: 0, y: 0, w: 100, h: 100 }, centroid: { x: 50, y: 50 }, meanDepth: 250 }),
        makeCandidate({ id: "small", coverage: 0.1, bbox: { x: 30, y: 30, w: 40, h: 40 }, centroid: { x: 50, y: 50 }, meanDepth: 10 }),
      ];
      const result = assignRoles(candidates, W, H, { depthRoleWeight: 1.0 });
      expect(result.find(c => c.id === "wide")?.role).toBe("background-plate");
    });
  });

  describe("orderByRole with real depth", () => {
    it("should use meanDepth for tie-breaking within same role", () => {
      const candidates = [
        makeCandidate({ id: "mid-far", role: "midground", coverage: 0.15, meanDepth: 50 }),
        makeCandidate({ id: "mid-near", role: "midground", coverage: 0.15, meanDepth: 200 }),
      ];
      const ordered = orderByRole(candidates);
      expect(ordered[0].id).toBe("mid-far");
      expect(ordered[1].id).toBe("mid-near");
    });
  });

  describe("AC-3.4: background depth relaxation", () => {
    it("should relax bbox threshold for far (low depth) candidates", () => {
      const candidates = [
        makeCandidate({ id: "bg", coverage: 0.6, bbox: { x: 0, y: 0, w: 100, h: 100 }, centroid: { x: 50, y: 50 }, meanDepth: 100 }),
        makeCandidate({
          id: "near", coverage: 0.12, bbox: { x: 30, y: 30, w: 40, h: 40 }, centroid: { x: 50, y: 50 }, meanDepth: 240,
        }),
        makeCandidate({
          id: "far-small-bbox", coverage: 0.16,
          bbox: { x: 5, y: 5, w: 42, h: 42 }, centroid: { x: 10, y: 10 },  // bbox ratio ~17.6% (< 20%), non-central, not edge-touching
          meanDepth: 20,  // truly far (lowest depth)
        }),
      ];
      const withDepth = assignRoles(candidates, W, H, { depthRoleWeight: 1.0, depthBackgroundThreshold: 0.7 });
      const farCandidate = withDepth.find(c => c.id === "far-small-bbox");
      expect(farCandidate?.role).toBe("background");
    });
  });

  describe("AC-3.5: foreground-occluder depth gating", () => {
    it("should NOT assign occluder to edge-touching but far (low depth) candidate", () => {
      const candidates = [
        makeCandidate({ id: "bg", coverage: 0.6, bbox: { x: 0, y: 0, w: 100, h: 100 }, centroid: { x: 50, y: 50 }, meanDepth: 128 }),
        makeCandidate({
          id: "edge-far", coverage: 0.08,
          bbox: { x: 0, y: 30, w: 30, h: 40 }, centroid: { x: 15, y: 50 },  // touches left edge
          meanDepth: 20,  // far
        }),
      ];
      const withDepth = assignRoles(candidates, W, H, { depthRoleWeight: 1.0, depthForegroundThreshold: 0.3 });
      const edgeFar = withDepth.find(c => c.id === "edge-far");
      expect(edgeFar?.role).not.toBe("foreground-occluder");
    });
  });

  describe("depthPercentile calculation", () => {
    it("should handle tie-breaking deterministically for equal depths", () => {
      const candidates = [
        makeCandidate({ id: "a", coverage: 0.15, bbox: { x: 25, y: 25, w: 50, h: 50 }, centroid: { x: 50, y: 50 }, meanDepth: 100 }),
        makeCandidate({ id: "b", coverage: 0.15, bbox: { x: 25, y: 25, w: 50, h: 50 }, centroid: { x: 50, y: 50 }, meanDepth: 100 }),
        makeCandidate({ id: "c", coverage: 0.15, bbox: { x: 25, y: 25, w: 50, h: 50 }, centroid: { x: 50, y: 50 }, meanDepth: 200 }),
      ];
      const result1 = assignRoles(candidates, W, H, { depthRoleWeight: 0.5 });
      const result2 = assignRoles(candidates, W, H, { depthRoleWeight: 0.5 });
      expect(result1.map(c => c.role)).toEqual(result2.map(c => c.role));
    });
  });
});
