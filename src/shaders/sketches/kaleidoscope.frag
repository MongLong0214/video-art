precision highp float;

uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

#define PI  3.14159265359
#define TAU 6.28318530718
#define DUR 10.0
#define FOLDS 10.0

// ─── Utility ────────────────────────────────────────────

mat2 rot(float a) { float s=sin(a),c=cos(a); return mat2(c,-s,s,c); }

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }

vec3 hsv(float h, float s, float v) {
  vec3 c = clamp(abs(mod(h*6.0+vec3(0,4,2),6.0)-3.0)-1.0, 0.0, 1.0);
  return v * mix(vec3(1), c, s);
}

// ─── SDF Primitives ─────────────────────────────────────

float sdLine(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p-a, ba = b-a;
  float h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0);
  return length(pa - ba*h);
}

float sdCircle(vec2 p, float r) { return length(p) - r; }

float sdStar(vec2 p, float r, int n, float m) {
  float an = PI / float(n);
  float en = PI / m;
  vec2 acs = vec2(cos(an), sin(an));
  vec2 ecs = vec2(cos(en), sin(en));
  float bn = mod(atan(p.x, p.y), 2.0*an) - an;
  p = length(p) * vec2(cos(bn), abs(sin(bn)));
  p -= r * acs;
  p += ecs * clamp(-dot(p, ecs), 0.0, r*acs.y/ecs.y);
  return length(p) * sign(p.x);
}

// ─── Kaleidoscope UV Fold ───────────────────────────────

vec2 kaleidoscope(vec2 uv, float folds, float rotation) {
  // Convert to polar
  float r = length(uv);
  float a = atan(uv.y, uv.x) + rotation;

  // Fold
  float segmentAngle = TAU / folds;
  a = mod(a, segmentAngle);

  // Mirror within segment for bilateral symmetry
  if (a > segmentAngle * 0.5) a = segmentAngle - a;

  // Back to cartesian
  return vec2(cos(a), sin(a)) * r;
}

// ─── Main ───────────────────────────────────────────────

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
  float lt = mod(uTime, DUR);
  float t = lt / DUR; // [0,1) normalized, all cycles must be integer multiples

  vec3 col = vec3(0.02, 0.01, 0.03); // near-black background

  // Global rotation (1 full rotation per loop for seamless)
  float globalRot = t * TAU;

  // ─── Layer 1: Outer concentric star rings ─────────────
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float radius = 0.15 + fi * 0.12;

    // Kaleidoscope fold with per-ring rotation offset
    float ringRot = globalRot * (1.0 + fi * 0.3);
    vec2 kUv = kaleidoscope(uv, FOLDS, ringRot);

    // Morphing star shape: point count oscillates (2 cycles/loop)
    float morph = 3.0 + sin(t * TAU * 2.0 + fi * 0.8) * 1.5;
    float starD = sdStar(kUv, radius, int(FOLDS * 0.5), morph);

    // Neon stroke
    float line = smoothstep(0.006, 0.0, abs(starD));
    float glow = exp(-abs(starD) * mix(60.0, 120.0, fi/5.0)) * 0.3;

    // Color: cycle through spectrum per ring + time
    float hue = t * 3.0 + fi * 0.12 + length(kUv) * 0.5;
    vec3 neonCol = hsv(hue, 0.9, 0.95);

    col += neonCol * (line * 0.8 + glow) * mix(0.7, 0.3, fi/5.0);
  }

  // ─── Layer 2: Inner petal/flower pattern ──────────────
  {
    vec2 kUv = kaleidoscope(uv, FOLDS, globalRot * 0.7);
    float r = length(uv);

    // Petal shape: line from center outward, curved
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float petalLen = 0.25 + fi * 0.08;
      float curve = 0.1 * sin(t * TAU * 3.0 + fi * 1.5);

      vec2 a = vec2(0.0, 0.02);
      vec2 b = vec2(petalLen, curve);
      float d = sdLine(kUv, a, b);

      float line = smoothstep(0.004, 0.0, d);
      float glow = exp(-d * 80.0) * 0.2;

      float hue = t * 4.0 + 0.6 + fi * 0.1;
      vec3 petalCol = hsv(hue, 0.85, 0.9);

      float mask = smoothstep(0.35, 0.0, r); // fade out toward edge
      col += petalCol * (line * 0.7 + glow) * mask;
    }
  }

  // ─── Layer 3: Spiral swirls at edges ──────────────────
  {
    float r = length(uv);
    float a = atan(uv.y, uv.x);

    // Spiral: r = base * exp(k * angle)
    for (int i = 0; i < 2; i++) {
      float fi = float(i);
      float spiralSpeed = 2.0 + fi;
      float spiralAngle = a + globalRot * spiralSpeed + fi * PI;

      // Log spiral SDF approximation
      float spiralR = 0.08 * exp(0.15 * spiralAngle);
      float spiralD = abs(r - mod(spiralR, 0.8));

      float line = smoothstep(0.005, 0.0, spiralD) * smoothstep(0.3, 0.5, r);
      float glow = exp(-spiralD * 50.0) * 0.15 * smoothstep(0.3, 0.6, r);

      float hue = t * 2.0 + 0.3 + fi * 0.5 + a / TAU;
      vec3 spiralCol = hsv(hue, 0.8, 0.85);

      col += spiralCol * (line * 0.5 + glow);
    }
  }

  // ─── Layer 4: Concentric circle rings ─────────────────
  {
    float r = length(uv);
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float ringR = 0.1 + fi * 0.15 + 0.02 * sin(t * TAU * 2.0 + fi);
      float d = abs(r - ringR);
      float line = smoothstep(0.003, 0.0, d);
      float glow = exp(-d * 100.0) * 0.12;

      float hue = t * 5.0 + fi * 0.2;
      col += hsv(hue, 0.7, 0.8) * (line * 0.4 + glow);
    }
  }

  // ─── Sparkle particles ────────────────────────────────
  {
    vec2 kUv = kaleidoscope(uv, FOLDS, globalRot * 0.5);
    for (int i = 0; i < 12; i++) {
      float fi = float(i);
      vec2 pos = vec2(
        hash(vec2(fi, 1.0)) * 0.8 - 0.1,
        hash(vec2(fi, 2.0)) * 0.5 - 0.05
      );
      float sparkle = smoothstep(0.008, 0.0, length(kUv - pos));
      // Twinkle: on/off cycle (3 cycles/loop, offset per particle)
      float twinkle = pow(max(sin(t * TAU * 3.0 + fi * 1.7), 0.0), 4.0);
      float hue = t * 6.0 + fi * 0.3;
      col += hsv(hue, 0.5, 1.0) * sparkle * twinkle * 0.8;
    }
  }

  // ─── Color inversion pulse (subtle, 1 cycle) ─────────
  float pulse = pow(max(sin(t * TAU), 0.0), 12.0) * 0.15;
  col = mix(col, 1.0 - col, pulse);

  // ─── Radial vignette ──────────────────────────────────
  float vig = smoothstep(0.5, 1.2, length(uv * 1.5));
  col *= 1.0 - vig * 0.4;

  // ─── Saturation boost ─────────────────────────────────
  float gray = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(gray), col, 1.4);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
