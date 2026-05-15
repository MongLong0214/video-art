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
  // All Tier B/C sketches now committed and required — missing file = FAIL, not skip.
  { name: "sketch-cellular", url: "/?sketch=cellular", required: true },
  { name: "sketch-volumetric", url: "/?sketch=volumetric", required: true },
  { name: "sketch-particles", url: "/?sketch=particles", required: true },
  { name: "sketch-fractal-cave", url: "/?sketch=fractal-cave", required: true },
  { name: "mode-dmt", url: "/?mode=dmt", required: true },
  { name: "mode-dmt-ig", url: "/?mode=dmt&dmt=/dmt-config-ig.json", required: true },
  { name: "mode-dmt-trip", url: "/?mode=dmt&dmt=/dmt-config-trip.json", required: true },
  { name: "mode-dmt-trip-v66", url: "/?mode=dmt&dmt=/dmt-config-trip-v66.json", required: true },
  { name: "mode-dmt-trip-v67", url: "/?mode=dmt&dmt=/dmt-config-trip-v67.json", required: true },
  { name: "mode-dmt-trip-v68", url: "/?mode=dmt&dmt=/dmt-config-trip-v68.json", required: true },
  { name: "mode-dmt-trip-v69", url: "/?mode=dmt&dmt=/dmt-config-trip-v69.json", required: true },
  { name: "mode-dmt-trip-v70", url: "/?mode=dmt&dmt=/dmt-config-trip-v70.json", required: true },
  { name: "mode-dmt-trip-v71", url: "/?mode=dmt&dmt=/dmt-config-trip-v71.json", required: true },
  { name: "mode-dmt-trip-v72", url: "/?mode=dmt&dmt=/dmt-config-trip-v72.json", required: true },
  { name: "mode-dmt-trip-v73", url: "/?mode=dmt&dmt=/dmt-config-trip-v73.json", required: true },
  { name: "mode-dmt-trip-v74", url: "/?mode=dmt&dmt=/dmt-config-trip-v74.json", required: true },
  { name: "mode-dmt-trip-v75", url: "/?mode=dmt&dmt=/dmt-config-trip-v75.json", required: true },
  { name: "mode-dmt-trip-v76", url: "/?mode=dmt&dmt=/dmt-config-trip-v76.json", required: true },
  { name: "mode-dmt-trip-v77", url: "/?mode=dmt&dmt=/dmt-config-trip-v77.json", required: true },
  { name: "mode-dmt-trip-v78", url: "/?mode=dmt&dmt=/dmt-config-trip-v78.json", required: true },
  { name: "mode-dmt-trip-v79", url: "/?mode=dmt&dmt=/dmt-config-trip-v79.json", required: true },
  { name: "mode-dmt-trip-v80", url: "/?mode=dmt&dmt=/dmt-config-trip-v80.json", required: true },
  { name: "mode-dmt-trip-v81", url: "/?mode=dmt&dmt=/dmt-config-trip-v81.json", required: true },
  { name: "mode-dmt-trip-v82", url: "/?mode=dmt&dmt=/dmt-config-trip-v82.json", required: true },
  { name: "mode-dmt-trip-v83", url: "/?mode=dmt&dmt=/dmt-config-trip-v83.json", required: true },
  { name: "mode-dmt-trip-v84", url: "/?mode=dmt&dmt=/dmt-config-trip-v84.json", required: true },
  { name: "mode-dmt-trip-v85", url: "/?mode=dmt&dmt=/dmt-config-trip-v85.json", required: true },
  { name: "mode-dmt-trip-v86", url: "/?mode=dmt&dmt=/dmt-config-trip-v86.json", required: true },
  { name: "mode-dmt-trip-v88", url: "/?mode=dmt&dmt=/dmt-config-trip-v88.json", required: true },
  { name: "mode-dmt-trip-v88-20s", url: "/?mode=dmt&dmt=/dmt-config-trip-v88-20s.json", required: true },
  { name: "mode-dmt-trip-v89-core-breath-20s", url: "/?mode=dmt&dmt=/dmt-config-trip-v89-core-breath-20s.json", required: true },
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
