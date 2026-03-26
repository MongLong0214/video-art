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

export class LiveOrchestrator {
  private projectRoot: string;
  private processes: Set<ChildProcess> = new Set();
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

  async start(): Promise<void> {
    this.checkLock();
    this.writeLock();

    const bootScd = path.join(
      this.projectRoot,
      "audio",
      "sc",
      "superdirt",
      "boot.scd",
    );

    return new Promise<void>((resolve, reject) => {
      const proc = execFile("sclang", [bootScd]);
      this.processes.add(proc);

      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error("SC boot timeout — no ready signal within 30s"));
        }
      }, BOOT_TIMEOUT_MS);

      proc.stdout?.on("data", (data: string) => {
        if (data.includes("SuperDirt ready") && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve();
        }
      });

      proc.on("exit", (code: number | null) => {
        if (!resolved && code !== 0) {
          resolved = true;
          clearTimeout(timeout);
          reject(
            new Error(`sclang exited with code ${code}. Check SC installation.`),
          );
        }
      });
    });
  }

  async stop(isRecording: boolean): Promise<void> {
    if (isRecording || this.recording) {
      try {
        execFile("oscsend", ["127.0.0.1", "57110", "/quit"]);
      } catch {
        // best-effort OSC quit
      }
    }

    for (const proc of this.processes) {
      proc.kill("SIGTERM");
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
        this.processes.clear();
        this.removeLock();
        resolve();
      }, SIGKILL_DELAY_MS);
    });
  }

  private checkLock(): void {
    if (fs.existsSync(this.lockFile)) {
      const pid = parseInt(fs.readFileSync(this.lockFile, "utf-8").trim(), 10);
      if (pid && this.isProcessAlive(pid)) {
        throw new Error(`Already running (PID ${pid}). Use live:stop first.`);
      }
      fs.unlinkSync(this.lockFile);
    }
  }

  private writeLock(): void {
    fs.writeFileSync(this.lockFile, String(process.pid));
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
