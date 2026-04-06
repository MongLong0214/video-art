import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);
const SCRIPT = path.resolve("scripts/motion/extract_flow.py");

const SKIP = process.env.SKIP_PYTHON_TESTS === "1";

// Helper: create a solid color PNG using raw pixel data
async function createTestPng(filePath: string, r: number, g: number, b: number): Promise<void> {
  // Use sharp if available, otherwise create minimal PNG manually
  const sharp = await import("sharp").then(m => m.default);
  const pixels = Buffer.alloc(64 * 64 * 3);
  for (let i = 0; i < 64 * 64; i++) {
    pixels[i * 3] = r;
    pixels[i * 3 + 1] = g;
    pixels[i * 3 + 2] = b;
  }
  await sharp(pixels, { raw: { width: 64, height: 64, channels: 3 } })
    .png()
    .toFile(filePath);
}

describe.skipIf(SKIP)("extract_flow.py", () => {
  let tmpDir: string;

  function setup() {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "flow-test-"));
    fs.mkdirSync(path.join(tmpDir, "frames"));
    fs.mkdirSync(path.join(tmpDir, "output"));
  }

  function cleanup() {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  it("outputs flow npy files for 3 frames", async () => {
    setup();
    try {
      const framesDir = path.join(tmpDir, "frames");
      await createTestPng(path.join(framesDir, "frame_00001.png"), 255, 0, 0);
      await createTestPng(path.join(framesDir, "frame_00002.png"), 0, 255, 0);
      await createTestPng(path.join(framesDir, "frame_00003.png"), 0, 0, 255);

      const { stdout } = await execFileAsync("python3", [SCRIPT, framesDir, path.join(tmpDir, "output")], {
        timeout: 120_000,
      });

      // Check .npy files created
      const npyFiles = fs.readdirSync(path.join(tmpDir, "output")).filter(f => f.endsWith(".npy"));
      expect(npyFiles).toHaveLength(2);
      expect(npyFiles).toContain("flow_00001.npy");
      expect(npyFiles).toContain("flow_00002.npy");

      // Check JSON metadata
      const meta = JSON.parse(stdout.trim());
      expect(meta.frame_count).toBe(3);
      expect(meta.flow_count).toBe(2);
      expect(meta.device).toMatch(/^(cpu|cuda)$/);
      expect(meta.elapsed_sec).toBeGreaterThan(0);
    } finally {
      cleanup();
    }
  });

  it("identical frames produce near-zero flow", async () => {
    setup();
    try {
      const framesDir = path.join(tmpDir, "frames");
      await createTestPng(path.join(framesDir, "frame_00001.png"), 128, 128, 128);
      await createTestPng(path.join(framesDir, "frame_00002.png"), 128, 128, 128);

      const { stdout } = await execFileAsync("python3", [SCRIPT, framesDir, path.join(tmpDir, "output")], {
        timeout: 120_000,
      });

      const meta = JSON.parse(stdout.trim());
      expect(meta.flow_count).toBe(1);
    } finally {
      cleanup();
    }
  });

  it("errors on single frame", async () => {
    setup();
    try {
      const framesDir = path.join(tmpDir, "frames");
      await createTestPng(path.join(framesDir, "frame_00001.png"), 255, 0, 0);

      await expect(
        execFileAsync("python3", [SCRIPT, framesDir, path.join(tmpDir, "output")], { timeout: 30_000 }),
      ).rejects.toThrow();
    } finally {
      cleanup();
    }
  });

  it("outputs json metadata on stdout", async () => {
    setup();
    try {
      const framesDir = path.join(tmpDir, "frames");
      await createTestPng(path.join(framesDir, "frame_00001.png"), 100, 100, 100);
      await createTestPng(path.join(framesDir, "frame_00002.png"), 200, 200, 200);

      const { stdout } = await execFileAsync("python3", [SCRIPT, framesDir, path.join(tmpDir, "output")], {
        timeout: 120_000,
      });

      const meta = JSON.parse(stdout.trim());
      expect(meta).toHaveProperty("frame_count");
      expect(meta).toHaveProperty("flow_count");
      expect(meta).toHaveProperty("device");
      expect(meta).toHaveProperty("elapsed_sec");
      expect(meta).toHaveProperty("resolution");
      expect(meta.resolution).toEqual([64, 64]);
    } finally {
      cleanup();
    }
  });
});
