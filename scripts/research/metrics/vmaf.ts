// M7: VMAF via ffmpeg libvmaf
// Full-reference video quality, includes temporal information
// Score 0-100 → normalized to 0-1

import { execFileSync } from "child_process";
import { readFileSync, unlinkSync } from "fs";

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function checkVmafAvailable(): boolean {
  try {
    const output = execFileSync("ffmpeg", ["-filters"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return output.includes("libvmaf");
  } catch {
    return false;
  }
}

export function parseVmafJson(jsonStr: string): number {
  const data = JSON.parse(jsonStr);
  const vmafScore = data?.pooled_metrics?.vmaf?.mean;
  if (vmafScore === undefined || vmafScore === null) {
    throw new Error("VMAF score not found in JSON output");
  }
  return vmafScore;
}

export function normalizeVmafScore(score: number): number {
  return clamp01(score / 100);
}

export function computeVmaf(
  refVideoPath: string,
  genVideoPath: string,
): number {
  if (!checkVmafAvailable()) {
    throw new Error(
      "ffmpeg libvmaf not available. Install with: brew install ffmpeg (ensure --enable-libvmaf)",
    );
  }

  // ffmpeg compares videos frame-by-frame
  // Scale gen to match ref resolution if different
  const logPath = `/tmp/vmaf_${Date.now()}.json`;

  try {
    execFileSync(
      "ffmpeg",
      [
        "-i", refVideoPath,
        "-i", genVideoPath,
        "-lavfi",
        `[0:v]setpts=PTS-STARTPTS[ref];[1:v]setpts=PTS-STARTPTS,scale=iw:ih:flags=lanczos[gen];[ref][gen]libvmaf=log_fmt=json:log_path=${logPath}`,
        "-f", "null",
        "-",
      ],
      { stdio: "pipe", timeout: 120_000 },
    );

    const json = readFileSync(logPath, "utf-8");
    const score = parseVmafJson(json);

    try {
      unlinkSync(logPath);
    } catch { /* ignore cleanup errors */ }

    return normalizeVmafScore(score);
  } catch (err) {
    try {
      unlinkSync(logPath);
    } catch { /* ignore */ }
    throw err;
  }
}
