import "dotenv/config";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { resolveExclusiveOwnership, deduplicateCandidates, assignRoles, applyRetentionRules } from "./lib/layer-resolve.js";
import type { LayerCandidate } from "../src/lib/scene-schema.js";

const layersDir = ".cache/research/layers";
const layers = fs.readdirSync(layersDir).filter(f => f.endsWith(".png")).sort();
console.log(`Found ${layers.length} layer files`);

const meta = await sharp(path.join(layersDir, layers[0])).metadata();
const W = meta.width!, H = meta.height!;
console.log(`Dimensions: ${W}x${H}\n`);

// Build candidates from layer files
const candidates: LayerCandidate[] = [];
for (let i = 0; i < layers.length; i++) {
  const fp = path.join(layersDir, layers[i]);
  const rgba = await sharp(fp).resize(W, H).ensureAlpha().raw().toBuffer();
  let opaque = 0;
  for (let p = 0; p < W * H; p++) {
    if (rgba[p * 4 + 3] > 10) opaque++;
  }
  candidates.push({
    id: `layer-${i}`,
    source: "sam3-semantic",
    filePath: fp,
    width: W,
    height: H,
    coverage: opaque / (W * H),
    uniqueCoverage: 0,
    edgeDensity: 0,
    componentCount: 1,
    bbox: { x: 0, y: 0, w: W, h: H },
    centroid: { x: W / 2, y: H / 2 },
  });
  console.log(`${layers[i]}: ${(opaque / (W * H) * 100).toFixed(1)}% opaque (alpha>10)`);
}

console.log("\n--- resolveExclusiveOwnership ---");
const resolved = await resolveExclusiveOwnership(candidates, W, H);
for (const c of resolved) {
  console.log(`${path.basename(c.filePath)}: coverage=${(c.coverage * 100).toFixed(1)}% unique=${((c.uniqueCoverage ?? 0) * 100).toFixed(1)}%`);
}

console.log("\n--- assignRoles ---");
const roled = assignRoles(resolved, W, H);
for (const c of roled) {
  console.log(`${path.basename(c.filePath)}: role=${c.role} unique=${((c.uniqueCoverage ?? 0) * 100).toFixed(1)}%`);
}

console.log("\n--- applyRetentionRules ---");
const retention = applyRetentionRules(roled, 16);
for (const c of retention) {
  const dropped = c.droppedReason ? `DROPPED: ${c.droppedReason}` : "RETAINED";
  console.log(`${path.basename(c.filePath)}: role=${c.role} unique=${((c.uniqueCoverage ?? 0) * 100).toFixed(1)}% → ${dropped}`);
}
