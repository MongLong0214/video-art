// M7: VMAF via ffmpeg libvmaf
// Full-reference video quality, includes temporal information
// Score 0-100 -> normalized to 0-1

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

export interface VmafOptions {
  refWidth?: number;
  refHeight?: number;
}

export function computeVmaf(
  refVideoPath: string,
  genVideoPath: string,
  options?: VmafOptions,
): number {
  if (!checkVmafAvailable()) {
    throw new Error(
      "ffmpeg libvmaf not available. Install with: brew install ffmpeg (ensure --enable-libvmaf)",
    );
  }

  // ffmpeg compares videos frame-by-frame
  // Scale gen to match ref resolution before VMAF comparison
  const logPath = `/tmp/vmaf_${Date.now()}.json`;

  // Build scale filter: if reference dimensions provided, scale to those;
  // otherwise probe reference and scale gen to match
  let scaleFilter: string;
  if (options?.refWidth && options?.refHeight) {
    scaleFilter = `scale=${options.refWidth}:${options.refHeight}:flags=lanczos`;
  } else {
    // Scale gen to match ref dimensions using [0:v] stream dimensions
    scaleFilter = "scale='iw0':'ih0':flags=lanczos";
  }

  try {
    // Use two-pass filtergraph: ref passes through, gen is scaled to ref's dimensions
    const lavfi = options?.refWidth && options?.refHeight
      ? `[0:v]setpts=PTS-STARTPTS[ref];[1:v]setpts=PTS-STARTPTS,${scaleFilter}[gen];[ref][gen]libvmaf=log_fmt=json:log_path=${logPath}`
      : `[0:v]setpts=PTS-STARTPTS[ref0];[ref0]split[ref][refsize];[refsize]scale=iw:ih,format=pix_fmts=yuv420p[dummy];[1:v]setpts=PTS-STARTPTS[gen0];[ref]scale=iw:ih[refout];[gen0][refout]scale2ref[genscaled][refout2];[refout2][genscaled]libvmaf=log_fmt=json:log_path=${logPath}`;

    execFileSync(
      "ffmpeg",
      [
        "-i", refVideoPath,
        "-i", genVideoPath,
        "-lavfi",
        lavfi,
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
