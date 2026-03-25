precision highp float;

uniform float uTime;
uniform vec2 uResolution;

varying vec2 vUv;

#define PI 3.14159265359
#define TAU 6.28318530718
#define LOOP_DUR 7.9333

// ─── SDF Library ────────────────────────────────────────

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// ─── Utility ────────────────────────────────────────────

mat2 rot(float a) {
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c);
}

// ─── Palette ────────────────────────────────────────────

vec3 bg = vec3(0.063, 0.067, 0.051);
vec3 yellow_bright = vec3(0.976, 0.973, 0.682);
vec3 blue_cool = vec3(0.667, 0.780, 0.843);
vec3 warm_outer = vec3(0.635, 0.565, 0.498);
vec3 warm_inner = vec3(0.988, 0.988, 0.984);
vec3 peach = vec3(0.969, 0.875, 0.812);
vec3 pink = vec3(0.929, 0.631, 0.620);
vec3 red = vec3(0.784, 0.388, 0.388);

// ─── Main ───────────────────────────────────────────────

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
  float lt = mod(uTime, LOOP_DUR);

  vec3 col = bg;

  // ═══════════════════════════════════════════════
  // LAYER 1: Pink/red rotating strokes (back, behind yellow border)
  // 2 large rounded-rect strokes rotating at different speeds
  // ═══════════════════════════════════════════════
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float halfTurns = fi * 3.0 + 5.0;
    float pAngle = -lt * PI * halfTurns / LOOP_DUR;
    vec2 pP = rot(pAngle) * uv;
    float pScale = 0.55;
    float d = sdRoundedBox(pP, vec2(pScale * 0.62, pScale), pScale * 0.30);
    float thick = 0.007;
    float line = smoothstep(thick + 0.001, thick - 0.0005, abs(d));
    float glow = exp(-abs(d) * 35.0) * 0.25;
    vec3 pCol = mix(pink, red, fi);
    col += pCol * (line * 1.0 + glow) * 0.55;
  }

  // ═══════════════════════════════════════════════
  // LAYER 2: Yellow outer border (static, single stroke)
  // ═══════════════════════════════════════════════
  {
    float d = sdRoundedBox(uv, vec2(0.37, 0.52), 0.16);
    float thick = 0.006;
    float line = smoothstep(thick + 0.001, thick - 0.0005, abs(d));
    float glow = exp(-abs(d) * 25.0) * 0.30;
    col += yellow_bright * (line * 1.2 + glow);
  }

  // ═══════════════════════════════════════════════
  // LAYER 3: Blue/cool secondary border (static, single stroke)
  // ═══════════════════════════════════════════════
  {
    float d = sdRoundedBox(uv, vec2(0.34, 0.48), 0.15);
    float thick = 0.005;
    float line = smoothstep(thick + 0.001, thick - 0.0005, abs(d));
    float glow = exp(-abs(d) * 40.0) * 0.15;
    col += blue_cool * (line * 0.9 + glow) * 0.7;
  }

  // ═══════════════════════════════════════════════
  // LAYER 4: Warm concentric rects with per-instance rotation
  // 9 instances, inner rotates faster (linear speed: i+1 half-turns/loop)
  // ═══════════════════════════════════════════════
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    float ratio = fi / 8.0;

    // Per-instance rotation: instance 0 = 1 half-turn, instance 8 = 9 half-turns
    float halfTurns = fi + 1.0;
    float bAngle = -lt * PI * halfTurns / LOOP_DUR;
    vec2 bP = rot(bAngle) * uv;

    // Concentric scale: each instance smaller by 0.84x
    float bScale = 0.45 * pow(0.84, fi);

    // SDF: rounded rect, portrait aspect, generous corner radius
    float d = sdRoundedBox(bP, vec2(bScale * 0.62, bScale), bScale * 0.30);

    // Depth-varying stroke width
    float thick = mix(0.010, 0.003, ratio);
    float line = smoothstep(thick + 0.001, thick - 0.0005, abs(d));

    // Glow with depth-varying decay — boosted for bright center
    float glow = exp(-abs(d) * mix(40.0, 140.0, ratio)) * 0.45;

    // Depth attenuation — raise far value for brighter center
    float depthFade = mix(0.70, 0.25, ratio);

    // Color gradient: warm_outer -> peach -> warm_inner
    vec3 bCol = ratio < 0.5
      ? mix(warm_outer, peach, ratio * 2.0)
      : mix(peach, warm_inner, (ratio - 0.5) * 2.0);

    col += bCol * (line * 1.1 + glow) * depthFade;
  }

  // ═══════════════════════════════════════════════
  // Vignette
  // ═══════════════════════════════════════════════
  float vigDist = length(uv * 2.0);
  float vig = smoothstep(0.75, 1.6, vigDist);
  col *= 1.0 - vig * 0.3;

  col = clamp(col, 0.0, 2.0);
  gl_FragColor = vec4(col, 1.0);
}
