import * as path from "node:path";
import { LiveOrchestrator } from "./lib/live-orchestrator";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");

const isRecording = process.argv.includes("--recording");
const orchestrator = new LiveOrchestrator(PROJECT_ROOT);

console.log("Stopping live stack...");
orchestrator
  .stop(isRecording)
  .then(() => {
    console.log("Live stack stopped.");
  })
  .catch((err) => {
    console.error("Failed to stop live stack:", err.message);
    process.exit(1);
  });
