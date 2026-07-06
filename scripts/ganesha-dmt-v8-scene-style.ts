import type { ActiveLayerName } from "./ganesha-dmt-v8-layers.js";
import type { Motion, Rgb, Variant } from "./ganesha-dmt-v8-variants.js";

export type Blend = "normal" | "add" | "screen";

interface Palette {
  readonly a: Rgb;
  readonly b: Rgb;
  readonly c: Rgb;
  readonly d: Rgb;
}

const prismLayers: ReadonlySet<ActiveLayerName> = new Set(["gold", "cyan", "magenta"]);

const palettes = {
  jewelNight: {
    a: [0.5196, 0.2662, 0.6361],
    b: [0.4037, 0.2189, 0.3784],
    c: [1, 1, 0.9962],
    d: [0.2993, 0.9777, 0.7073],
  },
  jewelFire: {
    a: [0.5902, 0.3987, 0.3719],
    b: [0.3759, 0.1344, 0.3914],
    c: [1, 1, 0.9743],
    d: [0.4669, 0.9818, 0.0145],
  },
  jewelOpal: {
    a: [0.46692585262928143, 0.22185223001556564, 0.6393749155384588],
    b: [0.376157813817817, 0.12112465513828269, 0.33492567774417564],
    c: [1, 1, 0.9053179423806426],
    d: [0.41106600579680364, 0.02550583146006624, 0.7386765268852535],
  },
} as const satisfies Record<string, Palette>;

export function paletteFor(layer: ActiveLayerName | "base", variant: Variant): Palette {
  if (layer === "base") return palettes.jewelOpal;
  if (layer === "void") return palettes.jewelNight;
  if (layer === "body" || layer === "gold" || layer === "white") return palettes.jewelFire;
  if (layer === "cyan" || layer === "magenta") return palettes.jewelOpal;
  if (layer === "aura") return variant.slug.includes("rose") ? palettes.jewelFire : palettes.jewelNight;
  return palettes.jewelNight;
}

export function saturationFor(layer: ActiveLayerName | "base", motion: Motion): number {
  if (layer === "base") return 1.06;
  if (layer === "void") return 1;
  if (layer === "body") return Math.min(1.4, 1.12 + (motion.pressure - 1) * 0.68);
  if (layer === "aura") return Math.min(1.45, 1.14 + (motion.pressure - 1) * 0.52);
  if (layer === "white") return 1.18;
  if (prismLayers.has(layer)) return Math.min(2.05, 1.58 + (motion.pressure - 1) * 0.42);
  return 1.1;
}

export function valueLiftFor(layer: ActiveLayerName | "base"): number {
  if (layer === "base") return 0.18;
  if (layer === "void") return 0.16;
  if (layer === "body") return 0.12;
  if (layer === "aura") return 0.1;
  if (prismLayers.has(layer)) return 0.09;
  return 0.08;
}

export function paletteValueFloorFor(layer: ActiveLayerName | "base"): number {
  if (layer === "base") return 0.24;
  if (layer === "void") return 0.24;
  if (layer === "body") return 0.28;
  if (layer === "white") return 0.36;
  if (prismLayers.has(layer)) return 0.34;
  return 0.3;
}

export function paletteSatFloorFor(layer: ActiveLayerName | "base"): number {
  if (layer === "base") return 0.32;
  if (layer === "void") return 0.28;
  if (layer === "body") return 0.42;
  if (layer === "white") return 0.22;
  if (prismLayers.has(layer)) return 0.58;
  return 0.46;
}

export function blendFor(name: ActiveLayerName): Blend {
  if (name === "white") return "add";
  if (name === "aura" || prismLayers.has(name)) return "screen";
  return "normal";
}

export function opacityFor(name: ActiveLayerName, motion: Motion): number {
  if (name === "white") return Math.min(1, motion.opacity);
  if (prismLayers.has(name)) return Math.min(1, motion.opacity * 1.12);
  if (name === "body") return Math.min(1, motion.opacity * 1.08);
  return Math.min(1, motion.opacity);
}
