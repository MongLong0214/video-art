precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

varying vec2 vUv;

#define PI 3.14159265359
#define TAU 6.28318530718

// --- noise utilities ---

mat2 rot(float a) {
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float val = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 6; i++) {
    val += amp * noise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return val;
}

// --- color palette ---

vec3 palette(float t) {
  vec3 a = vec3(0.5);
  vec3 b = vec3(0.5);
  vec3 c = vec3(1.0);
  vec3 d = vec3(0.263, 0.416, 0.557);
  return a + b * cos(TAU * (c * t + d));
}

// --- main ---

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
  float t = uTime * 0.3;

  // domain warping
  vec2 p = uv * 3.0;
  p *= rot(t * 0.2);

  float n1 = fbm(p + fbm(p + t));
  float n2 = fbm(p * 1.5 - vec2(t * 0.7, t * 0.3));

  float pattern = fbm(p + vec2(n1, n2) * 2.0);

  // kaleidoscope fold
  float angle = atan(uv.y, uv.x);
  float segments = 6.0;
  angle = mod(angle, TAU / segments) - TAU / (segments * 2.0);
  vec2 kUv = vec2(cos(angle), sin(angle)) * length(uv);

  float kPattern = fbm(kUv * 4.0 + vec2(pattern, t));

  // color
  float colorIdx = pattern * 0.6 + kPattern * 0.4 + t * 0.1;
  vec3 col = palette(colorIdx);

  // vignette
  float vig = 1.0 - dot(uv * 0.8, uv * 0.8);
  col *= smoothstep(0.0, 1.0, vig);

  // contrast + saturation boost
  col = pow(col, vec3(0.85));
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, 1.3);

  gl_FragColor = vec4(col, 1.0);
}
