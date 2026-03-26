import * as path from "node:path";
import { LiveRecording } from "./lib/live-recording";
import { LiveOrchestrator } from "./lib/live-orchestrator";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const title = process.argv[2] ?? "untitled";

const orchestrator = new LiveOrchestrator(PROJECT_ROOT);
const recording = new LiveRecording({
  projectRoot: PROJECT_ROOT,
  onRecordingChange: (isRecording) => {
    orchestrator.setRecording(isRecording);
  },
  evalSclang: (code) => {
    orchestrator.evalSclang(code);
  },
});

console.log(`Starting recording: "${title}"`);
recording.start(title);
console.log("Recording started. Use live:stop to finalize.");
