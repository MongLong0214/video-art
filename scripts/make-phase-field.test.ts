import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirs: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirs.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

function createStripePixels(width: number, height: number): Buffer {
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = Math.floor(x / 2) % 2 === 0 ? 16 : 240;
      const offset = (y * width + x) * 3;
      pixels[offset] = value;
      pixels[offset + 1] = value;
      pixels[offset + 2] = value;
    }
  }
  return pixels;
}

function createTexturedCorePixels(width: number, height: number): Buffer {
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const insideCore = x > width * 0.15 && x < width * 0.85 && y > height * 0.14 && y < height * 0.86;
      const ridge = 128 + 64 * Math.sin(x * 0.55 + y * 0.18) + 33 * Math.sin(x * 0.13 - y * 0.42);
      const value = Math.round(Math.max(0, Math.min(255, insideCore ? ridge : 26)));
      const offset = (y * width + x) * 3;
      pixels[offset] = value;
      pixels[offset + 1] = value;
      pixels[offset + 2] = value;
    }
  }
  return pixels;
}

async function meanHorizontalDelta(imagePath: string): Promise<number> {
  const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
  let total = 0;
  let count = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 1; x < info.width; x++) {
      const offset = (y * info.width + x) * info.channels;
      total += Math.abs(data[offset] - data[offset - info.channels]);
      count++;
    }
  }
  return total / Math.max(1, count);
}

async function maxFlowCoherence(imagePath: string): Promise<number> {
  const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
  let max = 0;
  for (let i = 0; i < info.width * info.height; i++) max = Math.max(max, data[i * info.channels + 2]);
  return max;
}

async function meanRedChannel(imagePath: string): Promise<number> {
  const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
  let total = 0;
  for (let i = 0; i < info.width * info.height; i++) total += data[i * info.channels];
  return total / Math.max(1, info.width * info.height);
}

async function streamPhaseVariation(imagePath: string): Promise<{
  readonly horizontal: number;
  readonly vertical: number;
  readonly confidence: number;
}> {
  const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
  let horizontal = 0;
  let horizontalCount = 0;
  let vertical = 0;
  let verticalCount = 0;
  let confidence = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const offset = (y * info.width + x) * info.channels;
      confidence += data[offset + 2];
      if (x > 0) {
        const previous = offset - info.channels;
        horizontal += Math.hypot(data[offset] - data[previous], data[offset + 1] - data[previous + 1]);
        horizontalCount++;
      }
      if (y > 0) {
        const previous = offset - info.width * info.channels;
        vertical += Math.hypot(data[offset] - data[previous], data[offset + 1] - data[previous + 1]);
        verticalCount++;
      }
    }
  }
  return {
    horizontal: horizontal / Math.max(1, horizontalCount),
    vertical: vertical / Math.max(1, verticalCount),
    confidence: confidence / Math.max(1, info.width * info.height),
  };
}

describe("make-phase-field detail mode", () => {
  it("retains high-frequency source stripes when writing a detail phase field", async () => {
    // Given: dense source-aligned stripes that the broad edge field intentionally smooths away.
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "video-art-phase-detail-"));
    temporaryDirs.push(workDir);
    const sourcePath = path.join(workDir, "stripes.png");
    const width = 128;
    const height = 128;
    await sharp(createStripePixels(width, height), { raw: { width, height, channels: 3 } }).png().toFile(sourcePath);

    // When: the phase-field CLI writes both the broad edge and source-detail fields.
    execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        path.join(import.meta.dirname, "make-phase-field.ts"),
        sourcePath,
        "--work-dir",
        workDir,
        "--kinds",
        "edge,detail",
      ],
      { cwd: path.resolve(import.meta.dirname, ".."), stdio: "pipe" },
    );

    // Then: detail preserves materially more adjacent stripe variation than the broad edge field.
    const edgeDelta = await meanHorizontalDelta(path.join(workDir, "layers", "phase-edge.png"));
    const detailDelta = await meanHorizontalDelta(path.join(workDir, "layers", "phase-detail.png"));
    expect(detailDelta).toBeGreaterThan(edgeDelta * 2);
  });

  it("retains tangent confidence inside a supplied figure core", async () => {
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "video-art-flow-core-"));
    temporaryDirs.push(workDir);
    const sourcePath = path.join(workDir, "stripes.png");
    const maskPath = path.join(workDir, "figure-mask.png");
    const width = 128;
    const height = 128;
    await sharp(createStripePixels(width, height), { raw: { width, height, channels: 3 } }).png().toFile(sourcePath);
    await sharp(Buffer.alloc(width * height * 4, 255), { raw: { width, height, channels: 4 } }).png().toFile(maskPath);

    execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        path.join(import.meta.dirname, "make-phase-field.ts"),
        sourcePath,
        "--work-dir",
        workDir,
        "--kinds",
        "flow",
        "--figure-mask",
        maskPath,
      ],
      { cwd: path.resolve(import.meta.dirname, ".."), stdio: "pipe" },
    );

    expect(await maxFlowCoherence(path.join(workDir, "layers", "flow-field.png"))).toBeGreaterThan(30);
  });

  it("keeps source-material tangent confidence intact inside a supplied figure core", async () => {
    // Given: a fully masked source whose interior contains dense directional texture.
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "video-art-material-flow-core-"));
    temporaryDirs.push(workDir);
    const sourcePath = path.join(workDir, "stripes.png");
    const maskPath = path.join(workDir, "figure-mask.png");
    const width = 128;
    const height = 128;
    await sharp(createStripePixels(width, height), { raw: { width, height, channels: 3 } }).png().toFile(sourcePath);
    await sharp(Buffer.alloc(width * height * 4, 255), { raw: { width, height, channels: 4 } }).png().toFile(maskPath);

    // When: material flow is requested instead of the silhouette-protecting coarse profile.
    execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        path.join(import.meta.dirname, "make-phase-field.ts"),
        sourcePath,
        "--work-dir",
        workDir,
        "--kinds",
        "flow",
        "--figure-mask",
        maskPath,
        "--flow-profile",
        "material",
      ],
      { cwd: path.resolve(import.meta.dirname, ".."), stdio: "pipe" },
    );

    // Then: figure-core coherence is not attenuated before source-only material transport.
    expect(await maxFlowCoherence(path.join(workDir, "layers", "flow-field.png"))).toBeGreaterThan(220);
  });

  it("writes an integrated source stream phase that advances along source material tangents", async () => {
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "video-art-stream-phase-"));
    temporaryDirs.push(workDir);
    const sourcePath = path.join(workDir, "stripes.png");
    const width = 128;
    const height = 128;
    await sharp(createStripePixels(width, height), { raw: { width, height, channels: 3 } }).png().toFile(sourcePath);

    execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        path.join(import.meta.dirname, "make-phase-field.ts"),
        sourcePath,
        "--work-dir",
        workDir,
        "--kinds",
        "stream",
        "--flow-profile",
        "material",
      ],
      { cwd: path.resolve(import.meta.dirname, ".."), stdio: "pipe" },
    );

    const variation = await streamPhaseVariation(path.join(workDir, "layers", "stream-field.png"));
    expect(variation.vertical).toBeGreaterThan(variation.horizontal * 1.25);
    expect(variation.confidence).toBeGreaterThan(20);
  });

  it("writes a source-derived semantic affinity field for bounded material transport", async () => {
    // Given: source-aligned material detail without a supplied overlay or mask.
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "video-art-region-affinity-"));
    temporaryDirs.push(workDir);
    const sourcePath = path.join(workDir, "stripes.png");
    const width = 240;
    const height = 320;
    await sharp(createTexturedCorePixels(width, height), { raw: { width, height, channels: 3 } }).png().toFile(sourcePath);

    // When: the field generator is asked for the region-affinity primitive input.
    execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        path.join(import.meta.dirname, "make-phase-field.ts"),
        sourcePath,
        "--work-dir",
        workDir,
        "--kinds",
        "region",
      ],
      { cwd: path.resolve(import.meta.dirname, ".."), stdio: "pipe" },
    );

    // Then: it emits non-empty source-derived support, not a color/pattern asset.
    expect(await meanRedChannel(path.join(workDir, "layers", "region-affinity-field.png"))).toBeGreaterThan(20);
  });
});
