interface BpmResult {
  bpm: number;
  bars: number;
}

const GENRE_BPM_RANGE: Record<string, [number, number]> = {
  techno: [125, 150],
  trance: [130, 145],
};

const BAR_CANDIDATES = [2, 4, 8, 16, 32, 64];

export const calculateBpm = (
  duration: number,
  genre: "techno" | "trance",
): BpmResult => {
  const [minBpm, maxBpm] = GENRE_BPM_RANGE[genre];

  // Try each bar candidate for an exact fit within preferred BPM range
  for (const bars of BAR_CANDIDATES) {
    const bpm = (bars * 4 * 60) / duration;
    if (bpm >= minBpm && bpm <= maxBpm) {
      return { bpm: Math.round(bpm * 100) / 100, bars };
    }
  }

  // Fallback: find the bar count that gives BPM closest to preferred range
  let bestBars = BAR_CANDIDATES[0];
  let bestDistance = Infinity;

  for (const bars of BAR_CANDIDATES) {
    const bpm = (bars * 4 * 60) / duration;
    // Distance to the nearest edge of the preferred range
    const distance =
      bpm < minBpm ? minBpm - bpm : bpm > maxBpm ? bpm - maxBpm : 0;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestBars = bars;
    }
  }

  // Exact fractional BPM: bars * 4 * 60 / bpm = duration
  const bpm = (bestBars * 4 * 60) / duration;
  return { bpm: Math.round(bpm * 100) / 100, bars: bestBars };
};
