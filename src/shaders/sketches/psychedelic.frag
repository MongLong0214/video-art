precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

varying vec2 vUv;

#define PI 3.14159265359
#define TAU 6.28318530718
#define LOOP_DUR 8.0

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

mat2 rot(float a) {
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
  float lt = mod(uTime, LOOP_DUR);

  vec3 col = vec3(0.035, 0.050, 0.038);

  // palette
  vec3 gold  = vec3(0.44, 0.41, 0.24);
  vec3 gold2 = vec3(0.38, 0.36, 0.22);
  vec3 navy  = vec3(0.082, 0.176, 0.318);
  vec3 navy2 = vec3(0.090, 0.176, 0.263);
  vec3 burg  = vec3(0.42, 0.12, 0.17);
  vec3 burg2 = vec3(0.36, 0.12, 0.15);

  // timing
  float zoomPhase = fract(lt * 4.0 / LOOP_DUR);
  float breathe = 1.0 + 0.012 * sin(lt * TAU * 2.0 / LOOP_DUR);

  // ═══════════════════════════════════════════════
  // BACK LAYER: 10 burgundy rounded rects
  // Fixed sizes, each at its own clockwise rotation speed.
  // Completely independent from zoom — no discontinuities possible.
  // Each speed is an integer N of half-turns per loop → seamless.
  // ═══════════════════════════════════════════════
  for (int b = 0; b < 10; b++) {
    float fb = float(b);
    float bRatio = fb / 9.0;

    // fixed sizes: largest to smallest
    float bScale = 0.75 * pow(0.82, fb) * breathe;
    float bH = bScale * 0.70;

    // each layer: different integer speed (half-turns per loop)
    // layer 0: 1 half-turn, layer 1: 2, ... layer 9: 10
    float halfTurns = fb + 1.0;
    float bAngle = -lt * PI * halfTurns / LOOP_DUR;

    vec2 bP = rot(bAngle) * uv;
    float dB = sdRoundedBox(bP, vec2(bH * 0.55, bH), bH * 0.35);

    float bThick = mix(0.013, 0.003, bRatio);
    float bLine = smoothstep(bThick + 0.001, bThick - 0.0005, abs(dB));
    float bGlow = exp(-abs(dB) * mix(60.0, 140.0, bRatio)) * 0.30;

    float bDepth = mix(0.7, 0.15, bRatio);
    vec3 bCol = mix(burg, burg2, bRatio);

    col += bCol * (bLine * 1.1 + bGlow) * bDepth;
  }

  // ═══════════════════════════════════════════════
  // FRONT LAYER: 22 gold + navy tunnel frames
  // Inward zoom pull, no rotation, no wobble.
  // ═══════════════════════════════════════════════
  for (int i = 0; i < 22; i++) {
    float fi = float(i);
    float idx = fi + zoomPhase;

    float scale = pow(0.82, idx) * breathe;
    if (scale < 0.003) continue;

    float ratio = clamp(idx / 21.0, 0.0, 1.0);

    // gold frame
    float gH = scale * 0.78;
    float dG = sdRoundedBox(uv, vec2(gH * 0.58, gH), gH * 0.40);

    // navy frame
    float nH = scale * 0.65;
    float dN = sdRoundedBox(uv, vec2(nH * 0.58, nH), nH * 0.40);

    // line rendering
    float thick = mix(0.009, 0.0015, ratio);
    float goldLine = smoothstep(thick + 0.001, thick - 0.0005, abs(dG));
    float navyLine = smoothstep(thick * 0.85 + 0.001, thick * 0.85 - 0.0005, abs(dN));

    // glow
    float gGlow = exp(-abs(dG) * mix(80.0, 180.0, ratio)) * 0.35;
    float nGlow = exp(-abs(dN) * mix(90.0, 190.0, ratio)) * 0.30;

    // depth + seamless fade
    float depthFade = mix(1.0, 0.12, ratio);
    float fadeIn = smoothstep(0.0, 1.5, idx);
    float fadeOut = smoothstep(0.004, 0.02, scale);
    float alpha = fadeIn * fadeOut * depthFade;

    vec3 gCol = mix(gold, gold2, ratio);
    vec3 nCol = mix(navy, navy2, ratio);

    col += gCol * (goldLine * 1.2 + gGlow) * alpha;
    col += nCol * (navyLine * 1.0 + nGlow) * alpha;
  }

  // subtle noise (looped)
  float nPhase = lt * TAU * 2.0 / LOOP_DUR;
  col += noise(uv * 8.0 + vec2(sin(nPhase), cos(nPhase)) * 2.0) * 0.02;

  col = clamp(col, 0.0, 2.0);
  gl_FragColor = vec4(col, 1.0);
}