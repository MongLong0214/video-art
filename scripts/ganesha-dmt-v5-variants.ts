export type Rgb = readonly [number, number, number];
export type Speeds = readonly [number, number, number, number, number, number];
export type Opacities = readonly [number, number, number, number, number, number];
export type LayerName = "veil" | "portal" | "entity" | "jewel" | "skin" | "linework";

export interface Variant {
  readonly slug: string;
  readonly label: string;
  readonly speeds: Speeds;
  readonly opacities: Opacities;
  readonly trail: number;
  readonly feedback: readonly [number, number, number, number];
  readonly colors: Record<LayerName, Rgb>;
  readonly bloom: readonly [number, number, number];
  readonly ca: readonly [number, number];
  readonly aura: readonly [number, number, number];
  readonly contrast: readonly [number, number];
}

export const variants: readonly Variant[] = [
  {
    slug: "ganesha-8b4cafbd-research-dmt-v5-01-jewel-body",
    label: "jewel body",
    speeds: [12, 8, 16, 20, 14, 24],
    opacities: [0.31, 0.17, 0.08, 0.36, 0.28, 0.34],
    trail: 0.05,
    feedback: [0.06, 0.78, 0.006, 0.997],
    colors: {
      veil: [12, 82, 204],
      portal: [255, 198, 72],
      entity: [68, 246, 216],
      jewel: [255, 36, 150],
      skin: [42, 184, 255],
      linework: [255, 222, 48],
    },
    bloom: [0.13, 0.34, 0.86],
    ca: [0.9, 0.16],
    aura: [0.06, 0.044, 0.12],
    contrast: [1.08, 0.05],
  },
  {
    slug: "ganesha-8b4cafbd-research-dmt-v5-02-luminous-threshold",
    label: "luminous threshold",
    speeds: [10, 14, 18, 22, 12, 26],
    opacities: [0.3, 0.22, 0.09, 0.3, 0.36, 0.3],
    trail: 0.045,
    feedback: [0.055, 0.76, 0.008, 0.998],
    colors: {
      veil: [26, 210, 170],
      portal: [255, 88, 112],
      entity: [255, 232, 86],
      jewel: [255, 70, 196],
      skin: [40, 230, 255],
      linework: [132, 255, 88],
    },
    bloom: [0.12, 0.32, 0.86],
    ca: [0.82, 0.14],
    aura: [0.05, 0.04, 0.1],
    contrast: [1.06, 0.04],
  },
  {
    slug: "ganesha-8b4cafbd-research-dmt-v5-03-hyperspace-icon",
    label: "hyperspace icon",
    speeds: [16, 10, 21, 25, 17, 30],
    opacities: [0.36, 0.19, 0.09, 0.38, 0.34, 0.38],
    trail: 0.06,
    feedback: [0.072, 0.8, 0.009, 0.997],
    colors: {
      veil: [76, 26, 224],
      portal: [255, 194, 46],
      entity: [58, 246, 255],
      jewel: [255, 34, 82],
      skin: [48, 102, 255],
      linework: [255, 112, 28],
    },
    bloom: [0.14, 0.36, 0.86],
    ca: [1.05, 0.2],
    aura: [0.07, 0.048, 0.14],
    contrast: [1.1, 0.06],
  },
  {
    slug: "ganesha-8b4cafbd-research-dmt-v5-04-opal-entity",
    label: "opal entity",
    speeds: [8, 12, 15, 19, 23, 28],
    opacities: [0.26, 0.16, 0.075, 0.25, 0.34, 0.26],
    trail: 0.04,
    feedback: [0.05, 0.74, 0.005, 0.999],
    colors: {
      veil: [118, 236, 255],
      portal: [255, 218, 146],
      entity: [222, 114, 255],
      jewel: [255, 92, 178],
      skin: [88, 255, 198],
      linework: [255, 246, 178],
    },
    bloom: [0.1, 0.32, 0.88],
    ca: [0.72, 0.12],
    aura: [0.045, 0.038, 0.08],
    contrast: [1.04, 0.035],
  },
  {
    slug: "ganesha-8b4cafbd-research-dmt-v5-05-electric-temple",
    label: "electric temple",
    speeds: [18, 15, 24, 28, 21, 34],
    opacities: [0.4, 0.2, 0.095, 0.44, 0.4, 0.44],
    trail: 0.07,
    feedback: [0.08, 0.82, 0.01, 0.996],
    colors: {
      veil: [26, 32, 235],
      portal: [255, 44, 62],
      entity: [24, 255, 144],
      jewel: [255, 24, 214],
      skin: [24, 204, 255],
      linework: [255, 242, 28],
    },
    bloom: [0.14, 0.36, 0.86],
    ca: [1.15, 0.24],
    aura: [0.065, 0.046, 0.16],
    contrast: [1.12, 0.07],
  },
] as const;
