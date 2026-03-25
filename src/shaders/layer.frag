precision highp float;

uniform sampler2D uTexture;
uniform float uTime;       // normalized 0..1 over uLoopDurationATION
uniform float uOpacity;

// Color cycling
uniform float uColorCycleSpeed;
uniform float uColorCycleHueRange;
uniform float uColorCyclePeriod;

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

varying vec2 vUv;

#define PI 3.14159265359
#define TAU 6.28318530718
uniform float uLoopDuration;

// RGB <-> HSL conversions
vec3 rgb2hsl(vec3 c) {
  float maxC = max(max(c.r, c.g), c.b);
  float minC = min(min(c.r, c.g), c.b);
  float l = (maxC + minC) * 0.5;
  float s = 0.0;
  float h = 0.0;

  if (maxC != minC) {
    float d = maxC - minC;
    s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);

    if (maxC == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
    else if (maxC == c.g) h = (c.b - c.r) / d + 2.0;
    else h = (c.r - c.g) / d + 4.0;
    h /= 6.0;
  }

  return vec3(h, s, l);
}

float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}

vec3 hsl2rgb(vec3 hsl) {
  float h = hsl.x, s = hsl.y, l = hsl.z;
  if (s == 0.0) return vec3(l);
  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;
  return vec3(
    hue2rgb(p, q, h + 1.0/3.0),
    hue2rgb(p, q, h),
    hue2rgb(p, q, h - 1.0/3.0)
  );
}

void main() {
  float time = uTime * uLoopDuration; // actual time in seconds

  // --- Parallax offset (auto circular motion) ---
  float parallaxT = time * TAU / uLoopDuration; // 1 cycle per 20s
  vec2 parallaxOffset = uParallaxDepth * 0.02 * vec2(
    sin(parallaxT),
    cos(parallaxT * 2.0)
  );

  // --- Wave distortion ---
  float waveT = time * TAU / uWavePeriod;
  vec2 waveOffset = uWaveAmplitude * 0.001 * vec2(
    sin(waveT + vUv.y * uWaveFrequency * TAU),
    cos(waveT + vUv.x * uWaveFrequency * TAU + PI * 0.5)
  );

  vec2 uv = vUv + parallaxOffset + waveOffset;

  // --- Sample texture ---
  vec4 texColor = texture2D(uTexture, uv);

  // Discard fully transparent
  if (texColor.a < 0.01) discard;

  // --- Color cycling (HSL hue shift) ---
  float cycleT = time * TAU / uColorCyclePeriod;
  float hueShift = uColorCycleSpeed * sin(cycleT) * (uColorCycleHueRange / 360.0);

  vec3 hsl = rgb2hsl(texColor.rgb);
  hsl.x = fract(hsl.x + hueShift);
  vec3 rgb = hsl2rgb(hsl);

  // --- Glow pulse ---
  float glowT = time * TAU / uGlowPeriod;
  float glowFactor = 1.0 + uGlowIntensity * (0.5 + 0.5 * sin(glowT));
  rgb *= glowFactor;

  gl_FragColor = vec4(rgb, texColor.a * uOpacity);
}
