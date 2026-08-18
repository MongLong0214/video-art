/**
 *   npx tsx scripts/assert-session-grade.ts --work-dir out/manual-runs/<slug>
 */
import path from "node:path";
import { enforceSessionGrade } from "./lib/session-grade.js";

function parse(argv: readonly string[]): string {
  const i = argv.indexOf("--work-dir");
  const v = i === -1 ? undefined : argv[i + 1];
  if (!v || v.startsWith("--")) throw new Error("usage: --work-dir <dir>");
  return path.resolve(v);
}

const workDir = parse(process.argv.slice(2));
const grade = await enforceSessionGrade(workDir);
process.stdout.write(`${JSON.stringify(grade, null, 2)}\n`);
