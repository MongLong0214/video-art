import { runMasterPipeline } from "./lib/master-runtime.js";

if (import.meta.url === `file://${process.argv[1]}`) {
  runMasterPipeline().then((code) => process.exit(code)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
