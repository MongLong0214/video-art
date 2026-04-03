import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OUT_DIR = "out";
const WORK_DIR = "_work";

// ---------------------------------------------------------------------------
// Pipeline types
// ---------------------------------------------------------------------------

export type Pipeline = "blueprint" | "layered" | "audio";

// ---------------------------------------------------------------------------
// RunContext — per-run isolated work directory + archive directory
// ---------------------------------------------------------------------------

export interface RunContext {
  projectRoot: string;
  title: string;
  runId: string;
  pipeline: Pipeline;
  /** Transient work directory: out/{pipeline}/{date}_{title}/_work/ — auto-deleted on cleanup */
  workDir: string;
  /** Permanent archive directory: out/{pipeline}/{date}_{title}/ */
  archiveDir: string;
  /** Convenience sub-paths under workDir */
  paths: {
    layers: string;
    frames: string;
  };
  /** Remove _work/ inside archiveDir. Safe to call multiple times. */
  cleanup(): void;
  /** Prevent auto-cleanup (e.g. --keep-frames). Idempotent. */
  skipCleanup(): void;
  /** Whether cleanup has already been called or skipped */
  cleaned: boolean;
}

function generateRunId(): string {
  return crypto.randomUUID().substring(0, 8);
}

/**
 * Create a RunContext with a permanent archive directory and a nested _work/
 * directory for transient files. The _work/ directory is automatically removed
 * on process exit, SIGINT, and SIGTERM.
 *
 * Archive layout: out/{pipeline}/{YYYY-MM-DD}_{title}/
 *   - Final outputs live at root level (mp4, json, frag, etc.)
 *   - Intermediate files go into _work/ (auto-deleted on completion)
 *
 * @param projectRoot  Absolute path to the project root
 * @param title        Slugified title for the archive directory
 * @param pipeline     Pipeline type: "blueprint" or "layered"
 */
export function createRunContext(
  projectRoot: string,
  title: string,
  pipeline: Pipeline,
  existingArchiveDir?: string,
): RunContext {
  const runId = generateRunId();
  const archiveDir = existingArchiveDir || createArchiveDir(projectRoot, title, pipeline, runId);
  const workDir = path.join(archiveDir, WORK_DIR);

  fs.mkdirSync(workDir, { recursive: true });

  const ctx: RunContext = {
    projectRoot,
    title,
    runId,
    pipeline,
    workDir,
    archiveDir,
    paths: {
      layers: path.join(workDir, "layers"),
      frames: path.join(workDir, "frames"),
    },
    cleaned: false,
    cleanup() {
      if (ctx.cleaned) return;
      ctx.cleaned = true;
      try {
        // Remove _work/ inside archive dir
        if (fs.existsSync(workDir)) {
          fs.rmSync(workDir, { recursive: true, force: true });
        }
        // Remove empty archive directory (failed/aborted runs)
        if (archiveDir && fs.existsSync(archiveDir)) {
          const contents = fs.readdirSync(archiveDir);
          if (contents.length === 0) {
            fs.rmdirSync(archiveDir);
          }
        }
      } catch {
        // best-effort cleanup — don't crash the process
      }
    },
    skipCleanup() {
      ctx.cleaned = true;
    },
  };

  // Auto-cleanup on process exit
  const onExit = () => ctx.cleanup();
  process.once("exit", onExit);
  process.once("SIGINT", () => {
    onExit();
    process.exit(130);
  });
  process.once("SIGTERM", () => {
    onExit();
    process.exit(143);
  });

  return ctx;
}

// ---------------------------------------------------------------------------
// Archive helpers
// ---------------------------------------------------------------------------

/**
 * Parse --title from argv. Falls back to input filename or "untitled".
 */
export function parseTitle(argv: string[], inputPath?: string): string {
  const titleIdx = argv.indexOf("--title");
  if (titleIdx !== -1) {
    const next = argv[titleIdx + 1];
    if (next && !next.startsWith("--")) {
      return slugify(next);
    }
  }
  if (inputPath) {
    return slugify(path.basename(inputPath, path.extname(inputPath)));
  }
  return "untitled";
}

/**
 * Create archive directory: out/{pipeline}/{YYYY-MM-DD}_{title}/
 * If already exists, appends -2, -3, etc. to avoid overwriting.
 */
function createArchiveDir(projectRoot: string, title: string, pipeline: Pipeline, runId: string): string {
  const pipelineDir = path.join(projectRoot, OUT_DIR, pipeline);
  fs.mkdirSync(pipelineDir, { recursive: true });

  const date = new Date().toISOString().slice(0, 10);
  const dirName = `${date}_${title}-${runId}`;

  const archiveDir = path.join(pipelineDir, dirName);
  fs.mkdirSync(archiveDir, { recursive: true });
  return archiveDir;
}

/**
 * Copy layers + scene.json from sourceDir into the archive directory.
 * @param sourceDir  Directory containing layers/ and scene.json (workDir or public/)
 */
export function snapshotLayers(sourceDir: string, archiveDir: string): void {
  const srcLayers = path.join(sourceDir, "layers");
  const srcScene = path.join(sourceDir, "scene.json");
  const archiveLayers = path.join(archiveDir, "layers");

  if (fs.existsSync(srcLayers)) {
    fs.mkdirSync(archiveLayers, { recursive: true });
    for (const file of fs.readdirSync(srcLayers)) {
      if (file.endsWith(".png")) {
        fs.copyFileSync(
          path.join(srcLayers, file),
          path.join(archiveLayers, file),
        );
      }
    }
  }

  if (fs.existsSync(srcScene)) {
    fs.copyFileSync(srcScene, path.join(archiveDir, "scene.json"));
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || "untitled";
}
