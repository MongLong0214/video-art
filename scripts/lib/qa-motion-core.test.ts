import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeFrameBuffer, buildMetricRows, QA_FRAME_BYTES, resolveQaSourcePath } from "./qa-motion-core.js";

function solidFrameBuffer(frames: number, rgb: readonly [number, number, number]): Buffer {
  const buf = Buffer.alloc(QA_FRAME_BYTES * frames);
  for (let offset = 0; offset < buf.length; offset += 3) {
    buf[offset] = rgb[0];
    buf[offset + 1] = rgb[1];
    buf[offset + 2] = rgb[2];
  }
  return buf;
}

function travelingLuminanceFrameBuffer(frames: number): Buffer {
  const buf = Buffer.alloc(QA_FRAME_BYTES * frames);
  const cellCount = QA_FRAME_BYTES / 3;
  for (let frame = 0; frame < frames; frame++) {
    const frameOffset = QA_FRAME_BYTES * frame;
    for (let cell = 0; cell < cellCount; cell++) {
      const value = (cell + frame) % frames === 0 ? 230 : 40;
      const offset = frameOffset + cell * 3;
      buf[offset] = value;
      buf[offset + 1] = value;
      buf[offset + 2] = value;
    }
  }
  return buf;
}

function localizedColorDamageFrameBuffer(frames: number): Buffer {
  const buf = solidFrameBuffer(frames, [80, 80, 80]);
  const cellCount = QA_FRAME_BYTES / 3;
  const damagedCells = Math.ceil(cellCount * 0.1);
  for (let frame = 0; frame < frames; frame++) {
    const frameOffset = QA_FRAME_BYTES * frame;
    for (let cell = 0; cell < damagedCells; cell++) {
      const offset = frameOffset + cell * 3;
      buf[offset] = 255;
      buf[offset + 1] = 0;
      buf[offset + 2] = 0;
    }
  }
  return buf;
}

describe("qa-motion-core — r13 baseline-relative color dwell", () => {
  it("measures bleachDwell as time-averaged bright low-saturation pixel share", async () => {
    const result = await analyzeFrameBuffer(solidFrameBuffer(2, [230, 230, 230]));

    expect(result.metrics.bleachDwell).toBe(1);
  });

  it("uses source-relative bleach and olive thresholds when source metrics are available", async () => {
    const result = await analyzeFrameBuffer(solidFrameBuffer(1, [128, 145, 90]));
    const rows = buildMetricRows(result.metrics, {
      path: "/tmp/source.png",
      oliveDwell: 0.1,
      bleachDwell: 0.03,
    });

    const olive = rows.find((item) => item.metric === "oliveDwell");
    const bleach = rows.find((item) => item.metric === "bleachDwell");

    expect(olive?.threshold).toBe("<= 0.1500");
    expect(olive?.note).toBe("source=0.1000");
    expect(bleach?.threshold).toBe("<= 0.0600");
    expect(bleach?.note).toBe("source=0.0300");
  });

  it("caps oliveDwell failure threshold at 0.20 even for olive-heavy sources", async () => {
    const result = await analyzeFrameBuffer(solidFrameBuffer(1, [128, 145, 90]));
    const rows = buildMetricRows(result.metrics, {
      path: "/tmp/source.png",
      oliveDwell: 0.4,
      bleachDwell: 0,
    });
    const olive = rows.find((item) => item.metric === "oliveDwell");

    expect(olive?.threshold).toBe("<= 0.2000");
    expect(olive?.status).toBe("FAIL");
  });

  it("falls back to absolute color dwell thresholds without a source baseline", async () => {
    const result = await analyzeFrameBuffer(solidFrameBuffer(1, [230, 230, 230]));
    const rows = buildMetricRows(result.metrics);
    const bleach = rows.find((item) => item.metric === "bleachDwell");

    expect(bleach?.threshold).toBe("<= 0.0500");
    expect(bleach?.status).toBe("FAIL");
    expect(bleach?.note).toBe("(abs)");
  });

  it("separates hue staticZone from luminance motion density", async () => {
    const result = await analyzeFrameBuffer(travelingLuminanceFrameBuffer(4));
    const rows = buildMetricRows(result.metrics);
    const lightStaticZone = rows.find((item) => item.metric === "lightStaticZone");
    const motionDensity = rows.find((item) => item.metric === "motionDensity");

    expect(result.metrics.staticZone).toBe(1);
    expect(result.metrics.lightStaticZone).toBe(0);
    expect(result.metrics.motionDensity).toBeGreaterThan(0.7);
    expect(lightStaticZone?.status).toBe("PASS");
    expect(motionDensity?.status).toBe("PASS");
  });

  it("warns when both hue and luminance are static", async () => {
    const result = await analyzeFrameBuffer(solidFrameBuffer(4, [90, 90, 90]));
    const rows = buildMetricRows(result.metrics);
    const lightStaticZone = rows.find((item) => item.metric === "lightStaticZone");
    const motionDensity = rows.find((item) => item.metric === "motionDensity");

    expect(result.metrics.lightStaticZone).toBe(1);
    expect(result.metrics.motionDensity).toBe(0);
    expect(lightStaticZone?.status).toBe("WARN");
    expect(motionDensity?.status).toBe("WARN");
  });

  it("passes sourceColorDrift95 when frames stay close to the source grid", async () => {
    const sourceGrid = solidFrameBuffer(1, [80, 90, 100]);
    const result = await analyzeFrameBuffer(solidFrameBuffer(3, [82, 91, 101]), undefined, sourceGrid);
    const rows = buildMetricRows(result.metrics, {
      path: "/tmp/source.png",
      oliveDwell: 0,
      bleachDwell: 0,
    });
    const drift = rows.find((item) => item.metric === "sourceColorDrift95");

    expect(result.metrics.sourceColorDrift95).toBeLessThan(0.02);
    expect(drift?.status).toBe("PASS");
    expect(drift?.note).toBe("rgb-to-source");
  });

  it("fails sourceColorDrift95 when frames preserve luminance but damage source color", async () => {
    const sourceGrid = solidFrameBuffer(1, [80, 80, 80]);
    const result = await analyzeFrameBuffer(solidFrameBuffer(3, [220, 20, 20]), undefined, sourceGrid);
    const rows = buildMetricRows(result.metrics, {
      path: "/tmp/source.png",
      oliveDwell: 0,
      bleachDwell: 0,
    });
    const drift = rows.find((item) => item.metric === "sourceColorDrift95");

    expect(result.metrics.sourceColorDrift95).toBeGreaterThan(0.18);
    expect(drift?.threshold).toBe("<= 0.1800");
    expect(drift?.status).toBe("FAIL");
  });

  it("fails local source drift when localized damage is hidden by the frame mean", async () => {
    const sourceGrid = solidFrameBuffer(1, [80, 80, 80]);
    const result = await analyzeFrameBuffer(localizedColorDamageFrameBuffer(3), undefined, sourceGrid);
    const rows = buildMetricRows(result.metrics, {
      path: "/tmp/source.png",
      oliveDwell: 0,
      bleachDwell: 0,
    });
    const meanDrift = rows.find((item) => item.metric === "sourceColorDrift95");
    const localDrift = rows.find((item) => item.metric === "sourceColorLocalDrift95");

    expect(result.metrics.sourceColorDrift95).toBeLessThan(0.18);
    expect(meanDrift?.status).toBe("PASS");
    expect(result.metrics.sourceColorLocalDrift95).toBeGreaterThan(0.3);
    expect(localDrift?.threshold).toBe("<= 0.3000");
    expect(localDrift?.status).toBe("FAIL");
  });

  it("resolves a source image from the workDir derivation report when masks points at layers", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "qa-motion-source-"));
    const sourcePath = path.join(tmp, "source.png");
    fs.writeFileSync(sourcePath, "not-read-by-this-test");
    fs.mkdirSync(path.join(tmp, "layers"));
    fs.writeFileSync(path.join(tmp, "derivation-report.json"), JSON.stringify({ source: sourcePath }));

    expect(resolveQaSourcePath({ videoPath: "out.mp4", masksDir: path.join(tmp, "layers") })).toBe(sourcePath);
  });

  it("prefers an explicit source override over derivation-report source", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "qa-motion-source-"));
    const sourcePath = path.join(tmp, "override.png");
    fs.writeFileSync(sourcePath, "not-read-by-this-test");

    expect(resolveQaSourcePath({ videoPath: "out.mp4", masksDir: path.join(tmp, "layers"), sourcePath })).toBe(sourcePath);
  });
});
