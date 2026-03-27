// Git Automation + Crash Recovery
// Branch management, crash counter, budget tracker, SIGINT handling

import { execFileSync } from "child_process";

const MAX_CONSECUTIVE_CRASHES = 5;
const CONFIG_PATH = "scripts/research/research-config.ts";

// ── Crash Counter ──────────────────────────────────────────

export class CrashCounter {
  count = 0;

  recordCrash(): void {
    this.count++;
  }

  recordSuccess(): void {
    this.count = 0;
  }

  shouldStop(): boolean {
    return this.count >= MAX_CONSECUTIVE_CRASHES;
  }
}

// ── Budget Tracker ─────────────────────────────────────────

export class BudgetTracker {
  current = 0;
  private readonly limit: number | null;

  constructor(budget?: number) {
    this.limit = budget ?? null;
  }

  increment(): void {
    this.current++;
  }

  isExhausted(): boolean {
    if (this.limit === null) return false;
    return this.current >= this.limit;
  }
}

// ── Git Operations ─────────────────────────────────────────

export function ensureBranch(tag: string, cwd: string): void {
  const branch = `autoresearch/${tag}`;
  try {
    execFileSync("git", ["checkout", branch], { cwd, stdio: "pipe" });
  } catch {
    execFileSync("git", ["checkout", "-b", branch], { cwd, stdio: "pipe" });
  }
}

export function checkDirty(cwd: string): boolean {
  const output = execFileSync("git", ["status", "--porcelain"], {
    cwd,
    encoding: "utf-8",
  });
  return output.trim().length > 0;
}

export function gitCommitConfig(message: string, cwd: string): string {
  execFileSync("git", ["add", CONFIG_PATH], { cwd, stdio: "pipe" });
  execFileSync("git", ["commit", "-m", message], { cwd, stdio: "pipe" });
  const hash = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd,
    encoding: "utf-8",
  });
  return hash.trim();
}

export function gitRestoreConfig(cwd: string): void {
  execFileSync("git", ["checkout", "--", CONFIG_PATH], { cwd, stdio: "pipe" });
}

// ── SIGINT Handler ─────────────────────────────────────────

export function registerSigintHandler(
  restoreFn: () => void,
  logFn: (msg: string) => void,
): void {
  process.on("SIGINT", () => {
    logFn("SIGINT received — restoring config and exiting gracefully");
    try {
      restoreFn();
    } catch { /* best effort */ }
    process.exit(0);
  });
}
