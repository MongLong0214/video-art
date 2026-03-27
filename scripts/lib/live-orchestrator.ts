import { execFile, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

export const BOOT_TIMEOUT_MS = 30_000;
export const SIGKILL_DELAY_MS = 3_000;

interface BootConfig {
  blockSize: number;
  sampleRate: number;
  memSize: number;
}

interface StartOptions {
  restart?: boolean;
  enableLogging?: boolean;
}

export class LiveOrchestrator {
  private projectRoot: string;
  private processes: Set<ChildProcess> = new Set();
  private sclangProc: ChildProcess | null = null;
  private recording = false;
  private lockFile: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.lockFile = path.join(projectRoot, ".live.lock");
  }

  getBootConfig(): BootConfig {
    return {
      blockSize: 64,
      sampleRate: 48000,
      memSize: 8192 * 16,
    };
  }

  addProcess(proc: ChildProcess): void {
    this.processes.add(proc);
  }

  setRecording(value: boolean): void {
    this.recording = value;
  }

  getProcessCount(): number {
    return this.processes.size;
  }

  getSclangPid(): number | undefined {
    return this.sclangProc?.pid ?? undefined;
  }

  getSclangProcess(): ChildProcess | null {
    return this.sclangProc;
  }

  evalSclang(code: string): void {
    if (this.sclangProc?.stdin?.writable) {
      this.sclangProc.stdin.write(code + "\n");
    }
  }

  async start(options?: StartOptions): Promise<void> {
    if (!options?.restart) {
      this.checkLock();
    } else {
      this.removeLock();
    }

    const bootScd = path.join(
      this.projectRoot,
      "audio",
      "sc",
      "superdirt",
      "boot.scd",
    );

    return new Promise<void>((resolve, reject) => {
      const args = ["-i", "stdin"];
      if (options?.enableLogging) {
        args.push("-d", "~enableLogging = true;");
      }
      args.push(bootScd);
      const proc = execFile("sclang", args);
      this.sclangProc = proc;
      this.processes.add(proc);
      this.writeLock(proc.pid);

      let resolved = false;

      const cleanup = (err: Error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(err);
        }
      };

      const timeout = setTimeout(() => {
        cleanup(new Error("SC boot timeout — no ready signal within 30s"));
      }, BOOT_TIMEOUT_MS);

      proc.on("error", (err) => {
        cleanup(new Error(`Failed to start sclang: ${err.message}`));
      });

      proc.stdout?.on("data", (data: string) => {
        if (data.includes("SuperDirt ready") && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve();
        }
      });

      proc.on("exit", (code: number | null) => {
        if (!resolved && code !== 0) {
          cleanup(
            new Error(`sclang exited with code ${code}. Check SC installation.`),
          );
        }
      });
    });
  }

  async stop(isRecording: boolean): Promise<void> {
    // Stop recording via sclang stdin (same session)
    if (isRecording || this.recording) {
      this.evalSclang("s.stopRecording;");
    }

    // Kill in-process children (when called from same process as start)
    for (const proc of this.processes) {
      proc.kill("SIGTERM");
    }

    // Also kill PIDs from lock file (when called from a separate process)
    const lockPids = this.readLockPids();
    for (const pid of lockPids) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // already dead
      }
    }

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        for (const proc of this.processes) {
          try {
            proc.kill("SIGKILL");
          } catch {
            // already dead
          }
        }
        for (const pid of lockPids) {
          try {
            process.kill(pid, "SIGKILL");
          } catch {
            // already dead
          }
        }
        this.processes.clear();
        this.sclangProc = null;
        this.removeLock();
        resolve();
      }, SIGKILL_DELAY_MS);
    });
  }

  private readLockPids(): number[] {
    try {
      if (!fs.existsSync(this.lockFile)) return [];
      const content = fs.readFileSync(this.lockFile, "utf-8").trim();
      return content.split(":").map(Number).filter((n) => !isNaN(n) && n > 0);
    } catch {
      return [];
    }
  }

  private checkLock(): void {
    if (fs.existsSync(this.lockFile)) {
      const pids = this.readLockPids();
      if (pids.some((pid) => this.isProcessAlive(pid))) {
        throw new Error(`Already running (PIDs ${pids.join(",")}). Use live:stop first.`);
      }
      fs.unlinkSync(this.lockFile);
    }
  }

  private writeLock(sclangPid?: number): void {
    const pids = sclangPid
      ? `${process.pid}:${sclangPid}`
      : String(process.pid);
    fs.writeFileSync(this.lockFile, pids);
  }

  private removeLock(): void {
    try {
      fs.unlinkSync(this.lockFile);
    } catch {
      // lock may not exist
    }
  }

  private isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
}
