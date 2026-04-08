import "dotenv/config";
import { execFileSync } from "node:child_process";
import readline from "node:readline";
import path from "node:path";
import { parseTitle } from "./lib/archive.js";

const args = process.argv.slice(2);
const inputPath = args.find((a) => !a.startsWith("--"));
const keepFrames = args.includes("--keep-frames");
const noPreview = args.includes("--no-preview");
const title = parseTitle(args, inputPath);

if (!inputPath) {
  console.error("Usage: npm run pipeline <input.png> [--title <name>] [--keep-frames] [--no-preview] [--duration N] [--production]");
  process.exit(1);
}

const projectRoot = process.cwd();

function run(bin: string, runArgs: string[]) {
  console.log(`\n$ ${bin} ${runArgs.join(" ")}\n`);
  execFileSync(bin, runArgs, { cwd: projectRoot, stdio: "inherit" });
}

function waitForEnter(message: string): Promise<void> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  console.log("=== Layered Psychedelic Video Pipeline ===\n");
  console.log(`Input: ${path.resolve(inputPath!)}`);
  console.log(`Title: ${title}`);

  // Forward --work-dir if present
  const wdIdx = args.indexOf("--work-dir");
  const workDirArgs = wdIdx !== -1 && wdIdx + 1 < args.length ? ["--work-dir", args[wdIdx + 1]] : [];

  // Forward color mode positional arg if present
  const positional = args.filter((a) => !a.startsWith("--"));
  const colorModeArg = positional[1] === "classic" ? ["classic"] : [];

  // Run pro-pipeline (bria + flux-fill-pro + depth)
  run("npx", ["tsx", "scripts/pipeline-pro.ts", inputPath!, ...colorModeArg, ...workDirArgs]);

  if (!noPreview) {
    console.log("\n--- Step 3: Preview ---");
    console.log("Run `npm run dev` in another terminal, then open:");
    console.log("  http://localhost:5173/?mode=layered");
    await waitForEnter("\nPress Enter to continue to export, or Ctrl+C to cancel... ");
  }

  const exportArgs = ["tsx", "scripts/export-layered.ts", "--title", title, ...workDirArgs];
  if (keepFrames) exportArgs.push("--keep-frames");
  if (args.includes("--prores")) exportArgs.push("--prores");
  const fpsArgIdx = args.indexOf("--fps");
  if (fpsArgIdx !== -1 && fpsArgIdx + 1 < args.length) {
    exportArgs.push("--fps", args[fpsArgIdx + 1]);
  }
  run("npx", exportArgs);

  console.log("\n=== Pipeline Complete ===");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
