// ======================================================
// Fractal Cave Sketch (Tier C Bundle — T-C1/C2/C3)
// Maps 7 shader-dev techniques in one file:
//   ray-marching, sdf-3d, sdf-tricks, csg-boolean-operations,
//   normal-estimation, lighting-model, shadow-techniques,
//   ambient-occlusion
//
// Max 600 LOC — sections delimited below.
// ======================================================
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

#define MAX_STEPS 128
#define MIN_DIST 0.001
#define MAX_DIST 50.0
#define TAU 6.28318530718
#define PI 3.14159265359

// ======================================================
// [SECTION 1] SDF Primitives & CSG Boolean Ops (sdf-3d, sdf-tricks, csg)
// ======================================================

float sdSphere(vec3 p, float r) { return length(p) - r; }

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

// CSG — IQ smooth blend formulas (T-C3 scope, defined here per AC-3.7 section-1)
float smoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

float smoothSubtract(float d1, float d2, float k) {
  float h = clamp(0.5 - 0.5 * (d2 + d1) / k, 0.0, 1.0);
  return mix(d2, -d1, h) + k * h * (1.0 - h);
}

float smoothIntersect(float d1, float d2, float k) {
  float h = clamp(0.5 - 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) + k * h * (1.0 - h);
}

// Domain operations
vec3 opRep(vec3 p, vec3 c) { return mod(p + 0.5 * c, c) - 0.5 * c; }

// ======================================================
// [SECTION 2] Scene Composition — animated morphing
// ======================================================
float sceneSDF(vec3 p) {
  // Infinite repetition
  vec3 pr = opRep(p, vec3(6.0));

  // Animated primitives
  float rSph = 0.8 + 0.2 * sin(uTime * 0.7);
  float sph = sdSphere(pr, rSph);
  vec3 boxOff = vec3(sin(uTime) * 0.4, cos(uTime * 0.8) * 0.3, 0.0);
  float box = sdBox(pr - boxOff, vec3(0.5));
  float tor = sdTorus(pr.xzy, vec2(1.2, 0.22));

  // CSG chain
  float a = smoothUnion(sph, box, 0.4);
  float b = smoothSubtract(tor, a, 0.15);
  return b;
}

// ======================================================
// [SECTION 3] Ray Marching + Normal Estimation
// ======================================================
float rayMarch(vec3 ro, vec3 rd) {
  float t = 0.0;
  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * t;
    float d = sceneSDF(p);
    if (d < MIN_DIST) return t;
    if (t > MAX_DIST) break;
    t += d * 0.9; // relaxation factor
  }
  return -1.0;
}

vec3 calcNormal(vec3 p) {
  const float e = 0.001;
  vec2 h = vec2(e, 0.0);
  return normalize(vec3(
    sceneSDF(p + h.xyy) - sceneSDF(p - h.xyy),
    sceneSDF(p + h.yxy) - sceneSDF(p - h.yxy),
    sceneSDF(p + h.yyx) - sceneSDF(p - h.yyx)
  ));
}

// ======================================================
// [SECTION 4] Lighting (Phong + Soft Shadow + AO)
// ======================================================
float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
  float res = 1.0;
  float t = mint;
  for (int i = 0; i < 32; i++) {
    float h = sceneSDF(ro + rd * t);
    if (h < 0.001) return 0.0;
    res = min(res, k * h / t);
    t += h;
    if (t > maxt) break;
  }
  return res;
}

float calcAO(vec3 p, vec3 n) {
  float occ = 0.0;
  float sca = 1.0;
  for (int i = 0; i < 5; i++) {
    float h = 0.001 + 0.15 * float(i) / 4.0;
    float d = sceneSDF(p + n * h);
    occ += (h - d) * sca;
    sca *= 0.95;
  }
  return clamp(1.0 - 1.5 * occ, 0.0, 1.0);
}

vec3 lighting(vec3 p, vec3 n, vec3 rd) {
  vec3 lightDir = normalize(vec3(0.5, 0.7, -0.3));
  float NdotL = max(dot(n, lightDir), 0.0);
  float shadow = softShadow(p, lightDir, 0.02, 5.0, 16.0);
  float ao = calcAO(p, n);

  vec3 reflDir = reflect(-lightDir, n);
  float spec = pow(max(dot(reflDir, -rd), 0.0), 32.0);

  vec3 ambient = vec3(0.1, 0.08, 0.15) * ao;
  vec3 diffuse = vec3(0.6, 0.4, 0.8) * NdotL * shadow * ao;
  vec3 specular = vec3(1.0, 0.9, 0.7) * spec * shadow;

  // Psychedelic rim via fresnel with hue-shifted color
  float rim = pow(1.0 - max(dot(n, -rd), 0.0), 2.0);
  vec3 rimColor = 0.5 + 0.5 * cos(TAU * (uTime * 0.05 + vec3(0.0, 0.33, 0.67)));

  return ambient + diffuse + specular + rim * rimColor * 0.5;
}

// ======================================================
// [SECTION 5] Main
// ======================================================
void main() {
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 uv = (vUv - 0.5) * 2.0 * aspect;

  // Camera — orbiting with time
  float camT = uTime * 0.3;
  vec3 ro = vec3(cos(camT) * 4.0, sin(camT * 0.7) * 2.0, sin(camT) * 4.0);
  vec3 target = vec3(0.0);
  vec3 forward = normalize(target - ro);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
  vec3 up = cross(forward, right);
  vec3 rd = normalize(uv.x * right + uv.y * up + 1.5 * forward);

  float t = rayMarch(ro, rd);
  vec3 col;
  if (t > 0.0) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);
    col = lighting(p, n, rd);
    // Depth fog
    col = mix(col, vec3(0.05, 0.03, 0.1), 1.0 - exp(-t * 0.03));
  } else {
    // Background gradient
    col = mix(vec3(0.03, 0.02, 0.08), vec3(0.1, 0.05, 0.2), uv.y * 0.5 + 0.5);
  }

  gl_FragColor = vec4(col, 1.0);
}
