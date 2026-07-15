import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { runRegionAffinityAuthorityAudit } from "./lib/region-affinity-authority-audit.js";

const pathSchema = z.string().trim().min(1);

function required(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`expected value after ${flag}`);
  return pathSchema.parse(value);
}

function parseCli(argv: readonly string[]): {
  readonly sourcePath: string;
  readonly scenePath: string;
  readonly workDir: string;
  readonly outputPath: string;
  readonly flowField?: string;
  readonly streamField?: string;
} {
  let sourcePath: string | undefined;
  let scenePath: string | undefined;
  let workDir: string | undefined;
  let outputPath: string | undefined;
  let flowField: string | undefined;
  let streamField: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--source") sourcePath = required(argv, i++, flag);
    else if (flag === "--scene") scenePath = required(argv, i++, flag);
    else if (flag === "--work-dir") workDir = required(argv, i++, flag);
    else if (flag === "--output") outputPath = required(argv, i++, flag);
    else if (flag === "--flow-field") flowField = required(argv, i++, flag);
    else if (flag === "--stream-field") streamField = required(argv, i++, flag);
    else throw new Error(`unknown argument: ${flag}`);
  }
  if (!sourcePath || !scenePath || !workDir || !outputPath) {
    throw new Error("usage: --source <png> --scene <scene.json> --work-dir <dir> --output <audit.json> [--flow-field rel] [--stream-field rel]");
  }
  return { sourcePath, scenePath, workDir, outputPath, flowField, streamField };
}

async function main(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
  const args = parseCli(argv);
  const audit = await runRegionAffinityAuthorityAudit({
    sourcePath: path.resolve(args.sourcePath),
    scenePath: path.resolve(args.scenePath),
    workDir: path.resolve(args.workDir),
    flowFieldRel: args.flowField,
    streamFieldRel: args.streamField,
  });
  fs.mkdirSync(path.dirname(path.resolve(args.outputPath)), { recursive: true });
  fs.writeFileSync(path.resolve(args.outputPath), `${JSON.stringify(audit, null, 2)}\n`);
  process.stdout.write(`region-affinity-authority: ${audit.status}\n`);
  process.stdout.write(`report: ${path.resolve(args.outputPath)}\n`);
  if (audit.failures.length > 0) process.stdout.write(`failures: ${audit.failures.join(", ")}\n`);
  return audit.status === "PASS" ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((code) => process.exit(code)).catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
