interface FxParamRange {
  min: number;
  max: number;
}

interface FxModuleConfig {
  name: string;
  params: string[];
  cpuWeight: number;
}

const FX_PARAM_RANGES: Record<string, Record<string, FxParamRange>> = {
  compressor: {
    compress: { min: 0, max: 1 },
    threshold: { min: -60, max: 0 },
  },
  saturator: {
    saturate: { min: 0, max: 1 },
    drive: { min: 0, max: 1 },
  },
  eq: {
    loGain: { min: -24, max: 24 },
    midGain: { min: -24, max: 24 },
    hiGain: { min: -24, max: 24 },
  },
};

export const validateFxParams = (
  fxType: string,
  params: Record<string, number>,
): boolean => {
  const ranges = FX_PARAM_RANGES[fxType];
  if (!ranges) return false;

  for (const [key, value] of Object.entries(params)) {
    const range = ranges[key];
    if (!range) return false;
    if (value < range.min || value > range.max) return false;
  }
  return true;
};

export const FX_MODULE_ORDER = [
  "customSidechain",
  "customCompressor",
  "customSaturator",
  "customEQ",
  "superdirt_reverb",
  "superdirt_delay",
] as const;

export const FX_MODULE_CONFIGS: FxModuleConfig[] = [
  {
    name: "customCompressor",
    params: ["compress", "threshold", "ratio", "compAttack", "compRelease"],
    cpuWeight: 2,
  },
  {
    name: "customSaturator",
    params: ["saturate", "drive"],
    cpuWeight: 1,
  },
  {
    name: "customEQ",
    params: ["loGain", "midGain", "hiGain", "loFreq", "hiFreq"],
    cpuWeight: 1,
  },
  {
    name: "customSidechain",
    params: ["sideGain", "sideRelease"],
    cpuWeight: 3,
  },
];

export const getFxBypassOrder = (): string[] =>
  [...FX_MODULE_CONFIGS]
    .sort((a, b) => b.cpuWeight - a.cpuWeight)
    .map((c) => c.name);
