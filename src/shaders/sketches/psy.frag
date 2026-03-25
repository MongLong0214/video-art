precision highp float;

uniform float uTime;
uniform vec2 uResolution;

varying vec2 vUv;

#define PI 3.14159265359
#define LOOP_DUR 9.9805

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

mat2 rot(float a) {
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c);
}

const vec3 BG   = vec3(0.153, 0.286, 0.169);  // #27492B
const vec3 GOLD = vec3(0.702, 0.655, 0.373);  // #B3A75F
const vec3 BURG = vec3(0.647, 0.145, 0.227);  // #A5253A
const vec3 NAVY = vec3(0.098, 0.247, 0.467);  // #193F77

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
  float lt = mod(uTime, LOOP_DUR);

  vec3 col = BG;

  // 12 concentric rounded rects, 3-color cycle: gold → burg → navy
  // Per-instance rotation: i=0 → 1 half-turn/loop, i=1 → 2, ... i=11 → 12
  // Outer shapes rotate slowest, inner fastest.
  // Alpha blending: each shape paints over previous.

  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    float ratio = fi / 11.0;

    // Per-instance rotation speed
    float halfTurns = fi + 1.0;
    float angle = -lt * PI * halfTurns / LOOP_DUR;
    vec2 rP = rot(angle) * uv;

    // Concentric scaling: 0.82 step
    float sc = 0.54 * pow(0.82, fi);

    // Portrait aspect ratio (9:16 canvas), generous corner radius
    float d = sdRoundedBox(rP, vec2(sc * 0.58, sc), sc * 0.40);

    // Depth-varying stroke width — thick opaque strokes matching original
    float thick = mix(0.022, 0.008, ratio);
    float line = smoothstep(thick + 0.0008, thick - 0.0004, abs(d));

    // 3-color cycle (integer modulo avoids float precision issues)
    int colorIdx = int(fi) - (int(fi) / 3) * 3;
    vec3 strokeCol = colorIdx == 0 ? GOLD : (colorIdx == 1 ? BURG : NAVY);

    // Alpha blend: stroke paints over background
    col = mix(col, strokeCol, line);
  }

  // Vignette: edges darken to near-black
  float vigDist = length(uv * 2.0);
  float vig = smoothstep(0.85, 1.5, vigDist);
  col = mix(col, vec3(0.075, 0.078, 0.075), vig * 0.5);

  gl_FragColor = vec4(col, 1.0);
}
