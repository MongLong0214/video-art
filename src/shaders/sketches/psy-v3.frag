precision highp float;

uniform float uTime;
uniform vec2 uResolution;

varying vec2 vUv;

#define PI 3.14159265359
#define TAU 6.28318530718
#define LOOP_DUR 9.98

// ─── SDF Library ────────────────────────────────────────

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

float sdEllipse(vec2 p, vec2 ab) {
  // Approximate ellipse SDF
  float k = length(p / ab);
  return (k - 1.0) * min(ab.x, ab.y);
}

float sdLine(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

// ─── Utility ────────────────────────────────────────────

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

// ─── Palette ────────────────────────────────────────────

vec3 bg = vec3(0.114, 0.169, 0.122);
vec3 burg = vec3(0.639, 0.149, 0.227);
vec3 burg2 = vec3(0.388, 0.118, 0.157);
vec3 gold = vec3(0.694, 0.651, 0.369);
vec3 olive = vec3(0.427, 0.404, 0.243);
vec3 navy = vec3(0.086, 0.173, 0.278);
vec3 blue = vec3(0.098, 0.247, 0.467);

// ─── Main ───────────────────────────────────────────────

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
  float lt = mod(uTime, LOOP_DUR);

  vec3 col = vec3(0.114, 0.169, 0.122);

  float breathe = 1.0 + 0.012 * sin(lt * TAU * 0.5 / LOOP_DUR);

  // ═══════════════════════════════════════════════
  // LAYER BLOCKS — Claude fills these from blueprint
  // ═══════════════════════════════════════════════
  // --- LAYER: layer_back ---
  // blend_mode: additive
  // shapes: 10
  // motion: per_instance
  for (int i = 0; i < 10; i++) {
    float fi = float(i);
    float ratio = fi / 9.0;
    float halfTurns = fi * 1.0 + 1.0;
    float angle = -lt * PI * halfTurns / LOOP_DUR;
    vec2 rP = rot(angle) * uv;
    float scale = pow(0.8200, fi) * breathe;
    float d = sdRoundedBox(rP, scale * vec2(0.2900, 0.3900), scale * 0.3500);
    float thick = mix(0.013, 0.003, ratio);
    float line = smoothstep(thick + 0.001, thick - 0.0005, abs(d));
    float glow = exp(-abs(d) * mix(60.0, 140.0, ratio)) * 0.3;
    float depthFade = mix(0.7, 0.15, ratio);
    int colorIdx = int(fi) - int(fi / 2.0) * 2;
    vec3 shapeCol = vec3(0.0);
    if (colorIdx == 0) shapeCol = burg;
    else if (colorIdx == 1) shapeCol = burg2;
    else shapeCol = burg;
    col += shapeCol * (line * 1.1 + glow) * depthFade;
  }

  // --- LAYER: layer_front ---
  // blend_mode: additive
  // shapes: 22
  // motion: shared_phase
  for (int i = 0; i < 22; i++) {
    float fi = float(i);
    float ratio = fi / 21.0;
    float zoomPhase = fract(lt * 4.0 / LOOP_DUR);
    float idx = fi + zoomPhase;
    float scale = pow(0.82, idx) * breathe;
    if (scale < 0.003) continue;
    vec2 rP = uv;
    float d = sdRoundedBox(rP, scale * vec2(0.2900, 0.3900), scale * 0.4000);
    float thick = mix(0.009, 0.0015, ratio);
    float line = smoothstep(thick + 0.001, thick - 0.0005, abs(d));
    float glow = 0.0;
    float depthFade = mix(1.0, 0.1, ratio);
    vec3 shapeCol = vec3(0.5);  // no color specified in blueprint
    col += shapeCol * (line * 1.1 + glow) * depthFade;
  }


  // Grain (looped)
  float nPhase = lt * TAU * 2.0 / LOOP_DUR;
  col += noise(uv * 8.0 + vec2(sin(nPhase), cos(nPhase)) * 2.0) * 0.02;

  col = clamp(col, 0.0, 2.0);
  gl_FragColor = vec4(col, 1.0);
}