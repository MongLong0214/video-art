import { execSync } from "node:child_process";

export function checkFfmpeg(): void {
  try {
    execSync("which ffmpeg", { stdio: "pipe" });
  } catch {
    throw new Error(
      "ffmpeg is not installed. Install it with: brew install ffmpeg",
    );
  }
}

export function checkDeps(): void {
  checkFfmpeg();

  if (!process.env.REPLICATE_API_TOKEN) {
    console.warn(
      "WARNING: REPLICATE_API_TOKEN not set. Manual layer input required.",
    );
  }
}
