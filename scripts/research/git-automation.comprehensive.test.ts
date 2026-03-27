import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkDirty, ensureBranch, gitCommitConfig, gitRestoreConfig, registerSigintHandler } from "./git-automation.js";

vi.mock("child_process", () => ({
  execFileSync: vi.fn(),
}));

import { execFileSync } from "child_process";

beforeEach(() => { vi.clearAllMocks(); });

describe("checkDirty", () => {
  it("returns true when git status has output", () => {
    vi.mocked(execFileSync).mockReturnValue("M file.ts\n");
    expect(checkDirty("/repo")).toBe(true);
  });

  it("returns false when git status is clean", () => {
    vi.mocked(execFileSync).mockReturnValue("");
    expect(checkDirty("/repo")).toBe(false);
  });

  it("returns false for whitespace-only output", () => {
    vi.mocked(execFileSync).mockReturnValue("  \n  ");
    expect(checkDirty("/repo")).toBe(false);
  });
});

describe("ensureBranch", () => {
  it("checks out existing branch", () => {
    vi.mocked(execFileSync).mockReturnValue("");
    ensureBranch("mar27", "/repo");
    expect(vi.mocked(execFileSync)).toHaveBeenCalledWith(
      "git", ["checkout", "autoresearch/mar27"], expect.any(Object),
    );
  });

  it("creates new branch when checkout fails", () => {
    vi.mocked(execFileSync)
      .mockImplementationOnce(() => { throw new Error("not found"); })
      .mockReturnValue("");
    ensureBranch("mar27", "/repo");
    expect(vi.mocked(execFileSync)).toHaveBeenCalledWith(
      "git", ["checkout", "-b", "autoresearch/mar27"], expect.any(Object),
    );
  });
});

describe("gitCommitConfig", () => {
  it("adds config, commits, and returns hash", () => {
    vi.mocked(execFileSync)
      .mockReturnValueOnce("") // git add
      .mockReturnValueOnce("") // git commit
      .mockReturnValue("abc1234\n"); // git rev-parse
    const hash = gitCommitConfig("test commit", "/repo");
    expect(hash).toBe("abc1234");
    expect(vi.mocked(execFileSync)).toHaveBeenCalledTimes(3);
  });
});

describe("gitRestoreConfig", () => {
  it("calls git checkout on config file", () => {
    gitRestoreConfig("/repo");
    expect(vi.mocked(execFileSync)).toHaveBeenCalledWith(
      "git", ["checkout", "--", "scripts/research/research-config.ts"], expect.any(Object),
    );
  });
});

describe("registerSigintHandler", () => {
  it("registers handler on process SIGINT", () => {
    const spy = vi.spyOn(process, "on");
    const restore = vi.fn();
    registerSigintHandler(restore, vi.fn());
    expect(spy).toHaveBeenCalledWith("SIGINT", expect.any(Function));
    spy.mockRestore();
  });
});
