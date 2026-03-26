precision highp float;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uOpacity;

// Color cycling
uniform float uColorCycleSpeed;
uniform float uColorCyclePeriod;
uniform float uPhaseOffset;

// Wave distortion
uniform float uWaveAmplitude;
uniform float uWaveFrequency;
uniform float uWavePeriod;

// Glow pulse
uniform float uGlowIntensity;
uniform float uGlowPulse;
uniform float uGlowPeriod;

// Parallax
uniform float uParallaxDepth;

// Psychedelic color engine
uniform float uSaturationBoost;
uniform float uLuminanceKey;

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

  // --- Parallax ---
  float parallaxT = time * TAU / uLoopDuration;
  vec2 parallaxOffset = uParallaxDepth * 0.02 * vec2(sin(parallaxT), cos(parallaxT * 2.0));

  // --- Wave ---
  float waveT = time * TAU / uWavePeriod;
  vec2 waveOffset = uWaveAmplitude * 0.001 * vec2(
    sin(waveT + vUv.y * uWaveFrequency * TAU),
    cos(waveT + vUv.x * uWaveFrequency * TAU + PI * 0.5)
  );

  vec2 uv = vUv + parallaxOffset + waveOffset;
  vec4 texColor = texture2D(uTexture, uv);
  if (texColor.a < 0.01) discard;

  // === PSYCHEDELIC COLOR ENGINE ===
  float lum = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
  vec3 hsv = rgb2hsv(texColor.rgb);
  float originalSat = hsv.y;

  // Time sweep — lumPhase as additive offset (guarantees seamless when K×speed is integer)
  float lumPhase = uLuminanceKey > 0.001 ? pow(1.0 - lum, 1.0 + uLuminanceKey) : 0.0;
  float hueShift = fract(time / uColorCyclePeriod * uColorCycleSpeed + lumPhase + uPhaseOffset / 360.0);

  // Two strategies blended by original saturation:
  // HIGH sat pixels: shift existing hue (preserves original palette character)
  float shiftedHue = fract(hsv.x + hueShift);

  // LOW sat pixels: inject rainbow from luminance (gives color to gray areas)
  float injectedHue = fract(hueShift + lum * uLuminanceKey);

  // Smooth blend: sat < 0.1 → fully injected, sat > 0.4 → fully shifted
  float blend = smoothstep(0.1, 0.4, originalSat);
  hsv.x = mix(injectedHue, shiftedHue, blend);

  // Saturation: ensure minimum for low-sat pixels so hue is visible
  float injectedSat = uSaturationBoost * 0.35;
  float boostedSat = clamp(originalSat * uSaturationBoost, 0.0, 1.0);
  hsv.y = mix(injectedSat, boostedSat, blend);
  hsv.y = clamp(hsv.y, 0.0, 1.0);

  vec3 rgb = hsv2rgb(hsv);

  // --- Glow ---
  float glowT = time * TAU / uGlowPeriod;
  float glowPulse = mix(1.0, 0.5 + 0.5 * sin(glowT), uGlowPulse);
  float glowFactor = 1.0 + uGlowIntensity * glowPulse;
  rgb *= glowFactor;

  gl_FragColor = vec4(rgb, texColor.a * uOpacity);
}
