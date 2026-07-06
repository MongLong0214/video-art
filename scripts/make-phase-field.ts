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

type PhaseKind = "radial" | "luminance" | "edge" | "vertical" | "angular";
type OutputKind = PhaseKind | "flow";

type MixTerm = {
  readonly kind: PhaseKind;
  readonly weight: number;
};

type CliArgs = {
  readonly sourcePath: string;
  readonly workDir: string;
  readonly kinds: readonly OutputKind[];
  readonly focal?: readonly [number, number];
  readonly invert: boolean;
  readonly mix: readonly MixTerm[];
  readonly figureMaskPath?: string;
};

type FieldContext = {
  readonly width: number;
  readonly height: number;
  readonly lumSmooth: Float32Array;
  readonly edge: Float32Array;
  readonly focal: readonly [number, number];
};

const TAU = Math.PI * 2;

function normalizePhaseKind(value: string): PhaseKind {
  if (value === "radial" || value === "luminance" || value === "edge" || value === "vertical" || value === "angular") return value;
  if (value === "edge-distance") return "edge";
  throw new Error(`unknown phase kind: ${value}`);
}

function normalizeKind(value: string): OutputKind {
  if (value === "flow") return "flow";
  return normalizePhaseKind(value);
}

function parseFocal(value: string): readonly [number, number] {
  const [xRaw, yRaw] = value.split(",");
  const x = Number(xRaw);
  const y = Number(yRaw);
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error("expected --focal x,y");
  return [x, y];
}

function parseKinds(value: string | undefined): readonly OutputKind[] {
  if (!value) throw new Error("expected --kinds radial,luminance,edge,vertical,angular,flow");
  return value.split(",").filter((part) => part.length > 0).map(normalizeKind);
}

function parseMix(value: string | undefined): readonly MixTerm[] {
  if (!value) return [];
  return value.split(",").filter((part) => part.length > 0).map((term) => {
    const [kindRaw, weightRaw] = term.split(":");
    const weight = Number(weightRaw);
    if (!kindRaw || !Number.isFinite(weight) || weight < 0) throw new Error(`invalid --mix term: ${term}`);
    return { kind: normalizePhaseKind(kindRaw), weight };
  });
}

function parseCli(argv: readonly string[]): CliArgs {
  const sourcePath = argv[0];
  const workDirIndex = argv.indexOf("--work-dir");
  const kindsIndex = argv.indexOf("--kinds");
  if (!sourcePath || workDirIndex === -1 || !argv[workDirIndex + 1]) {
    throw new Error("usage: npx tsx scripts/make-phase-field.ts <source.png> --work-dir <dir> --kinds radial,luminance,edge,vertical,angular [--focal x,y] [--invert] [--mix radial:0.6,luminance:0.4]");
  }
  const focalIndex = argv.indexOf("--focal");
  const mixIndex = argv.indexOf("--mix");
  const figureMaskIndex = argv.indexOf("--figure-mask");
  return {
    sourcePath,
    workDir: argv[workDirIndex + 1],
    kinds: parseKinds(kindsIndex === -1 ? undefined : argv[kindsIndex + 1]),
    focal: focalIndex === -1 || !argv[focalIndex + 1] ? undefined : parseFocal(argv[focalIndex + 1]),
    invert: argv.includes("--invert"),
    mix: parseMix(mixIndex === -1 ? undefined : argv[mixIndex + 1]),
    figureMaskPath: figureMaskIndex === -1 ? undefined : argv[figureMaskIndex + 1],
  };
}

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
  for (const kind of args.kinds) if (kind !== "flow") add(kind);
  for (const term of args.mix) add(term.kind);
  return out;
}

function mixFields(fields: ReadonlyMap<PhaseKind, Float32Array>, terms: readonly MixTerm[]): Float32Array {
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

async function buildFlowField(image: Awaited<ReturnType<typeof loadImageData>>, lum: Float32Array, figureMaskPath: string | undefined): Promise<Buffer> {
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
  const sx = blurFloatField(jxx, image.width, image.height, 8);
  const sxy = blurFloatField(jxy, image.width, image.height, 8);
  const sy = blurFloatField(jyy, image.width, image.height, 8);
  const figure = figureMaskPath
    ? await loadFigureMask(figureMaskPath, image.width, image.height)
    : await buildSaliencyFigureMask(image);
  const core = erodeMask(figure, image.width, image.height, Math.max(1, Math.round(Math.min(image.width, image.height) * 0.025)));
  const rgb = Buffer.alloc(total * 3);
  for (let i = 0; i < total; i++) {
    const a = sx[i];
    const b = sxy[i];
    const c = sy[i];
    const normalAngle = 0.5 * Math.atan2(2 * b, a - c);
    const tangent = normalAngle + Math.PI * 0.5;
    const coherence = clamp01(Math.hypot(a - c, 2 * b) / Math.max(1e-6, a + c)) * (1 - core[i]);
    const p = i * 3;
    rgb[p] = clamp255((Math.cos(tangent) * 0.5 + 0.5) * 255);
    rgb[p + 1] = clamp255((Math.sin(tangent) * 0.5 + 0.5) * 255);
    rgb[p + 2] = clamp255(coherence * 255);
  }
  return rgb;
}

export async function makePhaseFields(args: CliArgs): Promise<readonly string[]> {
  const image = await loadImageData(args.sourcePath);
  const lum = makeLuminance(image);
  const lumSmooth = await blurField(lum, image.width, image.height, image.width * 0.02);
  const ctx: FieldContext = {
    width: image.width,
    height: image.height,
    lumSmooth,
    edge: sobelField(lumSmooth, image.width, image.height),
    focal: args.focal ?? autoFocal(lumSmooth, image.width),
  };
  const layersDir = path.join(args.workDir, "layers");
  fs.mkdirSync(layersDir, { recursive: true });
  const fields = new Map<PhaseKind, Float32Array>();
  for (const kind of neededKinds(args)) fields.set(kind, maybeInvert(buildField(kind, ctx), args.invert));
  const written: string[] = [];
  for (const kind of args.kinds) {
    if (kind === "flow") {
      const outPath = path.join(layersDir, "flow-field.png");
      await writeRgbPng(await buildFlowField(image, lum, args.figureMaskPath), image.width, image.height, outPath);
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
