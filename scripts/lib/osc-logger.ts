import * as path from "node:path";

export interface OscEvent {
  ts: number;
  s: string;
  n?: number;
  orbit?: number;
  [key: string]: number | string | undefined;
}

export interface SessionMetadata {
  startTime: string;
  duration: number;
  eventCount: number;
  bpm: number | null;
  key: string | null;
}

const ROTATION_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export const parseOscEvent = (line: string): OscEvent | null => {
  try {
    const parsed = JSON.parse(line);
    if (typeof parsed.ts !== "number" || typeof parsed.s !== "string") {
      return null;
    }
    return parsed as OscEvent;
  } catch {
    return null;
  }
};

export const generateLogPath = (
  outputDir: string,
  date: Date = new Date(),
  partNumber = 0,
): string => {
  const dateStr = date.toISOString().slice(0, 10);
  const timeStr = date.toISOString().slice(11, 16).replace(":", "-");
  const filename = `session_${dateStr}_${timeStr}_part${partNumber}.osclog`;
  return path.join(outputDir, filename);
};

export const shouldRotateFile = (
  fileStartTime: number,
  currentTime: number,
): boolean => {
  return currentTime - fileStartTime >= ROTATION_INTERVAL_MS;
};

export const generateSessionMetadata = (
  events: OscEvent[],
  options?: { bpm?: number | null; key?: string | null },
): SessionMetadata => {
  if (events.length === 0) {
    throw new Error("no events found");
  }

  const firstTs = events[0].ts;
  const lastTs = events[events.length - 1].ts;

  return {
    startTime: new Date().toISOString(),
    duration: lastTs - firstTs,
    eventCount: events.length,
    bpm: options?.bpm ?? null,
    key: options?.key ?? null,
  };
};

export const writeOscEvent = (
  event: OscEvent,
  appendToBuffer: (line: string) => void,
): void => {
  const line = JSON.stringify(event);
  appendToBuffer(line + "\n");
};
