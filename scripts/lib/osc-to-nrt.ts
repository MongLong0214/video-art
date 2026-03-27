import * as fs from "node:fs";
import * as path from "node:path";
import { parseOscEvent, type OscEvent } from "./osc-logger";
import { mapSynthDef, normalizeParams, SUPPORTED_SYNTHDEFS } from "./synth-stem-map";

export interface NrtEvent {
  time: number;
  synthDef: string;
  stem: string;
  bus: number;
  nodeId: number;
  params: Record<string, unknown>;
}

export interface NrtScore {
  metadata: {
    duration: number;
    eventCount: number;
    mapped: number;
    skipped: number;
    skipRate: number;
  };
  events: NrtEvent[];
}

export interface ConversionSummary {
  total: number;
  mapped: number;
  skipped: number;
  skipRate: number;
  duration: number;
  warnings: string[];
}

export const parseOscLog = (filePath: string): OscEvent[] => {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());
  const events: OscEvent[] = [];

  for (const line of lines) {
    const event = parseOscEvent(line);
    if (event) {
      events.push(event);
    }
    // malformed lines silently skipped (per AC-2.5 / PRD E4)
  }

  return events;
};

export const listOscLogFiles = (dirPath: string): string[] => {
  const entries = fs.readdirSync(dirPath);
  return entries
    .filter((f) => f.endsWith(".osclog"))
    .sort()
    .map((f) => path.join(dirPath, f));
};

export const mergeMultiPart = (dirPath: string): OscEvent[] => {
  const files = listOscLogFiles(dirPath);
  if (files.length === 0) {
    throw new Error("no .osclog files found in directory");
  }

  const allEvents: OscEvent[] = [];
  let offset = 0;

  for (const file of files) {
    const events = parseOscLog(file);
    for (const event of events) {
      allEvents.push({ ...event, ts: event.ts + offset });
    }
    if (events.length > 0) {
      offset = allEvents[allEvents.length - 1].ts;
    }
  }

  return allEvents;
};

export const convertToNrt = (events: OscEvent[]): NrtScore => {
  if (events.length === 0) {
    throw new Error("no events found");
  }

  const startTs = events[0].ts;
  const nrtEvents: NrtEvent[] = [];
  let mapped = 0;
  let skipped = 0;
  let nodeIdCounter = 1000;

  for (const event of events) {
    const mapping = mapSynthDef(event.s);
    if (!mapping) {
      skipped++;
      continue;
    }

    const { s, ts, ...rawParams } = event;
    const { normalized, warnings } = normalizeParams(rawParams as Record<string, unknown>);
    if (warnings.length > 0) {
      for (const w of warnings) console.warn(`[WARN] Event ts=${ts}: ${w}`);
    }

    nrtEvents.push({
      time: Number((ts - startTs).toFixed(3)),
      synthDef: mapping.synthDef,
      stem: mapping.stem,
      bus: mapping.bus,
      nodeId: nodeIdCounter,
      params: normalized,
    });

    mapped++;
    nodeIdCounter += 10;
  }

  const duration = events.length > 1
    ? events[events.length - 1].ts - startTs
    : 0;

  return {
    metadata: {
      duration: Number(duration.toFixed(3)),
      eventCount: events.length,
      mapped,
      skipped,
      skipRate: Number(((skipped / events.length) * 100).toFixed(1)),
    },
    events: nrtEvents,
  };
};

export const generateSummary = (
  total: number,
  mapped: number,
  skipped: number,
): ConversionSummary & { level: "ok" | "warning" | "error" } => {
  const skipRate = total > 0 ? (skipped / total) * 100 : 0;
  const level = skipRate > 50 ? "error" : skipRate > 10 ? "warning" : "ok";

  if (level === "error") {
    throw new Error(
      `Skip rate ${skipRate.toFixed(1)}% exceeds 50% threshold. ` +
      `${skipped}/${total} events unmapped. Aborting.`,
    );
  }

  return {
    total,
    mapped,
    skipped,
    skipRate: Number(skipRate.toFixed(1)),
    duration: 0,
    warnings: level === "warning"
      ? [`[WARNING] ${skipped}/${total} events (${skipRate.toFixed(1)}%) skipped. Result may be incomplete.`]
      : [],
    level,
  };
};

export const writeNrtScore = (score: NrtScore, outputPath: string): void => {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(score, null, 2));
};
