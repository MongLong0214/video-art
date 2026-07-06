import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  blurField,
  clamp01,
  clamp255,
  loadImageData,
  makeLuminance,
  percentile,
  rgbToHsv,
  smoothstep,
  sobelField,
} from "./lib/image-stats.js";
import {
  buildSaliencyFigureMask,
  dilateMask,
  fieldCentroid,
  fieldMean,
  radialBand,
  writeGrayPng,
} from "./lib/field-images.js";

type CliArgs = {
  readonly sourcePath: string;
  readonly workDir: string;
  readonly figureAlphaPath?: string;
};

type MaskName = "base" | "void" | "body" | "ornament" | "highlight" | "edge";

type MaskMeta = {
  readonly threshold: Record<string, number | string | boolean>;
  readonly areaPct: number;
};

type MaskSet = Record<MaskName, Float32Array>;

const MASK_NAMES: readonly MaskName[] = ["base", "void", "body", "ornament", "highlight", "edge"];
const round4 = (value: number): number => Math.round(value * 10_000) / 10_000;

function parseCli(argv: readonly string[]): CliArgs {
  const sourcePath = argv[0];
  const workDirIndex = argv.indexOf("--work-dir");
  if (!sourcePath || workDirIndex === -1 || !argv[workDirIndex + 1]) {
    throw new Error("usage: npx tsx scripts/make-optical-layers.ts <source.png> --work-dir <dir> [--figure-alpha <png>]");
  }
  const figureIndex = argv.indexOf("--figure-alpha");
  return {
    sourcePath,
    workDir: argv[workDirIndex + 1],
    figureAlphaPath: figureIndex === -1 ? undefined : argv[figureIndex + 1],
  };
}

function mean(values: Float32Array): number {
  let sum = 0;
  for (const value of values) sum += value;
  return values.length === 0 ? 0 : sum / values.length;
}

function percentWhere(values: Float32Array, predicate: (value: number) => boolean): number {
  let count = 0;
  for (const value of values) if (predicate(value)) count++;
  return (count / Math.max(1, values.length)) * 100;
}

function colorFields(raw: Buffer, total: number): { readonly sat: Float32Array; readonly val: Float32Array } {
  const sat = new Float32Array(total);
  const val = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const p = i * 4;
    const hsv = rgbToHsv([raw[p], raw[p + 1], raw[p + 2]]);
    sat[i] = hsv[1];
    val[i] = hsv[2];
  }
  return { sat, val };
}

async function localBusyness(lum: Float32Array, width: number, height: number): Promise<number> {
  const smooth = await blurField(lum, width, height, 8);
  let sum = 0;
  for (let i = 0; i < lum.length; i++) sum += Math.abs(lum[i] - smooth[i]);
  return sum / Math.max(1, lum.length);
}

async function feather(mask: Float32Array, width: number, height: number): Promise<Float32Array> {
  return blurField(mask, width, height, 8);
}

async function buildMasks(sourcePath: string): Promise<{ readonly image: Awaited<ReturnType<typeof loadImageData>>; readonly masks: MaskSet; readonly meta: Record<MaskName, MaskMeta> }> {
  const image = await loadImageData(sourcePath);
  const total = image.width * image.height;
  const lum = makeLuminance(image);
  const lumSmooth = await blurField(lum, image.width, image.height, image.width * 0.02);
  const edge = sobelField(lum, image.width, image.height);
  const { sat, val } = colorFields(image.raw, total);
  const darkAnchorPct = percentWhere(lum, (value) => value < 0.12);
  const busyness = await localBusyness(lum, image.width, image.height);
  const useSatVoid = darkAnchorPct < 3;
  const voidLumThreshold = percentile(lumSmooth, 0.25);
  const voidSatThreshold = percentile(sat, 0.3);
  const ornamentSatThreshold = percentile(sat, 0.7);
  const ornamentValThreshold = percentile(val, 0.4);
  const highlightValThreshold = percentile(val, 0.92);
  const edgePercentile = busyness > 0.08 ? 0.92 : 0.85;
  const edgeThreshold = percentile(edge, edgePercentile);
  const base = new Float32Array(total).fill(1);
  const voidMask = new Float32Array(total);
  const ornament = new Float32Array(total);
  const highlight = new Float32Array(total);
  const edgeMask = new Float32Array(total);
  const body = new Float32Array(total);

  for (let i = 0; i < total; i++) {
    const voidRaw = useSatVoid
      ? 1 - smoothstep(voidSatThreshold - 0.04, voidSatThreshold + 0.04, sat[i])
      : 1 - smoothstep(voidLumThreshold - 0.04, voidLumThreshold + 0.04, lumSmooth[i]);
    const ornamentRaw = smoothstep(ornamentSatThreshold - 0.04, ornamentSatThreshold + 0.04, sat[i]) * smoothstep(ornamentValThreshold - 0.04, ornamentValThreshold + 0.04, val[i]);
    const highlightRaw = smoothstep(highlightValThreshold - 0.03, highlightValThreshold + 0.03, val[i]);
    const edgeRaw = smoothstep(edgeThreshold * 0.75, edgeThreshold * 1.15, edge[i]) * (0.5 + 0.5 * sat[i]);
    voidMask[i] = clamp01(voidRaw);
    ornament[i] = clamp01(ornamentRaw);
    highlight[i] = clamp01(highlightRaw);
    edgeMask[i] = clamp01(edgeRaw);
    body[i] = clamp01((1 - voidMask[i] * 0.9) * (1 - ornament[i]) * (1 - highlight[i] * 0.35));
  }

  const masks: MaskSet = {
    base,
    void: await feather(voidMask, image.width, image.height),
    body: await feather(body, image.width, image.height),
    ornament: await feather(ornament, image.width, image.height),
    highlight: await feather(highlight, image.width, image.height),
    edge: await feather(edgeMask, image.width, image.height),
  };
  const shared = { darkAnchorPct: round4(darkAnchorPct), busyness: round4(busyness) };
  const meta: Record<MaskName, MaskMeta> = {
    base: { threshold: { mode: "full" }, areaPct: 100 },
    void: { threshold: { ...shared, mode: useSatVoid ? "bottom-30-saturation" : "bottom-25-luminance", value: round4(useSatVoid ? voidSatThreshold : voidLumThreshold) }, areaPct: round4(mean(masks.void) * 100) },
    body: { threshold: { mode: "mid-remainder-minus-ornament" }, areaPct: round4(mean(masks.body) * 100) },
    ornament: { threshold: { satP70: round4(ornamentSatThreshold), valueP40: round4(ornamentValThreshold) }, areaPct: round4(mean(masks.ornament) * 100) },
    highlight: { threshold: { valueP92: round4(highlightValThreshold) }, areaPct: round4(mean(masks.highlight) * 100) },
    edge: { threshold: { sobelPercentile: round4(edgePercentile), sobelThreshold: round4(edgeThreshold), busyTightened: busyness > 0.08 }, areaPct: round4(mean(masks.edge) * 100) },
  };
  return { image, masks, meta };
}

async function loadFigureAlpha(alphaPath: string, width: number, height: number): Promise<Float32Array> {
  const { data } = await sharp(alphaPath).ensureAlpha().resize(width, height, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  const alpha = new Float32Array(width * height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3] / 255;
  return blurField(alpha, width, height, 8);
}

async function buildDepthField(image: Awaited<ReturnType<typeof loadImageData>>, figure: Float32Array): Promise<Float32Array> {
  const lum = makeLuminance(image);
  const lumSmooth = await blurField(lum, image.width, image.height, image.width * 0.02);
  const depth = new Float32Array(figure.length);
  for (let y = 0; y < image.height; y++) {
    const ny = y / Math.max(1, image.height - 1);
    for (let x = 0; x < image.width; x++) {
      const i = y * image.width + x;
      depth[i] = clamp01(0.55 * figure[i] + 0.25 * lumSmooth[i] + 0.2 * (1 - ny));
    }
  }
  return blurField(depth, image.width, image.height, 12);
}

async function buildPortalMask(figure: Float32Array, width: number, height: number): Promise<{ readonly mask: Float32Array; readonly mode: string }> {
  const figureAreaPct = fieldMean(figure) * 100;
  if (figureAreaPct >= 10 && figureAreaPct <= 70) {
    const dilated = dilateMask(figure, width, height, Math.max(1, Math.round(Math.min(width, height) * 0.06)));
    const ring = new Float32Array(figure.length);
    for (let i = 0; i < ring.length; i++) ring[i] = clamp01(dilated[i] - figure[i]);
    return { mask: await blurField(ring, width, height, 10), mode: "figure-dilate-minus-figure" };
  }
  return { mask: await blurField(radialBand(width, height, fieldCentroid(figure, width, height)), width, height, 10), mode: "radial-fallback" };
}

async function writeLayer(raw: Buffer, width: number, height: number, mask: Float32Array, outPath: string): Promise<void> {
  const out = Buffer.alloc(raw.length);
  for (let i = 0; i < mask.length; i++) {
    const p = i * 4;
    out[p] = raw[p];
    out[p + 1] = raw[p + 1];
    out[p + 2] = raw[p + 2];
    out[p + 3] = clamp255(mask[i] * 255);
  }
  await sharp(out, { raw: { width, height, channels: 4 } }).png().toFile(outPath);
}

export async function makeOpticalLayers(args: CliArgs): Promise<Record<string, MaskMeta>> {
  const { image, masks, meta } = await buildMasks(args.sourcePath);
  const layersDir = path.join(args.workDir, "layers");
  fs.mkdirSync(layersDir, { recursive: true });
  await Promise.all(MASK_NAMES.map((name) => writeLayer(image.raw, image.width, image.height, masks[name], path.join(layersDir, `${name}.png`))));
  const metaOut: Record<string, MaskMeta> = { ...meta };
  const figure = args.figureAlphaPath
    ? await loadFigureAlpha(args.figureAlphaPath, image.width, image.height)
    : await buildSaliencyFigureMask(image);
  await writeLayer(image.raw, image.width, image.height, figure, path.join(layersDir, "figure.png"));
  const depth = await buildDepthField(image, figure);
  await writeGrayPng(depth, image.width, image.height, path.join(layersDir, "depth.png"));
  const portal = await buildPortalMask(figure, image.width, image.height);
  await writeGrayPng(portal.mask, image.width, image.height, path.join(layersDir, "portal.png"));
  metaOut.figure = { threshold: args.figureAlphaPath ? { mode: "external-alpha-blur-8px", source: args.figureAlphaPath } : { mode: "saliency-proxy-p60-blur-8px" }, areaPct: round4(fieldMean(figure) * 100) };
  metaOut.depth = { threshold: { mode: "0.55*figure+0.25*lumSmooth+0.20*(1-ny)-blur12" }, areaPct: round4(fieldMean(depth) * 100) };
  metaOut.portal = { threshold: { mode: portal.mode }, areaPct: round4(fieldMean(portal.mask) * 100) };
  fs.writeFileSync(path.join(args.workDir, "masks-meta.json"), `${JSON.stringify(metaOut, null, 2)}\n`);
  return metaOut;
}

async function main(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
  const meta = await makeOpticalLayers(parseCli(argv));
  process.stdout.write(`${JSON.stringify(meta, null, 2)}\n`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((code) => process.exit(code)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
