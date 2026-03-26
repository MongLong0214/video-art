import * as fs from "node:fs";
import * as path from "node:path";

type RecordingState = "idle" | "recording" | "stopped";

interface RecordConfig {
  sampleRate: number;
  format: string;
  sampleFormat: string;
}

interface LiveRecordingOptions {
  projectRoot: string;
  onRecordingChange: (isRecording: boolean) => void;
  evalSclang?: (code: string) => void;
}

export const sanitizeTitle = (title: string): string => {
  if (!title.trim()) return "untitled";
  return title.replace(/[^a-zA-Z0-9_-]/g, "-");
};

export const generateRecordPath = (
  projectRoot: string,
  title: string,
  date: Date = new Date(),
): string => {
  const dateStr = date.toISOString().slice(0, 10);
  const safeTitle = sanitizeTitle(title);
  return path.join(
    projectRoot,
    "out",
    "audio",
    `${dateStr}_${safeTitle}`,
    "live-recording.wav",
  );
};

export const checkDiskSpace = (
  availableBytes: number,
  estimatedBytes: number,
): boolean => availableBytes >= estimatedBytes * 2;

export class LiveRecording {
  private state: RecordingState = "idle";
  private options: LiveRecordingOptions;

  constructor(options: LiveRecordingOptions) {
    this.options = options;
  }

  getState(): RecordingState {
    return this.state;
  }

  getRecordConfig(): RecordConfig {
    return {
      sampleRate: 48000,
      format: "WAV",
      sampleFormat: "float",
    };
  }

  start(title?: string): void {
    this.state = "recording";
    this.options.onRecordingChange(true);

    const outputPath = generateRecordPath(this.options.projectRoot, title ?? "untitled");
    const outputDir = path.dirname(outputPath);
    fs.mkdirSync(outputDir, { recursive: true });

    // Send s.record to the running sclang session via stdin pipe
    const escapedPath = outputPath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const scCmd = `s.record("${escapedPath}"); "recording started".postln;`;
    this.options.evalSclang?.(scCmd);
  }

  stop(): void {
    if (this.state === "recording") {
      this.options.evalSclang?.('s.stopRecording; "recording stopped".postln;');
    }
    this.state = "stopped";
    this.options.onRecordingChange(false);
  }

  handleLowDiskSpace(): void {
    if (this.state === "recording") {
      console.warn("[WARN] Low disk space — stopping recording to protect file");
      this.stop();
    }
  }
}
