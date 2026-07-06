import * as THREE from "three";
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  BloomEffect,
  ChromaticAberrationEffect,
  ShaderPass,
  Pass,
  KernelSize,
} from "postprocessing";
import type { EffectsConfig } from "./scene-schema";
import multipassFeedbackFragmentShader from "@/shaders/multipass-feedback.frag";

const fullscreenVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const linearOutputFragment = `
  void writeOutput(vec4 color) {
    gl_FragColor = color;
  }
`;

const screenOutputFragment = `
  void writeScreenOutput(vec4 color) {
    gl_FragColor = color;
  }
`;

const kaleidoFragmentShader = `
  uniform sampler2D inputBuffer;
  uniform float uSegments;
  uniform float uBlend;
  varying vec2 vUv;

  #define TAU 6.28318530718

  // ANGLE/Metal miscompiles two-arg atan (empirically → NaN for all inputs here).
  // Manual atan2 via one-arg atan; also defines atan2(0,0)=0.
  float atan2Safe(float y, float x) {
    float ax = abs(x), ay = abs(y);
    if (ax < 1e-9 && ay < 1e-9) return 0.0;
    if (ax >= ay) {
      float a = atan(y / x);
      return x >= 0.0 ? a : (y >= 0.0 ? a + 3.14159265358979 : a - 3.14159265358979);
    }
    float a = atan(x / y);
    return (y >= 0.0 ? 1.57079632679490 : -1.57079632679490) - a;
  }

  ${linearOutputFragment}

  void main() {
    vec4 original = texture2D(inputBuffer, vUv);
    if (uSegments < 2.0) {
      writeOutput(original);
      return;
    }
    vec2 centered = vUv - 0.5;
    float angle = atan2Safe(centered.y, centered.x);
    if (angle < 0.0) angle += TAU;
    float radius = length(centered);

    float segAngle = TAU / uSegments;
    float idx = floor(angle / segAngle);
    float localAngle = angle - idx * segAngle;
    if (mod(idx, 2.0) > 0.5) {
      localAngle = segAngle - localAngle;
    }

    vec2 kaleidoUv = vec2(cos(localAngle), sin(localAngle)) * radius + 0.5;
    vec4 kaleidoColor = texture2D(inputBuffer, kaleidoUv);
    writeOutput(mix(original, kaleidoColor, uBlend));
  }
`;

const trailsFragmentShader = `
  uniform sampler2D inputBuffer;
  uniform sampler2D uPrevFrame;
  uniform float uTrailStrength;
  varying vec2 vUv;

  ${linearOutputFragment}

  void main() {
    vec4 current = texture2D(inputBuffer, vUv);
    vec4 prev = texture2D(uPrevFrame, vUv);
    writeOutput(mix(current, prev, uTrailStrength));
  }
`;

const linearBlitFragmentShader = `
  uniform sampler2D inputBuffer;
  varying vec2 vUv;

  ${linearOutputFragment}

  void main() {
    writeOutput(texture2D(inputBuffer, vUv));
  }
`;

const screenBlitFragmentShader = `
  uniform sampler2D inputBuffer;
  varying vec2 vUv;

  ${screenOutputFragment}

  void main() {
    writeScreenOutput(texture2D(inputBuffer, vUv));
  }
`;

// Lens Distortion — Brown distortion (barrel/pincushion) + chromatic + DoF radial blur + vignette (T-A2)
const lensDistortionFragmentShader = `
  uniform sampler2D inputBuffer;
  uniform float uBarrelAmount;
  uniform float uLensChromatic;
  uniform float uLensDoF;
  uniform float uLensVignetteRadius;
  varying vec2 vUv;

  vec2 distort(vec2 uv, float k) {
    vec2 c = uv - 0.5;
    float r2 = dot(c, c);
    return 0.5 + c * (1.0 + k * r2);
  }

  ${linearOutputFragment}

  void main() {
    float k = uBarrelAmount;
    float ch = uLensChromatic * 0.02;
    vec2 uvR = distort(vUv, k * (1.0 + ch));
    vec2 uvG = distort(vUv, k);
    vec2 uvB = distort(vUv, k * (1.0 - ch));
    vec4 sR = texture2D(inputBuffer, clamp(uvR, 0.0, 1.0));
    vec4 sG = texture2D(inputBuffer, clamp(uvG, 0.0, 1.0));
    vec4 sB = texture2D(inputBuffer, clamp(uvB, 0.0, 1.0));
    vec3 col = vec3(sR.r, sG.g, sB.b);

    // Radial DoF (5-tap ring blur proportional to distance from center)
    float d = length(vUv - 0.5);
    float blurAmt = uLensDoF * smoothstep(0.0, 0.7, d);
    if (blurAmt > 0.0001) {
      vec3 acc = col;
      float ring = max(blurAmt * 0.02, 0.001);
      for (int i = 0; i < 5; i++) {
        float a = float(i) * 1.2566370614; // TAU/5
        vec2 off = vec2(cos(a), sin(a)) * ring;
        acc += texture2D(inputBuffer, clamp(distort(vUv + off, k), 0.0, 1.0)).rgb;
      }
      col = acc / 6.0;
    }

    // Soft vignette
    float vig = smoothstep(uLensVignetteRadius, uLensVignetteRadius * 0.5, d);
    col *= mix(1.0, vig, step(0.999, uLensVignetteRadius) == 1.0 ? 0.0 : 1.0);

    writeOutput(vec4(col, sG.a));
  }
`;

// Radial volumetric god-rays (NVIDIA GPU Gems 3 Ch.13 pattern)
const godRaysFragmentShader = `
  uniform sampler2D inputBuffer;
  uniform vec2 uCenter;
  uniform float uIntensity;
  uniform float uDecay;
  uniform float uDensity;
  uniform float uWeight;
  uniform float uThreshold;
  uniform int uSamples;
  varying vec2 vUv;

  ${linearOutputFragment}

  void main() {
    vec4 original = texture2D(inputBuffer, vUv);
    vec2 delta = (vUv - uCenter) * (uDensity / float(uSamples));
    vec2 p = vUv;
    vec3 accum = vec3(0.0);
    float illum = 1.0;
    for (int i = 0; i < 128; i++) {
      if (i >= uSamples) break;
      vec3 s = texture2D(inputBuffer, p).rgb;
      float lum = dot(s, vec3(0.299, 0.587, 0.114));
      float mask = smoothstep(uThreshold, 1.0, lum);
      accum += s * mask * illum * uWeight;
      p -= delta;
      illum *= uDecay;
    }
    accum *= uIntensity / float(uSamples);
    // Additive blend
    writeOutput(vec4(original.rgb + accum, original.a));
  }
`;

// Silhouette aura — radial blur with hue-shifted samples, screen blend
const auraFragmentShader = `
  uniform sampler2D inputBuffer;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uRadius;
  uniform float uHueSpeed;
  uniform int uSamples;
  varying vec2 vUv;

  #define TAU 6.28318530718

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  ${linearOutputFragment}

  void main() {
    vec4 center = texture2D(inputBuffer, vUv);
    vec3 halo = vec3(0.0);
    float total = 0.0;
    // Multi-ring sampling: 3 radii × uSamples angles
    for (int r = 1; r <= 3; r++) {
      float radius = uRadius * float(r) / 3.0;
      for (int i = 0; i < 32; i++) {
        if (i >= uSamples) break;
        float a = float(i) / float(uSamples) * TAU;
        vec2 offset = vec2(cos(a), sin(a)) * radius;
        vec3 samp = texture2D(inputBuffer, vUv + offset).rgb;
        float lum = dot(samp, vec3(0.299, 0.587, 0.114));
        float mask = smoothstep(0.3, 1.0, lum);
        float hue = fract(a / TAU + uTime * uHueSpeed + float(r) * 0.15);
        vec3 hueTint = hsv2rgb(vec3(hue, 0.8, 1.0));
        halo += samp * hueTint * mask;
        total += 1.0;
      }
    }
    halo /= max(total, 1.0);
    halo *= uIntensity;
    // Screen blend
    vec3 screen = 1.0 - (1.0 - center.rgb) * (1.0 - halo);
    writeOutput(vec4(screen, center.a));
  }
`;

// Procedural mandala overlay — polar-fold hex lattice (Flower of Life)
const mandalaFragmentShader = `
  uniform sampler2D inputBuffer;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uSegments;
  uniform float uRings;
  uniform float uRotationSpeed;
  uniform float uBreathSpeed;
  uniform float uHueSpeed;
  varying vec2 vUv;

  #define TAU 6.28318530718

  // ANGLE/Metal miscompiles two-arg atan (empirically → NaN for all inputs here).
  // Manual atan2 via one-arg atan; also defines atan2(0,0)=0.
  float atan2Safe(float y, float x) {
    float ax = abs(x), ay = abs(y);
    if (ax < 1e-9 && ay < 1e-9) return 0.0;
    if (ax >= ay) {
      float a = atan(y / x);
      return x >= 0.0 ? a : (y >= 0.0 ? a + 3.14159265358979 : a - 3.14159265358979);
    }
    float a = atan(x / y);
    return (y >= 0.0 ? 1.57079632679490 : -1.57079632679490) - a;
  }

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  ${linearOutputFragment}

  void main() {
    vec4 original = texture2D(inputBuffer, vUv);
    if (uOpacity < 0.001) { writeOutput(original); return; }

    vec2 p = vUv - 0.5;
    // Aspect correct (portrait: y spans more)
    p.y *= 1.78;
    float r = length(p);
    float a = atan2Safe(p.y, p.x) + uTime * uRotationSpeed;

    // N-fold mirror fold
    float seg = TAU / max(uSegments, 2.0);
    float folded = abs(mod(a, seg) - seg * 0.5);
    vec2 kp = vec2(cos(folded), sin(folded)) * r;

    // Breathing tile scale
    float breathe = 1.0 + 0.12 * sin(uTime * uBreathSpeed);
    vec2 q = kp * uRings * breathe;
    // Hex grid (Flower of Life spacing)
    vec2 g = fract(q * vec2(1.0, 1.15470054)) - 0.5;
    float cellDist = length(g);
    float circle = smoothstep(0.48, 0.38, cellDist);

    // Concentric rings overlay — static standing wave (no outward scroll: loop-safe + ban #2)
    float ringWave = sin(r * uRings * 6.28) * 0.5 + 0.5;
    float rings = pow(ringWave, 6.0);

    float pattern = max(circle, rings * 0.5);
    // Soft falloff at frame edges so it doesn't feel like a heavy overlay
    pattern *= smoothstep(1.1, 0.3, r);

    vec3 mandalaColor = hsv2rgb(vec3(fract(uTime * uHueSpeed + r * 0.4), 0.75, 1.0));
    vec3 tinted = mandalaColor * pattern * uOpacity;

    // Screen blend so it glows rather than obscures
    vec3 out_rgb = 1.0 - (1.0 - original.rgb) * (1.0 - tinted);
    writeOutput(vec4(out_rgb, original.a));
  }
`;

const filmGradeFragmentShader = `
  uniform sampler2D inputBuffer;
  uniform float uTime;
  uniform float uGrain;
  uniform float uVignetteIntensity;
  uniform float uVignetteRadius;
  uniform vec3 uVignetteTint;
  uniform float uContrast;
  uniform float uSCurve;
  varying vec2 vUv;

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0), p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g)), q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y), e = 1.0e-10; return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
  }
  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0); vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www); return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  ${linearOutputFragment}

  void main() {
    vec4 c = texture2D(inputBuffer, vUv);
    vec3 rgb = c.rgb;

    // Contrast around 0.5
    rgb = (rgb - 0.5) * uContrast + 0.5;

    // Subtle S-curve (filmic-ish)
    if (uSCurve > 0.001) {
      vec3 x = rgb;
      vec3 s = x * x * (3.0 - 2.0 * x);
      rgb = mix(x, s, uSCurve);
    }

    // Luminance-adaptive grain (more in shadows)
    if (uGrain > 0.001) {
      float g = hash12(vUv * 1024.0 + vec2(uTime * 37.0, uTime * 19.0));
      float lum = dot(rgb, vec3(0.299, 0.587, 0.114));
      float grainAmt = mix(uGrain, uGrain * 0.3, lum);
      rgb += (g - 0.5) * grainAmt;
    }

    // Tinted radial vignette
    if (uVignetteIntensity > 0.001) {
      float d = length(vUv - 0.5);
      float v = smoothstep(uVignetteRadius, uVignetteRadius - 0.4, d);
      // Darken + tint toward vignette color
      vec3 tintedEdge = mix(rgb, uVignetteTint, 1.0 - v);
      rgb = mix(rgb, tintedEdge, uVignetteIntensity);
      rgb *= mix(1.0, 0.75, (1.0 - v) * uVignetteIntensity);
    }
    rgb = clamp(rgb, 0.0, 1.0);
    float lum = dot(rgb, vec3(0.299, 0.587, 0.114));
    float bleachGuard = smoothstep(0.52, 0.6, lum);
    vec3 hsv = rgb2hsv(rgb);
    hsv.y = max(hsv.y, bleachGuard * 0.45);
    rgb = hsv2rgb(hsv);

    writeOutput(vec4(rgb, c.a));
  }
`;

function createWhiteMaskTexture(): THREE.DataTexture {
  const texture = new THREE.DataTexture(
    new Uint8Array([255, 255, 255, 255]),
    1,
    1,
    THREE.RGBAFormat,
  );
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function loadFeedbackMaskTexture(mask: string | undefined): THREE.Texture {
  const texture = mask ? new THREE.TextureLoader().load(`/${mask}`) : createWhiteMaskTexture();
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

class FinalTexturePass extends Pass {
  texture: THREE.Texture | null = null;

  constructor() {
    super("FinalTexturePass");
    this.needsSwap = false;
  }

  render(
    _renderer: THREE.WebGLRenderer,
    inputBuffer: THREE.WebGLRenderTarget | null,
    _outputBuffer: THREE.WebGLRenderTarget | null,
  ): void {
    this.texture = inputBuffer?.texture ?? null;
  }

  dispose(): void {
    this.texture = null;
  }
}

export function createComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  effects: EffectsConfig,
  resolution: [number, number],
  loopDuration = 1,
) {
  const composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType,
  });
  composer.autoRenderToScreen = false;

  const trailStrength = effects.trails?.strength ?? 0;
  const hasTrails = trailStrength > 0;
  const mf = effects.multipassFeedback;
  const hasMultipass = mf && (mf.strength > 0 || mf.reactionDiffusionAmount > 0);
  const needsFeedback = hasTrails || hasMultipass;

  composer.addPass(new RenderPass(scene, camera));

  // --- Aura (before bloom so bloom amplifies the halo) ---
  const auraMaterial =
    effects.aura && effects.aura.intensity > 0
      ? new THREE.ShaderMaterial({
          uniforms: {
            inputBuffer: { value: null },
            uTime: { value: 0 },
            uIntensity: { value: effects.aura.intensity },
            uRadius: { value: effects.aura.radius },
            uHueSpeed: { value: effects.aura.hueSpeed },
            uSamples: { value: effects.aura.samples },
          },
          vertexShader: fullscreenVertexShader,
          fragmentShader: auraFragmentShader,
        })
      : null;
  if (auraMaterial) composer.addPass(new ShaderPass(auraMaterial, "inputBuffer"));

  // --- God rays (additive volumetric light from center) ---
  const godRaysMaterial =
    effects.godRays && effects.godRays.intensity > 0
      ? new THREE.ShaderMaterial({
          uniforms: {
            inputBuffer: { value: null },
            uCenter: {
              value: new THREE.Vector2(
                effects.godRays.centerX,
                1.0 - effects.godRays.centerY,
              ),
            },
            uIntensity: { value: effects.godRays.intensity },
            uDecay: { value: effects.godRays.decay },
            uDensity: { value: effects.godRays.density },
            uWeight: { value: effects.godRays.weight },
            uThreshold: { value: effects.godRays.threshold },
            uSamples: { value: effects.godRays.samples },
          },
          vertexShader: fullscreenVertexShader,
          fragmentShader: godRaysFragmentShader,
        })
      : null;
  if (godRaysMaterial) composer.addPass(new ShaderPass(godRaysMaterial, "inputBuffer"));

  // --- Mandala overlay ---
  const mandalaMaterial =
    effects.mandala && effects.mandala.opacity > 0
      ? new THREE.ShaderMaterial({
          uniforms: {
            inputBuffer: { value: null },
            uTime: { value: 0 },
            uOpacity: { value: effects.mandala.opacity },
            uSegments: { value: effects.mandala.segments },
            uRings: { value: effects.mandala.rings },
            uRotationSpeed: { value: effects.mandala.rotationSpeed },
            uBreathSpeed: { value: effects.mandala.breathSpeed },
            uHueSpeed: { value: effects.mandala.hueSpeed },
          },
          vertexShader: fullscreenVertexShader,
          fragmentShader: mandalaFragmentShader,
        })
      : null;
  if (mandalaMaterial) composer.addPass(new ShaderPass(mandalaMaterial, "inputBuffer"));

  // --- Bloom + CA (existing, enhanced kernel) ---
  const passEffects = [];
  if (effects.bloom.strength > 0) {
    passEffects.push(
      new BloomEffect({
        intensity: effects.bloom.strength,
        radius: effects.bloom.radius,
        luminanceThreshold: effects.bloom.threshold,
        luminanceSmoothing: 0.2,
        mipmapBlur: true,
        kernelSize: KernelSize.LARGE,
      }),
    );
  }
  if (effects.chromaticAberration.offset > 0) {
    passEffects.push(
      new ChromaticAberrationEffect({
        offset: new THREE.Vector2(
          effects.chromaticAberration.offset * 0.001,
          effects.chromaticAberration.offset * 0.001,
        ),
        radialModulation: true,
        modulationOffset: effects.chromaticAberration.modulationOffset,
      }),
    );
  }
  if (passEffects.length > 0) {
    composer.addPass(new EffectPass(camera, ...passEffects));
  }

  // --- Kaleidoscope ---
  const kaleidoSegments = effects.kaleidoscope?.segments ?? 0;
  const kaleidoMaterial =
    kaleidoSegments >= 2
      ? new THREE.ShaderMaterial({
          uniforms: {
            inputBuffer: { value: null },
            uSegments: { value: kaleidoSegments },
            uBlend: { value: effects.kaleidoscope?.blend ?? 0.3 },
          },
          vertexShader: fullscreenVertexShader,
          fragmentShader: kaleidoFragmentShader,
        })
      : null;
  if (kaleidoMaterial) composer.addPass(new ShaderPass(kaleidoMaterial, "inputBuffer"));

  // --- Film grade (final — grain, vignette, contrast) ---
  const filmGradeMaterial =
    effects.filmGrade &&
    (effects.filmGrade.grain > 0 ||
      effects.filmGrade.vignetteIntensity > 0 ||
      effects.filmGrade.contrast !== 1 ||
      effects.filmGrade.sCurve > 0)
      ? new THREE.ShaderMaterial({
          uniforms: {
            inputBuffer: { value: null },
            uTime: { value: 0 },
            uGrain: { value: effects.filmGrade.grain },
            uVignetteIntensity: { value: effects.filmGrade.vignetteIntensity },
            uVignetteRadius: { value: effects.filmGrade.vignetteRadius },
            uVignetteTint: {
              value: new THREE.Vector3(
                effects.filmGrade.vignetteTintR,
                effects.filmGrade.vignetteTintG,
                effects.filmGrade.vignetteTintB,
              ),
            },
            uContrast: { value: effects.filmGrade.contrast },
            uSCurve: { value: effects.filmGrade.sCurve },
          },
          vertexShader: fullscreenVertexShader,
          fragmentShader: filmGradeFragmentShader,
        })
      : null;
  // --- Feedback infrastructure (shared by trails + multipassFeedback) ---
  let feedbackTarget: THREE.WebGLRenderTarget | null = null;
  let feedbackMaskTexture: THREE.Texture | null = null;
  let multipassMaterial: THREE.ShaderMaterial | null = null;
  if (needsFeedback) {
    feedbackTarget = new THREE.WebGLRenderTarget(resolution[0], resolution[1], {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
  }

  // Trails pass (simple mix with prev)
  if (hasTrails && feedbackTarget) {
    const trailsMaterial = new THREE.ShaderMaterial({
      uniforms: {
        inputBuffer: { value: null },
        uPrevFrame: { value: feedbackTarget.texture },
        uTrailStrength: { value: trailStrength },
      },
      vertexShader: fullscreenVertexShader,
      fragmentShader: trailsFragmentShader,
    });
    composer.addPass(new ShaderPass(trailsMaterial, "inputBuffer"));
  }

  // Lens distortion pass (T-A2) — inserted after multipass, before kaleidoscope
  const ld = effects.lensDistortion;
  const hasLens = ld && (Math.abs(ld.barrel) > 0.001 || ld.chromatic > 0.001 || ld.dof > 0.001 || ld.vignetteRadius < 0.999);
  if (hasLens) {
    const lensMaterial = new THREE.ShaderMaterial({
      uniforms: {
        inputBuffer: { value: null },
        uBarrelAmount: { value: ld.barrel },
        uLensChromatic: { value: ld.chromatic },
        uLensDoF: { value: ld.dof },
        uLensVignetteRadius: { value: ld.vignetteRadius },
      },
      vertexShader: fullscreenVertexShader,
      fragmentShader: lensDistortionFragmentShader,
    });
    composer.addPass(new ShaderPass(lensMaterial, "inputBuffer"));
  }

  // Multipass feedback pass (warp + decay + hue-shift, shares feedbackTarget) (T-A1)
  if (hasMultipass && feedbackTarget) {
    feedbackMaskTexture = loadFeedbackMaskTexture(mf.mask);
    multipassMaterial = new THREE.ShaderMaterial({
      uniforms: {
        inputBuffer: { value: null },
        uPrevFrame: { value: feedbackTarget.texture },
        uFeedbackStrength: { value: mf.strength },
        uFeedbackWarp: { value: mf.warp },
        uFeedbackDecay: { value: mf.decay },
        uFeedbackHueShift: { value: mf.hueShift },
        uFeedbackZoom: { value: mf.zoom },
        uFeedbackRotate: { value: mf.rotate },
        uFeedbackMaskTex: { value: feedbackMaskTexture },
        uFeedbackMaskOn: { value: mf.mask ? 1 : 0 },
        uReactionDiffusionAmount: { value: mf.reactionDiffusionAmount },
        uReactionDiffusionSpeed: { value: mf.reactionDiffusionSpeed },
        uFeedbackLoopPhase: { value: 0 },
        uFeedbackTexel: { value: new THREE.Vector2(1 / resolution[0], 1 / resolution[1]) },
      },
      vertexShader: fullscreenVertexShader,
      fragmentShader: multipassFeedbackFragmentShader,
    });
    composer.addPass(new ShaderPass(multipassMaterial, "inputBuffer"));
  }

  if (filmGradeMaterial) composer.addPass(new ShaderPass(filmGradeMaterial, "inputBuffer"));

  const finalTexturePass = new FinalTexturePass();
  composer.addPass(finalTexturePass);

  // Display-referred contract: feedback and screen/capture blits are byte copies.
  const blitGeo = new THREE.PlaneGeometry(2, 2);
  const linearBlitMat = new THREE.ShaderMaterial({
    uniforms: { inputBuffer: { value: null } },
    vertexShader: fullscreenVertexShader,
    fragmentShader: linearBlitFragmentShader,
  });
  const screenBlitMat = new THREE.ShaderMaterial({
    uniforms: { inputBuffer: { value: null } },
    vertexShader: fullscreenVertexShader,
    fragmentShader: screenBlitFragmentShader,
  });
  const linearBlitQuad = new THREE.Mesh(blitGeo, linearBlitMat);
  const screenBlitQuad = new THREE.Mesh(blitGeo, screenBlitMat);
  const linearBlitScene = new THREE.Scene();
  const screenBlitScene = new THREE.Scene();
  linearBlitScene.add(linearBlitQuad);
  screenBlitScene.add(screenBlitQuad);
  const blitCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const originalRender = composer.render.bind(composer);

  const wrapper = {
    ...composer,
    setTime(t: number) {
      const safeLoopDuration = Math.max(loopDuration, 1e-6);
      const normalizedLoopTime = ((t % safeLoopDuration) + safeLoopDuration) % safeLoopDuration / safeLoopDuration;
      if (auraMaterial) auraMaterial.uniforms.uTime.value = t;
      if (mandalaMaterial) mandalaMaterial.uniforms.uTime.value = t;
      if (filmGradeMaterial) filmGradeMaterial.uniforms.uTime.value = t;
      if (multipassMaterial) multipassMaterial.uniforms.uFeedbackLoopPhase.value = normalizedLoopTime;
    },
    render(delta?: number) {
      originalRender(delta);

      const resultTexture = finalTexturePass.texture;
      if (resultTexture === null) {
        throw new Error("EffectComposer final texture was not captured");
      }

      if (feedbackTarget) {
        linearBlitMat.uniforms.inputBuffer.value = resultTexture;
        renderer.setRenderTarget(feedbackTarget);
        renderer.render(linearBlitScene, blitCamera);
      }
      screenBlitMat.uniforms.inputBuffer.value = resultTexture;
      renderer.setRenderTarget(null);
      renderer.render(screenBlitScene, blitCamera);
    },
    dispose() {
      feedbackTarget?.dispose();
      feedbackMaskTexture?.dispose();
      blitGeo.dispose();
      linearBlitMat.dispose();
      screenBlitMat.dispose();
      composer.dispose();
    },
  };

  return { composer: wrapper };
}
