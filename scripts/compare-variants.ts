/**
 * CLI: Compare two pipeline variant manifests and output a recommendation report.
 *
 * Usage:
 *   npx tsx scripts/compare-variants.ts <manifestA.json> <manifestB.json>
 *
 * Output: comparison report JSON to stdout + saved to out/comparison/
 */

import fs from "node:fs";
import path from "node:path";

import type { ManifestData } from "./lib/decomposition-manifest.js";
import {
  computeComparisonMetrics,
  generateComparisonReport,
} from "./lib/variant-comparison.js";

const main = () => {
  const [, , pathA, pathB] = process.argv;

  if (!pathA || !pathB) {
    console.error(
      "Usage: tsx scripts/compare-variants.ts <manifestA.json> <manifestB.json>",
    );
    process.exit(1);
  }

  const resolvedA = path.resolve(pathA);
  const resolvedB = path.resolve(pathB);

  if (!fs.existsSync(resolvedA)) {
    console.error(`Manifest A not found: ${resolvedA}`);
    process.exit(1);
  }
  if (!fs.existsSync(resolvedB)) {
    console.error(`Manifest B not found: ${resolvedB}`);
    process.exit(1);
  }

  const manifestA: ManifestData = JSON.parse(
    fs.readFileSync(resolvedA, "utf-8"),
  );
  const manifestB: ManifestData = JSON.parse(
    fs.readFileSync(resolvedB, "utf-8"),
  );

  const metricsA = computeComparisonMetrics(manifestA);
  const metricsB = computeComparisonMetrics(manifestB);

  const report = generateComparisonReport(metricsA, metricsB);

  // Write to out/comparison/
  const outDir = path.resolve("out", "comparison");
  fs.mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outFile = path.join(outDir, `comparison-${timestamp}.json`);
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  console.error(`\nReport saved to: ${outFile}`);
};

main();
