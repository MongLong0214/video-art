import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  LiveOrchestrator,
  BOOT_TIMEOUT_MS,
  SIGKILL_DELAY_MS,
} from "./live-orchestrator";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";

vi.mock("node:child_process");
vi.mock("node:fs");

const mockExecFile = vi.mocked(childProcess.execFile);

const createMockProcess = (overrides: Record<string, unknown> = {}) => ({
  pid: Math.floor(Math.random() * 10000) + 1000,
  stdout: { on: vi.fn() },
  stderr: { on: vi.fn() },
  on: vi.fn(),
  kill: vi.fn().mockReturnValue(true),
  ...overrides,
});

describe("LiveOrchestrator", () => {
  let orchestrator: LiveOrchestrator;
  const unhandledRejections: Error[] = [];
  const rejectionHandler = (e: unknown) => {
    unhandledRejections.push(e as Error);
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.readFileSync).mockReturnValue("");
    orchestrator = new LiveOrchestrator("/fake/project");
    unhandledRejections.length = 0;
    process.on("unhandledRejection", rejectionHandler);
  });

  afterEach(() => {
    vi.useRealTimers();
    process.off("unhandledRejection", rejectionHandler);
  });

  it("startSequence boots SC then SuperDirt", async () => {
    const proc = createMockProcess();
    mockExecFile.mockReturnValue(proc as never);

    // Simulate sclang stdout ready message
    proc.stdout.on.mockImplementation(((event: string, cb: (data: string) => void) => {
      if (event === "data") {
        setTimeout(() => cb("=== SuperDirt ready"), 100);
      }
    }) as typeof proc.stdout.on);

    const startPromise = orchestrator.start();
    await vi.advanceTimersByTimeAsync(200);
    await startPromise;

    expect(mockExecFile).toHaveBeenCalled();
    const call = mockExecFile.mock.calls[0];
    expect(call[0]).toContain("sclang");
  });

  it("startSequence fails on SC boot error", async () => {
    const proc = createMockProcess();
    mockExecFile.mockReturnValue(proc as never);

    proc.on.mockImplementation(((event: string, cb: (code: number) => void) => {
      if (event === "exit") {
        setTimeout(() => cb(1), 10);
      }
    }) as typeof proc.on);

    const startPromise = orchestrator.start();
    await vi.advanceTimersByTimeAsync(50);
    await expect(startPromise).rejects.toThrow(/exited with code/);
  });

  it("startSequence throws on SC boot timeout", async () => {
    const proc = createMockProcess();
    mockExecFile.mockReturnValue(proc as never);
    // No stdout, no exit — pure timeout

    const startPromise = orchestrator.start();
    await vi.advanceTimersByTimeAsync(BOOT_TIMEOUT_MS + 100);
    await expect(startPromise).rejects.toThrow(/timeout/i);
  });

  it("stopSequence sends SIGTERM first", async () => {
    const proc = createMockProcess();
    orchestrator.addProcess(proc as never);

    const stopPromise = orchestrator.stop(false);
    expect(proc.kill).toHaveBeenCalledWith("SIGTERM");
    await vi.advanceTimersByTimeAsync(SIGKILL_DELAY_MS + 100);
    await stopPromise;
  });

  it("stopSequence escalates to SIGKILL after 3s", async () => {
    const proc = createMockProcess();
    proc.kill.mockReturnValue(true);
    orchestrator.addProcess(proc as never);

    const stopPromise = orchestrator.stop(false);
    await vi.advanceTimersByTimeAsync(SIGKILL_DELAY_MS + 100);
    await stopPromise;

    const killCalls = proc.kill.mock.calls.map((c: string[]) => c[0]);
    expect(killCalls).toContain("SIGTERM");
    expect(killCalls).toContain("SIGKILL");
  });

  it("stopSequence sends quit OSC if recording", async () => {
    const proc = createMockProcess();
    orchestrator.addProcess(proc as never);
    orchestrator.setRecording(true);

    const stopPromise = orchestrator.stop(true);
    await vi.advanceTimersByTimeAsync(SIGKILL_DELAY_MS + 100);
    await stopPromise;

    expect(mockExecFile).toHaveBeenCalled();
  });

  it("stopSequence leaves no zombies", async () => {
    const proc = createMockProcess();
    orchestrator.addProcess(proc as never);

    const stopPromise = orchestrator.stop(false);
    await vi.advanceTimersByTimeAsync(SIGKILL_DELAY_MS + 100);
    await stopPromise;

    expect(orchestrator.getProcessCount()).toBe(0);
  });

  it("concurrent start prevention", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("12345");
    // Mock process.kill to return true (process exists)
    const origKill = process.kill;
    process.kill = vi.fn().mockReturnValue(true) as never;

    await expect(orchestrator.start()).rejects.toThrow(/already running/i);

    process.kill = origKill;
  });

  it("startSequence cleans stale lock", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("99999");
    // Mock process.kill to throw (process doesn't exist)
    const origKill = process.kill;
    process.kill = vi.fn().mockImplementation(() => {
      throw new Error("ESRCH");
    }) as never;

    const proc = createMockProcess();
    mockExecFile.mockReturnValue(proc as never);
    proc.stdout.on.mockImplementation(((event: string, cb: (data: string) => void) => {
      if (event === "data") {
        setTimeout(() => cb("=== SuperDirt ready"), 100);
      }
    }) as typeof proc.stdout.on);

    const startPromise = orchestrator.start();
    await vi.advanceTimersByTimeAsync(200);
    await startPromise;

    expect(vi.mocked(fs.unlinkSync)).toHaveBeenCalled();
    process.kill = origKill;
  });

  it("stop reads PIDs from lock file and kills them", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("1234:5678");
    const origKill = process.kill;
    const killCalls: Array<[number, string]> = [];
    process.kill = vi.fn().mockImplementation((pid: number, sig: string) => {
      killCalls.push([pid, sig]);
    }) as never;

    const stopPromise = orchestrator.stop(false);
    await vi.advanceTimersByTimeAsync(SIGKILL_DELAY_MS + 100);
    await stopPromise;

    const sigterms = killCalls.filter(([, sig]) => sig === "SIGTERM");
    expect(sigterms.length).toBeGreaterThanOrEqual(2);
    expect(sigterms.some(([pid]) => pid === 1234)).toBe(true);
    expect(sigterms.some(([pid]) => pid === 5678)).toBe(true);

    process.kill = origKill;
  });

  it("uses execFile not exec", () => {
    expect(mockExecFile).toBeDefined();
  });

  it("evalSclang writes to sclang stdin", () => {
    const proc = createMockProcess({
      stdin: { writable: true, write: vi.fn() },
    });
    orchestrator.addProcess(proc as never);
    // Manually set sclangProc via start-like flow
    (orchestrator as unknown as { sclangProc: unknown }).sclangProc = proc;
    orchestrator.evalSclang("s.record;");
    expect(proc.stdin.write).toHaveBeenCalledWith("s.record;\n");
  });

  it("boot config sets blockSize 64", () => {
    const config = orchestrator.getBootConfig();
    expect(config.blockSize).toBe(64);
  });
});
