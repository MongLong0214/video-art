import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { validateFilePath, IMAGE_EXTENSIONS } from "./validate-file-path.js";

describe("validateFilePath — image path traversal", () => {
  let tmpDir: string;
  let projectRoot: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vfp-test-"));
    projectRoot = path.join(tmpDir, "project");
    fs.mkdirSync(projectRoot, { recursive: true });

    // Valid image inside project
    fs.writeFileSync(path.join(projectRoot, "input.png"), "fake-png");
    fs.writeFileSync(path.join(projectRoot, "photo.jpg"), "fake-jpg");
    fs.writeFileSync(path.join(projectRoot, "photo.jpeg"), "fake-jpeg");
    fs.writeFileSync(path.join(projectRoot, "photo.webp"), "fake-webp");

    // Non-image file inside project
    fs.writeFileSync(path.join(projectRoot, "readme.txt"), "text");

    // External file
    fs.writeFileSync(path.join(tmpDir, "evil.png"), "evil");

    // Symlink pointing outside project
    try {
      fs.symlinkSync(
        path.join(tmpDir, "evil.png"),
        path.join(projectRoot, "symlink-evil.png"),
      );
    } catch {
      // symlink may fail on some systems
    }

    // Prefix attack directory
    const evilDir = projectRoot + "-evil";
    fs.mkdirSync(evilDir, { recursive: true });
    fs.writeFileSync(path.join(evilDir, "pwned.png"), "pwned");
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("accepts valid PNG path within project", () => {
    expect(
      validateFilePath(path.join(projectRoot, "input.png"), projectRoot, IMAGE_EXTENSIONS),
    ).toBe(true);
  });

  it("accepts .jpg, .jpeg, .webp", () => {
    expect(validateFilePath(path.join(projectRoot, "photo.jpg"), projectRoot, IMAGE_EXTENSIONS)).toBe(true);
    expect(validateFilePath(path.join(projectRoot, "photo.jpeg"), projectRoot, IMAGE_EXTENSIONS)).toBe(true);
    expect(validateFilePath(path.join(projectRoot, "photo.webp"), projectRoot, IMAGE_EXTENSIONS)).toBe(true);
  });

  it("rejects non-image extension", () => {
    expect(
      validateFilePath(path.join(projectRoot, "readme.txt"), projectRoot, IMAGE_EXTENSIONS),
    ).toBe(false);
  });

  it("rejects ../ traversal", () => {
    expect(
      validateFilePath(path.join(projectRoot, "..", "evil.png"), projectRoot, IMAGE_EXTENSIONS),
    ).toBe(false);
  });

  it("rejects symlink pointing outside project", () => {
    const symlinkPath = path.join(projectRoot, "symlink-evil.png");
    if (!fs.existsSync(symlinkPath)) return; // skip if symlink creation failed
    expect(validateFilePath(symlinkPath, projectRoot, IMAGE_EXTENSIONS)).toBe(false);
  });

  it("rejects prefix attack (/project-evil/)", () => {
    expect(
      validateFilePath(projectRoot + "-evil/pwned.png", projectRoot, IMAGE_EXTENSIONS),
    ).toBe(false);
  });

  it("rejects nonexistent file", () => {
    expect(
      validateFilePath(path.join(projectRoot, "no-such-file.png"), projectRoot, IMAGE_EXTENSIONS),
    ).toBe(false);
  });
});
