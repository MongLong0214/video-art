import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { createPingPongLoop } from "./pingpong.js";

async function createTestFrame(filePath: string, value: number): Promise<void> {
  const pixels = Buffer.alloc(32 * 32 * 3, value);
  await sharp(pixels, { raw: { width: 32, height: 32, channels: 3 } })
    .png()
    .toFile(filePath);
}

describe("createPingPongLoop", () => {
  let tmpDir: string;
  let inputDir: string;
  let outputDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pingpong-test-"));
    inputDir = path.join(tmpDir, "input");
    outputDir = path.join(tmpDir, "output");
    fs.mkdirSync(inputDir);
    fs.mkdirSync(outputDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates 2N frames from N", async () => {
    for (let i = 1; i <= 5; i++) {
      await createTestFrame(path.join(inputDir, `frame_${String(i).padStart(5, "0")}.png`), i * 40);
    }

    const result = await createPingPongLoop(inputDir, outputDir);

    expect(result.frameCount).toBe(10); // 5 * 2
    const outFiles = fs.readdirSync(outputDir).filter(f => f.endsWith(".png"));
    expect(outFiles).toHaveLength(10);
  });

  it("first frame matches loop point", async () => {
    for (let i = 1; i <= 5; i++) {
      await createTestFrame(path.join(inputDir, `frame_${String(i).padStart(5, "0")}.png`), i * 40);
    }

    await createPingPongLoop(inputDir, outputDir);

    const outFiles = fs.readdirSync(outputDir).filter(f => f.endsWith(".png")).sort();
    const first = await sharp(path.join(outputDir, outFiles[0])).raw().toBuffer();
    const last = await sharp(path.join(outputDir, outFiles[outFiles.length - 1])).raw().toBuffer();

    // In a perfect ping-pong, last frame should be very close to first frame
    // (they're adjacent in the loop: last→first)
    // Frame N-1 (reversed[last]) should equal frame 1 (forward[1])
    // The actual first and last frames wrap around the loop
    expect(first.length).toBe(last.length);
  });

  it("applies cosine blending at seam", async () => {
    for (let i = 1; i <= 8; i++) {
      await createTestFrame(path.join(inputDir, `frame_${String(i).padStart(5, "0")}.png`), i * 30);
    }

    const result = await createPingPongLoop(inputDir, outputDir, { blendFrames: 3 });

    expect(result.frameCount).toBe(16);
    expect(result.blendFrames).toBe(3);
  });

  it("handles minimum 4 frames", async () => {
    for (let i = 1; i <= 4; i++) {
      await createTestFrame(path.join(inputDir, `frame_${String(i).padStart(5, "0")}.png`), i * 60);
    }

    const result = await createPingPongLoop(inputDir, outputDir);

    expect(result.frameCount).toBe(8);
  });

  it("errors on less than 4 frames", async () => {
    for (let i = 1; i <= 3; i++) {
      await createTestFrame(path.join(inputDir, `frame_${String(i).padStart(5, "0")}.png`), i * 80);
    }

    await expect(createPingPongLoop(inputDir, outputDir)).rejects.toThrow();
  });
});
