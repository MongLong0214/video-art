export type Rgb = readonly [number, number, number];

export type LayerName =
  | "void"
  | "aura"
  | "halo"
  | "body"
  | "gold"
  | "cyan"
  | "magenta"
  | "white"
  | "shadow";

export interface Variant {
  readonly slug: string;
  readonly label: string;
  readonly speeds: Record<LayerName, number>;
  readonly opacities: Record<LayerName, number>;
  readonly colors: Record<LayerName, Rgb>;
  readonly trail: number;
  readonly feedback: readonly [number, number, number, number];
  readonly bloom: readonly [number, number, number];
  readonly ca: readonly [number, number];
  readonly auraFx: readonly [number, number, number];
  readonly grade: readonly [number, number];
}

const speeds = (
  voidSpeed: number,
  auraSpeed: number,
  haloSpeed: number,
  bodySpeed: number,
  goldSpeed: number,
  cyanSpeed: number,
  magentaSpeed: number,
  whiteSpeed: number,
  shadowSpeed: number,
): Record<LayerName, number> => ({
  void: voidSpeed,
  aura: auraSpeed,
  halo: haloSpeed,
  body: bodySpeed,
  gold: goldSpeed,
  cyan: cyanSpeed,
  magenta: magentaSpeed,
  white: whiteSpeed,
  shadow: shadowSpeed,
});

const opacities = (
  voidOpacity: number,
  auraOpacity: number,
  haloOpacity: number,
  bodyOpacity: number,
  goldOpacity: number,
  cyanOpacity: number,
  magentaOpacity: number,
  whiteOpacity: number,
  shadowOpacity: number,
): Record<LayerName, number> => ({
  void: voidOpacity,
  aura: auraOpacity,
  halo: haloOpacity,
  body: bodyOpacity,
  gold: goldOpacity,
  cyan: cyanOpacity,
  magenta: magentaOpacity,
  white: whiteOpacity,
  shadow: shadowOpacity,
});

export const variants: readonly Variant[] = [
  {
    slug: "ganesha-8b4cafbd-dmt-v7-01-blacklight-entity",
    label: "blacklight entity",
    speeds: speeds(8, 11, 15, 19, 23, 29, 31, 37, 10),
    opacities: opacities(0.36, 0.18, 0.16, 0.2, 0.26, 0.22, 0.22, 0.16, 0.18),
    colors: {
      void: [10, 8, 58],
      aura: [84, 36, 230],
      halo: [255, 190, 40],
      body: [32, 222, 255],
      gold: [255, 206, 54],
      cyan: [18, 246, 255],
      magenta: [255, 36, 188],
      white: [245, 255, 232],
      shadow: [36, 16, 104],
    },
    trail: 0.048,
    feedback: [0.055, 0.76, 0.007, 0.997],
    bloom: [0.1, 0.34, 0.86],
    ca: [0.86, 0.13],
    auraFx: [0.065, 0.044, 0.1],
    grade: [1.08, 0.055],
  },
  {
    slug: "ganesha-8b4cafbd-dmt-v7-02-opal-chamber",
    label: "opal chamber",
    speeds: speeds(6, 10, 14, 20, 24, 28, 34, 38, 12),
    opacities: opacities(0.28, 0.22, 0.14, 0.18, 0.18, 0.2, 0.18, 0.12, 0.14),
    colors: {
      void: [12, 38, 78],
      aura: [126, 242, 255],
      halo: [255, 216, 142],
      body: [108, 255, 214],
      gold: [255, 170, 86],
      cyan: [80, 228, 255],
      magenta: [232, 112, 255],
      white: [255, 246, 220],
      shadow: [26, 58, 96],
    },
    trail: 0.04,
    feedback: [0.048, 0.78, 0.006, 0.998],
    bloom: [0.085, 0.32, 0.87],
    ca: [0.72, 0.1],
    auraFx: [0.055, 0.042, 0.08],
    grade: [1.05, 0.04],
  },
  {
    slug: "ganesha-8b4cafbd-dmt-v7-03-phosphor-temple",
    label: "phosphor temple",
    speeds: speeds(9, 13, 17, 21, 27, 33, 39, 43, 14),
    opacities: opacities(0.32, 0.17, 0.18, 0.23, 0.28, 0.24, 0.22, 0.18, 0.16),
    colors: {
      void: [8, 20, 70],
      aura: [62, 255, 156],
      halo: [255, 228, 36],
      body: [36, 248, 214],
      gold: [202, 255, 60],
      cyan: [26, 210, 255],
      magenta: [255, 42, 138],
      white: [246, 255, 210],
      shadow: [18, 46, 110],
    },
    trail: 0.052,
    feedback: [0.062, 0.74, 0.008, 0.996],
    bloom: [0.11, 0.35, 0.84],
    ca: [0.95, 0.14],
    auraFx: [0.07, 0.046, 0.11],
    grade: [1.09, 0.06],
  },
  {
    slug: "ganesha-8b4cafbd-dmt-v7-04-rose-cyan-lattice",
    label: "rose cyan lattice",
    speeds: speeds(7, 12, 18, 24, 30, 36, 42, 48, 15),
    opacities: opacities(0.3, 0.2, 0.14, 0.2, 0.22, 0.26, 0.28, 0.16, 0.14),
    colors: {
      void: [34, 10, 72],
      aura: [255, 74, 204],
      halo: [255, 176, 64],
      body: [46, 232, 255],
      gold: [255, 202, 74],
      cyan: [22, 244, 246],
      magenta: [255, 48, 178],
      white: [255, 238, 236],
      shadow: [82, 18, 108],
    },
    trail: 0.048,
    feedback: [0.055, 0.76, 0.007, 0.997],
    bloom: [0.095, 0.34, 0.86],
    ca: [0.9, 0.13],
    auraFx: [0.065, 0.044, 0.1],
    grade: [1.08, 0.055],
  },
  {
    slug: "ganesha-8b4cafbd-dmt-v7-05-amber-ultraviolet",
    label: "amber ultraviolet",
    speeds: speeds(6, 11, 16, 22, 28, 34, 40, 46, 13),
    opacities: opacities(0.38, 0.16, 0.2, 0.16, 0.3, 0.18, 0.18, 0.14, 0.22),
    colors: {
      void: [18, 8, 64],
      aura: [116, 48, 255],
      halo: [255, 164, 42],
      body: [66, 184, 255],
      gold: [255, 214, 52],
      cyan: [40, 234, 255],
      magenta: [222, 54, 255],
      white: [255, 246, 214],
      shadow: [46, 18, 82],
    },
    trail: 0.046,
    feedback: [0.052, 0.78, 0.006, 0.998],
    bloom: [0.095, 0.34, 0.86],
    ca: [0.82, 0.12],
    auraFx: [0.06, 0.044, 0.09],
    grade: [1.07, 0.05],
  },
] as const;
