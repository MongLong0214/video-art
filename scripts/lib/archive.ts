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
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${ts}-${rand}`;
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
): RunContext {
  const runId = generateRunId();
  const archiveDir = createArchiveDir(projectRoot, title, pipeline);
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

/**
 * Create a lightweight temp work directory (no archive).
 * For intermediate-only steps like pipeline-layers that produce no final output.
 * Auto-deleted on process exit.
 */
export function createWorkDir(projectRoot: string): {
  workDir: string;
  paths: { layers: string; frames: string };
  cleanup: () => void;
} {
  const runId = generateRunId();
  const workDir = path.join(projectRoot, OUT_DIR, WORK_DIR, runId);
  fs.mkdirSync(workDir, { recursive: true });

  const cleanup = () => {
    try {
      if (fs.existsSync(workDir)) {
        fs.rmSync(workDir, { recursive: true, force: true });
      }
      const topWork = path.join(projectRoot, OUT_DIR, WORK_DIR);
      if (fs.existsSync(topWork) && fs.readdirSync(topWork).length === 0) {
        fs.rmdirSync(topWork);
      }
    } catch { /* best-effort */ }
  };

  process.once("exit", cleanup);
  process.once("SIGINT", () => { cleanup(); process.exit(130); });
  process.once("SIGTERM", () => { cleanup(); process.exit(143); });

  return {
    workDir,
    paths: {
      layers: path.join(workDir, "layers"),
      frames: path.join(workDir, "frames"),
    },
    cleanup,
  };
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
function createArchiveDir(projectRoot: string, title: string, pipeline: Pipeline): string {
  const pipelineDir = path.join(projectRoot, OUT_DIR, pipeline);
  fs.mkdirSync(pipelineDir, { recursive: true });

  const date = new Date().toISOString().slice(0, 10);
  const baseName = `${date}_${title}`;
  let dirName = baseName;
  let counter = 1;

  while (fs.existsSync(path.join(pipelineDir, dirName))) {
    counter++;
    dirName = `${baseName}-${counter}`;
  }

  const archiveDir = path.join(pipelineDir, dirName);
  fs.mkdirSync(archiveDir, { recursive: true });
  return archiveDir;
}

/**
 * Copy current public/layers + scene.json into the archive directory.
 */
export function snapshotLayers(projectRoot: string, archiveDir: string): void {
  const publicLayers = path.join(projectRoot, "public", "layers");
  const publicScene = path.join(projectRoot, "public", "scene.json");
  const archiveLayers = path.join(archiveDir, "layers");

  if (fs.existsSync(publicLayers)) {
    fs.mkdirSync(archiveLayers, { recursive: true });
    for (const file of fs.readdirSync(publicLayers)) {
      if (file.endsWith(".png")) {
        fs.copyFileSync(
          path.join(publicLayers, file),
          path.join(archiveLayers, file),
        );
      }
    }
  }

  if (fs.existsSync(publicScene)) {
    fs.copyFileSync(publicScene, path.join(archiveDir, "scene.json"));
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
