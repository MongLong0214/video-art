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

varying vec2 vUv;

#define PI 3.14159265359
#define TAU 6.28318530718
uniform float uLoopDuration;

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

  // No wave/parallax — structure stays pixel-stable
  vec4 texColor = texture2D(uTexture, vUv);
  if (texColor.a < 0.01) discard;

  // === LUMINANCE-PRESERVING HUE ROTATION ===
  float lum = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
  vec3 hsv = rgb2hsv(texColor.rgb);
  float originalSat = hsv.y;
  float originalVal = hsv.z;

  float lumPhase = uLuminanceKey > 0.001 ? pow(1.0 - lum, uLumExponent + uLuminanceKey) : 0.0;
  float safePeriod = max(uColorCyclePeriod, 1e-4);
  // Seamless loop: speed is quantized by scene-generator.ts so that
  // (duration / period * speed) is always an integer → fract wraps cleanly
  float hueShift = fract(time / safePeriod * uColorCycleSpeed + lumPhase + uPhaseOffset / 360.0);

  float shiftedHue = fract(hsv.x + hueShift);
  float injectedHue = fract(hueShift + lum * uLuminanceKey);

  float blend = smoothstep(uSatBlendLow, uSatBlendHigh, originalSat);
  hsv.x = mix(injectedHue, shiftedHue, blend);

  float injectedSat = uSaturationBoost * uSatInjectionMul;
  float boostedSat = clamp(originalSat * uSaturationBoost, 0.0, 1.0);
  hsv.y = clamp(mix(injectedSat, boostedSat, blend), 0.0, 1.0);

  // Luminance preservation
  hsv.z = originalVal;

  vec3 rgb = hsv2rgb(hsv);

  // --- Glow (subtle) ---
  float safeGlowPeriod = max(uGlowPeriod, 1e-4);
  float glowT = time * TAU / safeGlowPeriod;
  float glowPulse = mix(1.0, uGlowPulseFloor + (1.0 - uGlowPulseFloor) * 0.5 * (1.0 + sin(glowT)), uGlowPulse);
  float glowFactor = 1.0 + uGlowIntensity * glowPulse;
  rgb *= glowFactor;

  gl_FragColor = vec4(rgb, texColor.a * uOpacity);
}
