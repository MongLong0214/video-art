// ======================================================
// Volumetric Sketch (Tier B — T-B2)
// Maps: volumetric-rendering, procedural-noise (3D fbm)
//
// Raymarched volumetric fog/cloud with animated 3D fbm density field.
// Front-to-back accumulation with early termination.
// ======================================================
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

#define MAX_STEPS 64
#define TAU 6.28318530718
#define DUR 5.0

// 3D hash
float hash31(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

// 3D value noise
float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash31(i + vec3(0,0,0));
  float n100 = hash31(i + vec3(1,0,0));
  float n010 = hash31(i + vec3(0,1,0));
  float n110 = hash31(i + vec3(1,1,0));
  float n001 = hash31(i + vec3(0,0,1));
  float n101 = hash31(i + vec3(1,0,1));
  float n011 = hash31(i + vec3(0,1,1));
  float n111 = hash31(i + vec3(1,1,1));
  float x00 = mix(n000, n100, f.x);
  float x10 = mix(n010, n110, f.x);
  float x01 = mix(n001, n101, f.x);
  float x11 = mix(n011, n111, f.x);
  float y0 = mix(x00, x10, f.y);
  float y1 = mix(x01, x11, f.y);
  return mix(y0, y1, f.z);
}

// 3D fbm
float fbm3(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise3(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 uv = (vUv - 0.5) * aspect;

  // Seamless loop: use fract(uTime/DUR) * TAU for periodic motion
  float t = fract(uTime / DUR) * TAU;

  // Camera / ray setup
  vec3 ro = vec3(0.0, 0.0, -2.0);
  vec3 rd = normalize(vec3(uv, 1.0));

  vec3 col = vec3(0.0);
  float alpha = 0.0;
  float stride = 0.08;

  for (int i = 0; i < MAX_STEPS; i++) {
    float tRay = float(i) * stride + 0.5;
    vec3 p = ro + rd * tRay;
    // Animate density field via time
    vec3 pq = p + vec3(sin(t) * 0.5, cos(t) * 0.3, t);
    float d = fbm3(pq * 0.8);
    float density = smoothstep(0.35, 0.85, d);

    // Gradient color by depth + direction
    vec3 cBottom = vec3(0.15, 0.05, 0.4);
    vec3 cTop = vec3(0.95, 0.55, 0.8);
    vec3 cMid = mix(cBottom, cTop, p.y * 0.5 + 0.5);
    // Hue drift
    vec3 cDrift = 0.5 + 0.5 * cos(TAU * (vec3(0.0, 0.33, 0.67) + t / TAU));
    vec3 c = mix(cMid, cDrift, 0.3);

    col += c * density * (1.0 - alpha) * 0.08;
    alpha += density * 0.03;
    if (alpha > 0.95) break;
  }

  // Background tint (visible where alpha low)
  col += vec3(0.04, 0.02, 0.1) * (1.0 - alpha);

  gl_FragColor = vec4(col, 1.0);
}
