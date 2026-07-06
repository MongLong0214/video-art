import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { sceneSchema } from "../src/lib/scene-schema.js";
import { variants, type LayerName, type Rgb, type Variant } from "./ganesha-dmt-v5-variants.js";

interface ImageData {
  readonly raw: Buffer;
  readonly width: number;
  readonly height: number;
}

interface PixelWrite {
  readonly buffer: Buffer;
  readonly index: number;
  readonly color: Rgb;
  readonly alpha: number;
}

const sourcePath =
  "/Users/isaac/Downloads/monglong_a_bright_psychedelic_artwork_featuring_ganesha_sitting_8b4cafbd-746f-4c4b-9438-c18a1998ed8a 2.PNG";
const outputRoot = "out/manual-runs";

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const clamp255 = (value: number): number => Math.min(255, Math.max(0, Math.round(value)));

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

function writeColorPixel({ buffer, index, color, alpha }: PixelWrite): void {
  const src = index * 4;
  buffer[src] = color[0];
  buffer[src + 1] = color[1];
  buffer[src + 2] = color[2];
  buffer[src + 3] = Math.round(clamp01(alpha) * 255);
}

function spectralColor(base: Rgb, raw: Buffer, p: number, weight: number): Rgb {
  const r = raw[p];
  const g = raw[p + 1];
  const b = raw[p + 2];
  return [
    clamp255(base[0] * (0.5 + weight) + (255 - b) * 0.26 + r * 0.18),
    clamp255(base[1] * (0.5 + weight) + (255 - r) * 0.22 + g * 0.2),
    clamp255(base[2] * (0.5 + weight) + (255 - g) * 0.24 + b * 0.18),
  ];
}

async function loadImage(): Promise<ImageData> {
  const image = sharp(sourcePath).ensureAlpha();
  const metadata = await image.metadata();
  if (metadata.width === undefined || metadata.height === undefined) {
    throw new Error("source image has no dimensions");
  }
  return { raw: await image.raw().toBuffer(), width: metadata.width, height: metadata.height };
}

async function writeLayers(image: ImageData, layersDir: string, colors: Record<LayerName, Rgb>): Promise<void> {
  fs.mkdirSync(layersDir, { recursive: true });
  const pixelCount = image.width * image.height;
  const lum = new Float32Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const p = i * 4;
    lum[i] = (0.299 * image.raw[p] + 0.587 * image.raw[p + 1] + 0.114 * image.raw[p + 2]) / 255;
  }

  const veil = Buffer.alloc(image.raw.length);
  const portal = Buffer.alloc(image.raw.length);
  const entity = Buffer.alloc(image.raw.length);
  const jewel = Buffer.alloc(image.raw.length);
  const skin = Buffer.alloc(image.raw.length);
  const linework = Buffer.alloc(image.raw.length);

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const i = y * image.width + x;
      const p = i * 4;
      const nx = x / (image.width - 1);
      const ny = y / (image.height - 1);
      const [h, s, v] = rgbToHsv(image.raw[p], image.raw[p + 1], image.raw[p + 2]);
      const figure = 1 - smoothstep(0.82, 1.08, Math.hypot((nx - 0.5) / 0.42, (ny - 0.62) / 0.45));
      const haloDist = Math.hypot((nx - 0.5) / 0.47, (ny - 0.34) / 0.2);
      const haloBody = 1 - smoothstep(0.72, 1.04, haloDist);
      const haloShell = smoothstep(0.45, 0.72, haloDist) * (1 - smoothstep(0.86, 1.08, haloDist));
      const warmHue = Math.max(1 - hueDistance(h, 0.04) / 0.16, 1 - hueDistance(h, 0.9) / 0.16);
      const coolHue = Math.max(1 - hueDistance(h, 0.56) / 0.18, 1 - hueDistance(h, 0.68) / 0.16);
      const xl = Math.max(0, x - 1);
      const xr = Math.min(image.width - 1, x + 1);
      const yu = Math.max(0, y - 1);
      const yd = Math.min(image.height - 1, y + 1);
      const grad = Math.hypot(lum[y * image.width + xr] - lum[y * image.width + xl], lum[yd * image.width + x] - lum[yu * image.width + x]);
      const detail = smoothstep(0.025, 0.13, grad) * (0.25 + s * 0.75);
      const bg = clamp01(1 - figure * 0.82);
      const faceLight = figure * smoothstep(0.36, 0.82, v) * (0.18 + detail * 0.42);
      const ornament = detail * Math.max(bg * 0.65, warmHue * 0.55, haloShell * 0.7);

      writeColorPixel({ buffer: veil, index: i, color: spectralColor(colors.veil, image.raw, p, 0.16), alpha: bg * (0.16 + s * 0.42) });
      writeColorPixel({ buffer: portal, index: i, color: spectralColor(colors.portal, image.raw, p, 0.2), alpha: (haloBody * 0.06 + haloShell * 0.68) * (0.3 + v * 0.7) });
      writeColorPixel({ buffer: entity, index: i, color: spectralColor(colors.entity, image.raw, p, 0.18), alpha: faceLight });
      writeColorPixel({ buffer: jewel, index: i, color: spectralColor(colors.jewel, image.raw, p, 0.22), alpha: clamp01(warmHue) * s * (0.35 + figure * 0.65) });
      writeColorPixel({ buffer: skin, index: i, color: spectralColor(colors.skin, image.raw, p, 0.2), alpha: clamp01(coolHue) * s * (0.35 + figure * 0.65) });
      writeColorPixel({ buffer: linework, index: i, color: spectralColor(colors.linework, image.raw, p, 0.24), alpha: ornament });
    }
  }

  const raw = { width: image.width, height: image.height, channels: 4 as const };
  await Promise.all([
    sharp(image.raw, { raw }).png().toFile(path.join(layersDir, "base.png")),
    sharp(veil, { raw }).blur(1.6).png().toFile(path.join(layersDir, "veil-field.png")),
    sharp(portal, { raw }).blur(1.0).png().toFile(path.join(layersDir, "portal-depth.png")),
    sharp(entity, { raw }).blur(0.45).png().toFile(path.join(layersDir, "entity-light.png")),
    sharp(jewel, { raw }).blur(0.35).png().toFile(path.join(layersDir, "jewel-current.png")),
    sharp(skin, { raw }).blur(0.35).png().toFile(path.join(layersDir, "skin-current.png")),
    sharp(linework, { raw }).png().toFile(path.join(layersDir, "optic-linework.png")),
  ]);
}

function animation(speed: number, phase: number, luminous: boolean) {
  return {
    colorCycle: { speed, period: 20, phaseOffset: phase },
    saturationBoost: luminous ? 1.48 : 1,
    luminanceKey: luminous ? 0.05 : 0,
    satBlendLow: luminous ? -0.05 : 0,
    satBlendHigh: luminous ? 0.3 : 1,
    satInjectionMul: 0,
    glowPulseFloor: 0.62,
    lumExponent: 1,
    valueLift: 0,
    hueKey: luminous ? 0.26 : 0,
    hueSpeed: 1.35,
    breath: { amplitude: luminous ? 0.0045 : 0, frequency: 1, period: 20 },
    noiseScale: 0,
    noiseSpeed: 0,
    noiseAmount: 0,
    domainWarp: 0,
    domainWarp2: 0,
    tileRepeat: 0,
    polarTwist: 0,
    voronoiScale: 8,
    voronoiAmount: 0,
    paletteAmount: 0,
    paletteValueFloor: 0,
    paletteSatFloor: 0,
    flowAmp: 0,
    flowScale: 3,
    paletteA: [0.5, 0.5, 0.5],
    paletteB: [0.5, 0.5, 0.5],
    paletteC: [1, 1, 1],
    paletteD: [0, 0.33, 0.67],
    patternType: 0,
    patternScale: 20,
    patternAmount: 0,
    sdfType: 0,
    sdfScale: 2,
    sdfAmount: 0,
    juliaAmount: 0,
    juliaC: [-0.7, 0.27015],
    rotateSpeed: 0,
    scalePulse: 0,
    bicubicFilter: true,
    worleyScale: 8,
    worleyAmount: 0,
    rimIntensity: luminous ? 0.1 : 0,
    rimHueShift: 0.05,
    rimWidth: 0.004,
    ringIntensity: 0,
    ringFreq: 30,
    ringPeriod: 20,
    glow: { intensity: luminous ? 0.04 : 0, pulse: luminous ? 0.18 : 0, period: 5 },
  };
}

function createScene(image: ImageData, variant: Variant) {
  const [veil, portal, entity, jewel, skin, linework] = variant.opacities;
  const [veilSpeed, portalSpeed, entitySpeed, jewelSpeed, skinSpeed, lineSpeed] = variant.speeds;
  const [feedbackStrength, feedbackDecay, feedbackHueShift, feedbackZoom] = variant.feedback;
  return sceneSchema.parse({
    version: 1,
    source: path.basename(sourcePath),
    resolution: [image.width, image.height],
    duration: 20,
    fps: 30,
    layers: [
      { id: "base-presence", file: "layers/base.png", zIndex: 0, opacity: 1, blending: "normal", role: "subject", animation: animation(0, 0, false) },
      { id: "veil-field", file: "layers/veil-field.png", zIndex: 1, opacity: veil, blending: "normal", role: "background", animation: animation(veilSpeed, 24, true) },
      { id: "portal-depth", file: "layers/portal-depth.png", zIndex: 2, opacity: portal, blending: "normal", role: "light-rays", animation: animation(portalSpeed, 82, true) },
      { id: "entity-light", file: "layers/entity-light.png", zIndex: 3, opacity: entity, blending: "normal", role: "subject", animation: animation(entitySpeed, 136, true) },
      { id: "jewel-current", file: "layers/jewel-current.png", zIndex: 4, opacity: jewel, blending: "normal", role: "detail", animation: animation(jewelSpeed, 198, true) },
      { id: "skin-current", file: "layers/skin-current.png", zIndex: 5, opacity: skin, blending: "normal", role: "detail", animation: animation(skinSpeed, 268, true) },
      { id: "optic-linework", file: "layers/optic-linework.png", zIndex: 6, opacity: linework, blending: "add", role: "foreground-occluder", animation: animation(lineSpeed, 322, true) },
    ],
    effects: {
      parallax: { scale: 0 },
      haze: { intensity: 0 },
      feather: { radius: 0 },
      trails: { strength: variant.trail },
      kaleidoscope: { segments: 0, blend: 0 },
      godRays: { intensity: 0, decay: 0.93, density: 0.78, weight: 0.18, threshold: 0.82, samples: 64, centerX: 0.5, centerY: 0.36 },
      aura: { intensity: variant.aura[0], radius: variant.aura[1], hueSpeed: variant.aura[2], samples: 28 },
      mandala: { opacity: 0, segments: 12, rings: 8, rotationSpeed: 0, breathSpeed: 0, hueSpeed: 0 },
      lensDistortion: { barrel: 0, chromatic: 0.055, dof: 0, vignetteRadius: 1 },
      bloom: { strength: variant.bloom[0], radius: variant.bloom[1], threshold: variant.bloom[2] },
      chromaticAberration: { offset: variant.ca[0], modulationOffset: variant.ca[1] },
      multipassFeedback: { strength: feedbackStrength, warp: 0, decay: feedbackDecay, hueShift: feedbackHueShift, zoom: feedbackZoom, rotate: 0 },
      filmGrade: { grain: 0.006, vignetteIntensity: 0, vignetteRadius: 1.2, vignetteTintR: 0.1, vignetteTintG: 0.04, vignetteTintB: 0.16, contrast: variant.contrast[0], sCurve: variant.contrast[1] },
    },
  });
}

async function main(): Promise<void> {
  const image = await loadImage();
  for (const variant of variants) {
    const workDir = path.join(outputRoot, variant.slug, "_work");
    fs.rmSync(workDir, { recursive: true, force: true });
    const layersDir = path.join(workDir, "layers");
    await writeLayers(image, layersDir, variant.colors);
    fs.writeFileSync(path.join(workDir, "scene.json"), `${JSON.stringify(createScene(image, variant), null, 2)}\n`);
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
