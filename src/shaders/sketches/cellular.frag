// ======================================================
// Cellular Display Pass (Tier B — T-B1) — REVISED
// Maps: cellular-automata + color-palette (IQ cosine)
//
// Reads Gray-Scott state (uState.xy = u, v) and colormaps to RGB.
// v is the "active species" (the visible pattern), u is "substrate".
// ======================================================
precision highp float;

uniform sampler2D uState;
uniform float uTime;
varying vec2 vUv;

#define TAU 6.28318530718

void main() {
  vec2 s = texture2D(uState, vUv).xy;
  float u = s.x;
  float v = s.y;

  // Expand v range — patterns typically live in 0.1..0.45
  float m = smoothstep(0.05, 0.35, v);

  // IQ cosine palette — psychedelic drift
  float t = uTime * 0.08;
  vec3 palA = vec3(0.5, 0.3, 0.5);
  vec3 palB = vec3(0.5, 0.5, 0.5);
  vec3 palC = vec3(1.0, 0.7, 0.4);
  vec3 palD = vec3(0.0 + t, 0.2, 0.5);
  vec3 pattern = palA + palB * cos(TAU * (palC * m + palD));

  // Dark background where no pattern (v tiny)
  vec3 bg = vec3(0.02, 0.01, 0.06);
  vec3 col = mix(bg, pattern, m);

  // Slight u-tint for depth (u high = substrate visible)
  col += vec3(0.05, 0.02, 0.1) * (1.0 - u) * 0.3;

  gl_FragColor = vec4(col, 1.0);
}
