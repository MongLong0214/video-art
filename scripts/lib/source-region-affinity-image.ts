import sharp from "sharp";
import { buildSourceRegionAffinityField } from "./source-region-capacity.js";

export type SourceRegionAffinityImage = {
  readonly width: number;
  readonly height: number;
  readonly values: Float32Array;
};

export async function buildSourceRegionAffinityImage(sourcePath: string): Promise<SourceRegionAffinityImage> {
  const image = sharp(sourcePath);
  const metadata = await image.metadata();
  if (metadata.width === undefined || metadata.height === undefined) throw new Error(`source has no dimensions: ${sourcePath}`);
  const width = Math.min(240, metadata.width);
  const height = Math.max(2, Math.round((metadata.height / metadata.width) * width));
  const { data, info } = await image.resize(width, height, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const luma = new Float32Array(info.width * info.height);
  for (let cell = 0; cell < luma.length; cell++) {
    const offset = cell * info.channels;
    luma[cell] = (0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2]) / 255;
  }
  const field = buildSourceRegionAffinityField({
    luma,
    width: info.width,
    height: info.height,
    sourcePixelsPerCell: (metadata.width / info.width + metadata.height / info.height) * 0.5,
  });
  return { width: field.width, height: field.height, values: field.values };
}
