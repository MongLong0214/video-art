import { describe, it, expect, vi, beforeEach } from "vitest";
import { execFileSync } from "child_process";
import fs from "node:fs";
import path from "node:path";

vi.mock("child_process");
vi.mock("node:fs");
vi.mock("node:path");

// Re-import after mocks are hoisted
import {
  runLayerDecomposition,
  runExportLayered,
  copyToResearchDir,
  findManifest,
  runFullPipeline,
  resolveInputImagePath,
} from "./pipeline-runner";

const mockedExecFileSync = vi.mocked(execFileSync);
const mockedFs = vi.mocked(fs);
const mockedPath = vi.mocked(path);

beforeEach(() => {
  vi.resetAllMocks();
  // Default path.join just concatenates with /
  mockedPath.join.mockImplementation((...parts: string[]) => parts.join("/"));
  mockedPath.relative.mockImplementation((_from: string, to: string) => to);
});

// ── resolveInputImagePath ──────────────────────────────────

describe("resolveInputImagePath", () => {
  it("returns input.png when exists", () => {
    mockedFs.existsSync.mockReturnValue(true);
    expect(resolveInputImagePath("/project")).toBe("input.png");
    expect(mockedFs.existsSync).toHaveBeenCalledWith("/project/input.png");
  });

  it("returns single png when no input.png", () => {
    mockedFs.existsSync.mockReturnValue(false);
    mockedFs.readdirSync.mockReturnValue(["photo.png"] as unknown as ReturnType<typeof fs.readdirSync>);
    expect(resolveInputImagePath("/project")).toBe("photo.png");
  });

  it("throws when no png", () => {
    mockedFs.existsSync.mockReturnValue(false);
    mockedFs.readdirSync.mockReturnValue([] as unknown as ReturnType<typeof fs.readdirSync>);
    expect(() => resolveInputImagePath("/project")).toThrow(
      "No .png files found. Place input.png at the project root.",
    );
  });

  it("throws when multiple png (different message)", () => {
    mockedFs.existsSync.mockReturnValue(false);
    mockedFs.readdirSync.mockReturnValue(["a.png", "b.png"] as unknown as ReturnType<typeof fs.readdirSync>);
    expect(() => resolveInputImagePath("/project")).toThrow(
      "Multiple .png files found (expected 1): a.png, b.png. Place a single input.png.",
    );
  });
});

// ── findManifest ───────────────────────────────────────────

describe("findManifest", () => {
  it("returns path when exists", () => {
    mockedFs.existsSync.mockReturnValue(true);
    const result = findManifest("/archive/dir");
    expect(result).toBe("/archive/dir/decomposition-manifest.json");
  });

  it("returns empty when not exists", () => {
    mockedFs.existsSync.mockReturnValue(false);
    expect(findManifest("/archive/dir")).toBe("");
  });

  it("returns empty for empty archiveDir", () => {
    expect(findManifest("")).toBe("");
  });
});

// ── copyToResearchDir ──────────────────────────────────────

describe("copyToResearchDir", () => {
  it("copies video to cache dir", () => {
    mockedFs.mkdirSync.mockReturnValue(undefined);
    mockedFs.copyFileSync.mockReturnValue(undefined);

    const result = copyToResearchDir("/tmp/video.mp4", "/project");
    expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
      "/project/.cache/research/current",
      { recursive: true },
    );
    expect(mockedFs.copyFileSync).toHaveBeenCalledWith(
      "/tmp/video.mp4",
      "/project/.cache/research/current/video.mp4",
    );
    expect(result).toBe("/project/.cache/research/current/video.mp4");
  });
});

// ── runLayerDecomposition ──────────────────────────────────

describe("runLayerDecomposition", () => {
  it("does not pass --variant", () => {
    mockedExecFileSync.mockReturnValue("Archive: /some/archive/dir\n");

    runLayerDecomposition("input.png", "/project", { method: "qwen-only" });

    const callArgs = mockedExecFileSync.mock.calls[0];
    const cliArgs = callArgs[1] as string[];
    expect(cliArgs).not.toContain("--variant");
    expect(cliArgs).not.toContain("qwen-only");
  });
});

// ── runFullPipeline ────────────────────────────────────────

describe("runFullPipeline", () => {
  it("returns videoPath and manifestPath", async () => {
    // Step 1: runLayerDecomposition
    mockedExecFileSync.mockReturnValueOnce("Archive: /archive/001\n");
    // Step 2: runExportLayered — execFileSync for export-layered
    mockedExecFileSync.mockReturnValueOnce("");

    // runExportLayered fs calls
    mockedFs.existsSync
      .mockReturnValueOnce(true)   // layeredDir exists
      .mockReturnValueOnce(true);  // manifest exists
    mockedFs.readdirSync
      .mockReturnValueOnce(["20260328_research"] as unknown as ReturnType<typeof fs.readdirSync>) // dirs in layeredDir
      .mockReturnValueOnce(["_research.mp4"] as unknown as ReturnType<typeof fs.readdirSync>);    // mp4 in subdir

    // copyToResearchDir fs calls
    mockedFs.mkdirSync.mockReturnValue(undefined);
    mockedFs.copyFileSync.mockReturnValue(undefined);

    const result = await runFullPipeline("/project", "input.png", {});

    expect(result.videoPath).toContain("video.mp4");
    expect(result.manifestPath).toContain("decomposition-manifest.json");
    expect(typeof result.elapsedMs).toBe("number");
  });

  it("throws on pipeline-layers failure", async () => {
    mockedExecFileSync.mockImplementationOnce(() => {
      throw new Error("pipeline-layers crashed");
    });

    await expect(runFullPipeline("/project", "input.png")).rejects.toThrow(
      "pipeline-layers crashed",
    );
  });

  it("throws on export-layered failure", async () => {
    // Step 1 succeeds
    mockedExecFileSync.mockReturnValueOnce("Archive: /archive/001\n");
    // Step 2 fails
    mockedExecFileSync.mockImplementationOnce(() => {
      throw new Error("export-layered crashed");
    });

    await expect(runFullPipeline("/project", "input.png")).rejects.toThrow(
      "export-layered crashed",
    );
  });

  it("throws when no mp4 in archive", async () => {
    mockedExecFileSync.mockReturnValueOnce("Archive: /archive/001\n");
    mockedExecFileSync.mockReturnValueOnce("");

    mockedFs.existsSync.mockReturnValueOnce(true); // layeredDir exists
    mockedFs.readdirSync
      .mockReturnValueOnce(["20260328_research"] as unknown as ReturnType<typeof fs.readdirSync>)
      .mockReturnValueOnce([] as unknown as ReturnType<typeof fs.readdirSync>); // no mp4

    await expect(runFullPipeline("/project", "input.png")).rejects.toThrow(
      "did not produce",
    );
  });

  it("returns empty manifestPath when no manifest", async () => {
    mockedExecFileSync.mockReturnValueOnce("Archive: /archive/001\n");
    mockedExecFileSync.mockReturnValueOnce("");

    mockedFs.existsSync
      .mockReturnValueOnce(true)    // layeredDir exists
      .mockReturnValueOnce(false);  // manifest does not exist
    mockedFs.readdirSync
      .mockReturnValueOnce(["20260328_research"] as unknown as ReturnType<typeof fs.readdirSync>)
      .mockReturnValueOnce(["_research.mp4"] as unknown as ReturnType<typeof fs.readdirSync>);

    mockedFs.mkdirSync.mockReturnValue(undefined);
    mockedFs.copyFileSync.mockReturnValue(undefined);

    const result = await runFullPipeline("/project", "input.png");
    expect(result.manifestPath).toBe("");
  });

  it("passes --layers N from config", async () => {
    mockedExecFileSync.mockReturnValueOnce("Archive: /archive/001\n");
    mockedExecFileSync.mockReturnValueOnce("");

    mockedFs.existsSync
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true);
    mockedFs.readdirSync
      .mockReturnValueOnce(["20260328_research"] as unknown as ReturnType<typeof fs.readdirSync>)
      .mockReturnValueOnce(["_research.mp4"] as unknown as ReturnType<typeof fs.readdirSync>);
    mockedFs.mkdirSync.mockReturnValue(undefined);
    mockedFs.copyFileSync.mockReturnValue(undefined);

    await runFullPipeline("/project", "input.png", { numLayers: 6 });

    // First call is runLayerDecomposition
    const firstCallArgs = mockedExecFileSync.mock.calls[0][1] as string[];
    expect(firstCallArgs).toContain("--layers");
    expect(firstCallArgs).toContain("6");
  });
});
