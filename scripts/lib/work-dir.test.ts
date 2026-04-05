import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import net from "node:net";

// Will be implemented in work-dir.ts
import { findAvailablePort, createWorkDir, cleanupWorkDir } from "./work-dir.js";

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "work-dir-test-"));
}

describe("findAvailablePort", () => {
  it("returns port in range 5300-5399", async () => {
    const port = await findAvailablePort();
    expect(port).toBeGreaterThanOrEqual(5300);
    expect(port).toBeLessThanOrEqual(5399);
  });

  it("retries on occupied port", async () => {
    // Occupy a port
    const server = net.createServer();
    const occupiedPort = 5350;
    await new Promise<void>((resolve) => {
      server.listen(occupiedPort, "127.0.0.1", () => resolve());
    });

    try {
      // Should still find a different available port
      const port = await findAvailablePort();
      expect(port).toBeGreaterThanOrEqual(5300);
      expect(port).toBeLessThanOrEqual(5399);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("throws after max retries when all ports occupied", async () => {
    // Occupy the single port in range
    const server = net.createServer();
    const port = 5398;
    await new Promise<void>((resolve) => {
      server.listen(port, "127.0.0.1", () => resolve());
    });

    try {
      await expect(
        findAvailablePort(port, port, 3),
      ).rejects.toThrow("No available port");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

describe("createWorkDir", () => {
  let dir: string;
  afterEach(() => {
    if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  });

  it("creates _work/layers/ structure", () => {
    dir = tmpDir();
    const workDir = createWorkDir(dir);
    expect(fs.existsSync(workDir)).toBe(true);
    expect(fs.existsSync(path.join(workDir, "layers"))).toBe(true);
    expect(workDir).toBe(path.join(dir, "_work"));
  });
});

describe("cleanupWorkDir", () => {
  let dir: string;
  afterEach(() => {
    if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  });

  it("removes _work directory", () => {
    dir = tmpDir();
    createWorkDir(dir);
    expect(fs.existsSync(path.join(dir, "_work"))).toBe(true);
    cleanupWorkDir(dir);
    expect(fs.existsSync(path.join(dir, "_work"))).toBe(false);
  });

  it("is no-op if _work missing", () => {
    dir = tmpDir();
    expect(() => cleanupWorkDir(dir)).not.toThrow();
  });
});
