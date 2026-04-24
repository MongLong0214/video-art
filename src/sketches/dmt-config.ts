export interface DmtConfig {
  duration: number;
  fps: number;
  resolution: [number, number];
  symmetry: number;
  zoomLoops: number;
  cameraLoops: number;
  foldScale: number;
  paletteMode: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17;
  hueSpeed: number;
  glow: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  caOffset: number;
  vignetteIntensity: number;
  contrast: number;
}

export const DEFAULT_DMT_CONFIG: DmtConfig = {
  duration: 20,
  fps: 30,
  resolution: [1632, 2912],
  symmetry: 6,
  zoomLoops: 2.5,
  cameraLoops: 2,
  foldScale: 2.0,
  paletteMode: 0,
  hueSpeed: 1.0,
  glow: 1.2,
  bloomStrength: 0.35,
  bloomRadius: 0.6,
  bloomThreshold: 0.65,
  caOffset: 0.04,
  vignetteIntensity: 0.45,
  contrast: 1.06,
};
