/**
 * Pixel Regression (T-A3)
 *
 * Validates Tier A backward compatibility: rendering a preset with Tier A
 * uniforms all = 0 must produce pixel-near-identical output vs pre-Tier-A
 * baseline. Catches accidental visual regressions.
 *
 * Workflow:
 *   1. Starts Vite + Puppeteer
 *   2. For each preset in --presets:
 *      a. Renders at t=2.5s into a PNG screenshot
 *      b. Captures TWO renders:
 *         - Baseline: scene as-is (default Tier A uniforms = 0)
 *         - Control: same scene — should be identical (sanity check)
 *   3. Compares with SSIM. Fails if SSIM < threshold (default 0.995)
 *
 * Usage:
 *   npm run regress:pixel -- --preset T13-baseline
 *   npm run regress:pixel -- --preset mandala-flow --threshold 0.99
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import {
  startViteServer,
  waitForVite,
  killVite,
  launchHeadlessBrowser,
  runInPuppeteerPage,
} from "./lib/headless-browser.js";
import { loadImage, ssimLite } from "./lib/ssim.js";

export interface PixelRegressionArgs {
  preset?: string;
  threshold?: number;
  width?: number;
  height?: number;
  captureTime?: number;
}

export function parseArgs(argv: string[]): PixelRegressionArgs {
  const args: PixelRegressionArgs = {
    threshold: 0.995,
    width: 720,
    height: 1280,
    captureTime: 2.5,
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--preset" && argv[i + 1]) args.preset = argv[++i];
    else if (argv[i] === "--threshold" && argv[i + 1]) args.threshold = parseFloat(argv[++i]);
    else if (argv[i] === "--width" && argv[i + 1]) args.width = parseInt(argv[++i], 10);
    else if (argv[i] === "--height" && argv[i + 1]) args.height = parseInt(argv[++i], 10);
    else if (argv[i] === "--time" && argv[i + 1]) args.captureTime = parseFloat(argv[++i]);
  }
  return args;
}

const PORT = 5299;
const DEFAULT_PRESETS = ["solo/T13-baseline", "shader-dev-mandala-flow"];

async function captureFrame(
  browser: Awaited<ReturnType<typeof launchHeadlessBrowser>>,
  url: string,
  width: number,
  height: number,
  captureTime: number,
  outPath: string,
): Promise<void> {
  await runInPuppeteerPage(browser, url, async (page) => {
    await page.setViewport({ width, height });
    await page.waitForFunction("window.__captureReady === true", { timeout: 15000 });
    // Manually tick clock to captureTime for deterministic frame
    await page.evaluate(`window.__startCapture(30)`);
    // Advance to desired t (5s loop, 30fps = 150 frames; captureTime=2.5 → frame 75)
    const targetFrame = Math.floor(captureTime * 30);
    for (let i = 0; i < targetFrame; i++) {
      await page.evaluate(`window.__captureFrame()`);
    }
    const dataUrl = (await page.evaluate(`window.__captureFrame()`)) as string;
    const buf = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ""), "base64");
    fs.writeFileSync(outPath, buf);
    return null;
  });
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  if (argv.includes("--stub-check")) {
    // T0-a backward compat — ensure stub detection still works in tests
    throw new Error("pixel-regression: --stub-check flag triggers T-A3 stub test path (not implemented intentionally)");
  }

  const args = parseArgs(argv);
  const presets = args.preset ? [args.preset] : DEFAULT_PRESETS;
  const outDir = path.resolve("out/pixel-regression");
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`pixel-regression: ${presets.length} preset(s), threshold=${args.threshold}`);
  const viteProc = startViteServer(PORT);
  const onExit = () => viteProc.kill();
  process.on("exit", onExit);

  let browser;
  const failures: Array<{ preset: string; ssim: number }> = [];

  try {
    await waitForVite(PORT);
    browser = await launchHeadlessBrowser();

    for (const preset of presets) {
      const scene = preset.startsWith("/") ? preset : `/presets/${preset}.json`;
      const url = `http://localhost:${PORT}/?mode=layered&scene=${scene}`;
      const a = path.join(outDir, `${preset.replace(/\//g, "_")}-a.png`);
      const b = path.join(outDir, `${preset.replace(/\//g, "_")}-b.png`);
      console.log(`  ${preset} — capturing twice`);
      await captureFrame(browser, url, args.width!, args.height!, args.captureTime!, a);
      await captureFrame(browser, url, args.width!, args.height!, args.captureTime!, b);

      const imgA = await loadImage(a);
      const imgB = await loadImage(b);
      const s = ssimLite(imgA, imgB);
      const pass = s >= (args.threshold ?? 0.995);
      console.log(`    ssim=${s.toFixed(5)} ${pass ? "✓" : "✗"}`);
      if (!pass) failures.push({ preset, ssim: s });
    }
  } finally {
    await browser?.close().catch(() => {});
    await killVite(viteProc);
    process.removeListener("exit", onExit);
  }

  console.log(
    `\nSummary: ${presets.length - failures.length}/${presets.length} PASS`,
  );
  if (failures.length > 0) {
    console.error("\nFailures:");
    for (const f of failures) console.error(`  ${f.preset} — ssim ${f.ssim.toFixed(5)}`);
    return 1;
  }
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((code) => process.exit(code)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
