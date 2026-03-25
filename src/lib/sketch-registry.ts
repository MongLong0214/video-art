import * as THREE from "three";

export type SketchConfig = {
  name: string;
  width: number;
  height: number;
  fps: number;
  loopDuration: number;
  toneMapping: "none" | "aces";
  postProcessing: "none" | "bloom_post";
};

export const SKETCH_REGISTRY: Record<string, SketchConfig> = {
  psychedelic: {
    name: "psychedelic",
    width: 1080, height: 1920, fps: 60,
    loopDuration: 8.0,
    toneMapping: "aces",
    postProcessing: "bloom_post",
  },
  signal: {
    name: "signal",
    width: 1080, height: 1920, fps: 60,
    loopDuration: 7.9333,
    toneMapping: "none",
    postProcessing: "none",
  },
  psy: {
    name: "psy",
    width: 814, height: 1308, fps: 60,
    loopDuration: 9.9805,
    toneMapping: "none",
    postProcessing: "none",
  },
  "psychedelic-eye": {
    name: "psychedelic-eye",
    width: 1080, height: 1080, fps: 60,
    loopDuration: 8.0,
    toneMapping: "none",
    postProcessing: "none",
  },
  "rainbow-spiral": {
    name: "rainbow-spiral",
    width: 1080, height: 1920, fps: 60,
    loopDuration: 8.0,
    toneMapping: "aces",
    postProcessing: "bloom_post",
  },
  blueprint: {
    name: "blueprint",
    width: 1080, height: 1920, fps: 60,
    loopDuration: 8.0,
    toneMapping: "aces",
    postProcessing: "bloom_post",
  },
  kaleidoscope: {
    name: "kaleidoscope",
    width: 1920, height: 1080, fps: 60,
    loopDuration: 10.0,
    toneMapping: "none",
    postProcessing: "none",
  },
};

export const DEFAULT_CONFIG: SketchConfig = {
  name: "default",
  width: 1080, height: 1920, fps: 60,
  loopDuration: 8.0,
  toneMapping: "aces",
  postProcessing: "bloom_post",
};

export const getSketchConfig = (name: string): SketchConfig =>
  SKETCH_REGISTRY[name] ?? DEFAULT_CONFIG;

export const getToneMapping = (config: SketchConfig): THREE.ToneMapping =>
  config.toneMapping === "none" ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
