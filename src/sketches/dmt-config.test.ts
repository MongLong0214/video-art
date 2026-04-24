/// <reference types="node" />
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DmtConfig } from "./dmt-config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

function readConfig(name: string): DmtConfig {
  return JSON.parse(
    fs.readFileSync(path.join(projectRoot, "public", name), "utf-8"),
  ) as DmtConfig;
}

describe("dmt-config-ig.json", () => {
  const config = readConfig("dmt-config-ig.json");

  it("matches the reference reel delivery format", () => {
    expect(config.duration).toBe(16);
    expect(config.fps).toBe(60);
    expect(config.resolution).toEqual([1080, 1920]);
  });

  it("keeps radial drift loopable for the shader ring frequency", () => {
    const ringFrequency = 6 * config.foldScale;
    const loopShift = ringFrequency * config.zoomLoops;
    expect(Math.abs(loopShift - Math.round(loopShift))).toBeLessThan(0.00001);
  });
});

describe("dmt-config-trip.json", () => {
  const config = readConfig("dmt-config-trip.json");

  it("keeps the trip cut in vertical 60fps delivery format", () => {
    expect(config.duration).toBe(16);
    expect(config.fps).toBe(60);
    expect(config.resolution).toEqual([1080, 1920]);
    expect(config.paletteMode).toBe(3);
  });

  it("keeps all major motion loops closed", () => {
    const ringFrequency = 6 * config.foldScale;
    const loopShift = ringFrequency * config.zoomLoops;
    expect(Math.abs(loopShift - Math.round(loopShift))).toBeLessThan(0.00001);
    expect(Math.abs(config.hueSpeed - Math.round(config.hueSpeed))).toBeLessThan(0.00001);
    expect(Math.abs(config.cameraLoops - Math.round(config.cameraLoops))).toBeLessThan(0.00001);
  });
});

describe("dmt-config-trip-v66.json", () => {
  const config = readConfig("dmt-config-trip-v66.json");

  it("keeps the v66 masterpiece cut in vertical 60fps delivery format", () => {
    expect(config.duration).toBe(16);
    expect(config.fps).toBe(60);
    expect(config.resolution).toEqual([1080, 1920]);
    expect(config.paletteMode).toBe(4);
  });

  it("keeps v66 major motion loops closed", () => {
    const ringFrequency = 6 * config.foldScale;
    const loopShift = ringFrequency * config.zoomLoops;
    expect(Math.abs(loopShift - Math.round(loopShift))).toBeLessThan(0.00001);
    expect(Math.abs(config.hueSpeed - Math.round(config.hueSpeed))).toBeLessThan(0.00001);
    expect(Math.abs(config.cameraLoops - Math.round(config.cameraLoops))).toBeLessThan(0.00001);
  });

  it("uses a restrained post stack to protect color hierarchy", () => {
    expect(config.glow).toBeLessThanOrEqual(1.22);
    expect(config.bloomStrength).toBeLessThanOrEqual(0.28);
    expect(config.bloomThreshold).toBeGreaterThanOrEqual(0.58);
    expect(config.caOffset).toBeLessThanOrEqual(0.052);
    expect(config.contrast).toBeGreaterThanOrEqual(1.10);
  });
});

describe("dmt-config-trip-v67.json", () => {
  const config = readConfig("dmt-config-trip-v67.json");

  it("keeps the v67 jewel-eye cut in vertical 60fps delivery format", () => {
    expect(config.duration).toBe(16);
    expect(config.fps).toBe(60);
    expect(config.resolution).toEqual([1080, 1920]);
    expect(config.paletteMode).toBe(5);
  });

  it("keeps v67 major motion loops closed", () => {
    const ringFrequency = 6 * config.foldScale;
    const loopShift = ringFrequency * config.zoomLoops;
    expect(Math.abs(loopShift - Math.round(loopShift))).toBeLessThan(0.00001);
    expect(Math.abs(config.hueSpeed - Math.round(config.hueSpeed))).toBeLessThan(0.00001);
    expect(Math.abs(config.cameraLoops - Math.round(config.cameraLoops))).toBeLessThan(0.00001);
  });

  it("uses a cooler post stack for Instagram compression comfort", () => {
    expect(config.glow).toBeLessThanOrEqual(1.16);
    expect(config.bloomStrength).toBeLessThanOrEqual(0.24);
    expect(config.bloomThreshold).toBeGreaterThanOrEqual(0.62);
    expect(config.caOffset).toBeLessThanOrEqual(0.046);
    expect(config.contrast).toBeGreaterThanOrEqual(1.12);
  });
});

describe("dmt-config-trip-v68.json", () => {
  const config = readConfig("dmt-config-trip-v68.json");

  it("keeps the v68 psychedelic color cut in vertical 60fps delivery format", () => {
    expect(config.duration).toBe(16);
    expect(config.fps).toBe(60);
    expect(config.resolution).toEqual([1080, 1920]);
    expect(config.paletteMode).toBe(6);
  });

  it("keeps v68 major motion loops closed", () => {
    const ringFrequency = 6 * config.foldScale;
    const loopShift = ringFrequency * config.zoomLoops;
    expect(Math.abs(loopShift - Math.round(loopShift))).toBeLessThan(0.00001);
    expect(Math.abs(config.hueSpeed - Math.round(config.hueSpeed))).toBeLessThan(0.00001);
    expect(Math.abs(config.cameraLoops - Math.round(config.cameraLoops))).toBeLessThan(0.00001);
  });

  it("raises color intensity without returning to a fragile post stack", () => {
    expect(config.glow).toBeLessThanOrEqual(1.20);
    expect(config.bloomStrength).toBeLessThanOrEqual(0.25);
    expect(config.bloomThreshold).toBeGreaterThanOrEqual(0.60);
    expect(config.caOffset).toBeLessThanOrEqual(0.048);
    expect(config.contrast).toBeGreaterThanOrEqual(1.14);
  });
});

describe("dmt-config-trip-v69.json", () => {
  const config = readConfig("dmt-config-trip-v69.json");

  it("keeps the v69 suction cut in vertical 60fps delivery format", () => {
    expect(config.duration).toBe(16);
    expect(config.fps).toBe(60);
    expect(config.resolution).toEqual([1080, 1920]);
    expect(config.paletteMode).toBe(7);
  });

  it("keeps v69 major motion loops closed while increasing speed", () => {
    const ringFrequency = 6 * config.foldScale;
    const loopShift = ringFrequency * config.zoomLoops;
    expect(Math.abs(loopShift - Math.round(loopShift))).toBeLessThan(0.00001);
    expect(config.zoomLoops).toBeGreaterThan(5);
    expect(Math.abs(config.hueSpeed - Math.round(config.hueSpeed))).toBeLessThan(0.00001);
    expect(Math.abs(config.cameraLoops - Math.round(config.cameraLoops))).toBeLessThan(0.00001);
  });

  it("allows stronger dizziness without uncontrolled post effects", () => {
    expect(config.glow).toBeLessThanOrEqual(1.30);
    expect(config.bloomStrength).toBeLessThanOrEqual(0.29);
    expect(config.bloomThreshold).toBeGreaterThanOrEqual(0.60);
    expect(config.caOffset).toBeLessThanOrEqual(0.054);
    expect(config.contrast).toBeGreaterThanOrEqual(1.15);
  });
});

describe("dmt-config-trip-v70.json", () => {
  const config = readConfig("dmt-config-trip-v70.json");

  it("keeps the v70 hard-trip cut in vertical 60fps delivery format", () => {
    expect(config.duration).toBe(16);
    expect(config.fps).toBe(60);
    expect(config.resolution).toEqual([1080, 1920]);
    expect(config.paletteMode).toBe(8);
  });

  it("keeps v70 hard-trip motion loop-safe while increasing attack", () => {
    const ringFrequency = 6 * config.foldScale;
    const loopShift = ringFrequency * config.zoomLoops;
    expect(Math.abs(loopShift - Math.round(loopShift))).toBeLessThan(0.00001);
    expect(config.zoomLoops).toBeGreaterThan(7);
    expect(Math.abs(config.hueSpeed - Math.round(config.hueSpeed))).toBeLessThan(0.00001);
    expect(Math.abs(config.cameraLoops - Math.round(config.cameraLoops))).toBeLessThan(0.00001);
  });

  it("allows hard-trip post pressure without white-center blowout settings", () => {
    expect(config.glow).toBeLessThanOrEqual(1.36);
    expect(config.bloomStrength).toBeLessThanOrEqual(0.32);
    expect(config.bloomThreshold).toBeGreaterThanOrEqual(0.56);
    expect(config.caOffset).toBeLessThanOrEqual(0.062);
    expect(config.contrast).toBeGreaterThanOrEqual(1.18);
  });
});

describe("dmt-config-trip-v71.json", () => {
  const config = readConfig("dmt-config-trip-v71.json");

  it("keeps the v71 inward-cascade cut in vertical 60fps delivery format", () => {
    expect(config.duration).toBe(16);
    expect(config.fps).toBe(60);
    expect(config.resolution).toEqual([1080, 1920]);
    expect(config.paletteMode).toBe(9);
  });

  it("keeps v71 depth-color motion loop-safe", () => {
    const ringFrequency = 6 * config.foldScale;
    const loopShift = ringFrequency * config.zoomLoops;
    expect(Math.abs(loopShift - Math.round(loopShift))).toBeLessThan(0.00001);
    expect(config.zoomLoops).toBeGreaterThanOrEqual(7.5);
    expect(Math.abs(config.hueSpeed - Math.round(config.hueSpeed))).toBeLessThan(0.00001);
    expect(Math.abs(config.cameraLoops - Math.round(config.cameraLoops))).toBeLessThan(0.00001);
  });

  it("keeps the cascade hard but below the v70 post ceiling", () => {
    expect(config.glow).toBeLessThanOrEqual(1.34);
    expect(config.bloomStrength).toBeLessThanOrEqual(0.31);
    expect(config.bloomThreshold).toBeGreaterThanOrEqual(0.58);
    expect(config.caOffset).toBeLessThanOrEqual(0.060);
    expect(config.contrast).toBeGreaterThanOrEqual(1.18);
  });
});

describe("dmt-config-trip-v72.json", () => {
  const config = readConfig("dmt-config-trip-v72.json");

  it("keeps the v72 no-cross smooth cascade in vertical 60fps delivery format", () => {
    expect(config.duration).toBe(16);
    expect(config.fps).toBe(60);
    expect(config.resolution).toEqual([1080, 1920]);
    expect(config.paletteMode).toBe(10);
  });

  it("keeps v72 on the existing loop-safe line structure", () => {
    const ringFrequency = 6 * config.foldScale;
    const loopShift = ringFrequency * config.zoomLoops;
    expect(Math.abs(loopShift - Math.round(loopShift))).toBeLessThan(0.00001);
    expect(config.zoomLoops).toBe(6.5);
    expect(Math.abs(config.hueSpeed - Math.round(config.hueSpeed))).toBeLessThan(0.00001);
    expect(Math.abs(config.cameraLoops - Math.round(config.cameraLoops))).toBeLessThan(0.00001);
  });

  it("uses a smoother post stack than the hard-trip cuts", () => {
    expect(config.glow).toBeLessThanOrEqual(1.20);
    expect(config.bloomStrength).toBeLessThanOrEqual(0.24);
    expect(config.bloomThreshold).toBeGreaterThanOrEqual(0.62);
    expect(config.caOffset).toBeLessThanOrEqual(0.044);
    expect(config.contrast).toBeLessThanOrEqual(1.13);
  });
});

describe("dmt-config-trip-v73.json", () => {
  const config = readConfig("dmt-config-trip-v73.json");

  it("keeps the v73 dramatic no-cross color cut in vertical 60fps delivery format", () => {
    expect(config.duration).toBe(16);
    expect(config.fps).toBe(60);
    expect(config.resolution).toEqual([1080, 1920]);
    expect(config.paletteMode).toBe(11);
  });

  it("keeps v73 on the same loop-safe line structure as v72", () => {
    const ringFrequency = 6 * config.foldScale;
    const loopShift = ringFrequency * config.zoomLoops;
    expect(Math.abs(loopShift - Math.round(loopShift))).toBeLessThan(0.00001);
    expect(config.zoomLoops).toBe(6.5);
    expect(Math.abs(config.hueSpeed - Math.round(config.hueSpeed))).toBeLessThan(0.00001);
    expect(Math.abs(config.cameraLoops - Math.round(config.cameraLoops))).toBeLessThan(0.00001);
  });

  it("raises color intensity while staying below the rough cascade post stack", () => {
    expect(config.hueSpeed).toBeGreaterThanOrEqual(6);
    expect(config.glow).toBeLessThanOrEqual(1.24);
    expect(config.bloomStrength).toBeLessThanOrEqual(0.26);
    expect(config.bloomThreshold).toBeGreaterThanOrEqual(0.61);
    expect(config.caOffset).toBeLessThanOrEqual(0.046);
    expect(config.contrast).toBeGreaterThanOrEqual(1.14);
  });
});

describe("dmt-config-trip-v74.json", () => {
  const config = readConfig("dmt-config-trip-v74.json");

  it("keeps the v74 color-grade-only cut in vertical 60fps delivery format", () => {
    expect(config.duration).toBe(16);
    expect(config.fps).toBe(60);
    expect(config.resolution).toEqual([1080, 1920]);
    expect(config.paletteMode).toBe(12);
  });

  it("keeps v74 on the same loop-safe line structure as v72/v73", () => {
    const ringFrequency = 6 * config.foldScale;
    const loopShift = ringFrequency * config.zoomLoops;
    expect(Math.abs(loopShift - Math.round(loopShift))).toBeLessThan(0.00001);
    expect(config.zoomLoops).toBe(6.5);
    expect(Math.abs(config.hueSpeed - Math.round(config.hueSpeed))).toBeLessThan(0.00001);
    expect(Math.abs(config.cameraLoops - Math.round(config.cameraLoops))).toBeLessThan(0.00001);
  });

  it("keeps post effects restrained so color grading does not create new rings", () => {
    expect(config.glow).toBeLessThanOrEqual(1.20);
    expect(config.bloomStrength).toBeLessThanOrEqual(0.24);
    expect(config.bloomThreshold).toBeGreaterThanOrEqual(0.63);
    expect(config.caOffset).toBeLessThanOrEqual(0.042);
    expect(config.contrast).toBeLessThanOrEqual(1.14);
  });
});

describe("dmt-config-trip-v75.json", () => {
  const config = readConfig("dmt-config-trip-v75.json");

  it("keeps the v75 seam-safe smooth cut in vertical 60fps delivery format", () => {
    expect(config.duration).toBe(16);
    expect(config.fps).toBe(60);
    expect(config.resolution).toEqual([1080, 1920]);
    expect(config.paletteMode).toBe(13);
  });

  it("keeps v75 on the same loop-safe line structure as v74", () => {
    const ringFrequency = 6 * config.foldScale;
    const loopShift = ringFrequency * config.zoomLoops;
    expect(Math.abs(loopShift - Math.round(loopShift))).toBeLessThan(0.00001);
    expect(config.zoomLoops).toBe(6.5);
    expect(Math.abs(config.hueSpeed - Math.round(config.hueSpeed))).toBeLessThan(0.00001);
    expect(Math.abs(config.cameraLoops - Math.round(config.cameraLoops))).toBeLessThan(0.00001);
  });

  it("uses the smoothest post stack in the no-cross branch", () => {
    expect(config.glow).toBeLessThanOrEqual(1.15);
    expect(config.bloomStrength).toBeLessThanOrEqual(0.20);
    expect(config.bloomThreshold).toBeGreaterThanOrEqual(0.66);
    expect(config.caOffset).toBeLessThanOrEqual(0.034);
    expect(config.contrast).toBeLessThanOrEqual(1.08);
  });
});

describe("dmt-config-trip-v76.json", () => {
  const config = readConfig("dmt-config-trip-v76.json");

  it("keeps the v76 hypercolor polish in vertical 60fps delivery format", () => {
    expect(config.duration).toBe(16);
    expect(config.fps).toBe(60);
    expect(config.resolution).toEqual([1080, 1920]);
    expect(config.paletteMode).toBe(14);
  });

  it("keeps v76 on the same loop-safe line structure as v75", () => {
    const ringFrequency = 6 * config.foldScale;
    const loopShift = ringFrequency * config.zoomLoops;
    expect(Math.abs(loopShift - Math.round(loopShift))).toBeLessThan(0.00001);
    expect(config.zoomLoops).toBe(6.5);
    expect(Math.abs(config.hueSpeed - Math.round(config.hueSpeed))).toBeLessThan(0.00001);
    expect(Math.abs(config.cameraLoops - Math.round(config.cameraLoops))).toBeLessThan(0.00001);
  });

  it("keeps the v75 smooth post stack while changing only color behavior", () => {
    expect(config.glow).toBeLessThanOrEqual(1.15);
    expect(config.bloomStrength).toBeLessThanOrEqual(0.20);
    expect(config.bloomThreshold).toBeGreaterThanOrEqual(0.66);
    expect(config.caOffset).toBeLessThanOrEqual(0.034);
    expect(config.contrast).toBeLessThanOrEqual(1.08);
  });
});

describe("dmt-config-trip-v77.json", () => {
  const config = readConfig("dmt-config-trip-v77.json");

  it("keeps the v77 bright-prism polish in vertical 60fps delivery format", () => {
    expect(config.duration).toBe(16);
    expect(config.fps).toBe(60);
    expect(config.resolution).toEqual([1080, 1920]);
    expect(config.paletteMode).toBe(15);
  });

  it("keeps v77 on the same loop-safe line structure as v75", () => {
    const ringFrequency = 6 * config.foldScale;
    const loopShift = ringFrequency * config.zoomLoops;
    expect(Math.abs(loopShift - Math.round(loopShift))).toBeLessThan(0.00001);
    expect(config.zoomLoops).toBe(6.5);
    expect(Math.abs(config.hueSpeed - Math.round(config.hueSpeed))).toBeLessThan(0.00001);
    expect(Math.abs(config.cameraLoops - Math.round(config.cameraLoops))).toBeLessThan(0.00001);
  });

  it("keeps the v75 smooth post stack and avoids solving brightness with harsher post", () => {
    expect(config.glow).toBeLessThanOrEqual(1.15);
    expect(config.bloomStrength).toBeLessThanOrEqual(0.20);
    expect(config.bloomThreshold).toBeGreaterThanOrEqual(0.66);
    expect(config.caOffset).toBeLessThanOrEqual(0.034);
    expect(config.contrast).toBeLessThanOrEqual(1.08);
  });
});

describe("dmt-config-trip-v78.json", () => {
  const config = readConfig("dmt-config-trip-v78.json");

  it("keeps the v78 cohesive continuous-gradient cut in vertical 60fps delivery format", () => {
    expect(config.duration).toBe(16);
    expect(config.fps).toBe(60);
    expect(config.resolution).toEqual([1080, 1920]);
    expect(config.paletteMode).toBe(16);
  });

  it("keeps v78 loop-safe while increasing suction speed", () => {
    const ringFrequency = 6 * config.foldScale;
    const loopShift = ringFrequency * config.zoomLoops;
    expect(Math.abs(loopShift - Math.round(loopShift))).toBeLessThan(0.00001);
    expect(config.zoomLoops).toBe(7.5);
    expect(Math.abs(config.hueSpeed - Math.round(config.hueSpeed))).toBeLessThan(0.00001);
    expect(Math.abs(config.cameraLoops - Math.round(config.cameraLoops))).toBeLessThan(0.00001);
  });

  it("keeps post effects smooth instead of hiding palette issues with harsh processing", () => {
    expect(config.glow).toBeLessThanOrEqual(1.14);
    expect(config.bloomStrength).toBeLessThanOrEqual(0.19);
    expect(config.bloomThreshold).toBeGreaterThanOrEqual(0.67);
    expect(config.caOffset).toBeLessThanOrEqual(0.032);
    expect(config.contrast).toBeLessThanOrEqual(1.07);
  });
});

describe("dmt-config-trip-v79.json", () => {
  const config = readConfig("dmt-config-trip-v79.json");

  it("keeps the v79 reference-prism cut in vertical 60fps delivery format", () => {
    expect(config.duration).toBe(16);
    expect(config.fps).toBe(60);
    expect(config.resolution).toEqual([1080, 1920]);
    expect(config.paletteMode).toBe(17);
  });

  it("keeps v79 loop-safe while intensifying suction", () => {
    const ringFrequency = 6 * config.foldScale;
    const loopShift = ringFrequency * config.zoomLoops;
    expect(Math.abs(loopShift - Math.round(loopShift))).toBeLessThan(0.00001);
    expect(config.zoomLoops).toBe(8);
    expect(Math.abs(config.hueSpeed - Math.round(config.hueSpeed))).toBeLessThan(0.00001);
    expect(Math.abs(config.cameraLoops - Math.round(config.cameraLoops))).toBeLessThan(0.00001);
  });

  it("keeps post effects smooth so the extracted palette does the work", () => {
    expect(config.glow).toBeLessThanOrEqual(1.12);
    expect(config.bloomStrength).toBeLessThanOrEqual(0.18);
    expect(config.bloomThreshold).toBeGreaterThanOrEqual(0.68);
    expect(config.caOffset).toBeLessThanOrEqual(0.03);
    expect(config.contrast).toBeLessThanOrEqual(1.06);
  });
});
