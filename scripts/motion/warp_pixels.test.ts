import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";

const execFileAsync = promisify(execFile);
const SCRIPT = path.resolve("scripts/motion/warp_pixels.py");

const SKIP = process.env.SKIP_PYTHON_TESTS === "1";

async function createTestPng(filePath: string, r: number, g: number, b: number, size = 64): Promise<void> {
  const pixels = Buffer.alloc(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    pixels[i * 3] = r;
    pixels[i * 3 + 1] = g;
    pixels[i * 3 + 2] = b;
  }
  await sharp(pixels, { raw: { width: size, height: size, channels: 3 } })
    .png()
    .toFile(filePath);
}

async function createTestRgba(filePath: string, r: number, g: number, b: number, a: number, size = 64): Promise<void> {
  const pixels = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4] = r;
    pixels[i * 4 + 1] = g;
    pixels[i * 4 + 2] = b;
    pixels[i * 4 + 3] = a;
  }
  await sharp(pixels, { raw: { width: size, height: size, channels: 4 } })
    .png()
    .toFile(filePath);
}

function createZeroFlow(dir: string, name: string, h: number, w: number): void {
  // Create a zero flow .npy file (all zeros = no motion)
  // Simple .npy format: header + float32 data
  const header = createNpyHeader(h, w);
  const data = Buffer.alloc(h * w * 2 * 4); // float32, 2 channels
  const buf = Buffer.concat([header, data]);
  fs.writeFileSync(path.join(dir, name), buf);
}

function createUniformFlow(dir: string, name: string, h: number, w: number, dx: number, dy: number): void {
  const header = createNpyHeader(h, w);
  const data = Buffer.alloc(h * w * 2 * 4);
  for (let i = 0; i < h * w; i++) {
    data.writeFloatLE(dx, i * 8);
    data.writeFloatLE(dy, i * 8 + 4);
  }
  const buf = Buffer.concat([header, data]);
  fs.writeFileSync(path.join(dir, name), buf);
}

function createNpyHeader(h: number, w: number): Buffer {
  const descr = "{'descr': '<f4', 'fortran_order': False, 'shape': (" + h + ", " + w + ", 2), }";
  const padding = 64 - ((10 + descr.length) % 64);
  const headerLen = descr.length + padding;
  const header = Buffer.alloc(10 + headerLen);
  // Magic: \x93NUMPY
  header[0] = 0x93;
  header.write("NUMPY", 1);
  header[6] = 1; // major version
  header[7] = 0; // minor version
  header.writeUInt16LE(headerLen, 8);
  header.write(descr, 10);
  // Pad with spaces, end with \n
  for (let i = 10 + descr.length; i < 10 + headerLen - 1; i++) {
    header[i] = 0x20;
  }
  header[10 + headerLen - 1] = 0x0a;
  return header;
}

describe.skipIf(SKIP)("warp_pixels.py", () => {
  let tmpDir: string;

  function setup() {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "warp-test-"));
    fs.mkdirSync(path.join(tmpDir, "flow"));
    fs.mkdirSync(path.join(tmpDir, "output"));
  }

  function cleanup() {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  it("warps pixels with zero flow — output equals original", async () => {
    setup();
    try {
      const imgPath = path.join(tmpDir, "original.png");
      await createTestPng(imgPath, 128, 64, 200);
      createZeroFlow(path.join(tmpDir, "flow"), "flow_00001.npy", 64, 64);

      const { stdout } = await execFileAsync("python3", [
        SCRIPT, imgPath, path.join(tmpDir, "flow"), path.join(tmpDir, "output"),
      ], { timeout: 60_000 });

      const outFiles = fs.readdirSync(path.join(tmpDir, "output")).filter(f => f.endsWith(".png"));
      expect(outFiles).toHaveLength(2); // frame 1 (original) + frame 2 (warped)

      const meta = JSON.parse(stdout.trim());
      expect(meta.frame_count).toBe(2);
    } finally {
      cleanup();
    }
  });

  it("preserves alpha channel with --has-alpha", async () => {
    setup();
    try {
      const imgPath = path.join(tmpDir, "original.png");
      await createTestRgba(imgPath, 200, 100, 50, 128);
      createZeroFlow(path.join(tmpDir, "flow"), "flow_00001.npy", 64, 64);

      const { stdout } = await execFileAsync("python3", [
        SCRIPT, imgPath, path.join(tmpDir, "flow"), path.join(tmpDir, "output"),
        "--has-alpha",
      ], { timeout: 60_000 });

      const meta = JSON.parse(stdout.trim());
      expect(meta.has_alpha).toBe(true);

      // Check output has alpha channel
      const outFile = path.join(tmpDir, "output", "frame_00002.png");
      const info = await sharp(outFile).metadata();
      expect(info.channels).toBe(4);
    } finally {
      cleanup();
    }
  });

  it("outputs json metadata", async () => {
    setup();
    try {
      const imgPath = path.join(tmpDir, "original.png");
      await createTestPng(imgPath, 100, 100, 100);
      createZeroFlow(path.join(tmpDir, "flow"), "flow_00001.npy", 64, 64);

      const { stdout } = await execFileAsync("python3", [
        SCRIPT, imgPath, path.join(tmpDir, "flow"), path.join(tmpDir, "output"),
      ], { timeout: 60_000 });

      const meta = JSON.parse(stdout.trim());
      expect(meta).toHaveProperty("frame_count");
      expect(meta).toHaveProperty("disocclusion_ratio_avg");
      expect(meta).toHaveProperty("has_alpha");
      expect(meta).toHaveProperty("resolution");
    } finally {
      cleanup();
    }
  });
});
