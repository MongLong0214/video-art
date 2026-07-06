import { z } from "zod";
import { clamp01, rgbToHsv } from "./lib/image-stats.js";

type V3 = readonly [number, number, number];
type PresetName = "jewel-night" | "jewel-fire" | "jewel-opal";

type PaletteConfig = {
  readonly A: V3;
  readonly B: V3;
  readonly C: V3;
  readonly D: V3;
};

type LintOptions = {
  readonly allowEmerald: boolean;
};

const TAU = Math.PI * 2;
const SAMPLE_COUNT = 256;

const paletteSchema = z.object({
  A: z.tuple([z.number(), z.number(), z.number()]),
  B: z.tuple([z.number(), z.number(), z.number()]),
  C: z.tuple([z.number(), z.number(), z.number()]),
  D: z.tuple([z.number(), z.number(), z.number()]),
});

const PRESETS: Record<PresetName, PaletteConfig> = {
  "jewel-night": { A: [0.42, 0.4, 0.52], B: [0.38, 0.34, 0.4], C: [1, 1, 1], D: [0.62, 0.55, 0.95] },
  "jewel-fire": { A: [0.55, 0.42, 0.4], B: [0.42, 0.32, 0.38], C: [1, 1, 1], D: [0, 0.06, 0.78] },
  "jewel-opal": { A: [0.68, 0.62, 0.7], B: [0.3, 0.28, 0.32], C: [1, 1, 1.15], D: [0.05, 0.48, 0.6] },
};

const round4 = (value: number): number => Math.round(value * 10_000) / 10_000;

function paletteValue(t: number, config: PaletteConfig): V3 {
  return [
    clamp01(config.A[0] + config.B[0] * Math.cos(TAU * (config.C[0] * t + config.D[0]))),
    clamp01(config.A[1] + config.B[1] * Math.cos(TAU * (config.C[1] * t + config.D[1]))),
    clamp01(config.A[2] + config.B[2] * Math.cos(TAU * (config.C[2] * t + config.D[2]))),
  ];
}

function longestRun(signs: readonly number[], target: number): number {
  let best = 0;
  let current = 0;
  for (let i = 0; i < signs.length * 2; i++) {
    if (signs[i % signs.length] === target) {
      current = Math.min(current + 1, signs.length);
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

export function lintPalette(config: PaletteConfig, options: LintOptions) {
  let olive = 0;
  let green = 0;
  let dark = 0;
  const luminance: number[] = [];

  for (let k = 0; k < SAMPLE_COUNT; k++) {
    const rgb = paletteValue(k / SAMPLE_COUNT, config);
    const [h, s, v] = rgbToHsv([rgb[0] * 255, rgb[1] * 255, rgb[2] * 255]);
    const hueDeg = h * 360;
    if (hueDeg >= 60 && hueDeg <= 110 && (s < 0.65 || v < 0.5)) olive++;
    if (hueDeg >= 100 && hueDeg <= 150 && rgb[1] > 1.25 * Math.max(rgb[0], rgb[2])) green++;
    if (v < 0.25) dark++;
    luminance.push(0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]);
  }

  const deltas = luminance.map((value, i) => luminance[(i + 1) % luminance.length] - value);
  const signs = deltas.map((value) => (value > 1e-5 ? 1 : value < -1e-5 ? -1 : 0));
  const longestRiseRun = longestRun(signs, 1);
  const longestFallRun = longestRun(signs, -1);
  const asymmetry = longestFallRun === 0 ? SAMPLE_COUNT : longestRiseRun / longestFallRun;
  const amplitude = Math.max(...luminance) - Math.min(...luminance);
  const warnings: string[] = [];
  if (amplitude < 0.15 || amplitude > 0.35) warnings.push("luminance_amplitude_outside_0.15_0.35");
  if (asymmetry < 1.5) warnings.push("luminance_sawtooth_asymmetry_below_1.5");

  const olivePct = olive / SAMPLE_COUNT;
  const greenPct = green / SAMPLE_COUNT;
  const darkPct = dark / SAMPLE_COUNT;
  const pass = olive === 0 && greenPct <= (options.allowEmerald ? 0.15 : 0.08) && darkPct <= 0.1;

  return {
    pass,
    checks: {
      olivePct: round4(olivePct * 100),
      pureGreenPct: round4(greenPct * 100),
      darkPct: round4(darkPct * 100),
      limits: {
        olivePct: 0,
        pureGreenPct: options.allowEmerald ? 15 : 8,
        darkPct: 10,
      },
    },
    luminance: {
      amplitude: round4(amplitude),
      longestRiseRun,
      longestFallRun,
      asymmetry: round4(asymmetry),
      warningOnlyPass: warnings.length === 0,
      warnings,
    },
  };
}

function correctedPreset(config: PaletteConfig, options: LintOptions): PaletteConfig {
  if (lintPalette(config, options).pass) return config;
  for (let step = 1; step <= 50; step++) {
    for (const sign of [1, -1]) {
      const dg = (config.D[1] + sign * step * 0.02 + 1) % 1;
      const candidate: PaletteConfig = { ...config, D: [config.D[0], round4(dg), config.D[2]] };
      if (lintPalette(candidate, options).pass) return candidate;
    }
  }
  return config;
}

function isPresetName(value: string): value is PresetName {
  return value === "jewel-night" || value === "jewel-fire" || value === "jewel-opal";
}

function parseCli(argv: readonly string[]): { readonly config: PaletteConfig; readonly preset?: PresetName; readonly allowEmerald: boolean } {
  const allowEmerald = argv.includes("--allow-emerald");
  const presetIndex = argv.indexOf("--preset");
  if (presetIndex !== -1) {
    const rawPreset = argv[presetIndex + 1];
    if (!rawPreset || !isPresetName(rawPreset)) throw new Error("expected --preset jewel-night|jewel-fire|jewel-opal");
    return { config: PRESETS[rawPreset], preset: rawPreset, allowEmerald };
  }

  const jsonArg = argv.find((arg) => !arg.startsWith("--"));
  if (!jsonArg) throw new Error("usage: npx tsx scripts/lint-palette.ts '{\"A\":[...],\"B\":[...],\"C\":[...],\"D\":[...]}' OR --preset jewel-night|jewel-fire|jewel-opal");
  const parsed = paletteSchema.parse(JSON.parse(jsonArg));
  return { config: parsed, allowEmerald };
}

function main(argv: readonly string[] = process.argv.slice(2)): number {
  const cli = parseCli(argv);
  const config = cli.preset ? correctedPreset(cli.config, { allowEmerald: cli.allowEmerald }) : cli.config;
  const result = lintPalette(config, { allowEmerald: cli.allowEmerald });
  const verdict = {
    preset: cli.preset ?? null,
    allowEmerald: cli.allowEmerald,
    corrected: cli.preset ? config.D[1] !== cli.config.D[1] : false,
    palette: {
      A: config.A,
      B: config.B,
      C: config.C,
      D: config.D,
    },
    ...result,
  };
  process.stdout.write(`${JSON.stringify(verdict, null, 2)}\n`);
  return result.pass ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exit(main());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }
}
