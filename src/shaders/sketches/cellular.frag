// ======================================================
// Cellular Display Pass (Tier B — T-B1)
// Maps: cellular-automata
//
// Reads final Gray-Scott state (uState.xy = u, v) and colormaps to RGB.
// ======================================================
precision highp float;

uniform sampler2D uState;
uniform float uTime;
varying vec2 vUv;

#define TAU 6.28318530718

// Display: read state and colormap. Tuning of Gray-Scott params is TBD
// (T-F3 follow-up). Currently maps u,v directly for visualization.
void main() {
  vec2 s = texture2D(uState, vUv).xy;
  float u = clamp(s.x, 0.0, 1.0);
  float v = clamp(s.y, 0.0, 1.0);

  // Cosine palette animated over time — multi-channel
  float t = uTime * 0.1;
  vec3 palA = vec3(0.5, 0.3, 0.5);
  vec3 palB = vec3(0.5, 0.5, 0.5);
  vec3 palC = vec3(1.0, 0.7, 0.4);
  vec3 palD = vec3(t, 0.2, 0.5);
  vec3 col = palA + palB * cos(TAU * (palC * (u * 0.5 + v * 0.5) + palD));
  gl_FragColor = vec4(col, 1.0);
}
