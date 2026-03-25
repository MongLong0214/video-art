import fs from "node:fs";
import path from "node:path";

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
 * Create archive directory: out/{YYYY-MM-DD}_{title}/
 * If already exists, appends -2, -3, etc. to avoid overwriting.
 */
export function createArchiveDir(projectRoot: string, title: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const baseName = `${date}_${title}`;
  let dirName = baseName;
  let counter = 1;

  while (fs.existsSync(path.join(projectRoot, "out", dirName))) {
    counter++;
    dirName = `${baseName}-${counter}`;
  }

  const archiveDir = path.join(projectRoot, "out", dirName);
  fs.mkdirSync(archiveDir, { recursive: true });
  return archiveDir;
}

/**
 * Copy current layers + scene.json into archive directory.
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

/**
 * Temp frames directory (shared, always cleaned).
 */
export function framesDir(projectRoot: string): string {
  const dir = path.join(projectRoot, "out", "_frames");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Clean temp frames directory.
 */
export function cleanFrames(projectRoot: string): void {
  const dir = path.join(projectRoot, "out", "_frames");
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || "untitled";
}
