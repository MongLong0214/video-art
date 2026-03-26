precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform float uSparkleCount;
uniform float uSparkleSizeMin;
uniform float uSparkleSizeMax;
uniform float uSparkleSpeed;
uniform vec3 uPalette[24];

#define TAU 6.28318530718
#define SPARKLE_PERIOD 5.0

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 col = inputColor.rgb;
  float t = uTime * uSparkleSpeed;
  float loopT = mod(t, SPARKLE_PERIOD) / SPARKLE_PERIOD;
  vec2 fragCoord = uv * uResolution;

  for (float i = 0.0; i < 120.0; i++) {
    if (i >= uSparkleCount) break;

    // Deterministic position from seed
    float seed = i * 7.31;
    vec2 pos = vec2(hash11(seed), hash11(seed + 3.7)) * uResolution;

    // Slight drift over time (loops perfectly)
    pos += 15.0 * vec2(
      sin(loopT * TAU + seed),
      cos(loopT * TAU + seed * 0.7 + 1.0)  // 0.7 is fine here — loopT already loops at period
    );

    // Size oscillation
    float sizeBase = mix(uSparkleSizeMin, uSparkleSizeMax, hash11(seed + 1.1));
    float sizePulse = 0.5 + 0.5 * sin(loopT * TAU * 2.0 + seed * 2.0);
    float size = sizeBase * sizePulse;

    // Brightness: fade in/out over loop
    float phase = fract(loopT + hash11(seed + 5.5));
    float brightness = pow(sin(phase * 3.14159), 3.0);

    // Distance falloff
    float dist = length(fragCoord - pos);
    float glow = exp(-dist * dist / (size * size + 0.1));

    // Color from palette
    int palIdx = int(mod(i, 24.0));
    vec3 sparkleColor = uPalette[palIdx];

    col += sparkleColor * glow * brightness * 0.6;
  }

  outputColor = vec4(col, inputColor.a);
}
