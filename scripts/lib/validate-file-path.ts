import * as fs from "node:fs";
import * as path from "node:path";

const ALLOWED_EXTENSIONS = new Set([".osclog", ".osc", ".wav", ".json", ".flac", ".mp3", ".aiff"]);

// Image extensions for pipeline input validation
// NOTE: TOCTOU — Between realpathSync and file open, a symlink target could change.
// This is an accepted risk for a local CLI tool. See PRD-pipeline-hardening §6.3.
export const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

export const validateFilePath = (
  filePath: string,
  projectRoot: string,
  allowedExtensions: string[] = [...ALLOWED_EXTENSIONS],
): boolean => {
  try {
    const resolved = fs.realpathSync(filePath);
    const resolvedRoot = fs.realpathSync(projectRoot);

    if (!resolved.startsWith(resolvedRoot + path.sep) && resolved !== resolvedRoot) {
      return false;
    }

    const ext = path.extname(resolved).toLowerCase();
    if (allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};
