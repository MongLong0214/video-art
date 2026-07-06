export type Rgb = readonly [number, number, number];

export type LayerName =
  | "void"
  | "aura"
  | "body"
  | "gold"
  | "cyan"
  | "magenta"
  | "white"
  | "shadow";

export interface Motion {
  readonly speed: number;
  readonly opacity: number;
  readonly pressure: number;
  readonly hueKey: number;
  readonly palette: number;
}

export interface Variant {
  readonly slug: string;
  readonly label: string;
  readonly motions: Record<LayerName, Motion>;
  readonly base: {
    readonly sat: number;
    readonly value: number;
    readonly lift: number;
    readonly floor: number;
  };
  readonly gains: {
    readonly edge: number;
    readonly body: number;
    readonly aura: number;
    readonly shadow: number;
  };
  readonly trail: number;
  readonly feedback: readonly [number, number, number, number];
  readonly bloom: readonly [number, number, number];
  readonly ca: readonly [number, number];
  readonly auraFx: readonly [number, number, number];
  readonly lens: readonly [number, number, number];
  readonly grade: readonly [number, number];
}

const vividMotion: Record<LayerName, Motion> = {
  void: { speed: 2, opacity: 0.32, pressure: 0.86, hueKey: 0.18, palette: 0.62 },
  aura: { speed: 5, opacity: 0.34, pressure: 1.16, hueKey: 0.26, palette: 0.62 },
  body: { speed: 8, opacity: 0.36, pressure: 1.22, hueKey: 0.28, palette: 0.62 },
  gold: { speed: 13, opacity: 0.48, pressure: 1.56, hueKey: 0.34, palette: 0.82 },
  cyan: { speed: 22, opacity: 0.42, pressure: 1.62, hueKey: 0.32, palette: 0.84 },
  magenta: { speed: 17, opacity: 0.42, pressure: 1.62, hueKey: 0.32, palette: 0.84 },
  white: { speed: 11, opacity: 0.08, pressure: 1.12, hueKey: 0.22, palette: 0.46 },
  shadow: { speed: 2, opacity: 0, pressure: 0.72, hueKey: 0.03, palette: 0 },
};

export const variants: readonly Variant[] = [
  {
    slug: "ganesha-8b4cafbd-dmt-v8-01-jewel-entity",
    label: "jewel entity",
    motions: vividMotion,
    base: { sat: 1.06, value: 1.03, lift: 0.055, floor: 0.26 },
    gains: { edge: 1.52, body: 1.16, aura: 1.06, shadow: 1 },
    trail: 0.13,
    feedback: [0.11, 0.84, 0.018, 0.995],
    bloom: [0.24, 0.46, 0.68],
    ca: [1.3, 0.2],
    auraFx: [0.22, 0.052, 0.24],
    lens: [0.035, 0.34, 0.018],
    grade: [1.2, 0.15],
  },
  {
    slug: "ganesha-8b4cafbd-dmt-v8-02-uv-altar",
    label: "uv altar",
    motions: {
      ...vividMotion,
      aura: { speed: 7, opacity: 0.38, pressure: 1.24, hueKey: 0.28, palette: 0.66 },
      cyan: { speed: 23, opacity: 0.48, pressure: 1.72, hueKey: 0.34, palette: 0.88 },
      magenta: { speed: 17, opacity: 0.44, pressure: 1.62, hueKey: 0.34, palette: 0.84 },
    },
    base: { sat: 1.05, value: 1.03, lift: 0.06, floor: 0.27 },
    gains: { edge: 1.62, body: 1.12, aura: 1.18, shadow: 1 },
    trail: 0.15,
    feedback: [0.13, 0.82, 0.02, 0.994],
    bloom: [0.22, 0.5, 0.66],
    ca: [1.55, 0.23],
    auraFx: [0.28, 0.058, 0.3],
    lens: [0.045, 0.42, 0.025],
    grade: [1.23, 0.17],
  },
  {
    slug: "ganesha-8b4cafbd-dmt-v8-03-serpent-emerald",
    label: "serpent emerald",
    motions: {
      ...vividMotion,
      void: { speed: 3, opacity: 0.34, pressure: 0.9, hueKey: 0.2, palette: 0.66 },
      body: { speed: 8, opacity: 0.4, pressure: 1.28, hueKey: 0.3, palette: 0.66 },
      gold: { speed: 13, opacity: 0.42, pressure: 1.42, hueKey: 0.32, palette: 0.78 },
      cyan: { speed: 19, opacity: 0.48, pressure: 1.62, hueKey: 0.34, palette: 0.88 },
      white: { speed: 11, opacity: 0.1, pressure: 1.18, hueKey: 0.22, palette: 0.48 },
    },
    base: { sat: 1.05, value: 1.03, lift: 0.055, floor: 0.26 },
    gains: { edge: 1.7, body: 1.18, aura: 1.12, shadow: 1 },
    trail: 0.12,
    feedback: [0.105, 0.85, 0.016, 0.996],
    bloom: [0.2, 0.44, 0.7],
    ca: [1.36, 0.19],
    auraFx: [0.2, 0.048, 0.22],
    lens: [0.03, 0.32, 0.014],
    grade: [1.21, 0.14],
  },
  {
    slug: "ganesha-8b4cafbd-dmt-v8-04-rose-electric",
    label: "rose electric",
    motions: {
      ...vividMotion,
      aura: { speed: 7, opacity: 0.4, pressure: 1.24, hueKey: 0.28, palette: 0.68 },
      gold: { speed: 13, opacity: 0.42, pressure: 1.42, hueKey: 0.32, palette: 0.78 },
      cyan: { speed: 17, opacity: 0.38, pressure: 1.44, hueKey: 0.32, palette: 0.8 },
      magenta: { speed: 23, opacity: 0.52, pressure: 1.72, hueKey: 0.34, palette: 0.88 },
    },
    base: { sat: 1.05, value: 1.03, lift: 0.06, floor: 0.27 },
    gains: { edge: 1.72, body: 1.14, aura: 1.2, shadow: 1 },
    trail: 0.14,
    feedback: [0.12, 0.83, 0.022, 0.995],
    bloom: [0.25, 0.48, 0.68],
    ca: [1.62, 0.24],
    auraFx: [0.3, 0.06, 0.33],
    lens: [0.04, 0.46, 0.02],
    grade: [1.24, 0.18],
  },
  {
    slug: "ganesha-8b4cafbd-dmt-v8-05-gold-ultraviolet",
    label: "gold ultraviolet",
    motions: {
      ...vividMotion,
      body: { speed: 8, opacity: 0.34, pressure: 1.18, hueKey: 0.26, palette: 0.58 },
      gold: { speed: 13, opacity: 0.58, pressure: 1.72, hueKey: 0.34, palette: 0.9 },
      cyan: { speed: 19, opacity: 0.34, pressure: 1.36, hueKey: 0.3, palette: 0.76 },
      magenta: { speed: 23, opacity: 0.36, pressure: 1.38, hueKey: 0.3, palette: 0.78 },
    },
    base: { sat: 1.04, value: 1.03, lift: 0.055, floor: 0.26 },
    gains: { edge: 1.56, body: 1.08, aura: 1.04, shadow: 1 },
    trail: 0.125,
    feedback: [0.112, 0.84, 0.017, 0.996],
    bloom: [0.28, 0.5, 0.64],
    ca: [1.42, 0.2],
    auraFx: [0.24, 0.052, 0.25],
    lens: [0.035, 0.36, 0.015],
    grade: [1.22, 0.16],
  },
] as const;
