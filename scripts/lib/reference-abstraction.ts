import { z } from "zod";

const noteEventSchema = z.object({
  time: z.number().min(0),
  freq: z.number().positive(),
  duration: z.number().positive(),
  velocity: z.number().min(0).max(1),
  slide: z.boolean(),
});

const sectionSchema = z.object({
  start: z.number().min(0),
  end: z.number().min(0),
  label: z.string(),
});

const bpmSchema = z.object({
  value: z.number().positive(),
  confidence: z.number().min(0).max(1),
});

const analysisSchema = z.object({
  bpm: bpmSchema,
  key: z.string().nullable(),
  energy_curve: z.array(z.number()).nullable(),
  onset_density: z.number().nullable(),
  kick_pattern: z.object({ positions: z.array(z.number()) }).nullable(),
  hat_pattern: z.object({ positions: z.array(z.number()) }).nullable(),
  bass_profile: z.object({
    centroid: z.number(),
    variance: z.number(),
    flux: z.number(),
    type: z.string(),
  }).nullable(),
  structure: z.object({
    segments: z.array(sectionSchema),
  }).nullable(),
  spectral_centroid: z.object({
    mean: z.number(),
    max: z.number().optional(),
    min: z.number().optional(),
  }).nullable(),
  pitch_contour: z.object({
    tracker_used: z.string(),
    note_events: z.array(noteEventSchema),
  }).nullable(),
  warnings: z.array(z.string()).default([]),
});

const abstractionRoleSchema = z.object({
  strategy: z.string(),
  confidence: z.number().min(0).max(1),
  note_events: z.array(noteEventSchema).default([]),
  positions: z.array(z.number()).default([]),
  transition_times: z.array(z.number()).default([]),
});

export const referenceAbstractionSchema = z.object({
  version: z.literal(1),
  source: z.string(),
  bpm: z.object({
    value: z.number().positive(),
    confidence: z.number().min(0).max(1),
  }),
  root: z.object({
    value: z.string(),
    mode: z.enum(["minor", "major"]),
    midi: z.number().int(),
    confidence: z.number().min(0).max(1),
  }),
  sections: z.array(z.object({
    start: z.number().min(0),
    end: z.number().min(0),
    label: z.string(),
    energy: z.number().min(0).max(1),
  })),
  roles: z.object({
    bass: abstractionRoleSchema,
    riff: abstractionRoleSchema,
    top: abstractionRoleSchema,
    fx: abstractionRoleSchema,
  }),
  macro: z.object({
    energy_curve: z.array(z.number().min(0).max(1)),
    cutoff_curve: z.array(z.number().min(0).max(1)),
    density_curve: z.array(z.number().min(0).max(1)),
  }),
  fallbacks: z.object({
    root: z.string().nullable(),
    bass: z.string().nullable(),
    riff: z.string().nullable(),
    top: z.string().nullable(),
    fx: z.string().nullable(),
  }),
  warnings: z.array(z.string()),
});

export type AnalysisInput = z.infer<typeof analysisSchema>;
export type ReferenceAbstraction = z.infer<typeof referenceAbstractionSchema>;

const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const normalizeCurve = (curve: number[] | null | undefined, fallback = 0.5): number[] => {
  if (!curve || curve.length === 0) return [fallback];
  const min = Math.min(...curve);
  const max = Math.max(...curve);
  if (max - min < 1e-9) return curve.map(() => clamp01(fallback));
  return curve.map((value) => clamp01((value - min) / (max - min)));
};

const parseRoot = (
  key: string | null,
): { value: string; mode: "minor" | "major"; midi: number; confidence: number; fallback: string | null } => {
  if (!key) {
    return { value: "C", mode: "minor", midi: 48, confidence: 0.25, fallback: "default_c_minor" };
  }

  const match = key.match(/^([A-G](?:#|b)?)(m?)$/);
  if (!match) {
    return { value: "C", mode: "minor", midi: 48, confidence: 0.2, fallback: "unparsed_key_default_c_minor" };
  }

  const [, note, minorFlag] = match;
  const semitone = NOTE_TO_SEMITONE[note];
  if (semitone === undefined) {
    return { value: "C", mode: "minor", midi: 48, confidence: 0.2, fallback: "unknown_key_default_c_minor" };
  }
  return {
    value: note,
    mode: minorFlag ? "minor" : "major",
    midi: 48 + semitone,
    confidence: 0.8,
    fallback: null,
  };
};

const averageEnergyForSection = (
  curve: number[],
  start: number,
  end: number,
  totalDuration: number,
): number => {
  if (curve.length === 0 || totalDuration <= 0) return 0.5;
  const startIdx = Math.max(0, Math.floor((start / totalDuration) * curve.length));
  const endIdx = Math.min(curve.length, Math.max(startIdx + 1, Math.ceil((end / totalDuration) * curve.length)));
  const slice = curve.slice(startIdx, endIdx);
  if (slice.length === 0) return 0.5;
  return clamp01(slice.reduce((sum, value) => sum + value, 0) / slice.length);
};

const fallbackBassEvents = (
  bpm: number,
  sections: { start: number; end: number; label: string }[],
  rootFreq: number,
) => {
  const beatDur = 60 / bpm;
  const events: Array<z.infer<typeof noteEventSchema>> = [];
  for (const section of sections) {
    if (section.label === "intro") continue;
    for (let time = section.start; time < section.end; time += beatDur) {
      events.push({
        time: Number(time.toFixed(3)),
        freq: rootFreq,
        duration: Number((beatDur * 0.6).toFixed(3)),
        velocity: 0.72,
        slide: false,
      });
    }
  }
  return events;
};

const deriveTopPositions = (
  bpm: number,
  sections: { start: number; end: number; label: string }[],
) => {
  const positions: number[] = [];
  const eighth = 30 / bpm;
  for (const section of sections) {
    if (section.label === "intro") continue;
    for (let time = section.start; time < section.end; time += eighth) {
      positions.push(Number(time.toFixed(3)));
    }
  }
  return positions;
};

export const buildReferenceAbstraction = (
  rawAnalysis: AnalysisInput,
  source: string,
): ReferenceAbstraction => {
  const analysis = analysisSchema.parse(rawAnalysis);
  const warnings = [...analysis.warnings];
  const root = parseRoot(analysis.key);

  const energyCurve = normalizeCurve(analysis.energy_curve);
  const spectralMean = analysis.spectral_centroid?.mean ?? 2000;
  const cutoffCurve = energyCurve.map((value) =>
    clamp01((value * 0.65) + clamp01((spectralMean - 1000) / 4000) * 0.35));
  const densityBase = clamp01((analysis.onset_density ?? 4) / 10);
  const densityCurve = energyCurve.map((value) => clamp01((value * 0.7) + densityBase * 0.3));

  const sections = analysis.structure?.segments?.length
    ? analysis.structure.segments
    : [{ start: 0, end: Math.max(1, energyCurve.length), label: "drop" }];
  const totalDuration = sections[sections.length - 1]?.end ?? 1;
  const normalizedSections = sections.map((section) => ({
    start: section.start,
    end: section.end,
    label: section.label,
    energy: averageEnergyForSection(energyCurve, section.start, section.end, totalDuration),
  }));

  const pitchEvents = analysis.pitch_contour?.note_events ?? [];
  const bassPitchEvents = pitchEvents.filter((event) => event.freq <= 220);
  const riffPitchEvents = pitchEvents.filter((event) => event.freq > 220);
  const rootFreq = 440 * (2 ** ((root.midi - 69) / 12));

  const bassFallback = bassPitchEvents.length === 0 ? "root_pulse_from_key" : null;
  const bassEvents = bassPitchEvents.length > 0
    ? bassPitchEvents
    : fallbackBassEvents(analysis.bpm.value, normalizedSections, rootFreq);
  if (bassFallback) warnings.push("No low-register pitch contour — derived bass fallback from root pulse");

  const riffFallback = riffPitchEvents.length === 0 ? "derived_from_bass" : null;
  const riffEvents = riffPitchEvents.length > 0
    ? riffPitchEvents
    : bassEvents
      .filter((_, index) => index % 2 === 0)
      .map((event) => ({
        ...event,
        freq: event.freq * 2,
        duration: Number(Math.max(event.duration * 0.6, 0.1).toFixed(3)),
        velocity: clamp01(event.velocity * 0.9),
      }));
  if (riffFallback) warnings.push("No upper-register pitch contour — derived riff from bass lane");

  const topPositions = analysis.hat_pattern?.positions?.length
    ? analysis.hat_pattern.positions
    : deriveTopPositions(analysis.bpm.value, normalizedSections);
  const topFallback = analysis.hat_pattern?.positions?.length ? null : "density_proxy_grid";
  if (topFallback) warnings.push("No hat pattern available — derived top lane grid from density");

  const fxTransitions = normalizedSections
    .slice(1)
    .map((section) => Number(section.start.toFixed(3)));

  return referenceAbstractionSchema.parse({
    version: 1,
    source,
    bpm: analysis.bpm,
    root: {
      value: root.value,
      mode: root.mode,
      midi: root.midi,
      confidence: root.confidence,
    },
    sections: normalizedSections,
    roles: {
      bass: {
        strategy: bassFallback ? "root_fallback" : "pitch_contour",
        confidence: bassFallback ? 0.45 : 0.85,
        note_events: bassEvents,
        positions: [],
        transition_times: [],
      },
      riff: {
        strategy: riffFallback ? "derived_from_bass" : "pitch_contour",
        confidence: riffFallback ? 0.4 : 0.75,
        note_events: riffEvents,
        positions: [],
        transition_times: [],
      },
      top: {
        strategy: topFallback ? "density_proxy" : "hat_pattern",
        confidence: topFallback ? 0.5 : 0.8,
        note_events: [],
        positions: topPositions,
        transition_times: [],
      },
      fx: {
        strategy: "section_boundaries",
        confidence: 0.9,
        note_events: [],
        positions: [],
        transition_times: fxTransitions,
      },
    },
    macro: {
      energy_curve: energyCurve,
      cutoff_curve: cutoffCurve,
      density_curve: densityCurve,
    },
    fallbacks: {
      root: root.fallback,
      bass: bassFallback,
      riff: riffFallback,
      top: topFallback,
      fx: null,
    },
    warnings,
  });
};
