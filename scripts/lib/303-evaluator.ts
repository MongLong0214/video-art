import { z } from "zod";

import {
  compositionIrSchema,
  type CompositionIR,
} from "./303-compiler.js";
import {
  referenceAbstractionSchema,
  type ReferenceAbstraction,
} from "./reference-abstraction.js";

export const sourcePurityAuditSchema = z.object({
  version: z.number(),
  mode: z.string(),
  seed: z.number(),
  bank_manifest: z.string(),
  all_within_bank: z.boolean(),
  selected_source_count: z.number(),
  unique_source_count: z.number(),
  stems_mode: z.boolean(),
  sources: z.array(z.object({
    role: z.string(),
    time: z.number(),
    requested_articulation: z.string(),
    selected_id: z.string(),
    selected_file: z.string(),
    fallback: z.string().nullable(),
    note_midi: z.number().nullable(),
    selected_midi: z.number(),
    rate: z.number(),
    source_strategy: z.string(),
  })),
});

export interface DomainScore {
  total_score: number;
  breakdown: {
    groove: number;
    contour: number;
    section_shape: number;
    density: number;
    filter_motion: number;
    technical: number;
  };
  penalties: {
    source_purity_penalty: number;
    fallback_penalty: number;
  };
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const scoreFromMae = (mae: number, maxError: number) =>
  Math.max(0, 1 - mae / maxError) * 100;

const average = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const scoreTimeseries = (a: number[], b: number[], maxError: number) => {
  const len = Math.max(a.length, b.length);
  if (len === 0) return 100;
  const samples = Array.from({ length: len }, (_, index) => {
    const ai = a[Math.min(index, a.length - 1)] ?? 0;
    const bi = b[Math.min(index, b.length - 1)] ?? 0;
    return Math.abs(ai - bi);
  });
  return scoreFromMae(average(samples), maxError);
};

const sectionAverage = (curve: number[], start: number, end: number, total: number) => {
  if (curve.length === 0 || total <= 0) return 0.5;
  const startIdx = Math.max(0, Math.floor((start / total) * curve.length));
  const endIdx = Math.min(curve.length, Math.max(startIdx + 1, Math.ceil((end / total) * curve.length)));
  const slice = curve.slice(startIdx, endIdx);
  return slice.length === 0 ? 0.5 : average(slice);
};

const collectVoice = (ir: CompositionIR, role: CompositionIR["voices"][number]["role"]) =>
  ir.voices.find((voice) => voice.role === role)?.events ?? [];

export const evaluate303Domain = (
  abstractionInput: ReferenceAbstraction,
  irInput: CompositionIR,
  auditInput: z.infer<typeof sourcePurityAuditSchema>,
): DomainScore => {
  const abstraction = referenceAbstractionSchema.parse(abstractionInput);
  const ir = compositionIrSchema.parse(irInput);
  const audit = sourcePurityAuditSchema.parse(auditInput);

  const pseudoHatEvents = collectVoice(ir, "pseudo_hat");
  const grooveRef = abstraction.roles.top.positions;
  const grooveOut = pseudoHatEvents.map((event) => event.time);
  const groove = scoreFromMae(
    Math.abs(grooveRef.length - grooveOut.length) / Math.max(grooveRef.length, 1),
    1,
  );

  const bassRef = abstraction.roles.bass.note_events.map((event) => Math.round(69 + 12 * Math.log2(event.freq / 440)));
  const bassOut = collectVoice(ir, "bass").map((event) => event.note_midi ?? ir.root_midi);
  const riffRef = abstraction.roles.riff.note_events.map((event) => Math.round(69 + 12 * Math.log2(event.freq / 440)));
  const riffOut = collectVoice(ir, "riff").map((event) => event.note_midi ?? ir.root_midi);
  const contour = average([
    scoreTimeseries(bassRef, bassOut, 6),
    scoreTimeseries(riffRef, riffOut, 8),
  ]);

  const totalDuration = abstraction.sections[abstraction.sections.length - 1]?.end ?? 1;
  const sectionScores = abstraction.sections.map((section) => {
    const energy = sectionAverage(ir.automation.master_energy, section.start, section.end, totalDuration);
    return Math.abs(section.energy - energy);
  });
  const sectionShape = scoreFromMae(average(sectionScores), 1);

  const density = scoreTimeseries(abstraction.macro.density_curve, ir.automation.density, 1);
  const filterMotion = scoreTimeseries(abstraction.macro.cutoff_curve, ir.automation.filter_open, 1);

  const sourcePurityPenalty = audit.all_within_bank ? 0 : 25;
  const fallbackEvents = audit.sources.filter((source) => source.fallback !== null).length;
  const fallbackPenalty = Math.min(20, fallbackEvents * 5);
  const technical = Math.max(0, 100 - sourcePurityPenalty - fallbackPenalty);

  const total = (
    groove * 0.2
    + contour * 0.25
    + sectionShape * 0.2
    + density * 0.15
    + filterMotion * 0.1
    + technical * 0.1
  );

  return {
    total_score: Number(total.toFixed(1)),
    breakdown: {
      groove: Number(groove.toFixed(1)),
      contour: Number(contour.toFixed(1)),
      section_shape: Number(sectionShape.toFixed(1)),
      density: Number(density.toFixed(1)),
      filter_motion: Number(filterMotion.toFixed(1)),
      technical: Number(technical.toFixed(1)),
    },
    penalties: {
      source_purity_penalty: sourcePurityPenalty,
      fallback_penalty: Number(fallbackPenalty.toFixed(1)),
    },
  };
};
