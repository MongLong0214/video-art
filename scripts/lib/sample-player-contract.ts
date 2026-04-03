export interface SamplePlayerV2Params {
  out?: number;
  buf: number;
  amp?: number;
  dur?: number;
  pan?: number;
  rate?: number;
  startPos?: number;
  attack?: number;
  release?: number;
  hpFreq?: number;
  lpFreq?: number;
  loopMode?: number;
  xfade?: number;
  sustainLevel?: number;
  rateLag?: number;
  legato?: number;
  slide?: number;
  slideTime?: number;
}

export const SAMPLE_PLAYER_V2_DEFAULTS: Required<Omit<SamplePlayerV2Params, "buf">> = {
  out: 0,
  amp: 0.6,
  dur: 0.2,
  pan: 0,
  rate: 1,
  startPos: 0,
  attack: 0.005,
  release: 0.05,
  hpFreq: 20,
  lpFreq: 20000,
  loopMode: 0,
  xfade: 0.01,
  sustainLevel: 1,
  rateLag: 0,
  legato: 0,
  slide: 0,
  slideTime: 0.05,
};

export const buildSamplePlayerV2Params = (
  params: SamplePlayerV2Params,
): Record<string, number> => ({
  ...SAMPLE_PLAYER_V2_DEFAULTS,
  ...params,
});
