/**
 * CLI argument parsing for pipeline-layers.
 * Extracted for testability (T7).
 */

export interface PipelineCliArgs {
  inputPath: string;
  variant: "qwen-only" | "qwen-zoedepth";
  layerOverride?: number;
  unsafe: boolean;
  duration?: number;
  production: boolean;
}

/**
 * Parse CLI arguments for the layer decomposition pipeline.
 *
 * Usage: pipeline-layers <input.png> [options]
 *   --variant qwen-only|qwen-zoedepth  (default: qwen-only)
 *   --layers N                          override layer count
 *   --unsafe                            disable safety checker
 *   --duration N                        scene duration in seconds (1-60)
 *   --production                        enforce version pin
 *
 * Deprecated flags (emit warning, ignored):
 *   --depth-only, --qwen-only
 */
export function parseCliArgs(argv: string[]): PipelineCliArgs {
  // First positional arg = input path
  const positional = argv.filter((a) => !a.startsWith("--"));
  const inputPath = positional[0] ?? "";

  // --variant
  let variant: "qwen-only" | "qwen-zoedepth" = "qwen-only";
  const variantIdx = argv.indexOf("--variant");
  if (variantIdx !== -1 && variantIdx + 1 < argv.length) {
    const val = argv[variantIdx + 1];
    if (val === "qwen-only" || val === "qwen-zoedepth") {
      variant = val;
    } else {
      throw new Error(`Invalid --variant value: ${val}. Must be qwen-only or qwen-zoedepth.`);
    }
  }

  // --layers N
  let layerOverride: number | undefined;
  const layersIdx = argv.indexOf("--layers");
  if (layersIdx !== -1 && layersIdx + 1 < argv.length) {
    const val = parseInt(argv[layersIdx + 1], 10);
    if (Number.isNaN(val) || val < 1 || val > 20) {
      throw new Error(`Invalid --layers value. Must be 1-20 (integer).`);
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

  // Deprecated flags
  if (argv.includes("--depth-only")) {
    console.warn(
      "[deprecated] --depth-only is deprecated. Use --variant qwen-zoedepth instead.",
    );
  }
  if (argv.includes("--qwen-only")) {
    console.warn(
      "[deprecated] --qwen-only is deprecated. Use --variant qwen-only instead (it is the default).",
    );
  }

  return {
    inputPath,
    variant,
    layerOverride,
    unsafe,
    duration,
    production,
  };
}
