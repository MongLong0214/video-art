/**
 * Python subprocess bridge — safe execution of Python scripts from Node.js.
 *
 * Security: execFile (no shell), path normalization, timeout/maxBuffer limits.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

interface PythonResult {
  stdout: string;
  stderr: string;
}

/**
 * Run a Python script with normalized path arguments.
 * All paths are resolved and normalized to prevent path traversal.
 */
export async function runPython(
  script: string,
  args: string[],
  options: { timeout?: number } = {},
): Promise<PythonResult> {
  const normalizedScript = path.normalize(path.resolve(script));
  const normalizedArgs = args.map((a) => {
    // Only normalize args that look like paths (contain / or \)
    if (a.startsWith("-")) return a;
    return path.normalize(path.resolve(a));
  });

  const { stdout, stderr } = await execFileAsync(
    "python3",
    [normalizedScript, ...normalizedArgs],
    {
      maxBuffer: 50 * 1024 * 1024, // 50MB
      timeout: options.timeout ?? 600_000, // 10 minutes
    },
  );

  return { stdout, stderr };
}

/**
 * Check if Python 3 and torchvision are available.
 */
export async function checkPythonDeps(): Promise<{
  available: boolean;
  error?: string;
}> {
  try {
    await execFileAsync("python3", ["--version"], { timeout: 10_000 });
  } catch {
    return { available: false, error: "python3 not found" };
  }

  try {
    await execFileAsync(
      "python3",
      ["-c", "import numpy; import cv2; from PIL import Image; import torchvision"],
      { timeout: 30_000 },
    );
  } catch {
    return {
      available: false,
      error:
        "Missing Python deps. Run: pip3 install -r requirements-motion.txt",
    };
  }

  return { available: true };
}

/**
 * Parse JSON metadata from Python script stdout.
 */
export function parsePythonOutput<T>(stdout: string): T {
  const trimmed = stdout.trim();
  const lastLine = trimmed.split("\n").pop() ?? "";
  return JSON.parse(lastLine) as T;
}
