import fs from "node:fs";
import path from "node:path";
import { sceneSchema } from "../src/lib/scene-schema.js";
import { loadImage, outputRoot, sourcePath, writeLayers, type ImageData } from "./ganesha-dmt-v6-layers.js";
import { variants, type LayerName, type Variant } from "./ganesha-dmt-v6-variants.js";

const layerFiles: Record<LayerName, string> = {
  void: "layers/void-field.png",
  aura: "layers/aura-shell.png",
  halo: "layers/halo-threshold.png",
  body: "layers/body-spectrum.png",
  gold: "layers/gold-nerve.png",
  cyan: "layers/cyan-prism.png",
  magenta: "layers/magenta-prism.png",
  white: "layers/white-glyph.png",
  shadow: "layers/shadow-charge.png",
};

const layerPhases: Record<LayerName, number> = {
  void: 18,
  aura: 64,
  halo: 109,
  body: 151,
  gold: 207,
  cyan: 248,
  magenta: 291,
  white: 329,
  shadow: 346,
};

type Blend = "normal" | "add" | "screen";

function animation(speed: number, phase: number, luminous: number) {
  return {
    colorCycle: { speed, period: 20, phaseOffset: phase },
    saturationBoost: 1 + luminous * 0.36,
    luminanceKey: luminous * 0.055,
    satBlendLow: -0.05,
    satBlendHigh: 0.34,
    satInjectionMul: 0,
    glowPulseFloor: 0.58,
    lumExponent: 1,
    valueLift: 0,
    hueKey: luminous * 0.12,
    hueSpeed: 1.45,
    breath: { amplitude: luminous * 0.0035, frequency: 1, period: 20 },
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
    rimIntensity: luminous * 0.08,
    rimHueShift: 0.04,
    rimWidth: 0.004,
    ringIntensity: 0,
    ringFreq: 30,
    ringPeriod: 20,
    glow: { intensity: luminous * 0.035, pulse: luminous * 0.18, period: 5 },
  };
}

function sceneLayer(name: LayerName, zIndex: number, blending: Blend, variant: Variant) {
  return {
    id: name,
    file: layerFiles[name],
    zIndex,
    opacity: variant.opacities[name],
    blending,
    role: name === "halo" || name === "aura" ? "light-rays" : name === "void" || name === "shadow" ? "background" : "detail",
    animation: animation(variant.speeds[name], layerPhases[name], name === "void" || name === "shadow" ? 0.72 : 1),
  };
}

function createScene(image: ImageData, variant: Variant) {
  const [feedbackStrength, feedbackDecay, feedbackHueShift, feedbackZoom] = variant.feedback;
  return sceneSchema.parse({
    version: 1,
    source: path.basename(sourcePath),
    resolution: [image.width, image.height],
    duration: 20,
    fps: 30,
    layers: [
      { id: "base-presence", file: "layers/base-presence.png", zIndex: 0, opacity: 1, blending: "normal", role: "subject", animation: animation(0, 0, 0) },
      sceneLayer("void", 1, "normal", variant),
      sceneLayer("shadow", 2, "screen", variant),
      sceneLayer("aura", 3, "screen", variant),
      sceneLayer("halo", 4, "screen", variant),
      sceneLayer("body", 5, "screen", variant),
      sceneLayer("gold", 6, "add", variant),
      sceneLayer("cyan", 7, "add", variant),
      sceneLayer("magenta", 8, "add", variant),
      sceneLayer("white", 9, "add", variant),
    ],
    effects: {
      parallax: { scale: 0 },
      haze: { intensity: 0 },
      feather: { radius: 0 },
      trails: { strength: variant.trail },
      kaleidoscope: { segments: 0, blend: 0 },
      godRays: { intensity: 0, decay: 0.93, density: 0.78, weight: 0.18, threshold: 0.82, samples: 64, centerX: 0.5, centerY: 0.36 },
      aura: { intensity: variant.auraFx[0], radius: variant.auraFx[1], hueSpeed: variant.auraFx[2], samples: 28 },
      mandala: { opacity: 0, segments: 12, rings: 8, rotationSpeed: 0, breathSpeed: 0, hueSpeed: 0 },
      lensDistortion: { barrel: 0, chromatic: 0.08, dof: 0, vignetteRadius: 1 },
      bloom: { strength: variant.bloom[0], radius: variant.bloom[1], threshold: variant.bloom[2] },
      chromaticAberration: { offset: variant.ca[0], modulationOffset: variant.ca[1] },
      multipassFeedback: { strength: feedbackStrength, warp: 0, decay: feedbackDecay, hueShift: feedbackHueShift, zoom: feedbackZoom, rotate: 0 },
      filmGrade: { grain: 0.004, vignetteIntensity: 0, vignetteRadius: 1.2, vignetteTintR: 0.08, vignetteTintG: 0.04, vignetteTintB: 0.16, contrast: variant.grade[0], sCurve: variant.grade[1] },
    },
  });
}

async function main(): Promise<void> {
  const image = await loadImage();
  for (const variant of variants) {
    const workDir = path.join(outputRoot, variant.slug, "_work");
    fs.rmSync(workDir, { recursive: true, force: true });
    await writeLayers(image, path.join(workDir, "layers"), variant);
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
