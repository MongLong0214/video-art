// ======================================================
// Cellular Sim Pass (Tier B — T-B1)
// Maps: cellular-automata (Gray-Scott Reaction-Diffusion)
//
// One simulation step: reads prev state from uState, computes next step.
// Gray-Scott formula (Pearson 1993):
//   du/dt = Du*∇²u - uv² + f*(1-u)
//   dv/dt = Dv*∇²v + uv² - (f+k)*v
// Default params: f=0.0367, k=0.0649 → classic "coral" regime.
// ======================================================
precision highp float;

uniform sampler2D uState;
uniform vec2 uGridSize;
uniform float uFeed;
uniform float uKill;
uniform float uDiffA;
uniform float uDiffB;
uniform float uTime;
varying vec2 vUv;

// 9-tap discrete Laplacian
vec2 laplacian(vec2 uv) {
  vec2 px = 1.0 / uGridSize;
  vec2 c = texture2D(uState, uv).xy;
  vec2 l = texture2D(uState, uv + vec2(-px.x, 0.0)).xy;
  vec2 r = texture2D(uState, uv + vec2(px.x, 0.0)).xy;
  vec2 u = texture2D(uState, uv + vec2(0.0, px.y)).xy;
  vec2 d = texture2D(uState, uv + vec2(0.0, -px.y)).xy;
  vec2 tl = texture2D(uState, uv + vec2(-px.x, px.y)).xy;
  vec2 tr = texture2D(uState, uv + vec2(px.x, px.y)).xy;
  vec2 bl = texture2D(uState, uv + vec2(-px.x, -px.y)).xy;
  vec2 br = texture2D(uState, uv + vec2(px.x, -px.y)).xy;
  return (l + r + u + d) * 0.2 + (tl + tr + bl + br) * 0.05 - c;
}

void main() {
  vec2 s = texture2D(uState, vUv).xy;
  float u = s.x;
  float v = s.y;
  vec2 lap = laplacian(vUv);
  float du = uDiffA * lap.x - u * v * v + uFeed * (1.0 - u);
  float dv = uDiffB * lap.y + u * v * v - (uFeed + uKill) * v;
  // Clamp for numerical stability
  vec2 next = clamp(vec2(u + du, v + dv), 0.0, 1.0);
  gl_FragColor = vec4(next, 0.0, 1.0);
}
