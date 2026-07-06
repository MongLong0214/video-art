import fs from "node:fs";
import path from "node:path";
import { sceneSchema } from "../src/lib/scene-schema.js";
import {
  blendFor,
  opacityFor,
  paletteFor,
  paletteSatFloorFor,
  paletteValueFloorFor,
  saturationFor,
  valueLiftFor,
  type Blend,
} from "./ganesha-dmt-v8-scene-style.js";
import {
  layerFiles,
  loadImage,
  outputRoot,
  sourcePath,
  writeLayers,
  type ActiveLayerName,
  type ImageData,
} from "./ganesha-dmt-v8-layers.js";
import { buildPhaseFields, phaseFiles, writePhaseFields } from "./ganesha-dmt-v8-phase.js";
import { variants, type Motion, type Variant } from "./ganesha-dmt-v8-variants.js";

const layerPhases: Record<ActiveLayerName, number> = {
  void: 11,
  aura: 53,
  body: 97,
  gold: 149,
  cyan: 211,
  magenta: 277,
  white: 331,
  shadow: 29,
};

const layerOrder: readonly ActiveLayerName[] = ["void", "aura", "body", "gold", "cyan", "magenta", "white"];

interface AnimationInput {
  readonly motion: Motion;
  readonly phase: number;
  readonly variant: Variant;
  readonly layer: ActiveLayerName | "base";
  readonly phaseField?: string;
  readonly phaseAmount?: number;
}

interface PhaseSpec {
  readonly field: string;
  readonly amount: number;
}

function animation({ motion, phase, variant, layer, phaseField, phaseAmount }: AnimationInput) {
  const palette = paletteFor(layer, variant);
  return {
    colorCycle: { speed: motion.speed, period: 20, phaseOffset: phase },
    phaseField,
    phaseAmount: phaseAmount ?? 0,
    saturationBoost: saturationFor(layer, motion),
    luminanceKey: 0.025,
    satBlendLow: -0.02,
    satBlendHigh: 0.3,
    satInjectionMul: 0,
    glowPulseFloor: 0.44,
    lumExponent: 1,
    valueLift: valueLiftFor(layer),
    hueKey: motion.hueKey,
    hueSpeed: 1.55,
    breath: { amplitude: 0, frequency: 1, period: 20 },
    noiseScale: 0,
    noiseSpeed: 0,
    noiseAmount: 0,
    domainWarp: 0,
    domainWarp2: 0,
    tileRepeat: 0,
    polarTwist: 0,
    voronoiScale: 8,
    voronoiAmount: 0,
    paletteAmount: motion.palette,
    paletteValueFloor: paletteValueFloorFor(layer),
    paletteSatFloor: paletteSatFloorFor(layer),
    flowAmp: 0,
    flowScale: 3,
    paletteA: palette.a,
    paletteB: palette.b,
    paletteC: palette.c,
    paletteD: palette.d,
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
    rimIntensity: motion.pressure * 0.08,
    rimHueShift: 0.075,
    rimWidth: 0.0028,
    ringIntensity: 0,
    ringFreq: 30,
    ringPeriod: 20,
    glow: { intensity: 0, pulse: 0, period: 4 },
  };
}

function baseAnimation(variant: Variant) {
  return {
    ...animation({
      motion: { speed: 2, opacity: 1, pressure: 0.82, hueKey: 0.18, palette: 0.52 },
      phase: 0,
      variant,
      layer: "base",
      phaseField: phaseFiles.luminance,
      phaseAmount: 0.24,
    }),
    luminanceKey: 0,
    saturationBoost: 1.06,
    satBlendLow: 0,
    satBlendHigh: 1,
    glow: { intensity: 0, pulse: 0, period: 4 },
    rimIntensity: 0,
  };
}

function phaseFor(name: ActiveLayerName): PhaseSpec | undefined {
  if (name === "void") return { field: phaseFiles.vertical, amount: 0.32 };
  if (name === "aura") return { field: phaseFiles.vertical, amount: 0.44 };
  if (name === "body") return { field: phaseFiles.luminance, amount: 0.56 };
  if (name === "gold") return { field: phaseFiles.edge, amount: 0.58 };
  if (name === "cyan") return { field: phaseFiles.edge, amount: 0.66 };
  if (name === "magenta") return { field: phaseFiles.edge, amount: 0.62 };
  if (name === "white") return { field: phaseFiles.luminance, amount: 0.42 };
  return undefined;
}

function sceneLayer(name: ActiveLayerName, zIndex: number, variant: Variant) {
  const motion = variant.motions[name];
  const phase = phaseFor(name);
  return {
    id: name,
    file: layerFiles[name],
    zIndex,
    opacity: opacityFor(name, motion),
    blending: blendFor(name),
    role: name === "void" || name === "shadow" ? "background" : "detail",
    animation: animation({
      motion,
      phase: layerPhases[name],
      variant,
      layer: name,
      phaseField: phase?.field,
      phaseAmount: phase?.amount,
    }),
  };
}

function createScene(image: ImageData, variant: Variant) {
  const [, feedbackDecay, feedbackHueShift] = variant.feedback;
  return sceneSchema.parse({
    version: 1,
    source: path.basename(sourcePath),
    resolution: [image.width, image.height],
    duration: 20,
    fps: 30,
    layers: [
      {
        id: "base-presence",
        file: "layers/base-presence.png",
        zIndex: 0,
        opacity: 1,
        blending: "normal",
        role: "subject",
        animation: baseAnimation(variant),
      },
      ...layerOrder.map((name, index) => sceneLayer(name, index + 1, variant)),
    ],
    effects: {
      parallax: { scale: 0 },
      haze: { intensity: 0 },
      feather: { radius: 0 },
      trails: { strength: 0 },
      kaleidoscope: { segments: 0, blend: 0 },
      godRays: { intensity: 0, decay: 0.93, density: 0.78, weight: 0.18, threshold: 0.82, samples: 64, centerX: 0.5, centerY: 0.36 },
      aura: { intensity: 0, radius: variant.auraFx[1], hueSpeed: variant.auraFx[2], samples: 28 },
      mandala: { opacity: 0, segments: 12, rings: 8, rotationSpeed: 0, breathSpeed: 0, hueSpeed: 0 },
      lensDistortion: { barrel: 0, chromatic: variant.lens[1], dof: variant.lens[2], vignetteRadius: 1 },
      bloom: { strength: variant.bloom[0] * 0.72, radius: variant.bloom[1] * 0.78, threshold: Math.max(variant.bloom[2], 0.76) },
      chromaticAberration: { offset: variant.ca[0] * 0.82, modulationOffset: variant.ca[1] * 0.75 },
      multipassFeedback: { strength: 0, warp: 0, decay: feedbackDecay, hueShift: feedbackHueShift, zoom: 1, rotate: 0 },
      filmGrade: {
        grain: 0,
        vignetteIntensity: 0,
        vignetteRadius: 1.2,
        vignetteTintR: 0.08,
        vignetteTintG: 0.04,
        vignetteTintB: 0.16,
        contrast: Math.min(1.08, variant.grade[0]),
        sCurve: Math.min(0.08, variant.grade[1]),
      },
    },
  });
}

async function main(): Promise<void> {
  const image = await loadImage();
  const phaseFields = await buildPhaseFields(image);
  for (const variant of variants) {
    const workDir = path.join(outputRoot, variant.slug, "_work");
    const layersDir = path.join(workDir, "layers");
    fs.rmSync(workDir, { recursive: true, force: true });
    await writeLayers(image, layersDir, variant);
    await writePhaseFields(phaseFields, layersDir);
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
