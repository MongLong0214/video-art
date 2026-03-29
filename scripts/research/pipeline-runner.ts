// Pipeline Runner — Full pipeline orchestrator for autoresearch
// layers decomposition → export-layered (subprocess) → video.mp4
// Output: .cache/research/current/video.mp4

import { execFileSync } from "child_process";
import fs from "node:fs";
import path from "node:path";

const RESEARCH_DIR = ".cache/research/current";
const RESEARCH_VIDEO_PATH = `${RESEARCH_DIR}/video.mp4`;

// ── Scene.json Patch/Restore (performance optimization) ────

let sceneJsonBackup: string | null = null;

export function patchSceneJson(cwd: string): void {
  const scenePath = path.join(cwd, "public", "scene.json");
  if (!fs.existsSync(scenePath)) return;

  const original = fs.readFileSync(scenePath, "utf-8");
  sceneJsonBackup = original;

  const scene = JSON.parse(original);
  let patched = false;

  if (Array.isArray(scene.resolution)) {
    const [w, h] = scene.resolution;
    if (w > 1080 || h > 1080) {
      const scale = 1080 / Math.max(w, h);
      scene.resolution = [Math.round(w * scale), Math.round(h * scale)];
      patched = true;
    }
  }

  if (typeof scene.duration === "number" && scene.duration > 10) {
    const newDuration = 10;
    scene.duration = newDuration;
    patched = true;

    // Animation periods must be divisors of the new duration for seamless looping.
    // Set all periods to the new duration (safest — exactly 1 cycle per loop).
    if (Array.isArray(scene.layers)) {
      for (const layer of scene.layers) {
        const anim = layer?.animation;
        if (!anim) continue;
        for (const key of ["colorCycle", "wave", "glow"] as const) {
          if (anim[key] && typeof anim[key].period === "number") {
            anim[key].period = newDuration;
          }
        }
      }
    }
  }

  if (patched) {
    fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2));
    console.log("  [pipeline] scene.json patched for research (resolution/duration capped)");
  }
}

export function restoreSceneJson(cwd: string): void {
  if (sceneJsonBackup === null) return;
  const scenePath = path.join(cwd, "public", "scene.json");
  fs.writeFileSync(scenePath, sceneJsonBackup);
  sceneJsonBackup = null;
  console.log("  [pipeline] scene.json restored to original");
}

// ── Archive Cleanup ────────────────────────────────────────

function cleanPreviousArchive(cwd: string): void {
  // Remove out/layered/*_research* directories
  const layeredDir = path.join(cwd, "out/layered");
  if (fs.existsSync(layeredDir)) {
    const dirs = fs.readdirSync(layeredDir).filter((d) => d.includes("_research"));
    for (const dir of dirs) {
      fs.rmSync(path.join(layeredDir, dir), { recursive: true, force: true });
    }
    if (dirs.length > 0) {
      console.log(`  [pipeline] Cleaned ${dirs.length} previous _research archive(s)`);
    }
  }

  // Clear .cache/research/current/ contents
  const cacheDir = path.join(cwd, RESEARCH_DIR);
  if (fs.existsSync(cacheDir)) {
    const entries = fs.readdirSync(cacheDir);
    for (const entry of entries) {
      fs.rmSync(path.join(cacheDir, entry), { recursive: true, force: true });
    }
  }
}

export interface PipelineResult {
  videoPath: string;
  manifestPath: string;
  elapsedMs: number;
}

// ── Step 1: Layer Decomposition ─────────────────────────────

export function runLayerDecomposition(
  inputPath: string,
  cwd: string,
  config?: Record<string, unknown>,
): string {
  const args = ["tsx", "scripts/pipeline-layers.ts", inputPath];

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

// ── Chrome/Puppeteer Check ────────────────────────────────

export function checkChromeAvailable(): boolean {
  try {
    // puppeteer uses Chrome/Chromium — check if it can be found
    execFileSync("npx", ["puppeteer", "browsers", "list"], { stdio: "pipe", timeout: 15_000 });
    return true;
  } catch {
    return false;
  }
}

// ── Step 2: Export Video (subprocess) ───────────────────────

export function runExportLayered(cwd: string): string {
  // Use export-layered.ts as subprocess — it manages its own Vite + Puppeteer lifecycle
  // Title "_research" gives predictable archive path
  // Use stdio: inherit to avoid stdout buffer deadlock on large ffmpeg output
  execFileSync("npx", [
    "tsx", "scripts/export-layered.ts", "--title", "_research",
  ], {
    cwd,
    timeout: 600_000, // 10 min for large exports
    stdio: "inherit",
    env: { ...process.env, RESEARCH_FPS: "30", RESEARCH_PRESET: "fast" },
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

export function copyToResearchDir(videoPath: string, cwd: string): string {
  const destDir = path.join(cwd, RESEARCH_DIR);
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(cwd, RESEARCH_VIDEO_PATH);
  fs.copyFileSync(videoPath, dest);
  return dest;
}

// ── Step 4: Find Manifest ───────────────────────────────────

export function findManifest(archiveDir: string): string {
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

  // Cleanup previous archive before starting
  cleanPreviousArchive(cwd);

  // Step 1: Layer decomposition (Replicate API → scene.json + layers in public/)
  console.log("  [pipeline] Layer decomposition...");
  const archiveDir = runLayerDecomposition(inputPath, cwd, config);

  // Step 2: Pre-check Chrome + Patch scene.json + Video export
  if (!checkChromeAvailable()) {
    throw new Error(
      "Chrome/Chromium not found for Puppeteer. Install with:\n" +
      "  npx puppeteer browsers install chrome\n" +
      "Or install system Chrome: https://www.google.com/chrome/",
    );
  }

  patchSceneJson(cwd);
  const exitHandler = () => restoreSceneJson(cwd);
  process.on("exit", exitHandler);

  let exportedVideoPath: string;
  try {
    console.log("  [pipeline] Video export (Vite + Puppeteer + ffmpeg)...");
    exportedVideoPath = runExportLayered(cwd);
  } finally {
    restoreSceneJson(cwd);
    process.removeListener("exit", exitHandler);
  }

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

  if (rootFiles.length === 0) {
    throw new Error(
      "No .png files found. Place input.png at the project root.",
    );
  }

  throw new Error(
    `Multiple .png files found (expected 1): ${rootFiles.join(", ")}. Place a single input.png.`,
  );
}
