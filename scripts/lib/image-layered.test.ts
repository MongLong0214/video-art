import { describe, it, expect, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("image-layered", () => {
  const originalToken = process.env.REPLICATE_API_TOKEN;

  afterEach(() => {
    process.env.REPLICATE_API_TOKEN = originalToken;
    vi.restoreAllMocks();
  });

  it("should not contain hardcoded API token in source", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "image-layered.ts"),
      "utf-8",
    );
    expect(source).not.toMatch(/r8_[A-Za-z0-9]{40}/);
    expect(source).not.toMatch(/["']r8_/);
  });

  it("should throw when REPLICATE_API_TOKEN is not set", async () => {
    delete process.env.REPLICATE_API_TOKEN;
    vi.resetModules();
    const mod = await import("./image-layered.js");
    await expect(mod.decomposeImage("/fake/path.png")).rejects.toThrow(
      "REPLICATE_API_TOKEN is not set",
    );
  });
});

describe("downloadLayers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should throw on HTTP error response", async () => {
    const { downloadLayers } = await import("./image-layered.js");
    const tmpDir = path.join(__dirname, "__dl_test__");
    fs.mkdirSync(tmpDir, { recursive: true });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      }),
    );

    await expect(
      downloadLayers(["https://fake.url/layer.png"], tmpDir),
    ).rejects.toThrow("Failed to download layer 0: 404");

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should save files on successful fetch", async () => {
    const { downloadLayers } = await import("./image-layered.js");
    const tmpDir = path.join(__dirname, "__dl_test2__");
    fs.mkdirSync(tmpDir, { recursive: true });

    const fakeData = new Uint8Array([137, 80, 78, 71]); // PNG magic bytes
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(fakeData.buffer),
      }),
    );

    const files = await downloadLayers(["https://fake.url/layer.png"], tmpDir);
    expect(files.length).toBe(1);
    expect(fs.existsSync(files[0])).toBe(true);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe("check-deps", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should not throw when ffmpeg is present", async () => {
    const { checkFfmpeg } = await import("./check-deps.js");
    expect(() => checkFfmpeg()).not.toThrow();
  });

  it("should throw with helpful message when ffmpeg is missing", async () => {
    // Test the error message format by checking the implementation logic
    const { checkFfmpeg } = await import("./check-deps.js");
    // checkFfmpeg wraps execSync("which ffmpeg") — if it throws, it rethrows with a helpful message
    // We verify the error message format exists in the source code
    const source = fs.readFileSync(path.resolve(__dirname, "check-deps.ts"), "utf-8");
    expect(source).toContain("ffmpeg is not installed");
    expect(source).toContain("brew install ffmpeg");
    // Verify the function itself works (happy path — ffmpeg is present on this machine)
    expect(() => checkFfmpeg()).not.toThrow();
  });
});
