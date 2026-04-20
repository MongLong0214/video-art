// ======================================================
// Particles Sim Pass (Tier B — T-B3)
// Maps: particle-system, simulation-physics
//
// Updates particle positions via curl-of-fbm velocity field.
// Position stored in RGBA32F texture (xy = position, z = life, w = seed).
// ======================================================
precision highp float;

uniform sampler2D uPosition;
uniform float uTime;
uniform float uDt;
varying vec2 vUv;

float hash31(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash31(i);
  float n100 = hash31(i + vec3(1,0,0));
  float n010 = hash31(i + vec3(0,1,0));
  float n110 = hash31(i + vec3(1,1,0));
  float n001 = hash31(i + vec3(0,0,1));
  float n101 = hash31(i + vec3(1,0,1));
  float n011 = hash31(i + vec3(0,1,1));
  float n111 = hash31(i + vec3(1,1,1));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}

// Curl of 2D noise field — divergence-free velocity
vec2 curl(vec2 p) {
  const float eps = 0.01;
  float n_px = noise3(vec3(p.x + eps, p.y, uTime * 0.2));
  float n_mx = noise3(vec3(p.x - eps, p.y, uTime * 0.2));
  float n_py = noise3(vec3(p.x, p.y + eps, uTime * 0.2));
  float n_my = noise3(vec3(p.x, p.y - eps, uTime * 0.2));
  float dndy = (n_py - n_my) / (2.0 * eps);
  float dndx = (n_px - n_mx) / (2.0 * eps);
  return vec2(dndy, -dndx);
}

void main() {
  vec4 state = texture2D(uPosition, vUv);
  vec2 pos = state.xy;
  float life = state.z;
  float seed = state.w;

  // Velocity from curl
  vec2 vel = curl(pos * 1.5 + seed * 10.0);

  // Advance position
  pos += vel * uDt * 0.5;

  // Wrap boundaries to keep particles in [-1, 1]
  pos = mod(pos + 1.0, 2.0) - 1.0;

  life -= uDt * 0.15;
  if (life <= 0.0) {
    // Respawn at random position
    float a = seed * 6.28318 + uTime;
    pos = vec2(cos(a) * 0.8, sin(a) * 0.8);
    life = 1.0;
  }

  gl_FragColor = vec4(pos, life, seed);
}
