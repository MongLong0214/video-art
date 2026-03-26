import * as path from "node:path";
import { LiveOrchestrator } from "./lib/live-orchestrator";
import { LiveHealthMonitor } from "./lib/live-health-monitor";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");

const orchestrator = new LiveOrchestrator(PROJECT_ROOT);

const monitor = new LiveHealthMonitor({
  onCrash: () => {
    console.error("[CRASH] scsynth crashed — attempting restart...");
    orchestrator.start().catch((err) => {
      console.error("[FATAL] Restart failed:", err.message);
      process.exit(1);
    });
  },
  onHighMemory: (bytes) => {
    const mb = Math.round(bytes / 1024 / 1024);
    console.warn(`[WARN] SC memory: ${mb}MB (threshold: 1536MB)`);
  },
  onHighCpu: (percent) => {
    console.warn(`[WARN] SC CPU: ${percent}% — consider FX bypass`);
  },
});

console.log("Starting live stack...");
orchestrator
  .start()
  .then(() => {
    console.log("Live stack ready.");
    console.log("Open VS Code and use Ctrl+Enter to evaluate Tidal code.");
    console.log("BootTidal.hs: audio/tidal/BootTidal.hs");
    console.log("Sessions dir: audio/tidal/sessions/");

    void monitor;
  })
  .catch((err) => {
    console.error("Failed to start live stack:", err.message);
    process.exit(1);
  });
