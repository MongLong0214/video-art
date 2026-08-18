import * as THREE from "three";
import type { Sketch } from "./psychedelic";
import type { LayerConfig, SceneConfig } from "@/lib/scene-schema";
import { loadScene } from "@/lib/scene-loader";
import vertexShader from "@/shaders/layer.vert";
import fragmentShader from "@/shaders/layer.frag";

interface LayerMesh {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  config: LayerConfig;
  phaseTexture: THREE.Texture;
  phaseTexture2: THREE.Texture;
  depthTexture: THREE.Texture;
  flowTexture: THREE.Texture;
  streamTexture: THREE.Texture;
  regionTexture: THREE.Texture;
}

export type LayeredSketch = Sketch & { sceneConfig: SceneConfig };

type GreenBand = { readonly lo: number; readonly hi: number };

const TAU = Math.PI * 2;
const GLOW_WAVE_MEAN_SAMPLES = 64;

// Derived by sweeping HSV h=70..165,s=1,v=1 through the shader's
// linearSrgbToOklab matrix path; pure green maps to 142.4953388878deg.
const GREEN_BANDS_BY_HUE_SPACE = {
  hsv: { lo: 70 / 360, hi: 165 / 360 },
  oklch: { lo: 0.27769994490592986, hi: 0.49983187802797546 },
} satisfies Record<LayerConfig["animation"]["hueSpace"], GreenBand>;

export async function createLayeredPsychedelic(
  sceneUrl = "/scene.json",
): Promise<LayeredSketch> {
  const config = await loadScene(sceneUrl);
  const loopDuration = config.duration;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 100);
  camera.position.z = 10;

  const textureLoader = new THREE.TextureLoader();
  const layerMeshes: LayerMesh[] = [];

  const textures = await Promise.all(
    config.layers.map((l) => loadTexture(textureLoader, `/${l.file}`)),
  );
  const phaseTextures = await Promise.all(
    config.layers.map((l) => loadPhaseTexture(textureLoader, l.animation.phaseField)),
  );
  const phaseTextures2 = await Promise.all(
    config.layers.map((l) => loadPhaseTexture(textureLoader, l.animation.phaseField2)),
  );
  const depthTextures = await Promise.all(
    config.layers.map((l) => loadFieldTexture(textureLoader, l.animation.depthField, [128, 128, 128, 255])),
  );
  const flowTextures = await Promise.all(
    config.layers.map((l) => loadFieldTexture(textureLoader, l.animation.flowField, [128, 128, 0, 255])),
  );
  const streamTextures = await Promise.all(
    config.layers.map((l) => loadFieldTexture(textureLoader, l.animation.streamField, [128, 128, 0, 255])),
  );
  const regionTextures = await Promise.all(
    config.layers.map((l) => loadFieldTexture(textureLoader, l.animation.regionField, [0, 0, 0, 255])),
  );

  for (let idx = 0; idx < config.layers.length; idx++) {
    const layerConfig = config.layers[idx];
    const texture = textures[idx];
    const phaseTexture = phaseTextures[idx];
    const phaseTexture2 = phaseTextures2[idx];
    const depthTexture = depthTextures[idx];
    const flowTexture = flowTextures[idx];
    const streamTexture = streamTextures[idx];
    const regionTexture = regionTextures[idx];
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const anim = layerConfig.animation;
    const greenBand = GREEN_BANDS_BY_HUE_SPACE[anim.hueSpace];
    const blending = layerConfig.blending ?? "normal";

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTexture: { value: texture },
        uTime: { value: 0 },
        uLoopDuration: { value: loopDuration },
        uOpacity: { value: layerConfig.opacity },
        uPremultiplyAlpha: { value: blending === "screen" ? 1 : 0 },
        uColorCycleSpeed: { value: anim.colorCycle?.speed ?? 0 },
        uColorCyclePeriod: { value: anim.colorCycle?.period ?? 10 },
        uPhaseOffset: { value: anim.colorCycle?.phaseOffset ?? 0 },
        uColorCycleDesyncAmount: { value: anim.colorCycleDesync.amount },
        uColorCycleDesyncCycles: { value: anim.colorCycleDesync.cycles },
        uPhaseTex: { value: phaseTexture },
        uPhaseTex2: { value: phaseTexture2 },
        uDepthTex: { value: depthTexture },
        uFlowFieldTex: { value: flowTexture },
        uSourceDetailResidualStreamTex: { value: streamTexture },
        uSourceRegionAffinityTex: { value: regionTexture },
        uPhaseAmount: { value: anim.phaseAmount ?? 0 },
        uPhaseWarpAmount: { value: anim.phaseWarpAmount ?? 0 },
        uGlowWavePhaseSource: { value: anim.glowWavePhaseSource === "flowField" ? 1 : 0 },
        uCamDriftRadius: { value: config.effects.cameraDrift.radius },
        uCamDriftCycles: { value: config.effects.cameraDrift.cycles },
        uCamDriftPivot: { value: config.effects.cameraDrift.pivot },
        uStructFlowStrength: { value: anim.structureFlow.strength },
        uStructFlowCycles: { value: anim.structureFlow.cycles },
        uTangentMicroflowAmount: { value: anim.tangentMicroflow.amount },
        uTangentMicroflowMaxDisplacementPx: { value: anim.tangentMicroflow.maxDisplacementPx },
        uTangentMicroflowCycles: { value: anim.tangentMicroflow.cycles },
        uTangentMicroflowPhaseScale: { value: anim.tangentMicroflow.phaseScale },
        uSourceFlowAdvectionAmount: { value: anim.sourceFlowAdvection.amount },
        uSourceFlowAdvectionMaxDisplacementPx: { value: anim.sourceFlowAdvection.maxDisplacementPx },
        uSourceFlowAdvectionCycles: { value: anim.sourceFlowAdvection.cycles },
        uSourceFlowAdvectionPhaseScale: { value: anim.sourceFlowAdvection.phaseScale },
        uSourceFlowAdvectionNormalMix: { value: anim.sourceFlowAdvection.normalMix },
        uSourceFlowAdvectionEdgePreserve: { value: anim.sourceFlowAdvection.edgePreserve },
        uSourceFlowAdvectionDetailGain: { value: anim.sourceFlowAdvection.detailGain },
        uSourceFlowAdvectionForwardBias: { value: anim.sourceFlowAdvection.forwardBias },
        uSourceFlowAdvectionFieldAlign: { value: anim.sourceFlowAdvection.fieldAlign },
        uSourceFlowTransportAmount: { value: anim.flowField === undefined ? 0 : anim.sourceFlowTransport.amount },
        uSourceFlowTransportMacroDisplacementPx: { value: anim.sourceFlowTransport.macroDisplacementPx },
        uSourceFlowTransportMacroCycles: { value: anim.sourceFlowTransport.macroCycles },
        uSourceFlowTransportMicroDisplacementPx: { value: anim.sourceFlowTransport.microDisplacementPx },
        uSourceFlowTransportMicroCycles: { value: anim.sourceFlowTransport.microCycles },
        uSourceFlowTransportPhaseScale: { value: anim.sourceFlowTransport.phaseScale },
        uSourceFlowTransportNormalMix: { value: anim.sourceFlowTransport.normalMix },
        uSourceFlowTransportEdgePreserve: { value: anim.sourceFlowTransport.edgePreserve },
        uSourceFlowTransportColorAmount: { value: anim.sourceFlowTransport.colorAmount },
        uSourceFlowTransportForwardBias: { value: anim.sourceFlowTransport.forwardBias },
        uSourceStreamFlowAmount: { value: anim.flowField === undefined ? 0 : anim.sourceStreamFlow.amount },
        uSourceStreamFlowMaxDisplacementPx: { value: anim.sourceStreamFlow.maxDisplacementPx },
        uSourceStreamFlowCycles: { value: anim.sourceStreamFlow.cycles },
        uSourceStreamFlowWavelengthPx: { value: anim.sourceStreamFlow.wavelengthPx },
        uSourceStreamFlowEdgePreserve: { value: anim.sourceStreamFlow.edgePreserve },
        uSourceStreamFlowNormalMix: { value: anim.sourceStreamFlow.normalMix },
        uSourceStreamFlowMaterialMaskMix: { value: anim.sourceStreamFlow.materialMaskMix },
        uSourceStreamFlowStreamTex: { value: streamTexture },
        uSourceStreamFlowStreamPhase: { value: anim.sourceStreamFlow.streamPhase && anim.streamField !== undefined ? 1 : 0 },
        uSourceMaterialDissolveAmount: { value: anim.flowField === undefined ? 0 : anim.sourceMaterialDissolve.amount },
        uSourceMaterialDissolveMaxDisplacementPx: { value: anim.sourceMaterialDissolve.maxDisplacementPx },
        uSourceMaterialDissolveCycles: { value: anim.sourceMaterialDissolve.cycles },
        uSourceMaterialDissolveWavelengthPx: { value: anim.sourceMaterialDissolve.wavelengthPx },
        uSourceMaterialDissolveEdgePreserve: { value: anim.sourceMaterialDissolve.edgePreserve },
        uSourceMaterialDissolveStreamTex: { value: streamTexture },
        uSourceMaterialDissolveStreamPhase: { value: anim.sourceMaterialDissolve.streamPhase && anim.streamField !== undefined ? 1 : 0 },
        uSourceDetailResidualFlowAmount: { value: anim.flowField === undefined ? 0 : anim.sourceDetailResidualFlow.amount },
        uSourceDetailResidualFlowMaxDisplacementPx: { value: anim.sourceDetailResidualFlow.maxDisplacementPx },
        uSourceDetailResidualFlowCycles: { value: anim.sourceDetailResidualFlow.cycles },
        uSourceDetailResidualFlowBandLimitPx: { value: anim.sourceDetailResidualFlow.bandLimitPx },
        uSourceDetailResidualFlowEdgePreserve: { value: anim.sourceDetailResidualFlow.edgePreserve },
        uSourceDetailResidualFlowChromaOnly: { value: anim.sourceDetailResidualFlow.chromaOnly ? 1 : 0 },
        uSourceDetailResidualFlowStreamPhase: { value: anim.sourceDetailResidualFlow.streamPhase && anim.streamField !== undefined ? 1 : 0 },
        uSourceRegionAffinityAmount: { value: anim.flowField === undefined || anim.regionField === undefined ? 0 : anim.sourceRegionAffinity.amount },
        uSourceRegionAffinityMaxDisplacementPx: { value: anim.sourceRegionAffinity.maxDisplacementPx },
        uSourceRegionAffinityCycles: { value: anim.sourceRegionAffinity.cycles },
        uSourceRegionAffinityEdgePreserve: { value: anim.sourceRegionAffinity.edgePreserve },
        uSourceRegionAffinityNormalMix: { value: anim.sourceRegionAffinity.normalMix },
        uSourceRegionAffinityStreamTex: { value: streamTexture },
        uSourceRegionAffinityStreamPhase: { value: anim.sourceRegionAffinity.streamPhase && anim.streamField !== undefined ? 1 : 0 },
        uSourceChromaFlowAmount: { value: anim.sourceChromaFlow.amount },
        uSourceChromaFlowMaxDisplacementPx: { value: anim.sourceChromaFlow.maxDisplacementPx },
        uSourceChromaFlowCycles: { value: anim.sourceChromaFlow.cycles },
        uSourceChromaFlowPhaseScale: { value: anim.sourceChromaFlow.phaseScale },
        uSourceChromaFlowNormalMix: { value: anim.sourceChromaFlow.normalMix },
        uSourceChromaFlowDetailGain: { value: anim.sourceChromaFlow.detailGain },
        uSourceSpectralFlowAmount: { value: anim.sourceSpectralFlow.amount },
        uSourceSpectralFlowRadiusPx: { value: anim.sourceSpectralFlow.radiusPx },
        uSourceSpectralFlowCycles: { value: anim.sourceSpectralFlow.cycles },
        uSourceSpectralFlowPhaseScale: { value: anim.sourceSpectralFlow.phaseScale },
        uSourceSpectralFlowNormalMix: { value: anim.sourceSpectralFlow.normalMix },
        uGlowIntensity: { value: anim.glow?.intensity ?? 0 },
        uGlowPulse: { value: anim.glow?.pulse ?? 0 },
        uGlowPeriod: { value: anim.glow?.period ?? loopDuration },
        uGlowWaveStrength: { value: anim.glowWave.strength },
        uGlowWaveSpeed: { value: anim.glowWave.speed },
        uGlowWaveSharpness: { value: anim.glowWave.sharpness },
        uGlowWaveFieldCycles: { value: anim.glowWave.fieldCycles },
        uGlowWaveMean: { value: glowWaveMean(anim.glowWave.sharpness) },
        uGlowWave2Strength: { value: anim.glowWave2.strength },
        uGlowWave2Speed: { value: anim.glowWave2.speed },
        uGlowWave2Sharpness: { value: anim.glowWave2.sharpness },
        uGlowWave2FieldCycles: { value: anim.glowWave2.fieldCycles },
        uGlowWave2Mean: { value: glowWaveMean(anim.glowWave2.sharpness) },
        uSaturationBoost: { value: anim.saturationBoost ?? 2.5 },
        uLuminanceKey: { value: anim.luminanceKey ?? 0.6 },
        uSatBlendLow: { value: anim.satBlendLow ?? 0.1 },
        uSatBlendHigh: { value: anim.satBlendHigh ?? 0.4 },
        uSatInjectionMul: { value: anim.satInjectionMul ?? 0.35 },
        uGlowPulseFloor: { value: anim.glowPulseFloor ?? 0.0 },
        uLumExponent: { value: anim.lumExponent ?? 1.0 },
        uValueLift: { value: anim.valueLift ?? 0 },
        uGreenCompress: { value: anim.greenCompress ?? 0 },
        uGreenBandLo: { value: greenBand.lo },
        uGreenBandHi: { value: greenBand.hi },
        uHueSpaceMode: { value: anim.hueSpace === "oklch" ? 1 : 0 },
        uDepthNorm: { value: (layerConfig.meanDepth ?? 128) / 255 },
        uParallaxScale: { value: config.effects?.parallax?.scale ?? 0 },
        uHazeIntensity: { value: config.effects?.haze?.intensity ?? 0 },
        uFeatherRadius: { value: config.effects?.feather?.radius ?? 0 },
        uHueKey: { value: anim.hueKey ?? 0 },
        uHueSpeed: { value: anim.hueSpeed ?? 1 },
        uBreathAmp: { value: anim.breath?.amplitude ?? 0 },
        uBreathFreq: { value: anim.breath?.frequency ?? 3 },
        uBreathPeriod: { value: anim.breath?.period ?? 10 },
        uNoiseScale: { value: anim.noiseScale ?? 0 },
        uNoiseSpeed: { value: anim.noiseSpeed ?? 1 },
        uNoiseAmount: { value: anim.noiseAmount ?? 0 },
        uDomainWarp: { value: anim.domainWarp ?? 0 },
        uDomainWarp2: { value: anim.domainWarp2 ?? 0 },
        uTileRepeat: { value: anim.tileRepeat ?? 0 },
        uPolarTwist: { value: anim.polarTwist ?? 0 },
        uVoronoiScale: { value: anim.voronoiScale ?? 8 },
        uVoronoiAmount: { value: anim.voronoiAmount ?? 0 },
        uPaletteAmount: { value: anim.paletteAmount ?? 0 },
        uPaletteValueFloor: { value: anim.paletteValueFloor ?? 0 },
        uPaletteSatFloor: { value: anim.paletteSatFloor ?? 0 },
        uFlowAmp: { value: anim.flowAmp ?? 0 },
        uFlowScale: { value: anim.flowScale ?? 3 },
        uAdaptiveFlowStrength: { value: anim.adaptiveFlow.strength },
        uAdaptiveFlowScale: { value: anim.adaptiveFlow.scale },
        uAdaptiveFlowCycles: { value: anim.adaptiveFlow.cycles },
        uAdaptiveFlowLumWeight: { value: anim.adaptiveFlow.luminanceWeight },
        uAdaptiveFlowSatWeight: { value: anim.adaptiveFlow.saturationWeight },
        uAdaptiveFlowEdgeWeight: { value: anim.adaptiveFlow.edgeWeight },
        uAdaptiveFlowMaxDisplacementPx: { value: anim.adaptiveFlow.maxDisplacementPx },
        uAdaptiveFlowEdgePreserve: { value: anim.adaptiveFlow.edgePreserve },
        uColorMotionFloor: { value: anim.colorMotionMask.floor },
        uColorMotionLumWeight: { value: anim.colorMotionMask.luminanceWeight },
        uColorMotionSatWeight: { value: anim.colorMotionMask.saturationWeight },
        uColorMotionEdgeWeight: { value: anim.colorMotionMask.edgeWeight },
        uColorMotionPower: { value: anim.colorMotionMask.power },
        uChromaOrbitRadius: { value: anim.chromaOrbit.radius },
        uChromaOrbitSpeed: { value: anim.chromaOrbit.speed },
        uChromaOrbitPhaseScale: { value: anim.chromaOrbit.phaseScale },
        uSourcePrismAmount: { value: anim.sourcePrism.amount },
        uSourcePrismRadiusPx: { value: anim.sourcePrism.radiusPx },
        uSourcePrismDirectionCycles: { value: anim.sourcePrism.directionCycles },
        uSourcePrismChromaCycles: { value: anim.sourcePrism.chromaCycles },
        uSourcePrismSurfaceCycles: { value: anim.sourcePrism.surfaceCycles },
        uSourcePrismPhaseFlowPx: { value: anim.sourcePrism.phaseFlowPx },
        uSourcePrismPhaseFlowCycles: { value: anim.sourcePrism.phaseFlowCycles },
        uSourcePrismPhaseMix: { value: anim.sourcePrism.phaseMix },
        uSourcePrismDetailBoost: { value: anim.sourcePrism.detailBoost },
        uSourcePrismPhaseScale: { value: anim.sourcePrism.phaseScale },
        uSourceColorMaxDrift: { value: anim.sourceColorClamp.maxDrift },
        uPaletteA: { value: new THREE.Vector3(...(anim.paletteA ?? [0.5, 0.5, 0.5])) },
        uPaletteB: { value: new THREE.Vector3(...(anim.paletteB ?? [0.5, 0.5, 0.5])) },
        uPaletteC: { value: new THREE.Vector3(...(anim.paletteC ?? [1, 1, 1])) },
        uPaletteD: { value: new THREE.Vector3(...(anim.paletteD ?? [0, 0.33, 0.67])) },
        uPatternType: { value: anim.patternType ?? 0 },
        uPatternScale: { value: anim.patternScale ?? 20 },
        uPatternAmount: { value: anim.patternAmount ?? 0 },
        uSDFType: { value: anim.sdfType ?? 0 },
        uSDFScale: { value: anim.sdfScale ?? 2 },
        uSDFAmount: { value: anim.sdfAmount ?? 0 },
        uJuliaAmount: { value: anim.juliaAmount ?? 0 },
        uJuliaC: { value: new THREE.Vector2(...(anim.juliaC ?? [-0.7, 0.27015])) },
        uRotateSpeed: { value: anim.rotateSpeed ?? 0 },
        uScalePulse: { value: anim.scalePulse ?? 0 },
        uBicubicFilter: { value: anim.bicubicFilter ? 1 : 0 },
        uWorleyScale: { value: anim.worleyScale ?? 8 },
        uWorleyAmount: { value: anim.worleyAmount ?? 0 },
        uTextureSize: {
          value: new THREE.Vector2(
            texture.image?.width ?? 1024,
            texture.image?.height ?? 1024,
          ),
        },
        uRimIntensity: { value: anim.rimIntensity ?? 0 },
        uRimHueShift: { value: anim.rimHueShift ?? 0.1 },
        uRimWidth: { value: anim.rimWidth ?? 0.004 },
        uRingIntensity: { value: anim.ringIntensity ?? 0 },
        uRingFreq: { value: anim.ringFreq ?? 30 },
        uRingPeriod: { value: anim.ringPeriod ?? 10 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
    });

    // Apply blend mode from scene.json
    if (blending === "screen") {
      material.blending = THREE.CustomBlending;
      material.blendEquation = THREE.AddEquation;
      material.blendSrc = THREE.OneFactor;
      material.blendDst = THREE.OneMinusSrcColorFactor;
    } else if (blending === "add") {
      material.blending = THREE.AdditiveBlending;
    } else if (blending === "multiply") {
      material.blending = THREE.MultiplyBlending;
    }

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = layerConfig.zIndex * 0.1;
    mesh.renderOrder = layerConfig.zIndex;

    scene.add(mesh);
    layerMeshes.push({ mesh, material, config: layerConfig, phaseTexture, phaseTexture2, depthTexture, flowTexture, streamTexture, regionTexture });
  }

  return {
    scene,
    camera,
    sceneConfig: config,
    update(time: number) {
      const normalizedTime = (time % loopDuration) / loopDuration;
      for (const { material } of layerMeshes) {
        material.uniforms.uTime.value = normalizedTime;
      }
    },
    resize(_width: number, _height: number) {
      // OrthographicCamera is fixed -1..1, no resize needed for square
    },
    dispose() {
      for (const { mesh, material, phaseTexture, phaseTexture2, depthTexture, flowTexture, streamTexture, regionTexture } of layerMeshes) {
        mesh.geometry.dispose();
        material.dispose();
        const tex = material.uniforms.uTexture.value as THREE.Texture;
        tex.dispose();
        phaseTexture.dispose();
        phaseTexture2.dispose();
        depthTexture.dispose();
        flowTexture.dispose();
        streamTexture.dispose();
        regionTexture.dispose();
        scene.remove(mesh);
      }
      layerMeshes.length = 0;
    },
  };
}

function loadTexture(
  loader: THREE.TextureLoader,
  url: string,
): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

async function loadFieldTexture(
  loader: THREE.TextureLoader,
  field: string | undefined,
  fallbackRgba: readonly [number, number, number, number],
): Promise<THREE.Texture> {
  const texture = field === undefined
    ? createDataTexture(fallbackRgba)
    : await loadTexture(loader, `/${field}`);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

async function loadPhaseTexture(
  loader: THREE.TextureLoader,
  phaseField: string | undefined,
): Promise<THREE.Texture> {
  const texture = phaseField === undefined
    ? createDataTexture([0, 0, 0, 255])
    : await loadTexture(loader, `/${phaseField}`);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function createDataTexture(rgba: readonly [number, number, number, number]): THREE.DataTexture {
  const texture = new THREE.DataTexture(
    new Uint8Array(rgba),
    1,
    1,
    THREE.RGBAFormat,
  );
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function glowWaveMean(sharpness: number): number {
  const exponent = 1.5 + (7.0 - 1.5) * sharpness;
  let sum = 0;
  for (let sample = 0; sample < GLOW_WAVE_MEAN_SAMPLES; sample += 1) {
    const x = sample / GLOW_WAVE_MEAN_SAMPLES;
    sum += Math.pow(0.5 + 0.5 * Math.cos(TAU * x), exponent);
  }
  return sum / GLOW_WAVE_MEAN_SAMPLES;
}
