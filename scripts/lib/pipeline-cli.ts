/**
 * CLI argument parsing for pipeline-layers.
 * Extracted for testability (T7).
 */

export interface PipelineCliArgs {
  inputPath: string;
  layerOverride?: number;
  description?: string;
  unsafe: boolean;
  duration?: number;
  production: boolean;
}

/**
 * Parse CLI arguments for the layer decomposition pipeline.
 *
 * Usage: pipeline-layers <input.png> [options]
 *   --layers N                          override layer count (1-8)
 *   --description "text"                scene description for Qwen (default: auto)
 *   --unsafe                            disable safety checker
 *   --duration N                        scene duration in seconds (1-60)
 *   --production                        enforce version pin
 */
export function parseCliArgs(argv: string[]): PipelineCliArgs {
  const positional = argv.filter((a) => !a.startsWith("--"));
  const inputPath = positional[0] ?? "";

  // --description
  let description: string | undefined;
  const descIdx = argv.indexOf("--description");
  if (descIdx !== -1 && descIdx + 1 < argv.length) {
    description = argv[descIdx + 1];
  }

  // --layers N
  let layerOverride: number | undefined;
  const layersIdx = argv.indexOf("--layers");
  if (layersIdx !== -1 && layersIdx + 1 < argv.length) {
    const val = parseInt(argv[layersIdx + 1], 10);
    if (Number.isNaN(val) || val < 1 || val > 8) {
      throw new Error(`Invalid --layers value. Must be 1-8 (integer). Qwen API max is 8.`);
    }
    layerOverride = val;
  }

  // --unsafe
  const unsafe = argv.includes("--unsafe");

  // --duration N
  let duration: number | undefined;
  const durIdx = argv.indexOf("--duration");
  if (durIdx !== -1 && durIdx + 1 < argv.length) {
    const val = parseInt(argv[durIdx + 1], 10);
    if (Number.isNaN(val) || val < 1 || val > 60) {
      throw new Error(`Invalid --duration value. Must be 1-60 (integer).`);
    }
    duration = val;
  }

  // --production
  const production = argv.includes("--production");

  return {
    inputPath,
    layerOverride,
    description,
    unsafe,
    duration,
    production,
  };
}
