precision highp float;

uniform float uTime;
uniform vec2 uResolution;

varying vec2 vUv;

#define PI 3.14159265359
#define LOOP_DUR 7.9333

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

mat2 rot(float a) {
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c);
}

const vec3 BG     = vec3(0.063, 0.067, 0.051);
const vec3 YELLOW = vec3(0.976, 0.973, 0.682);
const vec3 BLUE   = vec3(0.667, 0.780, 0.843);
const vec3 WNEAR  = vec3(0.635, 0.565, 0.498);
const vec3 PEACH  = vec3(0.969, 0.875, 0.812);
const vec3 WFAR   = vec3(0.988, 0.988, 0.984);
const vec3 PINK   = vec3(0.929, 0.631, 0.620);
const vec3 RED    = vec3(0.784, 0.388, 0.388);

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
  float lt = mod(uTime, LOOP_DUR);
  vec3 col = BG;

  // ─── Pink/red rotating strokes ────────────────────────
  // Bright, thick neon strokes larger than yellow border
  {
    vec2 p1 = rot(-lt * PI * 5.0 / LOOP_DUR) * uv;
    float d1 = sdRoundedBox(p1, vec2(0.42, 0.67), 0.20);
    float line1 = smoothstep(0.014, 0.004, abs(d1));
    float glow1 = exp(-abs(d1) * 16.0) * 0.22;
    col += PINK * (line1 * 0.9 + glow1) * 0.75;

    vec2 p2 = rot(-lt * PI * 8.0 / LOOP_DUR) * uv;
    float d2 = sdRoundedBox(p2, vec2(0.42, 0.67), 0.20);
    float line2 = smoothstep(0.012, 0.004, abs(d2));
    float glow2 = exp(-abs(d2) * 18.0) * 0.18;
    col += RED * (line2 * 0.8 + glow2) * 0.65;
  }

  // ─── Yellow outer border ──────────────────────────────
  {
    float d = sdRoundedBox(uv, vec2(0.34, 0.54), 0.18);
    col += YELLOW * (smoothstep(0.007, 0.001, abs(d)) * 1.1 + exp(-abs(d) * 18.0) * 0.20);
  }

  // ─── Blue secondary border ────────────────────────────
  {
    float d = sdRoundedBox(uv, vec2(0.31, 0.50), 0.17);
    col += BLUE * (smoothstep(0.005, 0.001, abs(d)) * 0.8 + exp(-abs(d) * 22.0) * 0.12) * 0.65;
  }

  // ─── Warm concentric rects ────────────────────────────
  // 11 shapes, 0.88 scale step. i=0,1 static, rest rotate.
  // Tight glow (high decay) so individual lines stay visible.
  for (int i = 0; i < 11; i++) {
    float fi = float(i);
    float ratio = fi / 10.0;

    float halfTurns = max(0.0, fi - 1.0);
    vec2 rP = rot(-lt * PI * halfTurns / LOOP_DUR) * uv;

    float sc = 0.46 * pow(0.88, fi);
    float d = sdRoundedBox(rP, vec2(sc * 0.56, sc), sc * 0.40);

    // Crisp strokes — tight glow preserves line visibility
    float thick = mix(0.006, 0.0015, ratio);
    float line = smoothstep(thick + 0.0005, thick - 0.0003, abs(d));

    // Tight glow: high decay keeps halos narrow, but inner shapes have wider glow
    float glow = exp(-abs(d) * mix(45.0, 80.0, ratio)) * mix(0.18, 0.10, ratio);

    float depthFade = mix(0.75, 0.40, ratio);

    vec3 c = ratio < 0.35
      ? mix(WNEAR, PEACH, ratio / 0.35)
      : mix(PEACH, WFAR, (ratio - 0.35) / 0.65);

    col += c * (line * 1.4 + glow) * depthFade;
  }

  // ─── Vignette ─────────────────────────────────────────
  col *= 1.0 - smoothstep(0.8, 1.6, length(uv * 2.0)) * 0.25;

  gl_FragColor = vec4(clamp(col, 0.0, 2.0), 1.0);
}
