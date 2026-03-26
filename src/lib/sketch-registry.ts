import * as THREE from "three";
import type { SketchConfig } from "./sketch-configs";

export type { SketchConfig } from "./sketch-configs";
export { SKETCH_REGISTRY, DEFAULT_CONFIG, getSketchConfig } from "./sketch-configs";

export const getToneMapping = (config: SketchConfig): THREE.ToneMapping =>
  config.toneMapping === "none" ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
