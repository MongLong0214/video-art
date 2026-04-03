import * as fs from "node:fs";
import * as path from "node:path";

import { evaluate303Domain } from "../lib/303-evaluator.js";

const targetDir = process.argv[2];

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log("Usage: npx tsx scripts/research/calibrate-303.ts <render-303-output-dir>");
  process.exit(0);
}

if (!targetDir) {
  console.error("Usage: npx tsx scripts/research/calibrate-303.ts <render-303-output-dir>");
  process.exit(1);
}

const abstractionPath = path.join(targetDir, "reference-abstraction.json");
const irPath = path.join(targetDir, "composition-ir.json");
const auditPath = path.join(targetDir, "source-purity-audit.json");

for (const required of [abstractionPath, irPath, auditPath]) {
  if (!fs.existsSync(required)) {
    console.error(`Missing artifact: ${required}`);
    process.exit(1);
  }
}

const abstraction = JSON.parse(fs.readFileSync(abstractionPath, "utf-8"));
const ir = JSON.parse(fs.readFileSync(irPath, "utf-8"));
const audit = JSON.parse(fs.readFileSync(auditPath, "utf-8"));

const result = evaluate303Domain(abstraction, ir, audit);
const outPath = path.join(targetDir, "evaluation-303.json");
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

console.log(`303 evaluation saved: ${outPath}`);
console.log(`Total score: ${result.total_score}`);
