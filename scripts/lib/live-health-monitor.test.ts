import { describe, it, expect, vi, beforeEach } from "vitest";
import { LiveHealthMonitor } from "./live-health-monitor";

describe("LiveHealthMonitor", () => {
  let monitor: LiveHealthMonitor;
  let onCrash: ReturnType<typeof vi.fn>;
  let onHighMemory: ReturnType<typeof vi.fn>;
  let onHighCpu: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    onCrash = vi.fn();
    onHighMemory = vi.fn();
    onHighCpu = vi.fn();
    monitor = new LiveHealthMonitor({ onCrash, onHighMemory, onHighCpu });
  });

  it("detects crash and calls onCrash", () => {
    monitor.checkProcess(null);
    expect(onCrash).toHaveBeenCalled();
  });

  it("warns on high memory (> 1.5GB)", () => {
    monitor.checkMemory(1.6 * 1024 * 1024 * 1024);
    expect(onHighMemory).toHaveBeenCalled();
  });

  it("no warning on normal memory", () => {
    monitor.checkMemory(0.5 * 1024 * 1024 * 1024);
    expect(onHighMemory).not.toHaveBeenCalled();
  });

  it("warns on high CPU (> 70%)", () => {
    monitor.checkCpu(75);
    expect(onHighCpu).toHaveBeenCalled();
  });

  it("no warning on normal CPU", () => {
    monitor.checkCpu(40);
    expect(onHighCpu).not.toHaveBeenCalled();
  });
});
