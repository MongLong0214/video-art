/**
 * CLI argument parsing for pipeline-layers.
 * Extracted for testability (T7).
 */

export interface PipelineCliArgs {
  inputPath: string;
  layerOverride?: number;
  unsafe: boolean;
  duration?: number;
  production: boolean;
}

/**
 * Parse CLI arguments for the layer decomposition pipeline.
 *
 * Usage: pipeline-layers <input.png> [options]
 *   --layers N        override SAM 2 mask count (1-12)
 *   --unsafe          disable safety checker
 *   --duration N      scene duration in seconds (1-300)
 *   --production      enforce version pin
 */
export function parseCliArgs(argv: string[]): PipelineCliArgs {
  const positional = argv.filter((a) => !a.startsWith("--"));
  const inputPath = positional[0] ?? "";

  // --layers N (M9: match schema max 300 for duration, SAM2 supports up to 12)
  let layerOverride: number | undefined;
  const layersIdx = argv.indexOf("--layers");
  if (layersIdx !== -1 && layersIdx + 1 < argv.length) {
    const val = parseInt(argv[layersIdx + 1], 10);
    if (Number.isNaN(val) || val < 1 || val > 12) {
      throw new Error(`Invalid --layers value. Must be 1-12 (integer).`);
    }
    layerOverride = val;
  }

  // --unsafe
  const unsafe = argv.includes("--unsafe");

  // --duration N (M9: align with schema max 300)
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

  return {
    inputPath,
    layerOverride,
    unsafe,
    duration,
    production,
  };
}
