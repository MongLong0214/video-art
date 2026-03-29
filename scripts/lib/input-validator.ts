import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_DIMENSION = 4096;
const SUPPORTED_FORMATS = new Set(["png", "jpg", "jpeg", "webp"]);
const DEFAULT_PREPARED_INPUT_DIR = path.resolve(".cache/research/inputs");

export interface ValidatedInput {
  filePath: string;
  width: number;
  height: number;
  wasResized: boolean;
}

export interface ValidateAndPrepareOptions {
  outputDir?: string;
}

export async function validateAndPrepare(
  inputPath: string,
  options: ValidateAndPrepareOptions = {},
): Promise<ValidatedInput> {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const ext = path.extname(inputPath).toLowerCase().replace(".", "");
  if (!SUPPORTED_FORMATS.has(ext)) {
    throw new Error(
      `Unsupported format: .${ext}. Supported: PNG, JPG, WEBP`,
    );
  }

  const stats = fs.statSync(inputPath);
  if (stats.size > MAX_FILE_SIZE) {
    throw new Error(
      `File too large: ${(stats.size / 1024 / 1024).toFixed(1)}MB. Maximum: 20MB`,
    );
  }

  const metadata = await sharp(inputPath).metadata();
  const { width = 0, height = 0, space, channels } = metadata;

  // Check for fully transparent images (H5)
  if (channels === 4) {
    const { data } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let hasOpaque = false;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 10) { hasOpaque = true; break; }
    }
    if (!hasOpaque) {
      throw new Error("Input image is fully transparent. Cannot decompose.");
    }
  }

  let pipeline = sharp(inputPath);

  // CMYK → sRGB
  if (space === "cmyk") {
    pipeline = pipeline.toColorspace("srgb");
  }

  // Resize if exceeds max dimension
  let wasResized = false;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    });
    wasResized = true;
  }

  const outputDir = options.outputDir ?? DEFAULT_PREPARED_INPUT_DIR;
  fs.mkdirSync(outputDir, { recursive: true });

  // Save prepared file
  const pathHash = createHash("sha1")
    .update(path.resolve(inputPath))
    .digest("hex")
    .slice(0, 8);
  const preparedPath = path.join(
    outputDir,
    `prepared-${path.basename(inputPath, path.extname(inputPath))}-${pathHash}.png`,
  );
  await pipeline.png().toFile(preparedPath);

  const preparedMeta = await sharp(preparedPath).metadata();

  return {
    filePath: preparedPath,
    width: preparedMeta.width || width,
    height: preparedMeta.height || height,
    wasResized,
  };
}

export function detectManualLayers(layersDir: string): string[] | null {
  if (!fs.existsSync(layersDir)) return null;

  const files = fs
    .readdirSync(layersDir)
    .filter((f) => /^layer-\d+\.png$/i.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)?.[0] ?? "0", 10);
      const nb = parseInt(b.match(/\d+/)?.[0] ?? "0", 10);
      return na - nb;
    });

  if (files.length < 2) return null;

  return files.map((f) => path.join(layersDir, f));
}

export async function ensureRgba(filePath: string): Promise<void> {
  const meta = await sharp(filePath).metadata();
  if (meta.channels !== 4) {
    const buf = await sharp(filePath).ensureAlpha().png().toBuffer();
    fs.writeFileSync(filePath, buf);
  }
}
