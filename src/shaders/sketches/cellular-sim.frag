// ======================================================
// Cellular Sim Pass (Tier B — T-B1) — REVISED
// Maps: cellular-automata (Gray-Scott Reaction-Diffusion)
//
// Pearson 1993 formulation with classic "maze" regime params for
// fast visible pattern formation at 60fps × 20 steps/frame.
//
//   du/dt = Du*∇²u - uv² + f*(1-u)
//   dv/dt = Dv*∇²v + uv² - (f+k)*v
//
// Du=1.0, Dv=0.5, dt=1.0 (absorbed into coefficients).
// Canonical 9-tap weighted Laplacian (Karl Sims).
// ======================================================
precision highp float;

uniform sampler2D uState;
uniform vec2 uGridSize;
uniform float uFeed;
uniform float uKill;
uniform float uDiffA;
uniform float uDiffB;
varying vec2 vUv;

// Karl Sims 9-tap weighted Laplacian:
//   center: -1, edges 0.2 each, diagonals 0.05 each → sums to 0
vec2 laplacian(vec2 uv) {
  vec2 px = 1.0 / uGridSize;
  vec2 c = texture2D(uState, uv).xy;
  vec2 l  = texture2D(uState, uv + vec2(-px.x, 0.0)).xy;
  vec2 r  = texture2D(uState, uv + vec2( px.x, 0.0)).xy;
  vec2 u  = texture2D(uState, uv + vec2(0.0,  px.y)).xy;
  vec2 d  = texture2D(uState, uv + vec2(0.0, -px.y)).xy;
  vec2 tl = texture2D(uState, uv + vec2(-px.x,  px.y)).xy;
  vec2 tr = texture2D(uState, uv + vec2( px.x,  px.y)).xy;
  vec2 bl = texture2D(uState, uv + vec2(-px.x, -px.y)).xy;
  vec2 br = texture2D(uState, uv + vec2( px.x, -px.y)).xy;
  return (l + r + u + d) * 0.2 + (tl + tr + bl + br) * 0.05 - c;
}

void main() {
  vec2 s = texture2D(uState, vUv).xy;
  float u = s.x;
  float v = s.y;
  vec2 lap = laplacian(vUv);

  float uvv = u * v * v;
  float du = uDiffA * lap.x - uvv + uFeed * (1.0 - u);
  float dv = uDiffB * lap.y + uvv - (uFeed + uKill) * v;

  // dt = 1.0 (absorbed). Clamp for numerical stability.
  vec2 next = clamp(vec2(u + du, v + dv), 0.0, 1.0);
  gl_FragColor = vec4(next, 0.0, 1.0);
}
