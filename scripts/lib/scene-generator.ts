import path from "node:path";
import type { PostProcessResult } from "./postprocess.js";
import type { SceneConfig } from "../../src/lib/scene-schema.js";
import { getValidPeriods } from "../../src/lib/scene-schema.js";

// Dynamic preset generation: evenly distributes phaseOffset across N layers
function generatePreset(index: number, total: number, duration: number): SceneConfig["layers"][number]["animation"] {
  const t = index / Math.max(total - 1, 1); // 0..1 normalized position
  const phaseOffset = Math.round((360 * index) / total);
  const periods = getValidPeriods(duration).sort((a, b) => b - a); // descending: back layers → longer period
  const period = periods[Math.min(Math.floor(t * periods.length), periods.length - 1)];

  return {
    colorCycle: { speed: 13.0, period, phaseOffset },
    wave: { amplitude: +(3 - t * 2).toFixed(1), frequency: +(0.3 + t * 0.2).toFixed(1), period },
    glow: { intensity: +(0.2 + t * 0.3).toFixed(1), pulse: +(0.4 + t * 0.3).toFixed(1), period },
    parallax: { depth: +(t * 0.5).toFixed(1) },
    saturationBoost: 2.5,
    luminanceKey: +(0.4 + Math.sin(t * Math.PI) * 0.4).toFixed(2),
  };
}

export async function generateSceneJson(
  sourceName: string,
  result: PostProcessResult,
  resolution: [number, number] = [1080, 1080],
  duration: number = 20,
): Promise<SceneConfig> {
  // Cap resolution while maintaining aspect ratio (Puppeteer + GPU limit)
  const MAX_OUTPUT_DIM = 1920;
  let [w, h] = resolution;
  if (w > MAX_OUTPUT_DIM || h > MAX_OUTPUT_DIM) {
    const scale = MAX_OUTPUT_DIM / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  // Ensure even dimensions for h264 yuv420p encoding
  const evenRes: [number, number] = [
    w % 2 === 0 ? w : w - 1,
    h % 2 === 0 ? h : h - 1,
  ];

  const layers: SceneConfig["layers"] = [];

  for (let i = 0; i < result.files.length; i++) {
    const filePath = result.files[i];
    const preset = generatePreset(i, result.files.length, duration);

    const layerNames = ["far-bg", "background", "mid-bg", "mid", "mid-fg", "foreground", "near-fg", "nearest"];
    const id = i < layerNames.length ? layerNames[i] : `layer-${i}`;

    layers.push({
      id,
      file: `layers/${path.basename(filePath)}`,
      zIndex: i,
      opacity: 1.0,
      animation: preset,
    });
  }

  return {
    version: 1,
    source: sourceName,
    resolution: evenRes,
    duration,
    fps: 30,
    layers,
    effects: {
      bloom: { strength: 0.6, radius: 0.4, threshold: 0.7 },
      chromaticAberration: { offset: 1.5 },
      sparkle: { count: 80, sizeMin: 2, sizeMax: 6, speed: 1.0 },
    },
  };
}
