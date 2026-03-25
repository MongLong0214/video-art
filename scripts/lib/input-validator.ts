import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_DIMENSION = 4096;
const SUPPORTED_FORMATS = new Set(["png", "jpg", "jpeg", "webp"]);

export interface ValidatedInput {
  filePath: string;
  width: number;
  height: number;
  wasResized: boolean;
}

export async function validateAndPrepare(
  inputPath: string,
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
  const { width = 0, height = 0, space } = metadata;

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

  // Save prepared file
  const preparedPath = path.join(
    path.dirname(inputPath),
    `prepared-${path.basename(inputPath, path.extname(inputPath))}.png`,
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
    .sort();

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
