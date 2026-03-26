interface HealthMonitorCallbacks {
  onCrash: () => void;
  onHighMemory: (bytes: number) => void;
  onHighCpu: (percent: number) => void;
}

const MEMORY_WARN_BYTES = 1.5 * 1024 * 1024 * 1024;
const CPU_WARN_PERCENT = 70;

export class LiveHealthMonitor {
  private callbacks: HealthMonitorCallbacks;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private monitoredPid: number | null = null;

  constructor(callbacks: HealthMonitorCallbacks) {
    this.callbacks = callbacks;
  }

  startPolling(pid: number, intervalMs = 5000): void {
    this.monitoredPid = pid;
    this.intervalId = setInterval(() => {
      if (this.monitoredPid !== null) {
        try {
          process.kill(this.monitoredPid, 0);
        } catch {
          this.checkProcess(null);
          this.stopPolling();
        }
      }
    }, intervalMs);
  }

  stopPolling(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.monitoredPid = null;
  }

  checkProcess(pid: number | null): void {
    if (pid === null) {
      this.callbacks.onCrash();
    }
  }

  checkMemory(bytes: number): void {
    if (bytes > MEMORY_WARN_BYTES) {
      this.callbacks.onHighMemory(bytes);
    }
  }

  checkCpu(percent: number): void {
    if (percent > CPU_WARN_PERCENT) {
      this.callbacks.onHighCpu(percent);
    }
  }
}
