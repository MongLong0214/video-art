/**
 * Shader Compile Check (T0-a)
 *
 * Headless load of each mode — capture shader compile failures that regex tests miss.
 * See docs/tickets/shader-dev-tier-abc/T0-a-shader-compile-check.md
 *
 * Usage: npm run check:shaders
 */
import "dotenv/config";
import {
  startViteServer,
  waitForVite,
  killVite,
  launchHeadlessBrowser,
  runInPuppeteerPage,
} from "./lib/headless-browser.js";

export interface CheckMode {
  name: string;
  url: string;
  required: boolean; // if true, 404 or missing sketch is FAIL; if false, skip with warning
}

export const MODES: CheckMode[] = [
  { name: "layered-default", url: "/?mode=layered", required: true },
  {
    name: "layered-baseline",
    url: "/?mode=layered&scene=/presets/solo/T13-baseline.json",
    required: true,
  },
  { name: "sketch-psychedelic", url: "/?sketch=psychedelic", required: true },
  { name: "sketch-cellular", url: "/?sketch=cellular", required: false },
  { name: "sketch-volumetric", url: "/?sketch=volumetric", required: false },
  { name: "sketch-particles", url: "/?sketch=particles", required: false },
  { name: "sketch-fractal-cave", url: "/?sketch=fractal-cave", required: false },
];

export const ERROR_PATTERNS: RegExp[] = [
  /program not valid/i,
  /shader.*compile.*failed/i,
  /no matching overloaded function/i,
  /undeclared identifier/i,
  /INVALID_OPERATION.*useProgram/i,
];

export function detectShaderError(msg: string): string | null {
  for (const p of ERROR_PATTERNS) {
    if (p.test(msg)) return p.source;
  }
  return null;
}

const PORT = 5299;

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

export async function main(_argv: string[] = process.argv.slice(2)): Promise<number> {
  console.log(`shader-compile-check: testing ${MODES.length} modes`);
  const viteProc = startViteServer(PORT);
  const onExit = () => {
    viteProc.kill();
  };
  process.on("exit", onExit);

  let browser;
  const failures: Array<{ mode: string; error: string }> = [];
  const skipped: string[] = [];

  try {
    await waitForVite(PORT);
    browser = await launchHeadlessBrowser();

    for (const mode of MODES) {
      const url = `http://localhost:${PORT}${mode.url}`;
      const { logs } = await runInPuppeteerPage(browser, url, async (_page) => {
        await sleep(2500);
        return null;
      });

      // Detect sketch-not-found (404 for .frag)
      const has404 = logs.some(
        (l) =>
          /404.*\.frag|Sketch ".*" not found|Failed to load.*\.frag/.test(l),
      );
      if (has404 && !mode.required) {
        skipped.push(mode.name);
        console.log(`  ⚠  ${mode.name} — sketch not yet built (skip)`);
        continue;
      }

      let firstError: string | null = null;
      for (const line of logs) {
        const match = detectShaderError(line);
        if (match) {
          firstError = `[${mode.name}] ${line}`;
          break;
        }
      }

      if (firstError) {
        failures.push({ mode: mode.name, error: firstError });
        console.log(`  ✗ ${mode.name} — ${firstError}`);
      } else {
        console.log(`  ✓ ${mode.name}`);
      }
    }
  } finally {
    await browser?.close().catch(() => {});
    await killVite(viteProc);
    process.removeListener("exit", onExit);
  }

  console.log(
    `\nSummary: ${MODES.length - failures.length - skipped.length}/${MODES.length} PASS, ${failures.length} FAIL, ${skipped.length} SKIP`,
  );
  if (failures.length > 0) {
    console.error("\nFailures:");
    for (const f of failures) console.error(`  ${f.error}`);
    return 1;
  }
  return 0;
}

// Run if invoked directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((code) => process.exit(code));
}
