import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const PORT_MIN = 5300;
const PORT_MAX = 5399;
const MAX_RETRIES = 5;
const WORK_DIR_NAME = "_work";

/**
 * Find an available TCP port in the 5300-5399 range.
 * Tests by attempting to bind with net.createServer.
 */
export async function findAvailablePort(
  min = PORT_MIN,
  max = PORT_MAX,
  maxRetries = MAX_RETRIES,
): Promise<number> {
  for (let i = 0; i < maxRetries; i++) {
    const port = min + Math.floor(Math.random() * (max - min + 1));
    const available = await isPortAvailable(port);
    if (available) return port;
  }
  throw new Error(
    `No available port found after ${maxRetries} retries (range ${min}-${max})`,
  );
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

/**
 * Create _work/ directory structure inside archiveDir.
 * Returns the _work/ path.
 */
export function createWorkDir(archiveDir: string): string {
  const workDir = path.join(archiveDir, WORK_DIR_NAME);
  fs.mkdirSync(path.join(workDir, "layers"), { recursive: true });
  return workDir;
}

/**
 * Remove _work/ inside archiveDir. No-op if missing.
 */
export function cleanupWorkDir(archiveDir: string): void {
  const workDir = path.join(archiveDir, WORK_DIR_NAME);
  fs.rmSync(workDir, { recursive: true, force: true });
}
