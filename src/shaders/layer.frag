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

// Depth cinematic
uniform float uHazeIntensity;
uniform float uDepthNorm;
uniform float uFeatherRadius;

// Hue-keying: color-region-based animation
uniform float uHueKey;         // 0=off, >0=hue regions animate differently
uniform float uHueSpeed;       // hue-region speed multiplier

// Palette snap: constrain hue to original image colors
uniform float uPaletteHues[8]; // extracted dominant hues (0~1)
uniform int uPaletteSize;      // 0=off (continuous), 1~8=snap mode

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

float snapToPalette(float hue) {
  if (uPaletteSize < 1) return hue;
  float best = uPaletteHues[0];
  float bestDist = 1.0;
  for (int i = 0; i < 8; i++) {
    if (i >= uPaletteSize) break;
    float h = uPaletteHues[i];
    float d = min(abs(hue - h), 1.0 - abs(hue - h));
    if (d < bestDist) { bestDist = d; best = h; }
  }
  return best;
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

  // Hue-keying: original hue drives per-pixel phase offset (warm vs cool regions animate differently)
  float huePhase = uHueKey > 0.001 ? hsv.x * uHueKey * uHueSpeed : 0.0;

  float safePeriod = max(uColorCyclePeriod, 1e-4);
  // Seamless loop: speed is quantized by scene-generator.ts so that
  // (duration / period * speed) is always an integer → fract wraps cleanly
  float hueShift = fract(time / safePeriod * uColorCycleSpeed + lumPhase + huePhase + uPhaseOffset / 360.0);

  float shiftedHue = snapToPalette(fract(hsv.x + hueShift));
  float injectedHue = snapToPalette(fract(hueShift + lum * uLuminanceKey));

  float blend = smoothstep(uSatBlendLow, uSatBlendHigh, originalSat);
  hsv.x = mix(injectedHue, shiftedHue, blend);

  float injectedSat = uSaturationBoost * uSatInjectionMul;
  float boostedSat = clamp(originalSat * uSaturationBoost, 0.0, 1.0);
  hsv.y = clamp(mix(injectedSat, boostedSat, blend), 0.0, 1.0);

  // Luminance preservation
  hsv.z = originalVal;

  // Atmospheric haze: far layers lose saturation
  hsv.y *= max(0.0, 1.0 - uHazeIntensity * (1.0 - uDepthNorm));

  vec3 rgb = hsv2rgb(hsv);

  // --- Glow (subtle) ---
  float safeGlowPeriod = max(uGlowPeriod, 1e-4);
  float glowT = time * TAU / safeGlowPeriod;
  float glowPulse = mix(1.0, uGlowPulseFloor + (1.0 - uGlowPulseFloor) * 0.5 * (1.0 + sin(glowT)), uGlowPulse);
  float glowFactor = 1.0 + uGlowIntensity * glowPulse;
  rgb *= glowFactor;

  // Edge vignette: alpha fade at UV boundaries
  float d = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  float feather = uFeatherRadius < 1e-4 ? 1.0 : smoothstep(0.0, uFeatherRadius, d);
  float alpha = texColor.a * uOpacity * feather;
  gl_FragColor = vec4(rgb, alpha);
}
