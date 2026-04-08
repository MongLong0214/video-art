/**
 * CLI argument parsing for pipeline-pro.
 */

export type ColorMode = "palette" | "classic";

export interface PipelineCliArgs {
  inputPath: string;
  duration?: number;
  production: boolean;
  prores?: boolean;
  fps?: number;
  workDir?: string;
  colorMode: ColorMode;
}

export function parseCliArgs(argv: string[]): PipelineCliArgs {
  const positional = argv.filter((a) => !a.startsWith("--"));
  const inputPath = positional[0] ?? "";

  // --duration N
  let duration: number | undefined;
  const durIdx = argv.indexOf("--duration");
  if (durIdx !== -1 && durIdx + 1 < argv.length) {
    const val = parseInt(argv[durIdx + 1], 10);
    if (Number.isNaN(val) || val < 1 || val > 300) {
      throw new Error(`Invalid --duration value. Must be 1-300 (integer).`);
    }
    duration = val;
  }

  // --production
  const production = argv.includes("--production");

  // --prores
  const prores = argv.includes("--prores");

  // --fps N
  let fps: number | undefined;
  const fpsIdx = argv.indexOf("--fps");
  if (fpsIdx !== -1 && fpsIdx + 1 < argv.length) {
    const val = parseInt(argv[fpsIdx + 1], 10);
    if (Number.isNaN(val) || val < 1 || val > 120) {
      throw new Error(`Invalid --fps value. Must be 1-120 (integer).`);
    }
    fps = val;
  }

  // --work-dir <path>
  let workDir: string | undefined;
  const wdIdx = argv.indexOf("--work-dir");
  if (wdIdx !== -1 && wdIdx + 1 < argv.length) {
    workDir = argv[wdIdx + 1];
  }

  // Second positional arg: color mode (palette|classic)
  const colorMode: ColorMode = positional[1] === "classic" ? "classic" : "palette";

  return {
    inputPath,
    duration,
    production,
    prores,
    fps,
    workDir,
    colorMode,
  };
}
