/**
 * Shared headless browser helpers — vite dev server + puppeteer launch/teardown.
 *
 * Used by:
 *   - scripts/shader-compile-check.ts (T0-a)
 *   - scripts/fbo-float-spike.ts (T0-b)
 *   - scripts/gallery-render.ts (T-F1/F2)
 *   - scripts/pixel-regression.ts (T-A3)
 *
 * Rule: there should be exactly ONE `puppeteer.launch(...)` call site in the
 * repo — here. All other scripts consume launchHeadlessBrowser().
 */
import { spawn, type ChildProcess } from "node:child_process";
import puppeteer, { type Browser, type Page } from "puppeteer";

export function startViteServer(
  port: number,
  cwd: string = process.cwd(),
): ChildProcess {
  return spawn("npx", ["vite", "--port", String(port)], {
    cwd,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export async function waitForVite(port: number, timeoutMs = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${port}`);
      if (res.ok || res.status === 200 || res.status === 304) return;
    } catch {
      // connection refused — keep polling
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Vite did not become ready on port ${port} within ${timeoutMs}ms`);
}

export async function killVite(proc: ChildProcess): Promise<void> {
  await new Promise<void>((resolve) => {
    const to = setTimeout(() => {
      proc.kill("SIGKILL");
      resolve();
    }, 2000);
    proc.once("exit", () => {
      clearTimeout(to);
      resolve();
    });
    proc.kill("SIGTERM");
  });
}

export async function launchHeadlessBrowser(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--enable-gpu-rasterization",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
    ],
  });
}

/**
 * runInPuppeteerPage — open a URL, run a function on the page, collect
 * console errors, tear down.
 */
export async function runInPuppeteerPage<T>(
  browser: Browser,
  url: string,
  fn: (page: Page, logs: string[]) => Promise<T>,
): Promise<{ result: T; logs: string[] }> {
  const page = await browser.newPage();
  const logs: string[] = [];
  page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on("pageerror", (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    logs.push(`[pageerror] ${msg}`);
  });
  try {
    await page.goto(url, { waitUntil: "networkidle0" });
    const result = await fn(page, logs);
    return { result, logs };
  } finally {
    await page.close();
  }
}
