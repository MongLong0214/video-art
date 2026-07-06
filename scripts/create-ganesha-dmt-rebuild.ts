import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { sceneSchema } from "../src/lib/scene-schema.js";

type Rgb = readonly [number, number, number];

interface Variant {
  readonly slug: string;
  readonly label: string;
  readonly baseSpeed: number;
  readonly speeds: readonly [number, number, number, number, number];
  readonly opacities: readonly [number, number, number, number, number];
  readonly paletteA: Rgb;
  readonly paletteB: Rgb;
  readonly paletteC: Rgb;
  readonly paletteD: Rgb;
  readonly bloom: readonly [number, number, number];
  readonly ca: readonly [number, number];
  readonly aura: readonly [number, number, number];
  readonly feedback: readonly [number, number, number];
  readonly contrast: readonly [number, number];
  readonly basePalette: number;
}

interface ImageData {
  readonly raw: Buffer;
  readonly width: number;
  readonly height: number;
}

const sourcePath =
  "/Users/isaac/Downloads/monglong_a_bright_psychedelic_artwork_featuring_ganesha_sitting_8b4cafbd-746f-4c4b-9438-c18a1998ed8a 2.PNG";
const outputRoot = "out/manual-runs";

const variants: readonly Variant[] = [
  {
    slug: "ganesha-8b4cafbd-research-dmt-v4-01-blacklight-entity", label: "blacklight entity", baseSpeed: 0,
    speeds: [17, 13, 23, 19, 29], opacities: [0.24, 0.18, 0.24, 0.22, 0.3],
    paletteA: [0.32, 0.16, 0.48], paletteB: [0.54, 0.34, 0.36], paletteC: [1.25, 1.08, 1.1], paletteD: [0.82, 0.05, 0.56],
    bloom: [0.16, 0.38, 0.84], ca: [1.0, 0.18], aura: [0.035, 0.045, 0.12], feedback: [0.035, 0.93, 0.018], contrast: [1.16, 0.08], basePalette: 0,
  },
  {
    slug: "ganesha-8b4cafbd-research-dmt-v4-02-opal-cathedral", label: "opal cathedral", baseSpeed: 0,
    speeds: [9, 12, 15, 18, 24], opacities: [0.2, 0.22, 0.18, 0.18, 0.26],
    paletteA: [0.42, 0.28, 0.52], paletteB: [0.38, 0.44, 0.38], paletteC: [1.0, 1.14, 1.2], paletteD: [0.03, 0.38, 0.72],
    bloom: [0.12, 0.34, 0.86], ca: [0.78, 0.13], aura: [0.026, 0.04, 0.08], feedback: [0.025, 0.92, 0.014], contrast: [1.1, 0.06], basePalette: 0,
  },
  {
    slug: "ganesha-8b4cafbd-research-dmt-v4-03-alien-jewel-presence", label: "alien jewel presence", baseSpeed: 0,
    speeds: [18, 22, 27, 13, 31], opacities: [0.28, 0.2, 0.28, 0.26, 0.34],
    paletteA: [0.34, 0.18, 0.5], paletteB: [0.5, 0.36, 0.42], paletteC: [1.28, 0.98, 1.24], paletteD: [0.88, 0.12, 0.6],
    bloom: [0.18, 0.4, 0.84], ca: [1.12, 0.22], aura: [0.04, 0.048, 0.15], feedback: [0.04, 0.94, 0.02], contrast: [1.18, 0.1], basePalette: 0,
  },
  {
    slug: "ganesha-8b4cafbd-research-dmt-v4-04-cosmic-threshold", label: "cosmic threshold", baseSpeed: 0,
    speeds: [11, 16, 20, 14, 26], opacities: [0.3, 0.24, 0.18, 0.22, 0.3],
    paletteA: [0.28, 0.22, 0.46], paletteB: [0.48, 0.38, 0.32], paletteC: [1.04, 1.18, 1.08], paletteD: [0.56, 0.94, 0.24],
    bloom: [0.15, 0.38, 0.85], ca: [0.92, 0.16], aura: [0.034, 0.048, 0.1], feedback: [0.035, 0.93, 0.017], contrast: [1.16, 0.08], basePalette: 0,
  },
  {
    slug: "ganesha-8b4cafbd-research-dmt-v4-05-prismatic-xray", label: "prismatic xray", baseSpeed: 0,
    speeds: [21, 15, 25, 29, 33], opacities: [0.2, 0.18, 0.3, 0.3, 0.38],
    paletteA: [0.36, 0.18, 0.44], paletteB: [0.46, 0.44, 0.4], paletteC: [1.22, 1.04, 1.16], paletteD: [0.92, 0.22, 0.74],
    bloom: [0.14, 0.36, 0.86], ca: [1.2, 0.24], aura: [0.03, 0.042, 0.16], feedback: [0.04, 0.94, 0.02], contrast: [1.2, 0.1], basePalette: 0,
  },
];

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

const hueDistance = (a: number, b: number): number => {
  const d = Math.abs(a - b);
  return Math.min(d, 1 - d);
};

function rgbToHsv(r: number, g: number, b: number): readonly [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const sat = max === 0 ? 0 : delta / max;
  if (delta === 0) return [0, sat, max];
  const hue =
    max === rn
      ? ((gn - bn) / delta + (gn < bn ? 6 : 0)) / 6
      : max === gn
        ? ((bn - rn) / delta + 2) / 6
        : ((rn - gn) / delta + 4) / 6;
  return [hue, sat, max];
}

async function loadImage(): Promise<ImageData> {
  const image = sharp(sourcePath).ensureAlpha();
  const metadata = await image.metadata();
  if (metadata.width === undefined || metadata.height === undefined) {
    throw new Error("source image has no dimensions");
  }
  return {
    raw: await image.raw().toBuffer(),
    width: metadata.width,
    height: metadata.height,
  };
}

function writePixel(buffer: Buffer, index: number, raw: Buffer, alpha: number): void {
  const src = index * 4;
  buffer[src] = raw[src];
  buffer[src + 1] = raw[src + 1];
  buffer[src + 2] = raw[src + 2];
  buffer[src + 3] = Math.round(clamp01(alpha) * raw[src + 3]);
}

async function writeLayers(image: ImageData, layersDir: string): Promise<void> {
  fs.mkdirSync(layersDir, { recursive: true });
  const pixelCount = image.width * image.height;
  const lum = new Float32Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const p = i * 4;
    lum[i] = (0.299 * image.raw[p] + 0.587 * image.raw[p + 1] + 0.114 * image.raw[p + 2]) / 255;
  }

  const base = Buffer.from(image.raw);
  const background = Buffer.alloc(image.raw.length);
  const halo = Buffer.alloc(image.raw.length);
  const warm = Buffer.alloc(image.raw.length);
  const cool = Buffer.alloc(image.raw.length);
  const edge = Buffer.alloc(image.raw.length);

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const i = y * image.width + x;
      const p = i * 4;
      const nx = x / (image.width - 1);
      const ny = y / (image.height - 1);
      const [h, s, v] = rgbToHsv(image.raw[p], image.raw[p + 1], image.raw[p + 2]);
      const figX = (nx - 0.5) / 0.42;
      const figY = (ny - 0.63) / 0.43;
      const figure = 1 - smoothstep(0.88, 1.12, Math.hypot(figX, figY));
      const haloX = (nx - 0.5) / 0.47;
      const haloY = (ny - 0.36) / 0.2;
      const haloBody = 1 - smoothstep(0.8, 1.08, Math.hypot(haloX, haloY));
      const bgMask = clamp01(1 - figure * 0.75);
      const warmHue = Math.max(
        1 - hueDistance(h, 0.04) / 0.18,
        1 - hueDistance(h, 0.13) / 0.16,
        1 - hueDistance(h, 0.9) / 0.18,
      );
      const coolHue = Math.max(1 - hueDistance(h, 0.58) / 0.18, 1 - hueDistance(h, 0.72) / 0.18);
      const xl = Math.max(0, x - 1);
      const xr = Math.min(image.width - 1, x + 1);
      const yu = Math.max(0, y - 1);
      const yd = Math.min(image.height - 1, y + 1);
      const grad = Math.hypot(lum[y * image.width + xr] - lum[y * image.width + xl], lum[yd * image.width + x] - lum[yu * image.width + x]);
      const detail = smoothstep(0.035, 0.16, grad) * (0.35 + s * 0.65);

      writePixel(background, i, image.raw, bgMask * (0.35 + s * 0.65));
      writePixel(halo, i, image.raw, haloBody * (0.35 + v * 0.65));
      writePixel(warm, i, image.raw, clamp01(warmHue) * s * (0.45 + figure * 0.55));
      writePixel(cool, i, image.raw, clamp01(coolHue) * s * (0.45 + figure * 0.55));
      writePixel(edge, i, image.raw, detail);
    }
  }

  await Promise.all([
    sharp(base, { raw: { width: image.width, height: image.height, channels: 4 } }).png().toFile(path.join(layersDir, "base.png")),
    sharp(background, { raw: { width: image.width, height: image.height, channels: 4 } }).blur(0.8).png().toFile(path.join(layersDir, "background-field.png")),
    sharp(halo, { raw: { width: image.width, height: image.height, channels: 4 } }).blur(1.4).png().toFile(path.join(layersDir, "halo-chamber.png")),
    sharp(warm, { raw: { width: image.width, height: image.height, channels: 4 } }).blur(0.5).png().toFile(path.join(layersDir, "warm-energy.png")),
    sharp(cool, { raw: { width: image.width, height: image.height, channels: 4 } }).blur(0.5).png().toFile(path.join(layersDir, "cool-energy.png")),
    sharp(edge, { raw: { width: image.width, height: image.height, channels: 4 } }).png().toFile(path.join(layersDir, "edge-prism.png")),
  ]);
}

function animation(speed: number, phase: number, variant: Variant, paletteAmount: number, rim = 0) {
  const preserveBase = paletteAmount === 0 && rim === 0;
  return {
    colorCycle: { speed, period: 20, phaseOffset: phase },
    saturationBoost: preserveBase ? 1 : 1.18, luminanceKey: preserveBase ? 0 : 0.03, satBlendLow: preserveBase ? 0 : -0.05, satBlendHigh: preserveBase ? 1 : 0.34, satInjectionMul: 0,
    glowPulseFloor: 0.55, lumExponent: 1, valueLift: 0, hueKey: preserveBase ? 0 : 0.2, hueSpeed: preserveBase ? 1 : 1.35,
    breath: { amplitude: 0.0025, frequency: 1, period: 20 },
    noiseScale: 0, noiseSpeed: 0, noiseAmount: 0, domainWarp: 0, domainWarp2: 0, tileRepeat: 0, polarTwist: 0,
    voronoiScale: 8, voronoiAmount: 0, paletteAmount, paletteValueFloor: 0.1, paletteSatFloor: 0.68,
    flowAmp: 0, flowScale: 3, paletteA: variant.paletteA, paletteB: variant.paletteB, paletteC: variant.paletteC, paletteD: variant.paletteD,
    patternType: 0, patternScale: 20, patternAmount: 0, sdfType: 0, sdfScale: 2, sdfAmount: 0, juliaAmount: 0, juliaC: [-0.7, 0.27015],
    rotateSpeed: 0, scalePulse: 0, bicubicFilter: true, worleyScale: 8, worleyAmount: 0,
    rimIntensity: rim, rimHueShift: 0.06, rimWidth: 0.004, ringIntensity: 0, ringFreq: 30, ringPeriod: 20,
    glow: { intensity: preserveBase ? 0 : 0.01 + paletteAmount * 0.025, pulse: preserveBase ? 0 : 0.1, period: 5 },
  };
}

function createScene(image: ImageData, variant: Variant) {
  const [bg, halo, warm, cool, edge] = variant.opacities;
  const [bgSpeed, haloSpeed, warmSpeed, coolSpeed, edgeSpeed] = variant.speeds;
  return sceneSchema.parse({
    version: 1,
    source: path.basename(sourcePath),
    resolution: [image.width, image.height],
    duration: 20,
    fps: 30,
    layers: [
      { id: "base-presence", file: "layers/base.png", zIndex: 0, opacity: 1, blending: "normal", role: "subject", animation: animation(variant.baseSpeed, 0, variant, variant.basePalette) },
      { id: "background-field", file: "layers/background-field.png", zIndex: 1, opacity: bg, blending: "normal", role: "background", animation: animation(bgSpeed, 36, variant, 0.34, 0.02) },
      { id: "halo-chamber", file: "layers/halo-chamber.png", zIndex: 2, opacity: halo, blending: "normal", role: "light-rays", animation: animation(haloSpeed, 104, variant, 0.36, 0.04) },
      { id: "warm-energy", file: "layers/warm-energy.png", zIndex: 3, opacity: warm, blending: "normal", role: "detail", animation: animation(warmSpeed, 188, variant, 0.48, 0.08) },
      { id: "cool-energy", file: "layers/cool-energy.png", zIndex: 4, opacity: cool, blending: "normal", role: "detail", animation: animation(coolSpeed, 272, variant, 0.48, 0.08) },
      { id: "edge-prism", file: "layers/edge-prism.png", zIndex: 5, opacity: edge, blending: "multiply", role: "foreground-occluder", animation: animation(edgeSpeed, 318, variant, 0.54, 0.12) },
    ],
    effects: {
      parallax: { scale: 0 },
      haze: { intensity: 0 },
      feather: { radius: 0 },
      trails: { strength: 0 },
      kaleidoscope: { segments: 0, blend: 0 },
      godRays: { intensity: 0, decay: 0.93, density: 0.82, weight: 0.24, threshold: 0.72, samples: 64, centerX: 0.5, centerY: 0.36 },
      aura: { intensity: variant.aura[0], radius: variant.aura[1], hueSpeed: variant.aura[2], samples: 28 },
      mandala: { opacity: 0, segments: 12, rings: 8, rotationSpeed: 0, breathSpeed: 0, hueSpeed: 0 },
      lensDistortion: { barrel: 0, chromatic: 0.06, dof: 0, vignetteRadius: 1 },
      bloom: { strength: variant.bloom[0], radius: variant.bloom[1], threshold: variant.bloom[2] },
      chromaticAberration: { offset: variant.ca[0], modulationOffset: variant.ca[1] },
      multipassFeedback: { strength: variant.feedback[0], warp: 0, decay: variant.feedback[1], hueShift: variant.feedback[2], zoom: 1, rotate: 0 },
      filmGrade: { grain: 0.012, vignetteIntensity: 0, vignetteRadius: 1.2, vignetteTintR: 0.12, vignetteTintG: 0.04, vignetteTintB: 0.18, contrast: variant.contrast[0], sCurve: variant.contrast[1] },
    },
  });
}

async function main(): Promise<void> {
  const image = await loadImage();
  for (const variant of variants) {
    const workDir = path.join(outputRoot, variant.slug, "_work");
    fs.rmSync(workDir, { recursive: true, force: true });
    const layersDir = path.join(workDir, "layers");
    await writeLayers(image, layersDir);
    const scene = createScene(image, variant);
    fs.writeFileSync(path.join(workDir, "scene.json"), `${JSON.stringify(scene, null, 2)}\n`);
    console.log(`${variant.slug}: ${variant.label}`);
  }
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error("unknown failure");
  }
  process.exit(1);
});
