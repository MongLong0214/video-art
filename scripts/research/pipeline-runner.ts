// Pipeline Runner — Full pipeline orchestrator for autoresearch
// layers decomposition → export-layered (subprocess) → video.mp4
// Output: .cache/research/current/video.mp4

import { execFileSync } from "child_process";
import fs from "node:fs";
import path from "node:path";

const RESEARCH_DIR = ".cache/research/current";
const RESEARCH_VIDEO_PATH = `${RESEARCH_DIR}/video.mp4`;

export interface PipelineResult {
  videoPath: string;
  manifestPath: string;
  elapsedMs: number;
}

// ── Step 1: Layer Decomposition ─────────────────────────────

function runLayerDecomposition(
  inputPath: string,
  cwd: string,
  config?: Record<string, unknown>,
): string {
  const args = ["tsx", "scripts/pipeline-layers.ts", inputPath];

  if (config?.method) args.push("--variant", String(config.method));
  if (config?.numLayers) args.push("--layers", String(config.numLayers));

  const output = execFileSync("npx", args, {
    cwd,
    encoding: "utf-8",
    timeout: 300_000,
    stdio: ["pipe", "pipe", "pipe"],
  });

  // Extract archive dir from output for manifest lookup
  const archiveMatch = output.match(/Archive:\s*(.+)/);
  return archiveMatch?.[1]?.trim() ?? "";
}

// ── Step 2: Export Video (subprocess) ───────────────────────

function runExportLayered(cwd: string): string {
  // Use export-layered.ts as subprocess — it manages its own Vite + Puppeteer lifecycle
  // Title "_research" gives predictable archive path
  // Use stdio: inherit to avoid stdout buffer deadlock on large ffmpeg output
  execFileSync("npx", [
    "tsx", "scripts/export-layered.ts", "--title", "_research",
  ], {
    cwd,
    timeout: 600_000, // 10 min for large exports
    stdio: "inherit",
  });

  // Find the output video: out/layered/*_-research/_research.mp4
  const layeredDir = path.join(cwd, "out/layered");
  if (!fs.existsSync(layeredDir)) {
    throw new Error("out/layered/ not found after export");
  }

  const dirs = fs.readdirSync(layeredDir)
    .filter((d) => d.includes("_research"))
    .sort()
    .reverse();

  for (const dir of dirs) {
    const mp4Files = fs.readdirSync(path.join(layeredDir, dir))
      .filter((f) => f.endsWith(".mp4"));
    if (mp4Files.length > 0) {
      return path.join(layeredDir, dir, mp4Files[0]);
    }
  }

  throw new Error("export-layered did not produce a video file");
}

// ── Step 3: Copy Video to Research Dir ──────────────────────

function copyToResearchDir(videoPath: string, cwd: string): string {
  const destDir = path.join(cwd, RESEARCH_DIR);
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(cwd, RESEARCH_VIDEO_PATH);
  fs.copyFileSync(videoPath, dest);
  return dest;
}

// ── Step 4: Find Manifest ───────────────────────────────────

function findManifest(archiveDir: string): string {
  if (!archiveDir) return "";
  const manifestPath = path.join(archiveDir, "decomposition-manifest.json");
  return fs.existsSync(manifestPath) ? manifestPath : "";
}

// ── Public API ──────────────────────────────────────────────

export async function runFullPipeline(
  cwd: string,
  inputPath: string,
  config?: Record<string, unknown>,
): Promise<PipelineResult> {
  const startMs = Date.now();

  // Step 1: Layer decomposition (Replicate API → scene.json + layers in public/)
  console.log("  [pipeline] Layer decomposition...");
  const archiveDir = runLayerDecomposition(inputPath, cwd, config);

  // Step 2: Video export (Vite + Puppeteer + ffmpeg via export-layered subprocess)
  console.log("  [pipeline] Video export (Vite + Puppeteer + ffmpeg)...");
  const exportedVideoPath = runExportLayered(cwd);

  // Step 3: Copy video to stable research path
  const videoPath = copyToResearchDir(exportedVideoPath, cwd);

  // Step 4: Locate manifest
  const manifestPath = findManifest(archiveDir);

  const elapsedMs = Date.now() - startMs;
  console.log(`  [pipeline] Complete: ${path.relative(cwd, videoPath)} (${(elapsedMs / 1000).toFixed(1)}s)`);

  return { videoPath, manifestPath, elapsedMs };
}

// ── Input Image Resolution ──────────────────────────────────

export function resolveInputImagePath(cwd: string): string {
  // Priority: input.png at project root
  const inputPng = path.join(cwd, "input.png");
  if (fs.existsSync(inputPng)) return "input.png";

  // Fallback: any .png in project root (excluding source outputs)
  const rootFiles = fs.readdirSync(cwd).filter(
    (f) => f.endsWith(".png") && !f.startsWith(".") && f !== "favicon.png",
  );
  if (rootFiles.length === 1) return rootFiles[0];

  throw new Error(
    "No input image found. Place input.png at the project root.",
  );
}
