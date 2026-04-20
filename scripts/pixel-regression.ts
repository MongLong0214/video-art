/**
 * Pixel Regression (T0-a stub → T-A3 impl)
 *
 * STUB ONLY — full implementation lands in T-A3.
 *
 * Planned: compare two Puppeteer renders (Tier A uniforms=0 vs main baseline)
 * via SSIM or RMSE. Fail if SSIM < 0.995.
 *
 * See docs/tickets/shader-dev-tier-abc/T-A3-post-chain.md
 */

export interface PixelRegressionArgs {
  before?: string;
  after?: string;
  preset?: string;
}

export function parseArgs(argv: string[]): PixelRegressionArgs {
  const args: PixelRegressionArgs = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--before" && argv[i + 1]) args.before = argv[++i];
    else if (argv[i] === "--after" && argv[i + 1]) args.after = argv[++i];
    else if (argv[i] === "--preset" && argv[i + 1]) args.preset = argv[++i];
  }
  return args;
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const _args = parseArgs(argv);
  throw new Error(
    "pixel-regression: not implemented (T0-a stub — real implementation in T-A3).",
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
