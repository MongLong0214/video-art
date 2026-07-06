precision highp float;

// AUDIT (shader-dev T13) — WebGL pitfalls addressed:
//   1. Three.js r172 uses WebGL2 (GLSL 300 ES) — fwidth built-in, no extension needed
//   2. All helper fns declared before use (hash12 -> voronoi/worley, fbm -> noise flow)
//   3. Julia loop has bounded break condition (dot(z,z)>4) — no unbounded iteration
//   4. Divisions guarded with max(x, 1e-4) on period/scale uniforms
//   5. sin/cos only in hot path when feature enabled (uniform > threshold branch-gate)
//   6. hash12 uses fract chain (no sin, more stable across drivers)
//   7. Dynamic loop in voronoi/worley are small (3x3 fixed), const-bounded

uniform sampler2D uTexture;
uniform float uTime;
uniform float uOpacity;
uniform float uPremultiplyAlpha;

// Color cycling
uniform float uColorCycleSpeed;
uniform float uColorCyclePeriod;
uniform float uPhaseOffset;
uniform sampler2D uPhaseTex;
uniform sampler2D uDepthTex;
uniform sampler2D uFlowFieldTex;
uniform float uPhaseAmount;
uniform float uCamDriftRadius;
uniform float uCamDriftCycles;
uniform float uCamDriftPivot;
uniform float uStructFlowStrength;
uniform float uStructFlowCycles;

// Glow pulse
uniform float uGlowIntensity;
uniform float uGlowPulse;
uniform float uGlowPeriod;
uniform float uGlowWaveStrength;
uniform float uGlowWaveSpeed;
uniform float uGlowWaveSharpness;
uniform float uGlowWaveFieldCycles;
uniform float uGlowWaveMean;

// Psychedelic color engine
uniform float uSaturationBoost;
uniform float uLuminanceKey;

// Shader axes (research-tunable)
uniform float uSatBlendLow;
uniform float uSatBlendHigh;
uniform float uSatInjectionMul;
uniform float uGlowPulseFloor;
uniform float uLumExponent;
uniform float uValueLift;
uniform float uGreenCompress;
uniform float uGreenBandLo;
uniform float uGreenBandHi;
uniform float uHueSpaceMode;

// Breathing / morphing
uniform float uBreathAmp;
uniform float uBreathFreq;
uniform float uBreathPeriod;

// Depth cinematic
uniform float uHazeIntensity;
uniform float uDepthNorm;
uniform float uFeatherRadius;

// Hue-keying: color-region-based animation
uniform float uHueKey;
uniform float uHueSpeed;

// Organic noise flow (now multi-octave fBm)
uniform float uNoiseScale;
uniform float uNoiseSpeed;
uniform float uNoiseAmount;

// Domain warping — recursive fbm for organic swirls (shader-dev T1)
uniform float uDomainWarp;
uniform float uDomainWarp2;

// Domain repetition — fbm UV tiling (shader-dev T2)
uniform float uTileRepeat;

// Polar UV twist — spiral distortion at layer level (shader-dev T3)
uniform float uPolarTwist;

// Voronoi cellular — crystalline pattern overlay (shader-dev T4)
uniform float uVoronoiScale;
uniform float uVoronoiAmount;

// Procedural 2D patterns (shader-dev T6) — 0=off 1=check 2=stripe 3=dot
uniform float uPatternType;
uniform float uPatternScale;
uniform float uPatternAmount;

// SDF 2D overlay (shader-dev T7) — 0=off 1=circle 2=star 3=hexagon
uniform float uSDFType;
uniform float uSDFScale;
uniform float uSDFAmount;

// Julia fractal overlay (shader-dev T8)
uniform float uJuliaAmount;
uniform vec2 uJuliaC;

// Matrix transform UV — rotation + scale pulse (shader-dev T9)
uniform float uRotateSpeed;
uniform float uScalePulse;

// Bicubic texture sampling toggle (shader-dev T11)
uniform float uBicubicFilter;
uniform vec2 uTextureSize;

// Worley noise — F2-F1 edges (shader-dev T12)
uniform float uWorleyScale;
uniform float uWorleyAmount;

// IQ cosine palette — a + b*cos(TAU*(c*t+d)) (shader-dev T5)
uniform float uPaletteAmount;
uniform float uPaletteValueFloor;
uniform float uPaletteSatFloor;
uniform float uFlowAmp;
uniform float uFlowScale;
uniform vec3 uPaletteA;
uniform vec3 uPaletteB;
uniform vec3 uPaletteC;
uniform vec3 uPaletteD;

// --- Visionary upgrades ---
// Fresnel rim lighting — chromatic glow along silhouette edges
uniform float uRimIntensity;
uniform float uRimHueShift;
uniform float uRimWidth;

// Breathing sacred rings from center
uniform float uRingIntensity;
uniform float uRingFreq;
uniform float uRingPeriod;

varying vec2 vUv;

#define PI 3.14159265359
#define TAU 6.28318530718
uniform float uLoopDuration;

// Simplex 2D noise (Ashima Arts)
vec3 mod289v3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289v2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289v3(((x * 34.0) + 1.0) * x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289v2(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Per-pixel hash12 (used by voronoi/worley) — sin-free for GPU stability
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// B-spline bicubic sampling via 4 bilinear taps (shader-dev T11)
vec4 cubic(float v) {
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
  vec4 s = n * n * n;
  float x = s.x;
  float y = s.y - 4.0 * s.x;
  float z = s.z - 4.0 * s.y + 6.0 * s.x;
  float w = 6.0 - x - y - z;
  return vec4(x, y, z, w) * (1.0 / 6.0);
}
vec4 sampleBicubic(sampler2D tex, vec2 uv, vec2 texSize) {
  vec2 invTex = 1.0 / texSize;
  uv = uv * texSize - 0.5;
  vec2 fuv = fract(uv);
  uv = floor(uv);
  vec4 xc = cubic(fuv.x);
  vec4 yc = cubic(fuv.y);
  vec4 c = uv.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 s = vec4(xc.x + xc.y, xc.z + xc.w, yc.x + yc.y, yc.z + yc.w);
  vec4 o = c + vec4(xc.y, xc.w, yc.y, yc.w) / s;
  o *= invTex.xxyy;
  vec4 s0 = texture2D(tex, vec2(o.x, o.z));
  vec4 s1 = texture2D(tex, vec2(o.y, o.z));
  vec4 s2 = texture2D(tex, vec2(o.x, o.w));
  vec4 s3 = texture2D(tex, vec2(o.y, o.w));
  float sx = s.x / (s.x + s.y);
  float sy = s.z / (s.z + s.w);
  return mix(mix(s3, s2, sx), mix(s1, s0, sx), sy);
}

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

// SDF 2D shapes (shader-dev T7) — https://iquilezles.org/articles/distfunctions2d/
float sdCircle(vec2 p, float r) { return length(p) - r; }
float sdStar(vec2 p, float r, float n) {
  float an = PI / n;
  float en = PI / max(n - 2.0, 2.0);
  vec2 acs = vec2(cos(an), sin(an));
  vec2 ecs = vec2(cos(en), sin(en));
  float bn = mod(atan2Safe(p.x, p.y), 2.0 * an) - an;
  p = length(p) * vec2(cos(bn), abs(sin(bn)));
  p -= r * acs;
  p += ecs * clamp(-dot(p, ecs), 0.0, r * acs.y / ecs.y);
  return length(p) * sign(p.x);
}
float sdHexagon(vec2 p, float r) {
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p = abs(p);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}

// Voronoi cellular noise — returns min distance to feature point (shader-dev T4)
float voronoi(vec2 p) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float md = 1.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = vec2(hash12(n + g), hash12(n + g + 17.0));
      vec2 r = g + o - f;
      float d = dot(r, r);
      md = min(md, d);
    }
  }
  return sqrt(md);
}

// Worley noise — F2-F1 (shader-dev T12): sharper cell boundary than voronoi
float worley(vec2 p) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float f1 = 1.0;
  float f2 = 1.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = vec2(hash12(n + g), hash12(n + g + 31.7));
      float d = length(g + o - f);
      if (d < f1) { f2 = f1; f1 = d; }
      else if (d < f2) { f2 = d; }
    }
  }
  return f2 - f1;
}

// Multi-octave fractal Brownian motion — ethereal energy field
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * snoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

// IQ cosine palette (shader-dev T5) — https://iquilezles.org/articles/palettes/
vec3 palette(float t) {
  return uPaletteA + uPaletteB * cos(TAU * (uPaletteC * t + uPaletteD));
}

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float srgbChannelToLinear(float c) {
  return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4);
}

vec3 srgbToLinear(vec3 c) {
  return vec3(
    srgbChannelToLinear(c.r),
    srgbChannelToLinear(c.g),
    srgbChannelToLinear(c.b)
  );
}

float linearChannelToSrgb(float value) {
  float c = clamp(value, 0.0, 1.0);
  return c <= 0.0031308 ? c * 12.92 : 1.055 * pow(c, 1.0 / 2.4) - 0.055;
}

vec3 linearToSrgb(vec3 c) {
  return vec3(
    linearChannelToSrgb(c.r),
    linearChannelToSrgb(c.g),
    linearChannelToSrgb(c.b)
  );
}

float timelineGreenWarp(float h, float amt) {
  float greenStart = uGreenBandLo;
  float greenEnd = uGreenBandHi;
  float greenOut = greenEnd - greenStart;
  float loOut = greenStart;
  float hiOut = 1.0 - greenEnd;
  float nonGreenOut = loOut + hiOut;
  float greenIn = greenOut / (1.0 + 4.0 * amt);
  float freed = greenOut - greenIn;
  float loIn = loOut + freed * (loOut / nonGreenOut);
  float hiIn = hiOut + freed * (hiOut / nonGreenOut);
  float greenInEnd = loIn + greenIn;
  // W maps input allocations [loIn, greenIn, hiIn] to fixed output arcs
  // [loOut, greenOut, hiOut]. Since greenIn=|G|/(1+4a), a uniform sweep
  // crosses output G=[70deg,165deg] faster while W(0)=0, W(1)=1 remains continuous.
  if (h < loIn) return h * loOut / max(loIn, 1e-6);
  if (h < greenInEnd) return greenStart + (h - loIn) * greenOut / max(greenIn, 1e-6);
  return greenEnd + (h - greenInEnd) * hiOut / max(hiIn, 1e-6);
}

float squeezeOutputGreenArc(float h, float amt) {
  float greenStart = uGreenBandLo;
  float greenEnd = uGreenBandHi;
  float greenOut = greenEnd - greenStart;
  float targetGreen = greenOut * max(0.0001, 1.0 - 0.85 * amt);
  float originalCenter = (greenStart + greenEnd) * 0.5;
  float tealCenter = greenEnd - targetGreen * 0.5;
  float targetCenter = mix(originalCenter, tealCenter, smoothstep(0.0, 1.0, amt));
  float targetStart = clamp(targetCenter - targetGreen * 0.5, 0.0, 1.0 - targetGreen);
  float targetEnd = targetStart + targetGreen;
  if (h < greenStart) return h * targetStart / max(greenStart, 1e-6);
  if (h < greenEnd) return targetStart + (h - greenStart) * targetGreen / max(greenOut, 1e-6);
  return targetEnd + (h - greenEnd) * (1.0 - targetEnd) / max(1.0 - greenEnd, 1e-6);
}

float greenCompressedHue(float hue) {
  float h = fract(hue);
  float amt = clamp(uGreenCompress, 0.0, 1.0);
  return squeezeOutputGreenArc(timelineGreenWarp(h, amt), amt);
}

// OKLab matrices operate on linear sRGB; the shader adapts locally because
// the surrounding layered pipeline is display-referred.
vec3 linearSrgbToOklab(vec3 c) {
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  float l_ = pow(max(l, 0.0), 1.0 / 3.0);
  float m_ = pow(max(m, 0.0), 1.0 / 3.0);
  float s_ = pow(max(s, 0.0), 1.0 / 3.0);
  return vec3(
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
  );
}

vec3 oklabToLinearSrgb(vec3 c) {
  float l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  float l = l_ * l_ * l_;
  float m = m_ * m_ * m_;
  float s = s_ * s_ * s_;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}

bool inLinearSrgbGamut(vec3 c) {
  return all(greaterThanEqual(c, vec3(-1e-5))) && all(lessThanEqual(c, vec3(1.0 + 1e-5)));
}

vec3 oklchToLinearSrgb(float lightness, float hue, float chroma) {
  vec2 ab = vec2(cos(hue * TAU), sin(hue * TAU)) * chroma;
  return oklabToLinearSrgb(vec3(lightness, ab.x, ab.y));
}

vec3 oklchToLinearSrgbGamutMapped(float lightness, float hue, float chroma) {
  vec3 rgb = oklchToLinearSrgb(lightness, hue, chroma);
  if (inLinearSrgbGamut(rgb)) return rgb;

  // Bright OKLCH boosts can exit sRGB; scale chroma down instead of channel-clipping toward white.
  float lo = 0.0;
  float hi = max(0.0, chroma);
  for (int i = 0; i < 6; i++) {
    float mid = (lo + hi) * 0.5;
    vec3 candidate = oklchToLinearSrgb(lightness, hue, mid);
    if (inLinearSrgbGamut(candidate)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return oklchToLinearSrgb(lightness, hue, lo);
}

void writeOutput(vec4 color) {
  gl_FragColor = color;
}

void main() {
  float time = uTime * uLoopDuration;

  // Matrix transform UV — time-based rotation/scale pulse (shader-dev T9)
  vec2 mtxUv = vUv;
  if (abs(uRotateSpeed) > 0.0001 || uScalePulse > 0.0001) {
    vec2 cm = mtxUv - 0.5;
    float ra = time * uRotateSpeed;
    float sp = 1.0 + uScalePulse * sin(time * TAU);
    mat2 R = mat2(cos(ra), -sin(ra), sin(ra), cos(ra));
    cm = (R * cm) / sp;
    mtxUv = cm + 0.5;
  }

  // Polar UV twist: angle-dependent distortion — spiral (shader-dev T3)
  vec2 polarUv = mtxUv;
  if (abs(uPolarTwist) > 0.0001) {
    vec2 cPol = polarUv - 0.5;
    float rPol = length(cPol);
    float aPol = atan2Safe(cPol.y, cPol.x) + uPolarTwist * rPol;
    polarUv = 0.5 + vec2(cos(aPol), sin(aPol)) * rPol;
  }

  // Breathing UV distortion
  vec2 breathUv = polarUv;
  if (uBreathAmp > 0.0001) {
    float breathT = time * TAU / max(uBreathPeriod, 1e-4);
    vec2 fromCenter = breathUv - 0.5;
    float dist = length(fromCenter);
    float breathWave = sin(breathT + dist * uBreathFreq) * uBreathAmp;
    breathUv += normalize(fromCenter + 1e-6) * breathWave * dist;
  }

  // Curl-noise flow displacement — divergence-free 액체 스월 모션.
  // circle-time(cos/sin) 으로 시간을 원에 매핑 → frame0 == frameN, seamless 루프.
  if (uFlowAmp > 0.0001) {
    float ang = uTime * TAU;
    vec2 tOff = vec2(cos(ang), sin(ang)) * 1.5; // 노이즈 도메인을 원으로 순회 = 주기적
    vec2 fp = breathUv * uFlowScale + tOff;
    float e = 0.012;
    float a0 = fbm(fp);
    float ax = fbm(fp + vec2(e, 0.0));
    float ay = fbm(fp + vec2(0.0, e));
    vec2 grad = vec2(ax - a0, ay - a0) / e;
    vec2 curl = vec2(grad.y, -grad.x);          // 수직 그래디언트 = divergence-free 스월
    curl = clamp(curl, -2.0, 2.0);              // 고그래디언트 영역 폭주 방지
    breathUv += curl * uFlowAmp;
  }

  vec2 sampleUv = breathUv;
  if (uCamDriftRadius > 0.0001) {
    float d = texture2D(uDepthTex, sampleUv).r;
    vec2 cam = uCamDriftRadius * vec2(cos(TAU * uTime * uCamDriftCycles), sin(TAU * uTime * uCamDriftCycles));
    sampleUv += cam * (d - uCamDriftPivot);
  }
  if (uStructFlowStrength > 0.0001) {
    vec3 ff = texture2D(uFlowFieldTex, sampleUv).rgb;
    vec2 dir = ff.rg * 2.0 - 1.0;
    float coh = ff.b;
    float ph = texture2D(uPhaseTex, sampleUv).r;
    sampleUv += dir * uStructFlowStrength * coh * sin(TAU * (uTime * uStructFlowCycles + ph));
  }
  sampleUv = clamp(sampleUv, 0.0, 1.0);

  vec4 texColor = uBicubicFilter > 0.5
    ? sampleBicubic(uTexture, sampleUv, uTextureSize)
    : texture2D(uTexture, sampleUv);

  // --- Fresnel rim: sample alpha neighbors BEFORE alpha-discard so edges glow ---
  float rimFactor = 0.0;
  vec2 rimGrad = vec2(0.0);
  if (uRimIntensity > 0.001) {
    float w = max(uRimWidth, 0.001);
    float aR = texture2D(uTexture, sampleUv + vec2(w, 0.0)).a;
    float aL = texture2D(uTexture, sampleUv - vec2(w, 0.0)).a;
    float aU = texture2D(uTexture, sampleUv + vec2(0.0, w)).a;
    float aD = texture2D(uTexture, sampleUv - vec2(0.0, w)).a;
    rimGrad = vec2(aR - aL, aU - aD);
    rimFactor = length(rimGrad);
  }

  if (texColor.a < 0.01 && rimFactor < 0.05) discard;

  // === LUMINANCE-PRESERVING HUE ROTATION ===
  float lum = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
  vec3 hsv = rgb2hsv(texColor.rgb);
  float originalSat = hsv.y;
  float originalVal = hsv.z;
  float disabledInjectionSatFloor = min(0.22, originalSat + 0.16);

  float lumPhase = uLuminanceKey > 0.001 ? pow(1.0 - lum, uLumExponent + uLuminanceKey) : 0.0;
  float huePhase = uHueKey > 0.001 ? hsv.x * uHueKey * uHueSpeed : 0.0;

  float safePeriod = max(uColorCyclePeriod, 1e-4);
  float fieldPhase = 0.0;
  if (uPhaseAmount > 0.0001) {
    float f = texture2D(uPhaseTex, sampleUv).r;
    f += (hash12(vUv * 1024.0) - 0.5) / 300.0;
    fieldPhase = f * uPhaseAmount;
  }
  float hueShift = fract(time / safePeriod * uColorCycleSpeed + lumPhase + huePhase + fieldPhase + uPhaseOffset / 360.0);

  // Multi-octave fBm flow — richer spatial color variation
  float nHue = 0.0;
  float nSat = 0.0;
  float nGlow = 0.0;
  if (uNoiseAmount > 0.001) {
    vec2 flow = vec2(time * uNoiseSpeed * 0.1, time * uNoiseSpeed * 0.07);
    vec2 p = vUv * uNoiseScale + flow;
    // Domain repetition: tile fbm input UV — seamless infinite pattern (shader-dev T2)
    if (uTileRepeat > 0.5) {
      p = fract(p / uTileRepeat) * uTileRepeat;
    }
    // Domain warping (IQ-style): fbm(p + warp * vec2(fbm(p+a), fbm(p+b))) (shader-dev T1)
    if (uDomainWarp > 0.0001) {
      vec2 q = vec2(fbm(p + vec2(1.7, 9.2)), fbm(p + vec2(8.3, 2.8)));
      vec2 rr = uDomainWarp2 > 0.0001
        ? vec2(fbm(p + 4.0 * q + vec2(1.2, 3.4)), fbm(p + 4.0 * q + vec2(0.9, 6.1)))
        : q;
      nHue = fbm(p + uDomainWarp * rr);
    } else {
      nHue = fbm(p);
    }
    nSat = fbm(vUv * uNoiseScale * 0.8 + vec2(flow.y, 0.5));
    nGlow = fbm(vUv * uNoiseScale * 0.5 + vec2(0.3, time * uNoiseSpeed * 0.08));
    hueShift += nHue * uNoiseAmount;
  }

  float shiftedHue = greenCompressedHue(hsv.x + hueShift);
  float injectedHue = greenCompressedHue(hueShift + lum * uLuminanceKey);

  vec3 rgb = vec3(0.0);
  if (uHueSpaceMode > 0.5) {
    vec3 lab = linearSrgbToOklab(srgbToLinear(texColor.rgb));
    float okHue = greenCompressedHue(atan2Safe(lab.z, lab.y) / TAU + hueShift);
    float okChroma = length(lab.yz) * max(0.0, uSaturationBoost);
    okChroma *= max(0.0, 1.0 + nSat * uNoiseAmount * 0.8);
    okChroma *= max(0.0, 1.0 - uHazeIntensity * (1.0 - uDepthNorm));
    vec3 linearRgb = oklchToLinearSrgbGamutMapped(lab.x, okHue, okChroma);
    rgb = linearToSrgb(linearRgb);
  } else {
    float blend = smoothstep(uSatBlendLow, uSatBlendHigh, originalSat);
    hsv.x = mix(injectedHue, shiftedHue, blend);

    float boostedSat = clamp(originalSat * uSaturationBoost, 0.0, 1.0);
    float injectedSat = uSaturationBoost * uSatInjectionMul;
    float injectionEnabled = step(0.001, uSatInjectionMul);
    float disabledInjectionSat = max(boostedSat, disabledInjectionSatFloor);
    float lowSatTarget = mix(disabledInjectionSat, injectedSat, injectionEnabled);
    hsv.y = clamp(mix(lowSatTarget, boostedSat, blend), 0.0, 1.0);
    hsv.y *= 1.0 + nSat * uNoiseAmount * 0.8;

    hsv.z = max(originalVal, uValueLift * (1.0 - originalVal));
    hsv.y *= max(0.0, 1.0 - uHazeIntensity * (1.0 - uDepthNorm));

    rgb = hsv2rgb(hsv);
  }

  // IQ cosine palette blend — drive color by hueShift phase (shader-dev T5)
  if (uPaletteAmount > 0.001) {
    vec3 pal = palette(fract(hueShift));
    // 팔레트 자체가 특정 hue 위상에서 어두운 네이비로 떨어지는 것을 차단:
    // HSV value를 floor로 끌어올리되 채도는 보존(쨍쨍 유지)해 "어두운 톤" 제거.
    vec3 palHsv = rgb2hsv(pal);
    palHsv.z = max(palHsv.z, uPaletteValueFloor);
    // 채도도 floor로 끌어올림 → "탁한 밝음(저채도 회색/올리브)" 방지, 쨍한 밝음 보장.
    palHsv.y = max(palHsv.y, uPaletteSatFloor);
    pal = hsv2rgb(palHsv);
    // 소스 어두운 영역(originalVal 낮음)도 floor만큼 밝힘.
    rgb = mix(rgb, pal * mix(originalVal, 1.0, uPaletteValueFloor), uPaletteAmount);
  }

  // Julia set fractal overlay (shader-dev T8)
  if (uJuliaAmount > 0.001) {
    vec2 z = (vUv - 0.5) * 3.0;
    float iter = 0.0;
    const int MAX = 32;
    for (int i = 0; i < MAX; i++) {
      if (dot(z, z) > 4.0) break;
      z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + uJuliaC;
      iter += 1.0;
    }
    float jt = iter / float(MAX);
    vec3 jCol = 0.5 + 0.5 * cos(TAU * (vec3(0.0, 0.33, 0.67) + jt + hueShift));
    rgb = mix(rgb, rgb + jCol * (1.0 - jt), uJuliaAmount);
  }

  // SDF 2D overlay (shader-dev T7)
  if (uSDFAmount > 0.001 && uSDFType > 0.5) {
    vec2 sp = (vUv - 0.5) * uSDFScale;
    float d = 1.0;
    if (uSDFType < 1.5)      d = sdCircle(sp, 0.4);
    else if (uSDFType < 2.5) d = sdStar(sp, 0.5, 5.0);
    else                     d = sdHexagon(sp, 0.4);
    // Derivative-based AA: pixel-correct edge regardless of scale (shader-dev T10)
    float w = fwidth(d);
    float edge = 1.0 - smoothstep(0.0, max(w, 1e-4), abs(d));
    rgb = mix(rgb, rgb + vec3(1.0, 0.8, 0.4) * edge, uSDFAmount);
  }

  // Procedural 2D pattern overlay (shader-dev T6)
  if (uPatternAmount > 0.001 && uPatternType > 0.5) {
    vec2 pg = vUv * uPatternScale;
    float pat = 0.0;
    if (uPatternType < 1.5) {
      // Checkerboard
      vec2 c = floor(pg);
      pat = mod(c.x + c.y, 2.0);
    } else if (uPatternType < 2.5) {
      // Stripe
      pat = step(0.5, fract(pg.x));
    } else {
      // Dot grid
      vec2 c = fract(pg) - 0.5;
      pat = 1.0 - smoothstep(0.2, 0.35, length(c));
    }
    rgb = mix(rgb, rgb * (0.5 + 0.5 * pat), uPatternAmount);
  }

  // Worley F2-F1 vein pattern (shader-dev T12)
  if (uWorleyAmount > 0.001) {
    float w = worley(vUv * uWorleyScale);
    // Crisp vein edges where F2-F1 is small
    float vein = 1.0 - smoothstep(0.0, 0.3, w);
    vec3 veinCol = palette(fract(hueShift + 0.5));
    rgb = mix(rgb, rgb + veinCol * vein, uWorleyAmount);
  }

  // Voronoi cell overlay — crystalline additive highlights (shader-dev T4)
  if (uVoronoiAmount > 0.001) {
    float vCell = voronoi(vUv * uVoronoiScale);
    float vRidge = 1.0 - smoothstep(0.0, 0.25, vCell);
    rgb += vRidge * uVoronoiAmount * vec3(0.6, 0.8, 1.0);
  }

  // D-3-6 glow wave: hue-stable light crest traveling over the static phase field.
  if (uGlowWaveStrength > 0.001) {
    float glowPhaseSample = texture2D(uPhaseTex, sampleUv).r;
    float glowSafePeriod = max(uLoopDuration, 1e-4);
    float wp = fract(time / glowSafePeriod * uGlowWaveSpeed + glowPhaseSample * uGlowWaveFieldCycles);
    float crest = pow(0.5 + 0.5 * cos(TAU * (wp - 0.62)), mix(1.5, 7.0, uGlowWaveSharpness));
    rgb *= 1.0 + uGlowWaveStrength * (crest - uGlowWaveMean);
    vec3 crestSat = clamp(rgb * 1.15, 0.0, 1.0);
    rgb = mix(rgb, crestSat, 0.3 * uGlowWaveStrength * crest);
  }

  // --- Glow pulse ---
  float safeGlowPeriod = max(uGlowPeriod, 1e-4);
  float glowT = time * TAU / safeGlowPeriod;
  float glowPulse = mix(1.0, uGlowPulseFloor + (1.0 - uGlowPulseFloor) * 0.5 * (1.0 + sin(glowT)), uGlowPulse);
  float glowFactor = 1.0 + uGlowIntensity * glowPulse * (1.0 + nGlow * uNoiseAmount * 0.7);
  rgb *= glowFactor;

  // --- Breathing sacred rings from center (additive) ---
  float ringSum = 0.0;
  if (uRingIntensity > 0.001) {
    float ringPeriod = max(uRingPeriod, 1e-4);
    vec2 ringCentered = vUv - 0.5;
    float ringR = length(ringCentered);
    float ringT = time * TAU / ringPeriod;
    float ringWave = sin(ringR * uRingFreq - ringT);
    // Sharpen + bias so bands are crisp but AA-smoothed (shader-dev T10)
    float ringAAW = fwidth(ringWave);
    float ring = smoothstep(-ringAAW, ringAAW, ringWave) * pow(max(ringWave, 0.0), 3.0);
    // Falloff: strongest at mid-radius, fades at center + corners
    ring *= smoothstep(0.0, 0.1, ringR) * smoothstep(0.75, 0.25, ringR);
    // Chromatic ring: hue rotates over time
    vec3 ringHue = hsv2rgb(vec3(fract(hueShift + ringR * 0.5), 0.85, 1.0));
    rgb += ringHue * ring * uRingIntensity * texColor.a;
    ringSum = ring;
  }

  // --- Fresnel rim chromatic glow ---
  if (uRimIntensity > 0.001 && rimFactor > 0.01) {
    // Rim hue: direction of alpha gradient + time drift
    float rimAngle = atan2Safe(rimGrad.y, rimGrad.x);
    float rimHue = fract(rimAngle / TAU + time * uRimHueShift);
    vec3 rimColor = hsv2rgb(vec3(rimHue, 0.9, 1.0));
    float rimStrength = smoothstep(0.05, 0.6, rimFactor) * uRimIntensity;
    rgb = mix(rgb, rimColor, rimStrength);
  }

  // Edge vignette: alpha fade at UV boundaries
  float d = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  float feather = uFeatherRadius < 1e-4 ? 1.0 : smoothstep(0.0, uFeatherRadius, d);

  // Alpha: use max of original + rim edge (rim extends beyond silhouette a bit)
  float alpha = max(texColor.a, rimFactor * uRimIntensity * 0.6);
  alpha = alpha * uOpacity * feather;

  if (uSatInjectionMul < 0.001) {
    vec3 finalHsv = rgb2hsv(clamp(rgb, 0.0, 1.2));
    float brightSatFloor = smoothstep(0.55, 0.85, finalHsv.z) * 0.18;
    finalHsv.y = max(finalHsv.y, max(disabledInjectionSatFloor, brightSatFloor));
    rgb = hsv2rgb(finalHsv);
  }

  // Custom screen blending uses OneFactor, so final alpha must attenuate source RGB here.
  if (uPremultiplyAlpha > 0.5) {
    rgb *= alpha;
  }

  writeOutput(vec4(rgb, alpha));
}
