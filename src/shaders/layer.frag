precision highp float;

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

  // Breathing UV distortion
  vec2 breathUv = vUv;
  if (uBreathAmp > 0.0001) {
    float breathT = time * TAU / max(uBreathPeriod, 1e-4);
    vec2 fromCenter = breathUv - 0.5;
    float dist = length(fromCenter);
    float breathWave = sin(breathT + dist * uBreathFreq) * uBreathAmp;
    breathUv += normalize(fromCenter + 1e-6) * breathWave * dist;
  }

  vec4 texColor = texture2D(uTexture, breathUv);

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
    nHue = fbm(vUv * uNoiseScale + flow);
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
    // Sharpen + bias so bands are crisp but not dominant
    float ring = pow(max(ringWave, 0.0), 3.0);
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
