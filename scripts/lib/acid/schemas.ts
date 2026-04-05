import { z } from "zod";

// ============================================
// analysis.json — Step 2 output
// ============================================

const drumAnalysisSchema = z.object({
  kick_positions: z.array(z.number()),
  snare_positions: z.array(z.number()),
  hat_positions: z.array(z.number()),
});

const bassNoteSchema = z.object({
  time: z.number().min(0),
  freq: z.number().positive(),
  midi: z.number().int(),
  duration: z.number().positive(),
  velocity: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  slide: z.boolean().default(false),
});

const structureSectionSchema = z.object({
  start: z.number().min(0),
  end: z.number().min(0),
  label: z.enum(["build", "drop", "break", "intro", "outro"]),
});

const analysisQcSchema = z.object({
  passed: z.boolean(),
  degraded: z.boolean(),
  warnings: z.array(z.string()),
});

export const analysisSchema = z.object({
  bpm: z.object({
    value: z.number().positive(),
    confidence: z.number().min(0).max(1),
  }),
  key: z.object({
    root: z.string(),
    mode: z.enum(["minor", "major"]),
    midi: z.number().int(),
    confidence: z.number().min(0).max(1),
  }).nullable(),
  duration: z.number().positive(),
  selected_range: z.object({
    start: z.number().min(0),
    end: z.number().min(0),
  }),
  drums: drumAnalysisSchema,
  bass: z.object({ notes: z.array(bassNoteSchema) }),
  other: z.object({ notes: z.array(bassNoteSchema) }),
  energy_curve: z.array(z.number()),
  spectral_centroid_curve: z.array(z.number()),
  structure: z.array(structureSectionSchema),
  analysis_qc: analysisQcSchema,
  warnings: z.array(z.string()),
});

export type AnalysisResult = z.infer<typeof analysisSchema>;

// ============================================
// interpretation.json — Step 3 output
// ============================================

const event303Schema = z.object({
  time: z.number().min(0),
  note_midi: z.number().int(),
  duration: z.number().positive(),
  velocity: z.number().min(0).max(1),
  accent: z.boolean(),
  slide: z.boolean(),
  cutoff: z.number().min(100).max(5000),
  resonance: z.number().min(0).max(1),
  envMod: z.number().min(0).max(1),
  decay: z.number().min(0.01).max(2),
  waveform: z.number().int().min(0).max(1),
});

const pattern909Schema = z.object({
  pattern: z.array(z.number().int().min(0).max(1)),
  velocity: z.array(z.number().min(0).max(1)),
});

const hat909Schema = pattern909Schema.extend({
  open_pattern: z.array(z.number().int().min(0).max(1)),
});

export const interpretationSchema = z.object({
  bpm: z.number().positive(),
  key: z.object({
    root: z.string(),
    mode: z.enum(["minor", "major"]),
    midi: z.number().int(),
  }),
  duration: z.number().positive(),
  tracks: z.object({
    bass_303: z.object({ events: z.array(event303Schema) }),
    riff_303: z.object({ events: z.array(event303Schema) }),
    kick_909: pattern909Schema,
    hat_909: hat909Schema,
    snare_909: pattern909Schema,
  }),
  fx: z.object({
    reverb_send: z.number().min(0).max(1),
    delay_send: z.number().min(0).max(1),
    delay_time: z.number().positive(),
    master_cutoff_curve: z.array(z.number()),
  }),
  energy_curve: z.array(z.number()),
});

export type InterpretationResult = z.infer<typeof interpretationSchema>;

// ============================================
// qc.json — Step 5 output
// ============================================

export const qcSchema = z.object({
  lufs: z.number(),
  peak_dbfs: z.number(),
  clipping_count: z.number().int().min(0),
  stereo_width: z.number(),
  duration: z.number().positive(),
  passed: z.boolean(),
  warnings: z.array(z.string()),
});

export type QCResult = z.infer<typeof qcSchema>;

// ============================================
// Validation helpers
// ============================================

export const validateAnalysis = (data: unknown): AnalysisResult =>
  analysisSchema.parse(data);

export const validateInterpretation = (data: unknown): InterpretationResult =>
  interpretationSchema.parse(data);

export const validateQC = (data: unknown): QCResult =>
  qcSchema.parse(data);
