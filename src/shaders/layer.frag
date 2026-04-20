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

// Color cycling
uniform float uColorCycleSpeed;
uniform float uColorCyclePeriod;
uniform float uPhaseOffset;

// Glow pulse
uniform float uGlowIntensity;
uniform float uGlowPulse;
uniform float uGlowPeriod;

// Psychedelic color engine
uniform float uSaturationBoost;
uniform float uLuminanceKey;

// Shader axes (research-tunable)
uniform float uSatBlendLow;
uniform float uSatBlendHigh;
uniform float uSatInjectionMul;
uniform float uGlowPulseFloor;
uniform float uLumExponent;

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

// SDF 2D shapes (shader-dev T7) — https://iquilezles.org/articles/distfunctions2d/
float sdCircle(vec2 p, float r) { return length(p) - r; }
float sdStar(vec2 p, float r, float n) {
  float an = PI / n;
  float en = PI / max(n - 2.0, 2.0);
  vec2 acs = vec2(cos(an), sin(an));
  vec2 ecs = vec2(cos(en), sin(en));
  float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
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
    float aPol = atan(cPol.y, cPol.x) + uPolarTwist * rPol;
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

  vec4 texColor = uBicubicFilter > 0.5
    ? sampleBicubic(uTexture, breathUv, uTextureSize)
    : texture2D(uTexture, breathUv);

  // --- Fresnel rim: sample alpha neighbors BEFORE alpha-discard so edges glow ---
  float rimFactor = 0.0;
  vec2 rimGrad = vec2(0.0);
  if (uRimIntensity > 0.001) {
    float w = max(uRimWidth, 0.001);
    float aR = texture2D(uTexture, breathUv + vec2(w, 0.0)).a;
    float aL = texture2D(uTexture, breathUv - vec2(w, 0.0)).a;
    float aU = texture2D(uTexture, breathUv + vec2(0.0, w)).a;
    float aD = texture2D(uTexture, breathUv - vec2(0.0, w)).a;
    rimGrad = vec2(aR - aL, aU - aD);
    rimFactor = length(rimGrad);
  }

  if (texColor.a < 0.01 && rimFactor < 0.05) discard;

  // === LUMINANCE-PRESERVING HUE ROTATION ===
  float lum = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
  vec3 hsv = rgb2hsv(texColor.rgb);
  float originalSat = hsv.y;
  float originalVal = hsv.z;

  float lumPhase = uLuminanceKey > 0.001 ? pow(1.0 - lum, uLumExponent + uLuminanceKey) : 0.0;
  float huePhase = uHueKey > 0.001 ? hsv.x * uHueKey * uHueSpeed : 0.0;

  float safePeriod = max(uColorCyclePeriod, 1e-4);
  float hueShift = fract(time / safePeriod * uColorCycleSpeed + lumPhase + huePhase + uPhaseOffset / 360.0);

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
      nHue = fbm(p + uDomainWarp * vec2(fbm(p + vec2(1.7, 9.2)), fbm(p + vec2(8.3, 2.8))));
    } else {
      nHue = fbm(p);
    }
    nSat = fbm(vUv * uNoiseScale * 0.8 + vec2(flow.y, 0.5));
    nGlow = fbm(vUv * uNoiseScale * 0.5 + vec2(0.3, time * uNoiseSpeed * 0.08));
    hueShift += nHue * uNoiseAmount;
  }

  float shiftedHue = fract(hsv.x + hueShift);
  float injectedHue = fract(hueShift + lum * uLuminanceKey);

  float blend = smoothstep(uSatBlendLow, uSatBlendHigh, originalSat);
  hsv.x = mix(injectedHue, shiftedHue, blend);

  float injectedSat = uSaturationBoost * uSatInjectionMul;
  float boostedSat = clamp(originalSat * uSaturationBoost, 0.0, 1.0);
  hsv.y = clamp(mix(injectedSat, boostedSat, blend), 0.0, 1.0);
  hsv.y *= 1.0 + nSat * uNoiseAmount * 0.8;

  hsv.z = originalVal;
  hsv.y *= max(0.0, 1.0 - uHazeIntensity * (1.0 - uDepthNorm));

  vec3 rgb = hsv2rgb(hsv);

  // IQ cosine palette blend — drive color by hueShift phase (shader-dev T5)
  if (uPaletteAmount > 0.001) {
    vec3 pal = palette(fract(hueShift));
    rgb = mix(rgb, pal * originalVal, uPaletteAmount);
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
    vec3 jCol = 0.5 + 0.5 * cos(TAU * (vec3(0.0, 0.33, 0.67) + jt + time * 0.1));
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
    float w = worley(vUv * uWorleyScale + vec2(time * 0.2, time * -0.15));
    // Crisp vein edges where F2-F1 is small
    float vein = 1.0 - smoothstep(0.0, 0.3, w);
    rgb = mix(rgb, rgb + vec3(0.3, 0.6, 1.0) * vein, uWorleyAmount);
  }

  // Voronoi cell overlay — crystalline additive highlights (shader-dev T4)
  if (uVoronoiAmount > 0.001) {
    float vCell = voronoi(vUv * uVoronoiScale + vec2(time * 0.3, time * 0.2));
    float vRidge = 1.0 - smoothstep(0.0, 0.25, vCell);
    rgb += vRidge * uVoronoiAmount * vec3(0.6, 0.8, 1.0);
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
    vec3 ringHue = hsv2rgb(vec3(fract(time * 0.07 + ringR * 0.5), 0.85, 1.0));
    rgb += ringHue * ring * uRingIntensity * texColor.a;
    ringSum = ring;
  }

  // --- Fresnel rim chromatic glow ---
  if (uRimIntensity > 0.001 && rimFactor > 0.01) {
    // Rim hue: direction of alpha gradient + time drift
    float rimAngle = atan(rimGrad.y, rimGrad.x);
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

  gl_FragColor = vec4(rgb, alpha);
}
