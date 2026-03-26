interface HealthMonitorCallbacks {
  onCrash: () => void;
  onHighMemory: (bytes: number) => void;
  onHighCpu: (percent: number) => void;
}

const MEMORY_WARN_BYTES = 1.5 * 1024 * 1024 * 1024;
const CPU_WARN_PERCENT = 70;

export class LiveHealthMonitor {
  private callbacks: HealthMonitorCallbacks;

  constructor(callbacks: HealthMonitorCallbacks) {
    this.callbacks = callbacks;
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
