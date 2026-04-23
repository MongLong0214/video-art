precision highp float;

// =============================================================================
// v60 — MASTERPIECE SYNTHESIS v47 Recipe (committed production)
//
// Reference bank: docs/research/MASTERPIECE-SYNTHESIS.md
// Target: commercial-safe (non-commercial use approved by Isaac 2026-04-23)
//
// Licensed ingredients:
//   [MIT]  iq Apollonian map              — iquilezles.org, 4sX3Rn, 4ds3zn
//   [MIT]  iq cosine palette              — iquilezles.org/articles/palettes
//   [CC0]  mrange smoothKaleidoscope      — Shadertoy 7lKSWW (SABS fold)
//   [Pub]  AgX tonemap                    — iolite-engine.com minimal AgX
//   [NC-SA] Way of Light volumetric       — Shadertoy cdsSRf (re-implemented)
//   [Pub math] Log-Moebius background     — Shadertoy XdyXD3 concept
//   [Pub math] IQ exponential fog         — iquilezles.org/articles/morenoise
//
// 6-Pass architecture (from MASTERPIECE-SYNTHESIS §Production Recipe):
//   Pass 0: Base IQ Apollonian + 3-stage orbit-trap color + free AO
//   Pass 1: Breathing fractal s (2 breaths/loop, integer)
//   Pass 2: Separate iridescence (Annihilation petrol slick via Fresnel)
//   Pass 3: Volumetric color accumulation along ray (Way of Light)
//   Pass 4: Background core + halo + palette-tinted glow (Way of Light)
//   Pass 5: Post AgX + S-curve + CA + exp fog + breathing vignette
//
// Strict seamless discipline (§Loop Strategy line 713):
//   All time terms: cos(integer · time) where time = phase · TAU
//   Camera orbit cycles: 2, 3 integer
//   Breathing: 2/loop; vignette: 1/loop
//   Palette cosine freq c = 1.0 integer for strict first/last match
//
// Masterpiece principles applied:
//   Doctor Strange §2373: "artist-broken math" — hand-tuned `s` offset
//   Annihilation §2383: separate iridescence pass for comp control
//   Enter The Void §2351: CA + vignette breathe + exposure pulse
//   Bressloff/Form constants: smoothKaleidoscope on geometry not post
//   Horsthuis §336: fog + scale cues = architectural depth
// =============================================================================

uniform float uTime;         // normalized [0..1]
uniform vec2  uResolution;
uniform float uSymmetry;     // N-fold mandala
uniform float uFoldScale;    // Apollonian s base
uniform int   uPaletteMode;
uniform float uHueSpeed;
uniform float uGlow;

varying vec2 vUv;

#define PI  3.14159265359
#define TAU 6.28318530718

// ═══════════════════════════════════════════════════════════════════════════
// [CC0] mrange smoothKaleidoscope (Shadertoy 7lKSWW)
// ═══════════════════════════════════════════════════════════════════════════
float pmin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
  return mix(b, a, h) - k*h*(1.0-h);
}
float pmax(float a, float b, float k) { return -pmin(-a, -b, k); }
float pabs(float a, float k) { return pmax(a, -a, k); }
vec2 toPolar(vec2 p) { return vec2(length(p), atan(p.y, p.x)); }
vec2 toRect(vec2 p) { return vec2(p.x*cos(p.y), p.x*sin(p.y)); }
float modMirror1(inout float p, float size) {
  float halfsize = size*0.5;
  float c = floor((p + halfsize)/size);
  p = mod(p + halfsize, size) - halfsize;
  p *= mod(c, 2.0)*2.0 - 1.0;
  return c;
}
float smoothKaleidoscope(inout vec2 p, float sm, float rep) {
  vec2 hpp = toPolar(p);
  modMirror1(hpp.y, TAU/rep);
  float sa = PI/rep - pabs(PI/rep - abs(hpp.y), sm);
  hpp.y = sign(hpp.y)*(sa);
  p = toRect(hpp);
  return 0.0;
}

// ═══════════════════════════════════════════════════════════════════════════
// [MIT] iq Apollonian fractal with 4-channel orbit trap
// ═══════════════════════════════════════════════════════════════════════════
vec4 gOrb;

// N-fold angular fold on xy-plane (structural kaleidoscope in 3D)
// Applied inside map() so symmetry is built into geometry, not post gimmick
vec3 foldSymmetry(vec3 p, float n) {
  float r = length(p.xy);
  float a = atan(p.y, p.x);
  float seg = TAU / n;
  // smooth abs fold (SABS-style)
  float ha = mod(a + seg*0.5, seg) - seg*0.5;
  ha = sqrt(ha*ha + 0.002) * sign(ha);
  p.xy = r * vec2(cos(ha), sin(ha));
  return p;
}

float apollonian(vec3 p, float s) {
  // Structural N-fold symmetry BEFORE Apollonian iteration
  // (§6 kaleidoscope math, doc line 1544: symmetry should be structural)
  p = foldSymmetry(p, max(uSymmetry, 3.0));

  float scale = 1.0;
  gOrb = vec4(1000.0);
  for (int i = 0; i < 8; i++) {
    p = -1.0 + 2.0*fract(0.5*p + 0.5);
    float r2 = dot(p, p);
    gOrb = min(gOrb, vec4(abs(p), r2));
    float k = s / r2;
    p     *= k;
    scale *= k;
  }
  return 0.25 * abs(p.y) / scale;
}

vec3 calcNormal(vec3 pos, float s) {
  float e = 0.001 * length(pos);
  vec2 k = vec2(1.0, -1.0);
  return normalize(
    k.xyy * apollonian(pos + k.xyy*e, s) +
    k.yyx * apollonian(pos + k.yyx*e, s) +
    k.yxy * apollonian(pos + k.yxy*e, s) +
    k.xxx * apollonian(pos + k.xxx*e, s)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// [MIT] iq cosine palette — strict seamless with c = 1.0 integer freq
// ═══════════════════════════════════════════════════════════════════════════
vec3 iqPal(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(TAU * (c*t + d));
}
vec3 dmtPalette(float t, int mode) {
  // Sacred Neon: magenta/cyan/gold/void (Android Jones, Luke Brown)
  if (mode == 0) return iqPal(t,
    vec3(0.5, 0.5, 0.5),
    vec3(0.5, 0.5, 0.5),
    vec3(1.0, 1.0, 1.0),        // INTEGER for strict seamless
    vec3(0.0, 0.33, 0.67));
  // Old-Master Visionary: glazed gold/umber/ruby/ultramarine (Fuchs, Klarwein)
  if (mode == 1) return iqPal(t,
    vec3(0.55, 0.45, 0.40),
    vec3(0.55, 0.50, 0.50),
    vec3(1.0, 1.0, 1.0),
    vec3(0.0, 0.20, 0.55));
  // Fractal Cinema: volumetric blues/metallic gold (Horsthuis, Trumbull)
  if (mode == 2) return iqPal(t,
    vec3(0.55, 0.55, 0.60),
    vec3(0.50, 0.50, 0.55),
    vec3(1.0, 1.0, 1.0),
    vec3(0.10, 0.42, 0.78));
  // Belson Cosmic: soft blue/amber/red-orange/void
  return iqPal(t,
    vec3(0.50, 0.50, 0.50),
    vec3(0.55, 0.55, 0.65),
    vec3(1.0, 1.0, 1.0),
    vec3(0.30, 0.55, 0.90));
}

// ═══════════════════════════════════════════════════════════════════════════
// [Public math] AgX tonemap (iolite-engine minimal implementation)
// ═══════════════════════════════════════════════════════════════════════════
const mat3 AGX_IN = mat3(
  0.842, 0.042, 0.042,
  0.096, 0.793, 0.096,
  0.062, 0.165, 0.862);
const mat3 AGX_OUT = mat3(
  1.197, -0.053, -0.053,
  -0.098, 1.152, -0.098,
  -0.099, -0.099, 1.199);
vec3 agx(vec3 c) {
  c = AGX_IN * max(c, vec3(1e-10));
  c = clamp((log2(c) + 12.47393) / (4.026069 + 12.47393), 0.0, 1.0);
  vec3 x2 = c*c; vec3 x4 = x2*x2;
  c = 15.5*x4*x2 - 40.14*x4*c + 31.96*x4 - 6.868*x2*c + 0.4298*x2 + 0.1191*c - 0.00232;
  return clamp(AGX_OUT * c, 0.0, 1.0);
}

// ═══════════════════════════════════════════════════════════════════════════
// Volumetric raymarch (Way of Light technique, re-implemented for non-commercial)
//   Pass 0+1+3 combined: ray marches through colored volume, accumulating
//   orbit-trap-driven color per step. Surface hit produces final BRDF shading.
// ═══════════════════════════════════════════════════════════════════════════
const int   MAX_STEPS = 180;
const float MAX_DIST  = 30.0;

struct Ray { float tHit; vec4 orb; vec3 volCol; bool hit; };

Ray raymarchVol(vec3 ro, vec3 rd, float s, float tNorm) {
  float d = 0.01;
  vec3 col = vec3(0.0);
  float sum = 0.0;
  bool hit = false;
  vec4 trap = vec4(1e3);

  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * d;
    float h = apollonian(p, s);

    // Volumetric accumulation: each step contributes palette-sampled color
    // weighted by orbit trap density. Coefficient kept low to prevent saturation.
    float phase = gOrb.y * 2.0 + gOrb.z * 0.7 + tNorm * uHueSpeed;
    vec3 volSample = dmtPalette(phase, uPaletteMode);
    float density = clamp(1.0 - gOrb.w * 0.8, 0.0, 1.0);
    col = mix(col, volSample, 0.008 * (1.0 - sum) * density);
    sum += 1.0 / float(MAX_STEPS);

    float precis = 0.0008 * d;
    if (h < precis) { hit = true; trap = gOrb; break; }
    if (d > MAX_DIST) break;
    d += h * 0.85;
  }

  Ray r;
  r.tHit = hit ? d : -1.0;
  r.orb  = trap;
  r.volCol = col;
  r.hit  = hit;
  return r;
}

// ═══════════════════════════════════════════════════════════════════════════
// Pass 4: Background (Way of Light glow + core + palette tint)
// ═══════════════════════════════════════════════════════════════════════════
vec3 backgroundVoid(vec3 rd, float tNorm) {
  float dir = max(0.0, dot(vec3(0.0, 0.0, 1.0), rd))*0.5 + 0.5;
  float glow = pow(dir, 5.0)   * 0.15;
  float core = pow(dir, 2500.0) * 0.55;
  vec3 bg = vec3(0.02, 0.005, 0.04) + (glow + core) * vec3(0.85, 0.75, 1.0);
  bg += dmtPalette(tNorm*uHueSpeed + 0.3, uPaletteMode) * glow * 0.6;
  return bg;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════
void main() {
  float t = uTime;
  float time = t * TAU;  // phase in radians, one loop = TAU

  // ── Screen space prep ─────────────────────────────────────────────────
  vec2 p = (vUv - 0.5) * 2.0;
  p.x *= uResolution.x / uResolution.y;

  // NOTE: Kaleidoscope moved into map() as structural 3D fold (§6)
  // No screen-space kaleidoscope here — avoids ray-direction seams

  // ── Camera: 3-axis integer-cycle orbit (strict seamless) ──────────────
  // 2 cycles X, 3 cycles Y (height), 2 cycles Z (phase-offset for drift)
  vec3 ro = vec3(
    2.6 * cos(2.0 * time),
    0.35 + 0.25 * cos(3.0 * time),
    2.6 * cos(0.7 + 2.0 * time)
  );
  vec3 ta = vec3(
    0.25 * cos(1.0 * time),
    0.15 * cos(2.0 * time),
    0.25 * cos(1.0 * time + 1.3)
  );
  float roll = 0.15 * cos(1.0 * time);
  vec3 cw = normalize(ta - ro);
  vec3 cpvec = vec3(sin(roll), cos(roll), 0.0);
  vec3 cu = normalize(cross(cw, cpvec));
  vec3 cv = normalize(cross(cu, cw));
  vec3 rd = normalize(p.x*cu + p.y*cv + 2.0*cw);

  // ── Pass 1: Fractal parameter breathing (2 breaths/loop integer) ──────
  float s = uFoldScale + 0.15 * cos(2.0 * time);

  // ── Pass 0+3: Volumetric raymarch + orbit trap ────────────────────────
  Ray rr = raymarchVol(ro, rd, s, t);

  vec3 col;
  if (rr.hit) {
    vec4 tra = rr.orb;
    vec3 pos = ro + rr.tHit * rd;
    vec3 nor = calcNormal(pos, s);

    // 3-light setup (iq Apollonian canonical)
    vec3 L1 = vec3( 0.577, 0.577, -0.577);
    vec3 L2 = vec3(-0.707, 0.0,    0.707);
    float key = clamp(dot(L1, nor), 0.0, 1.0);
    float bac = clamp(0.2 + 0.8*dot(L2, nor), 0.0, 1.0);
    float amb = 0.7 + 0.3*nor.y;
    // Free AO from orbit trap
    float ao  = pow(clamp(tra.w * 2.0, 0.0, 1.0), 1.2);

    vec3 brdf = vec3(0.40)*amb*ao
              + vec3(1.10)*key*ao
              + vec3(0.45)*bac*ao;

    // Pass 0: 3-stage orbit trap palette (iq Apollonian canonical coloring)
    vec3 c1 = dmtPalette(tra.y       + t*uHueSpeed,       uPaletteMode);
    vec3 c2 = dmtPalette(tra.z * 1.3 + t*uHueSpeed + 0.2, uPaletteMode);
    vec3 c3 = dmtPalette(tra.x * 0.8 + t*uHueSpeed + 0.5, uPaletteMode);

    vec3 surf = c1;
    surf = mix(surf, c2, pow(clamp(1.0 - 2.0*tra.z, 0.0, 1.0), 6.0));
    surf = mix(surf, c3, pow(clamp(1.0 - 3.0*tra.x, 0.0, 1.0), 4.0));

    // Pass 2: Separate iridescence — Sun & Wang thin-film interference
    // (§13 Interference Shaders of Thin Films, academic math)
    // Wavelength-based RGB phase from film thickness + view angle
    float ndotv = clamp(dot(nor, -rd), 0.0, 1.0);
    float fresnel = pow(1.0 - ndotv, 4.0);  // sharper edge-only
    // Film thickness breathes 2x/loop (integer → strict seamless)
    float thickness = 380.0 + 120.0 * cos(2.0 * time);
    vec3 lambda = vec3(680.0, 530.0, 440.0);
    vec3 iphase = TAU * thickness * ndotv / lambda;
    vec3 iridescence = 0.5 + 0.5 * cos(iphase + vec3(0.0, 2.09, 4.18));

    // Compose surface
    col = surf * brdf * exp(-0.11 * rr.tHit);
    col += iridescence * fresnel * 0.5 * uGlow;  // tamed

    // Blend volumetric atmosphere (Way of Light)
    col = mix(col, rr.volCol * 1.5, 0.32);
  } else {
    // Pass 4: Background void + palette-tinted halo + volumetric residue
    col = backgroundVoid(rd, t);
    col += rr.volCol * 0.9;
  }

  // ── Pass 5a: Exponential fog (IQ Rainforest formula, public math) ─────
  float fogT = rr.hit ? rr.tHit : MAX_DIST;
  vec3 fogCol = dmtPalette(t*uHueSpeed + 0.7, uPaletteMode) * 0.06;
  col = mix(col, fogCol, 1.0 - exp(-0.022 * fogT * fogT));

  // ── Pass 5b: Clamp + Exposure + AgX tonemap ──────────────────────────
  col = min(col, vec3(4.0));  // guard against blowout
  col *= 1.1;
  col = agx(col);

  // ── Pass 5c: S-curve contrast ─────────────────────────────────────────
  col = col*0.55 + 0.45*col*col*(3.0 - 2.0*col);

  // ── Pass 5d: Saturation punch ─────────────────────────────────────────
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, 1.30);

  // ── Pass 5e: Radial CA (Enter The Void principle) ────────────────────
  vec2 vu = vUv - 0.5;
  float r0 = length(vu);
  col.r *= 1.0 + 0.20*r0;
  col.b *= 1.0 + 0.20*r0;
  col.g *= 1.0 - 0.04*r0;

  // ── Pass 5f: Breathing vignette (1 cycle/loop) ───────────────────────
  float vignStr = 0.30 + 0.10 * cos(1.0 * time);
  float vig = 1.0 - vignStr * pow(r0*1.6, 2.2);
  col *= max(vig, 0.0);

  // ── Pass 5g: Gamma ────────────────────────────────────────────────────
  col = pow(clamp(col, 0.0, 1.0), vec3(0.92));

  gl_FragColor = vec4(col, 1.0);
}
