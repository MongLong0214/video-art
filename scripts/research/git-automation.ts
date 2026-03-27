// Git Automation + Crash Recovery
// Branch management, crash counter, budget tracker, SIGINT handling

import { execFileSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "node:path";

const MAX_CONSECUTIVE_CRASHES = 5;
const CONFIG_PATH = "scripts/research/research-config.ts";
const CRASH_COUNT_PATH = ".cache/research/crash-count.json";
const EXPERIMENT_COUNT_PATH = ".cache/research/experiment-count.json";

// ── Crash Counter (persisted to file) ─────────────────────

interface CrashCounterState {
  count: number;
  errors: string[];
}

export class CrashCounter {
  count = 0;
  errors: string[] = [];
  private readonly persistPath: string | null;

  constructor(persistPath?: string | null) {
    // null = in-memory only (for tests); undefined = use default path
    this.persistPath = persistPath === undefined ? null : persistPath;
    if (this.persistPath) this._load();
  }

  /** Create a persisted instance using the default file path */
  static persisted(filePath?: string): CrashCounter {
    return new CrashCounter(filePath ?? CRASH_COUNT_PATH);
  }

  private _load(): void {
    if (!this.persistPath) return;
    try {
      if (existsSync(this.persistPath)) {
        const raw: CrashCounterState = JSON.parse(readFileSync(this.persistPath, "utf-8"));
        this.count = raw.count ?? 0;
        this.errors = raw.errors ?? [];
      }
    } catch {
      this.count = 0;
      this.errors = [];
    }
  }

  private _save(): void {
    if (!this.persistPath) return;
    const dir = path.dirname(this.persistPath);
    mkdirSync(dir, { recursive: true });
    const state: CrashCounterState = {
      count: this.count,
      errors: this.errors.slice(-MAX_CONSECUTIVE_CRASHES),
    };
    writeFileSync(this.persistPath, JSON.stringify(state, null, 2));
  }

  recordCrash(errorMessage?: string): void {
    this.count++;
    if (errorMessage) {
      this.errors.push(errorMessage);
      if (this.errors.length > MAX_CONSECUTIVE_CRASHES) {
        this.errors = this.errors.slice(-MAX_CONSECUTIVE_CRASHES);
      }
    }
    this._save();
  }

  recordSuccess(): void {
    this.count = 0;
    this.errors = [];
    this._save();
  }

  shouldStop(): boolean {
    return this.count >= MAX_CONSECUTIVE_CRASHES;
  }

  getErrorSummary(): string {
    if (this.errors.length === 0) return "No error details recorded.";
    return this.errors
      .map((e, i) => `  ${i + 1}. ${e}`)
      .join("\n");
  }
}

// ── Budget Tracker (persisted to file) ────────────────────

export class BudgetTracker {
  current = 0;
  private readonly limit: number | null;
  private readonly persistPath: string | null;

  constructor(budget?: number, persistPath?: string | null) {
    this.limit = budget ?? null;
    // null = in-memory only (for tests); undefined = no persistence by default
    this.persistPath = persistPath === undefined ? null : persistPath;
    if (this.persistPath) this._load();
  }

  /** Create a persisted instance using the default file path */
  static persisted(budget?: number, filePath?: string): BudgetTracker {
    return new BudgetTracker(budget, filePath ?? EXPERIMENT_COUNT_PATH);
  }

  private _load(): void {
    if (!this.persistPath) return;
    try {
      if (existsSync(this.persistPath)) {
        const raw = JSON.parse(readFileSync(this.persistPath, "utf-8"));
        this.current = raw.current ?? 0;
      }
    } catch {
      this.current = 0;
    }
  }

  private _save(): void {
    if (!this.persistPath) return;
    const dir = path.dirname(this.persistPath);
    mkdirSync(dir, { recursive: true });
    writeFileSync(this.persistPath, JSON.stringify({ current: this.current }, null, 2));
  }

  increment(): void {
    this.current++;
    this._save();
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
