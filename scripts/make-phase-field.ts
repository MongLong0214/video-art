import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  blurField,
  clamp01,
  clamp255,
  loadImageData,
  makeLuminance,
  normalizePercentile,
  percentile,
  sobelField,
  sobelVectors,
} from "./lib/image-stats.js";
import {
  blurFloatField,
  buildSaliencyFigureMask,
  erodeMask,
  writeGrayPng,
  writeRgbPng,
} from "./lib/field-images.js";
import { parseCli, type CliArgs, type FlowProfile, type PhaseKind } from "./lib/phase-field-cli.js";
import { buildSourceRegionAffinityImage } from "./lib/source-region-affinity-image.js";
import { buildIntegratedStreamField, type MaterialFlow } from "./lib/stream-field.js";

type FieldContext = {
  readonly width: number;
  readonly height: number;
  readonly lumSmooth: Float32Array;
  readonly edge: Float32Array;
  readonly detail: Float32Array;
  readonly focal: readonly [number, number];
};

const TAU = Math.PI * 2;

function autoFocal(lumSmooth: Float32Array, width: number): readonly [number, number] {
  let best = -1;
  let index = 0;
  for (let i = 0; i < lumSmooth.length; i++) {
    if (lumSmooth[i] > best) {
      best = lumSmooth[i];
      index = i;
    }
  }
  return [index % width, Math.floor(index / width)];
}

function radialField(ctx: FieldContext): Float32Array {
  const out = new Float32Array(ctx.width * ctx.height);
  const maxR = Math.hypot(Math.max(ctx.focal[0], ctx.width - 1 - ctx.focal[0]), Math.max(ctx.focal[1], ctx.height - 1 - ctx.focal[1]));
  for (let y = 0; y < ctx.height; y++) {
    for (let x = 0; x < ctx.width; x++) out[y * ctx.width + x] = clamp01(Math.hypot(x - ctx.focal[0], y - ctx.focal[1]) / Math.max(1, maxR));
  }
  return out;
}

function chamferDistance(edgeMask: Uint8Array, width: number, height: number): Float32Array {
  const inf = 1_000_000;
  const dist = new Float32Array(width * height);
  for (let i = 0; i < dist.length; i++) dist[i] = edgeMask[i] > 0 ? 0 : inf;
  const at = (x: number, y: number): number => (x < 0 || y < 0 || x >= width || y >= height ? inf : dist[y * width + x]);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      dist[i] = Math.min(dist[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414);
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      dist[i] = Math.min(dist[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414);
    }
  }
  return dist;
}

function edgeField(ctx: FieldContext): Float32Array {
  const threshold = percentile(ctx.edge, 0.85);
  const mask = new Uint8Array(ctx.edge.length);
  for (let i = 0; i < ctx.edge.length; i++) mask[i] = ctx.edge[i] >= threshold ? 1 : 0;
  return normalizePercentile(chamferDistance(mask, ctx.width, ctx.height), 0.02, 0.98);
}

function detailField(ctx: FieldContext): Float32Array {
  return ctx.detail;
}

function verticalField(ctx: FieldContext): Float32Array {
  const out = new Float32Array(ctx.width * ctx.height);
  for (let y = 0; y < ctx.height; y++) {
    const ny = y / Math.max(1, ctx.height - 1);
    for (let x = 0; x < ctx.width; x++) {
      const i = y * ctx.width + x;
      out[i] = clamp01(0.7 * ny + 0.3 * (1 - ctx.lumSmooth[i]));
    }
  }
  return out;
}

function angularField(ctx: FieldContext): Float32Array {
  const out = new Float32Array(ctx.width * ctx.height);
  for (let y = 0; y < ctx.height; y++) {
    for (let x = 0; x < ctx.width; x++) {
      out[y * ctx.width + x] = (Math.atan2(y - ctx.focal[1], x - ctx.focal[0]) + Math.PI) / TAU;
    }
  }
  return out;
}

function buildField(kind: PhaseKind, ctx: FieldContext): Float32Array {
  switch (kind) {
    case "radial":
      return radialField(ctx);
    case "luminance":
      return normalizePercentile(ctx.lumSmooth, 0.02, 0.98);
    case "edge":
      return edgeField(ctx);
    case "detail":
      return detailField(ctx);
    case "vertical":
      return verticalField(ctx);
    case "angular":
      return angularField(ctx);
  }
}

function maybeInvert(field: Float32Array, invert: boolean): Float32Array {
  if (!invert) return field;
  const out = new Float32Array(field.length);
  for (let i = 0; i < field.length; i++) out[i] = 1 - field[i];
  return out;
}

function neededKinds(args: CliArgs): readonly PhaseKind[] {
  const out: PhaseKind[] = [];
  const add = (kind: PhaseKind): void => {
    if (!out.includes(kind)) out.push(kind);
  };
  for (const kind of args.kinds) if (kind !== "flow" && kind !== "stream" && kind !== "region") add(kind);
  for (const term of args.mix) add(term.kind);
  return out;
}

function mixFields(
  fields: ReadonlyMap<PhaseKind, Float32Array>,
  terms: ReadonlyArray<{ readonly kind: PhaseKind; readonly weight: number }>,
): Float32Array {
  if (terms.length === 0) throw new Error("cannot mix empty field list");
  const first = fields.get(terms[0].kind);
  if (!first) throw new Error(`missing field for mix: ${terms[0].kind}`);
  const out = new Float32Array(first.length);
  let weightSum = 0;
  for (const term of terms) {
    const field = fields.get(term.kind);
    if (!field) throw new Error(`missing field for mix: ${term.kind}`);
    weightSum += term.weight;
    for (let i = 0; i < out.length; i++) out[i] += field[i] * term.weight;
  }
  const denom = Math.max(1e-6, weightSum);
  for (let i = 0; i < out.length; i++) out[i] = clamp01(out[i] / denom);
  return out;
}

async function loadFigureMask(maskPath: string, width: number, height: number): Promise<Float32Array> {
  const { data } = await sharp(maskPath).ensureAlpha().resize(width, height, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  const mask = new Float32Array(width * height);
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] / 255;
  return mask;
}

function orientMaterialTangents(
  tangentX: Float32Array,
  tangentY: Float32Array,
  coherence: Float32Array,
  width: number,
  height: number,
): void {
  const alignPass = (xStart: number, xEnd: number, xStep: number, yStart: number, yEnd: number, yStep: number): void => {
    for (let y = yStart; y !== yEnd; y += yStep) {
      for (let x = xStart; x !== xEnd; x += xStep) {
        const i = y * width + x;
        if (coherence[i] < 0.05) continue;
        let sumX = 0;
        let sumY = 0;
        const previousX = x - xStep;
        const previousY = y - yStep;
        if (previousX >= 0 && previousX < width) {
          const neighbor = y * width + previousX;
          const weight = coherence[neighbor];
          sumX += tangentX[neighbor] * weight;
          sumY += tangentY[neighbor] * weight;
        }
        if (previousY >= 0 && previousY < height) {
          const neighbor = previousY * width + x;
          const weight = coherence[neighbor];
          sumX += tangentX[neighbor] * weight;
          sumY += tangentY[neighbor] * weight;
        }
        if (tangentX[i] * sumX + tangentY[i] * sumY < 0) {
          tangentX[i] = -tangentX[i];
          tangentY[i] = -tangentY[i];
        }
      }
    }
  };

  for (let pass = 0; pass < 4; pass++) {
    const forward = pass % 2 === 0;
    alignPass(
      forward ? 0 : width - 1,
      forward ? width : -1,
      forward ? 1 : -1,
      forward ? 0 : height - 1,
      forward ? height : -1,
      forward ? 1 : -1,
    );
  }
}

async function buildMaterialFlow(
  image: Awaited<ReturnType<typeof loadImageData>>,
  lum: Float32Array,
  figureMaskPath: string | undefined,
  flowProfile: FlowProfile,
): Promise<MaterialFlow> {
  const sobel = sobelVectors(lum, image.width, image.height);
  const total = image.width * image.height;
  const jxx = new Float32Array(total);
  const jxy = new Float32Array(total);
  const jyy = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const gx = sobel.gx[i];
    const gy = sobel.gy[i];
    jxx[i] = gx * gx;
    jxy[i] = gx * gy;
    jyy[i] = gy * gy;
  }
  const tensorSigma = flowProfile === "material" ? Math.max(1.5, Math.min(image.width, image.height) * 0.002) : 8;
  const sx = blurFloatField(jxx, image.width, image.height, tensorSigma);
  const sxy = blurFloatField(jxy, image.width, image.height, tensorSigma);
  const sy = blurFloatField(jyy, image.width, image.height, tensorSigma);
  const core = flowProfile === "coarse"
    ? erodeMask(
      figureMaskPath
        ? await loadFigureMask(figureMaskPath, image.width, image.height)
        : await buildSaliencyFigureMask(image),
      image.width,
      image.height,
      Math.max(1, Math.round(Math.min(image.width, image.height) * 0.025)),
    )
    : undefined;
  const tangentX = new Float32Array(total);
  const tangentY = new Float32Array(total);
  const coherence = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const a = sx[i];
    const b = sxy[i];
    const c = sy[i];
    const normalAngle = 0.5 * Math.atan2(2 * b, a - c);
    const tangent = normalAngle + Math.PI * 0.5;
    tangentX[i] = Math.cos(tangent);
    tangentY[i] = Math.sin(tangent);
    const rawCoherence = clamp01(Math.hypot(a - c, 2 * b) / Math.max(1e-6, a + c));
    coherence[i] = core ? rawCoherence * (1 - core[i] * 0.55) : rawCoherence;
  }
  if (flowProfile === "material") orientMaterialTangents(tangentX, tangentY, coherence, image.width, image.height);
  return { tangentX, tangentY, coherence };
}

function encodeFlowField(flow: MaterialFlow): Buffer {
  const rgb = Buffer.alloc(flow.tangentX.length * 3);
  for (let i = 0; i < flow.tangentX.length; i++) {
    const p = i * 3;
    rgb[p] = clamp255((flow.tangentX[i] * 0.5 + 0.5) * 255);
    rgb[p + 1] = clamp255((flow.tangentY[i] * 0.5 + 0.5) * 255);
    rgb[p + 2] = clamp255(flow.coherence[i] * 255);
  }
  return rgb;
}

export async function makePhaseFields(args: CliArgs): Promise<readonly string[]> {
  const image = await loadImageData(args.sourcePath);
  const lum = makeLuminance(image);
  const lumSmooth = await blurField(lum, image.width, image.height, image.width * 0.02);
  const lumDetail = await blurField(lum, image.width, image.height, Math.max(0.8, image.width * 0.0015));
  const detailLuminance = normalizePercentile(lumDetail, 0.03, 0.97);
  const detailEdge = normalizePercentile(sobelField(lumDetail, image.width, image.height), 0.08, 0.95);
  const detail = new Float32Array(lum.length);
  for (let i = 0; i < detail.length; i++) {
    detail[i] = clamp01(detailLuminance[i] * 0.45 + detailEdge[i] * 0.55);
  }
  const ctx: FieldContext = {
    width: image.width,
    height: image.height,
    lumSmooth,
    edge: sobelField(lumSmooth, image.width, image.height),
    detail,
    focal: args.focal ?? autoFocal(lumSmooth, image.width),
  };
  const layersDir = path.join(args.workDir, "layers");
  fs.mkdirSync(layersDir, { recursive: true });
  const fields = new Map<PhaseKind, Float32Array>();
  for (const kind of neededKinds(args)) fields.set(kind, maybeInvert(buildField(kind, ctx), args.invert));
  const materialFlow = args.kinds.includes("flow") || args.kinds.includes("stream")
    ? await buildMaterialFlow(image, lum, args.figureMaskPath, args.flowProfile)
    : undefined;
  const regionAffinity = args.kinds.includes("region")
    ? await buildSourceRegionAffinityImage(args.sourcePath)
    : undefined;
  const written: string[] = [];
  for (const kind of args.kinds) {
    if (kind === "flow") {
      const outPath = path.join(layersDir, "flow-field.png");
      if (!materialFlow) throw new Error("missing source material flow");
      await writeRgbPng(encodeFlowField(materialFlow), image.width, image.height, outPath);
      written.push(outPath);
      continue;
    }
    if (kind === "stream") {
      const outPath = path.join(layersDir, "stream-field.png");
      if (!materialFlow) throw new Error("missing source material flow");
      await writeRgbPng(buildIntegratedStreamField(materialFlow, image.width, image.height), image.width, image.height, outPath);
      written.push(outPath);
      continue;
    }
    if (kind === "region") {
      const outPath = path.join(layersDir, "region-affinity-field.png");
      if (!regionAffinity) throw new Error("missing source region affinity");
      await writeGrayPng(regionAffinity.values, regionAffinity.width, regionAffinity.height, outPath);
      written.push(outPath);
      continue;
    }
    const field = fields.get(kind);
    if (!field) throw new Error(`missing field: ${kind}`);
    const outPath = path.join(layersDir, `phase-${kind}.png`);
    await writeGrayPng(field, image.width, image.height, outPath);
    written.push(outPath);
  }
  if (args.mix.length > 0) {
    const outPath = path.join(layersDir, "phase-mix.png");
    await writeGrayPng(mixFields(fields, args.mix), image.width, image.height, outPath);
    written.push(outPath);
  }
  process.stdout.write(`${JSON.stringify({ focal: ctx.focal, written }, null, 2)}\n`);
  return written;
}

async function main(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
  await makePhaseFields(parseCli(argv));
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((code) => process.exit(code)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
