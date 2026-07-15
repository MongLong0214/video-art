import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertRegionAffinityAuthorityAudit,
  RegionAffinityAuthorityError,
  sceneUsesRegionAffinity,
} from "./region-affinity-authority-audit.js";
import { analyzeSourceRegionCapacity, buildSourceRegionAffinityField } from "./source-region-capacity.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});


describe("region-affinity authority model", () => {
  it("detects binary-capacity vs smooth-affinity mismatch on a sparse-support field", () => {
    // Construct a field where binary median support looks connected enough,
    // but the smooth affinity field (shader authority) collapses under the larger safety radius.
    const width = 96;
    const height = 144;
    const luma = new Float32Array(width * height).fill(0.5);
    // Sparse horizontal micro-bands: binary median mask still lights up many cells,
    // but smoothstep-to-p85 + large interior radius keeps affinity components tiny.
    for (let y = 8; y < height - 8; y += 18) {
      for (let x = 4; x < width - 4; x++) {
        luma[y * width + x] = 0.5 + 0.5 * Math.sin(x * 0.9);
        if (y + 1 < height) luma[(y + 1) * width + x] = 0.5 + 0.5 * Math.sin(x * 0.9 + 1.2);
      }
    }

    const binaryish = analyzeSourceRegionCapacity({
      luma,
      width,
      height,
      sourcePixelsPerCell: 8,
    });
    const affinity = buildSourceRegionAffinityField({
      luma,
      width,
      height,
      sourcePixelsPerCell: 8,
    });

    // Binary diagnostic metrics can look optimistic while renderer authority is insufficient.
    expect(binaryish.midBandSupportCoverage).toBeGreaterThan(0);
    expect(affinity.connectedCoverage).toBeLessThanOrEqual(binaryish.connectedSupportCoverage + 1e-6);
    // Preview permission must follow affinity, not binary optimism.
    if (affinity.connectedCoverage < 0.06 || binaryish.affinityActiveCoverage < 0.08) {
      expect(binaryish.canCarryConnectedTransport).toBe(false);
    }
  });

  it("allows broad connected material under renderer-equivalent affinity authority", () => {
    const width = 96;
    const height = 144;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.38;
    const luma = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dist = Math.hypot(x - cx, y - cy);
        luma[y * width + x] =
          dist < radius
            ? 0.4 + 0.35 * Math.sin(x * 0.9) * Math.cos(y * 0.75)
            : 0.5;
      }
    }
    const result = analyzeSourceRegionCapacity({
      luma,
      width,
      height,
      sourcePixelsPerCell: 6,
    });
    expect(result.affinityConnectedCoverage).toBeGreaterThan(0.06);
    expect(result.canCarryConnectedTransport).toBe(true);
  });

  it("sceneUsesRegionAffinity detects active amount only", () => {
    expect(sceneUsesRegionAffinity({ layers: [{ animation: { sourceRegionAffinity: { amount: 1 } } }] })).toBe(true);
    expect(sceneUsesRegionAffinity({ layers: [{ animation: { sourceRegionAffinity: { amount: 0 } } }] })).toBe(false);
    expect(sceneUsesRegionAffinity({ layers: [{}] })).toBe(false);
  });

  it("blocks preview when authority audit is REJECT or scene SHA mismatches", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "region-affinity-audit-"));
    temporaryDirectories.push(directory);
    const scenePath = path.join(directory, "scene.json");
    const reportPath = path.join(directory, "authority.json");
    const scene = "{\"duration\":20}\n";
    fs.writeFileSync(scenePath, scene);
    const sceneHash = createHash("sha256").update(scene).digest("hex");

    fs.writeFileSync(reportPath, JSON.stringify({ version: 1, status: "REJECT", scene: { sha256: sceneHash } }));
    expect(() => assertRegionAffinityAuthorityAudit(reportPath, scenePath)).toThrow(RegionAffinityAuthorityError);

    fs.writeFileSync(reportPath, JSON.stringify({ version: 1, status: "PASS", scene: { sha256: "0".repeat(64) } }));
    expect(() => assertRegionAffinityAuthorityAudit(reportPath, scenePath)).toThrow(/does not match/);

    fs.writeFileSync(reportPath, JSON.stringify({ version: 1, status: "PASS", scene: { sha256: sceneHash } }));
    expect(() => assertRegionAffinityAuthorityAudit(reportPath, scenePath)).not.toThrow();
  });
});
