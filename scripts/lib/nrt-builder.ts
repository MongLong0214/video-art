// NRT Integration Architecture — Phase 2 §4.3.4
// Merges buffer commands + synth events + section control events

import type { NrtCommand } from "./wavetable-utils.js";

export interface NrtControlEvent {
  time: number;
  nodeId: number;
  params: Record<string, number>;
  type: "n_set";
}

export interface NrtEvent {
  time: number;
  synthDef: string;
  stem: string;
  bus: number;
  nodeId: number;
  params: Record<string, unknown>;
}

export interface SectionOverride {
  label: string;
  start: number;
  end: number;
  synthOverrides?: Record<string, Record<string, number>>;
  fxOverrides?: Record<string, number>;
}

export interface ExtendedNrtScore {
  metadata: {
    duration: number;
    eventCount: number;
    mapped: number;
    skipped: number;
    skipRate: number;
    basePath?: string;
  };
  events: NrtEvent[];
  bufferCommands?: NrtCommand[];
  controlEvents?: NrtControlEvent[];
}

export const buildNrtScore = (
  baseScore: ExtendedNrtScore,
  bufferCommands: NrtCommand[],
  sections: SectionOverride[],
): ExtendedNrtScore => {
  // Validate sections: non-overlapping, non-negative
  const sortedSections = [...sections].sort((a, b) => a.start - b.start);
  for (let i = 0; i < sortedSections.length; i++) {
    const s = sortedSections[i];
    if (s.start < 0) {
      sortedSections[i] = { ...s, start: 0 };
    }
    if (i > 0 && s.start < sortedSections[i - 1].end) {
      throw new Error(
        `Overlapping sections: "${sortedSections[i - 1].label}" ends at ${sortedSections[i - 1].end} but "${s.label}" starts at ${s.start}`,
      );
    }
  }

  // Generate control events at section boundaries
  const controlEvents: NrtControlEvent[] = [];

  for (const section of sortedSections) {
    if (!section.synthOverrides) continue;

    // Find active nodes at section boundary
    for (const event of baseScore.events) {
      const eventEnd = event.time + (Number(event.params.dur) || 1);
      if (event.time <= section.start && eventEnd > section.start) {
        const overrides = section.synthOverrides[event.synthDef];
        if (overrides) {
          controlEvents.push({
            time: section.start,
            nodeId: event.nodeId,
            params: overrides,
            type: "n_set",
          });
        }
      }
    }
  }

  return {
    ...baseScore,
    metadata: {
      ...baseScore.metadata,
      eventCount: baseScore.events.length + controlEvents.length,
    },
    bufferCommands,
    controlEvents,
  };
};
