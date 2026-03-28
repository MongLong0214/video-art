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
  patchSceneJson,
  restoreSceneJson,
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

// Helper: mock cleanPreviousArchive + patchSceneJson calls that precede the main pipeline logic
function mockCleanAndPatch() {
  const noChangeScene = JSON.stringify({ resolution: [720, 720], duration: 5 });
  mockedFs.readFileSync.mockReturnValue(noChangeScene);
  mockedFs.writeFileSync.mockReturnValue(undefined);
  mockedFs.rmSync.mockReturnValue(undefined);
}

describe("runFullPipeline", () => {
  it("returns videoPath and manifestPath", async () => {
    mockCleanAndPatch();

    // cleanPreviousArchive + patchSceneJson + runExportLayered + findManifest existsSync
    mockedFs.existsSync
      .mockReturnValueOnce(false)  // out/layered (clean - no archive)
      .mockReturnValueOnce(false)  // .cache/research/current (clean)
      .mockReturnValueOnce(true)   // scene.json (patchSceneJson)
      .mockReturnValueOnce(true)   // out/layered (runExportLayered)
      .mockReturnValueOnce(true);  // manifest (findManifest)

    // Step 1: runLayerDecomposition
    mockedExecFileSync.mockReturnValueOnce("Archive: /archive/001\n");
    // Step 2: runExportLayered — execFileSync for export-layered
    mockedExecFileSync.mockReturnValueOnce("");

    // runExportLayered readdirSync calls
    mockedFs.readdirSync
      .mockReturnValueOnce(["20260328_research"] as unknown as ReturnType<typeof fs.readdirSync>)
      .mockReturnValueOnce(["_research.mp4"] as unknown as ReturnType<typeof fs.readdirSync>);

    // copyToResearchDir fs calls
    mockedFs.mkdirSync.mockReturnValue(undefined);
    mockedFs.copyFileSync.mockReturnValue(undefined);

    const result = await runFullPipeline("/project", "input.png", {});

    expect(result.videoPath).toContain("video.mp4");
    expect(result.manifestPath).toContain("decomposition-manifest.json");
    expect(typeof result.elapsedMs).toBe("number");
  });

  it("throws on pipeline-layers failure", async () => {
    mockCleanAndPatch();

    mockedFs.existsSync
      .mockReturnValueOnce(false)  // out/layered (clean)
      .mockReturnValueOnce(false); // .cache/research/current (clean)

    mockedExecFileSync.mockImplementationOnce(() => {
      throw new Error("pipeline-layers crashed");
    });

    await expect(runFullPipeline("/project", "input.png")).rejects.toThrow(
      "pipeline-layers crashed",
    );
  });

  it("throws on export-layered failure", async () => {
    mockCleanAndPatch();

    mockedFs.existsSync
      .mockReturnValueOnce(false)  // out/layered (clean)
      .mockReturnValueOnce(false)  // .cache/research/current (clean)
      .mockReturnValueOnce(true);  // scene.json (patchSceneJson)

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
    mockCleanAndPatch();

    mockedFs.existsSync
      .mockReturnValueOnce(false)  // out/layered (clean)
      .mockReturnValueOnce(false)  // .cache/research/current (clean)
      .mockReturnValueOnce(true)   // scene.json (patchSceneJson)
      .mockReturnValueOnce(true);  // out/layered (runExportLayered)

    mockedExecFileSync.mockReturnValueOnce("Archive: /archive/001\n");
    mockedExecFileSync.mockReturnValueOnce("");

    mockedFs.readdirSync
      .mockReturnValueOnce(["20260328_research"] as unknown as ReturnType<typeof fs.readdirSync>)
      .mockReturnValueOnce([] as unknown as ReturnType<typeof fs.readdirSync>); // no mp4

    await expect(runFullPipeline("/project", "input.png")).rejects.toThrow(
      "did not produce",
    );
  });

  it("returns empty manifestPath when no manifest", async () => {
    mockCleanAndPatch();

    mockedFs.existsSync
      .mockReturnValueOnce(false)  // out/layered (clean)
      .mockReturnValueOnce(false)  // .cache/research/current (clean)
      .mockReturnValueOnce(true)   // scene.json (patchSceneJson)
      .mockReturnValueOnce(true)   // out/layered (runExportLayered)
      .mockReturnValueOnce(false); // manifest does not exist

    mockedExecFileSync.mockReturnValueOnce("Archive: /archive/001\n");
    mockedExecFileSync.mockReturnValueOnce("");

    mockedFs.readdirSync
      .mockReturnValueOnce(["20260328_research"] as unknown as ReturnType<typeof fs.readdirSync>)
      .mockReturnValueOnce(["_research.mp4"] as unknown as ReturnType<typeof fs.readdirSync>);

    mockedFs.mkdirSync.mockReturnValue(undefined);
    mockedFs.copyFileSync.mockReturnValue(undefined);

    const result = await runFullPipeline("/project", "input.png");
    expect(result.manifestPath).toBe("");
  });

  it("passes --layers N from config", async () => {
    mockCleanAndPatch();

    mockedFs.existsSync
      .mockReturnValueOnce(false)  // out/layered (clean)
      .mockReturnValueOnce(false)  // .cache/research/current (clean)
      .mockReturnValueOnce(true)   // scene.json (patchSceneJson)
      .mockReturnValueOnce(true)   // out/layered (runExportLayered)
      .mockReturnValueOnce(true);  // manifest

    mockedExecFileSync.mockReturnValueOnce("Archive: /archive/001\n");
    mockedExecFileSync.mockReturnValueOnce("");

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

// ── patchSceneJson / restoreSceneJson ─────────────────────

describe("patchSceneJson", () => {
  it("reduces resolution to 1080", () => {
    const scene = { resolution: [1920, 1920], duration: 5 };
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(scene));
    mockedFs.writeFileSync.mockReturnValue(undefined);

    patchSceneJson("/project");

    const writeCall = mockedFs.writeFileSync.mock.calls[0];
    expect(writeCall[0]).toBe("/project/public/scene.json");
    const written = JSON.parse(writeCall[1] as string);
    expect(written.resolution).toEqual([1080, 1080]);
    expect(written.duration).toBe(5);
  });

  it("reduces duration to 10", () => {
    const scene = { resolution: [720, 720], duration: 20 };
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(scene));
    mockedFs.writeFileSync.mockReturnValue(undefined);

    patchSceneJson("/project");

    const writeCall = mockedFs.writeFileSync.mock.calls[0];
    const written = JSON.parse(writeCall[1] as string);
    expect(written.duration).toBe(10);
    expect(written.resolution).toEqual([720, 720]);
  });

  it("preserves original under 1080 (no change)", () => {
    const scene = { resolution: [720, 720], duration: 5 };
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(scene));

    patchSceneJson("/project");

    // writeFileSync should NOT be called since nothing changed
    expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
  });
});

describe("restoreSceneJson", () => {
  it("restores original content", () => {
    const original = JSON.stringify({ resolution: [1920, 1920], duration: 20 });
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(original);
    mockedFs.writeFileSync.mockReturnValue(undefined);

    // Patch first (stores backup)
    patchSceneJson("/project");

    // Reset to track only restore writes
    mockedFs.writeFileSync.mockClear();

    // Restore
    restoreSceneJson("/project");

    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      "/project/public/scene.json",
      original,
    );
  });
});

// ── cleanPreviousArchive (tested via runFullPipeline) ─────

describe("runFullPipeline archive cleanup", () => {
  it("removes _research dirs at pipeline start", async () => {
    // cleanPreviousArchive: out/layered exists with _research dirs
    mockedFs.existsSync
      .mockReturnValueOnce(true)   // out/layered exists (cleanPreviousArchive)
      .mockReturnValueOnce(true)   // .cache/research/current exists (cleanPreviousArchive)
      .mockReturnValueOnce(true)   // scene.json exists (patchSceneJson)
      .mockReturnValueOnce(true)   // out/layered exists (runExportLayered)
      .mockReturnValueOnce(true);  // manifest exists (findManifest)

    // cleanPreviousArchive readdirSync calls
    mockedFs.readdirSync
      .mockReturnValueOnce(["20260327_research", "20260326_research"] as unknown as ReturnType<typeof fs.readdirSync>) // out/layered dirs
      .mockReturnValueOnce(["video.mp4"] as unknown as ReturnType<typeof fs.readdirSync>) // .cache/research/current contents
      .mockReturnValueOnce(["20260328_research"] as unknown as ReturnType<typeof fs.readdirSync>) // runExportLayered: dirs
      .mockReturnValueOnce(["_research.mp4"] as unknown as ReturnType<typeof fs.readdirSync>);    // runExportLayered: mp4

    mockedFs.readFileSync.mockReturnValue(JSON.stringify({ resolution: [720, 720], duration: 5 }));
    mockedFs.rmSync.mockReturnValue(undefined);
    mockedFs.mkdirSync.mockReturnValue(undefined);
    mockedFs.copyFileSync.mockReturnValue(undefined);
    mockedFs.writeFileSync.mockReturnValue(undefined);

    // Step 1: runLayerDecomposition
    mockedExecFileSync.mockReturnValueOnce("Archive: /archive/001\n");
    // Step 2: runExportLayered
    mockedExecFileSync.mockReturnValueOnce("");

    await runFullPipeline("/project", "input.png");

    // Verify rmSync was called for _research dirs
    const rmCalls = mockedFs.rmSync.mock.calls.map((c) => c[0]);
    expect(rmCalls).toContain("/project/out/layered/20260327_research");
    expect(rmCalls).toContain("/project/out/layered/20260326_research");
  });
});

// ── Environment variable passing ──────────────────────────

describe("runFullPipeline env passing", () => {
  function setupFullPipelineMocks() {
    // cleanPreviousArchive: no dirs
    mockedFs.existsSync
      .mockReturnValueOnce(false)  // out/layered (clean)
      .mockReturnValueOnce(false)  // .cache/research/current (clean)
      .mockReturnValueOnce(true)   // scene.json exists (patchSceneJson)
      .mockReturnValueOnce(true)   // out/layered exists (runExportLayered)
      .mockReturnValueOnce(true);  // manifest exists (findManifest)

    mockedFs.readFileSync.mockReturnValue(JSON.stringify({ resolution: [720, 720], duration: 5 }));
    mockedFs.writeFileSync.mockReturnValue(undefined);
    mockedFs.mkdirSync.mockReturnValue(undefined);
    mockedFs.copyFileSync.mockReturnValue(undefined);

    mockedFs.readdirSync
      .mockReturnValueOnce(["20260328_research"] as unknown as ReturnType<typeof fs.readdirSync>)
      .mockReturnValueOnce(["_research.mp4"] as unknown as ReturnType<typeof fs.readdirSync>);

    // Step 1: runLayerDecomposition
    mockedExecFileSync.mockReturnValueOnce("Archive: /archive/001\n");
    // Step 2: runExportLayered
    mockedExecFileSync.mockReturnValueOnce("");
  }

  it("sets RESEARCH_FPS env", async () => {
    setupFullPipelineMocks();
    await runFullPipeline("/project", "input.png");

    // Second execFileSync call is runExportLayered
    const exportCall = mockedExecFileSync.mock.calls[1];
    const opts = exportCall[2] as { env?: Record<string, string> };
    expect(opts.env?.RESEARCH_FPS).toBe("30");
  });

  it("sets RESEARCH_PRESET env", async () => {
    setupFullPipelineMocks();
    await runFullPipeline("/project", "input.png");

    const exportCall = mockedExecFileSync.mock.calls[1];
    const opts = exportCall[2] as { env?: Record<string, string> };
    expect(opts.env?.RESEARCH_PRESET).toBe("fast");
  });
});

// ── scene.json restored after export failure ──────────────

describe("scene.json restore on failure", () => {
  it("scene.json is restored after export failure", async () => {
    const original = JSON.stringify({ resolution: [1920, 1920], duration: 20 });

    // cleanPreviousArchive: no dirs
    mockedFs.existsSync
      .mockReturnValueOnce(false)  // out/layered (clean)
      .mockReturnValueOnce(false)  // .cache/research/current (clean)
      .mockReturnValueOnce(true);  // scene.json exists (patchSceneJson)

    mockedFs.readFileSync.mockReturnValue(original);
    mockedFs.writeFileSync.mockReturnValue(undefined);

    // Step 1: runLayerDecomposition succeeds
    mockedExecFileSync.mockReturnValueOnce("Archive: /archive/001\n");
    // Step 2: runExportLayered fails
    mockedExecFileSync.mockImplementationOnce(() => {
      throw new Error("export-layered crashed");
    });

    await expect(runFullPipeline("/project", "input.png")).rejects.toThrow(
      "export-layered crashed",
    );

    // Verify scene.json was restored (last writeFileSync call should be restore)
    const writeCalls = mockedFs.writeFileSync.mock.calls;
    const lastWrite = writeCalls[writeCalls.length - 1];
    expect(lastWrite[0]).toBe("/project/public/scene.json");
    expect(lastWrite[1]).toBe(original);
  });
});
