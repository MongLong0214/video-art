/**
 * CLI argument parsing for pipeline-pro.
 */
import { DEFAULT_TONE, type Tone } from "./scene-presets.js";

export interface PipelineCliArgs {
  inputPath: string;
  duration?: number;
  production: boolean;
  prores?: boolean;
  fps?: number;
  workDir?: string;
  tone: Tone;
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

  // --tone commercial|elegant (default: commercial)
  let tone: Tone = DEFAULT_TONE;
  const toneIdx = argv.indexOf("--tone");
  if (toneIdx !== -1 && toneIdx + 1 < argv.length) {
    const val = argv[toneIdx + 1];
    if (val !== "commercial" && val !== "elegant") {
      throw new Error(`Invalid --tone value '${val}'. Must be 'commercial' or 'elegant'.`);
    }
    tone = val;
  }

  return {
    inputPath,
    duration,
    production,
    prores,
    fps,
    workDir,
    tone,
  };
}
