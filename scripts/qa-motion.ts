import { runQaMotion } from "./lib/qa-motion-core.js";

type CliArgs = {
  readonly videoPath: string;
  readonly masksDir?: string;
  readonly sourcePath?: string;
  readonly jsonPath?: string;
};

export function parseCli(argv: readonly string[]): CliArgs {
  const videoPath = argv[0];
  if (!videoPath) throw new Error("usage: npx tsx scripts/qa-motion.ts <video.mp4> [--masks <layersDir>] [--source <source.png>] [--json <out.json>]");
  let masksDir: string | undefined;
  let sourcePath: string | undefined;
  let jsonPath: string | undefined;
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--masks") {
      const value = argv[i + 1];
      if (!value) throw new Error("expected directory after --masks");
      masksDir = value;
      i++;
    } else if (arg === "--source") {
      const value = argv[i + 1];
      if (!value) throw new Error("expected path after --source");
      sourcePath = value;
      i++;
    } else if (arg === "--json") {
      const value = argv[i + 1];
      if (!value) throw new Error("expected path after --json");
      jsonPath = value;
      i++;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return { videoPath, masksDir, sourcePath, jsonPath };
}

async function main(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
  return runQaMotion(parseCli(argv));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((code) => process.exit(code)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
