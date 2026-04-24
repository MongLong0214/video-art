precision highp float;

// =============================================================================
// v79 - Kluver Tunnel Form I + Instagram-derived smooth prism branch
//
// Target: docs/research/references/ig-DV_6YBZk293-reel.mp4
//
// Reference visual anatomy:
//   - Pure concentric rings (no mandala/kaleidoscope)
//   - Wavy/zigzag ring edges (theta-modulated log radius)
//   - Dark blue central eye with a small neon iris
//   - Full neon cyan/magenta/blue coverage with dark band gaps
//   - Cold-warm radial cycling constrained to the reference palette
//   - Log-spaced rings (denser outward)
//
// Implementation principles:
//   - 2D log-polar only, no 3D raymarch
//   - u = log(r) - time * zoom → seamless outward flow
//   - u_wavy = u + angular triangular waves -> zigzag ring edges
//   - Per-ring color from palette cycled by log-radius
//   - Core remains dark enough to read as an eye, not a white bloom
//   - paletteMode 3 adds trip-specific ghost rings, phosphenes, and hue drift
//   - paletteMode 4 adds directed v66 color hierarchy and macro density breath
//   - paletteMode 5 adds v67 jewel-eye color comfort and stronger red suppression
//   - paletteMode 6 adds v68 UV-magenta / acid-lime psychedelic color cycling
//   - paletteMode 7 adds v69 suction depth, counter-spin, dizzy ghost rings,
//     and UV/acid chroma afterimages
//   - paletteMode 8 adds v70 hard trip chroma pressure and stronger afterimages
//   - paletteMode 9 adds v71 inward chroma cascade across tunnel depth
//   - paletteMode 10 adds v72 smooth color-only cascade with cross/spoke color muted
//   - paletteMode 11 adds v73 dramatic inward color change without new line geometry
//   - paletteMode 12 adds v74 luminance-preserving depth color grading
//   - paletteMode 13 adds v75 seam-safe angular noise and smoother color grading
//   - paletteMode 14 adds v76 hypercolor-only polish on the v75 smooth branch
//   - paletteMode 15 adds v77 bright-prism grade with no black/navy shadow field
//   - paletteMode 16 adds v78 continuous color-gradient flow with no palette steps
//   - paletteMode 17 adds v79 DUtm4sck3eY-derived smooth prism suction
//
// STUDY / NON-COMMERCIAL use only.
// Ingredients: IQ cosine palette (MIT), Klüver form constant math (public).
// =============================================================================

uniform float uTime;
uniform vec2  uResolution;
uniform float uSymmetry;       // kept for uniform compat (unused in pure tunnel)
uniform float uZoomLoops;      // radial flow rate (rings-per-loop drift)
uniform float uCameraLoops;    // unused in v63
uniform float uFoldScale;      // ring density multiplier
uniform int   uPaletteMode;
uniform float uHueSpeed;
uniform float uGlow;

varying vec2 vUv;

#define PI  3.14159265359
#define TAU 6.28318530718

// ═══════════════════════════════════════════════════════════════════════════
// [MIT] IQ cosine palette — full spectrum hyperchromatic (c=1.0 integer)
// ═══════════════════════════════════════════════════════════════════════════
vec3 iqPal(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(TAU * (c*t + d));
}

vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + vec3(0.0, 0.6666667, 0.3333333)) * 6.0 - 3.0);
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}

float tri(float x) {
  return abs(fract(x) - 0.5) * 2.0;
}

float cellDist(float x, float center) {
  return abs(fract(x - center + 0.5) - 0.5);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash12(i + vec2(0.0, 0.0)), hash12(i + vec2(1.0, 0.0)), u.x),
    mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm2(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise2(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return v;
}

float polarFbm(float theta01, float angularScale, float y, float offset) {
  vec2 circle = vec2(cos(TAU * theta01), sin(TAU * theta01)) * angularScale * 0.045;
  return fbm2(vec2(circle.x + offset, circle.y + y));
}

vec3 refPalette(float t) {
  float x = fract(t) * 6.0;
  vec3 indigo = vec3(0.015, 0.015, 0.16);
  vec3 cyan   = vec3(0.00, 0.92, 0.72);
  vec3 green  = vec3(0.00, 0.88, 0.26);
  vec3 blue   = vec3(0.02, 0.13, 0.92);
  vec3 violet = vec3(0.34, 0.00, 0.82);
  vec3 mag    = vec3(0.74, 0.00, 0.95);
  float f = smoothstep(0.0, 1.0, fract(x));
  if (x < 1.0) return mix(indigo, cyan, f);
  if (x < 2.0) return mix(cyan, green, f);
  if (x < 3.0) return mix(green, blue, f);
  if (x < 4.0) return mix(blue, violet, f);
  if (x < 5.0) return mix(violet, mag, f);
  return mix(mag, indigo, f);
}

vec3 v66Palette(float t) {
  float x = fract(t) * 6.0;
  vec3 deep   = vec3(0.015, 0.010, 0.18);
  vec3 cyan   = vec3(0.00, 0.98, 0.88);
  vec3 lime   = vec3(0.18, 1.00, 0.12);
  vec3 blue   = vec3(0.02, 0.08, 1.00);
  vec3 violet = vec3(0.30, 0.00, 1.00);
  vec3 mag    = vec3(0.74, 0.00, 1.00);
  float f = smoothstep(0.0, 1.0, fract(x));
  if (x < 1.0) return mix(deep, cyan, f);
  if (x < 2.0) return mix(cyan, lime, f);
  if (x < 3.0) return mix(lime, blue, f);
  if (x < 4.0) return mix(blue, violet, f);
  if (x < 5.0) return mix(violet, mag, f);
  return mix(mag, cyan, f);
}

vec3 v67Palette(float t) {
  float x = fract(t) * 7.0;
  vec3 abyss  = vec3(0.004, 0.008, 0.16);
  vec3 cyan   = vec3(0.00, 1.00, 0.96);
  vec3 jade   = vec3(0.02, 0.90, 0.50);
  vec3 lime   = vec3(0.24, 1.00, 0.10);
  vec3 cobalt = vec3(0.01, 0.08, 1.00);
  vec3 violet = vec3(0.14, 0.00, 1.00);
  vec3 ultra  = vec3(0.22, 0.00, 0.98);
  float f = smoothstep(0.0, 1.0, fract(x));
  if (x < 1.0) return mix(abyss, cyan, f);
  if (x < 2.0) return mix(cyan, jade, f);
  if (x < 3.0) return mix(jade, lime, f);
  if (x < 4.0) return mix(lime, cobalt, f);
  if (x < 5.0) return mix(cobalt, violet, f);
  if (x < 6.0) return mix(violet, ultra, f);
  return mix(ultra, cyan, f);
}

vec3 v68Palette(float t) {
  float x = fract(t) * 8.0;
  vec3 abyss   = vec3(0.003, 0.006, 0.14);
  vec3 cyan    = vec3(0.00, 1.00, 1.00);
  vec3 acid    = vec3(0.58, 1.00, 0.02);
  vec3 jade    = vec3(0.00, 0.96, 0.48);
  vec3 cobalt  = vec3(0.00, 0.08, 1.00);
  vec3 violet  = vec3(0.24, 0.00, 1.00);
  vec3 uvMag   = vec3(0.66, 0.00, 1.00);
  vec3 blueHot = vec3(0.00, 0.38, 1.00);
  float f = smoothstep(0.0, 1.0, fract(x));
  if (x < 1.0) return mix(abyss, cyan, f);
  if (x < 2.0) return mix(cyan, acid, f);
  if (x < 3.0) return mix(acid, jade, f);
  if (x < 4.0) return mix(jade, cobalt, f);
  if (x < 5.0) return mix(cobalt, violet, f);
  if (x < 6.0) return mix(violet, uvMag, f);
  if (x < 7.0) return mix(uvMag, blueHot, f);
  return mix(blueHot, cyan, f);
}

vec3 v69Palette(float t) {
  float x = fract(t) * 9.0;
  vec3 voidBlue = vec3(0.002, 0.004, 0.12);
  vec3 cyan     = vec3(0.00, 1.00, 0.95);
  vec3 acid     = vec3(0.72, 1.00, 0.00);
  vec3 jade     = vec3(0.00, 0.98, 0.46);
  vec3 cobalt   = vec3(0.00, 0.06, 1.00);
  vec3 violet   = vec3(0.44, 0.00, 1.00);
  vec3 uvMag    = vec3(0.82, 0.00, 1.00);
  vec3 blueHot  = vec3(0.00, 0.32, 1.00);
  vec3 darkUv   = vec3(0.14, 0.00, 0.42);
  float f = smoothstep(0.0, 1.0, fract(x));
  if (x < 1.0) return mix(voidBlue, cyan, f);
  if (x < 2.0) return mix(cyan, acid, f);
  if (x < 3.0) return mix(acid, jade, f);
  if (x < 4.0) return mix(jade, cobalt, f);
  if (x < 5.0) return mix(cobalt, violet, f);
  if (x < 6.0) return mix(violet, uvMag, f);
  if (x < 7.0) return mix(uvMag, blueHot, f);
  if (x < 8.0) return mix(blueHot, darkUv, f);
  return mix(darkUv, cyan, f);
}

vec3 v70Palette(float t) {
  float x = fract(t) * 10.0;
  vec3 voidUv  = vec3(0.010, 0.000, 0.18);
  vec3 cyan    = vec3(0.00, 1.00, 0.90);
  vec3 acid    = vec3(0.82, 1.00, 0.00);
  vec3 venom   = vec3(0.12, 1.00, 0.10);
  vec3 cobalt  = vec3(0.00, 0.05, 1.00);
  vec3 violet  = vec3(0.58, 0.00, 1.00);
  vec3 hotMag  = vec3(0.98, 0.00, 1.00);
  vec3 shock   = vec3(0.00, 0.52, 1.00);
  vec3 blackUv = vec3(0.18, 0.00, 0.50);
  vec3 acid2   = vec3(0.64, 1.00, 0.00);
  float f = smoothstep(0.0, 1.0, fract(x));
  if (x < 1.0) return mix(voidUv, cyan, f);
  if (x < 2.0) return mix(cyan, acid, f);
  if (x < 3.0) return mix(acid, venom, f);
  if (x < 4.0) return mix(venom, cobalt, f);
  if (x < 5.0) return mix(cobalt, violet, f);
  if (x < 6.0) return mix(violet, hotMag, f);
  if (x < 7.0) return mix(hotMag, shock, f);
  if (x < 8.0) return mix(shock, blackUv, f);
  if (x < 9.0) return mix(blackUv, acid2, f);
  return mix(acid2, cyan, f);
}

vec3 v71Palette(float t) {
  float x = fract(t) * 12.0;
  vec3 voidUv   = vec3(0.006, 0.000, 0.18);
  vec3 cyan     = vec3(0.00, 1.00, 0.92);
  vec3 acid     = vec3(0.82, 1.00, 0.00);
  vec3 neonMint = vec3(0.00, 1.00, 0.42);
  vec3 cobalt   = vec3(0.00, 0.05, 1.00);
  vec3 violet   = vec3(0.58, 0.00, 1.00);
  vec3 hotMag   = vec3(1.00, 0.00, 0.96);
  vec3 roseUv   = vec3(0.90, 0.00, 0.52);
  vec3 indigo   = vec3(0.10, 0.00, 0.52);
  vec3 shock    = vec3(0.00, 0.58, 1.00);
  vec3 lime     = vec3(0.58, 1.00, 0.00);
  vec3 deepCyan = vec3(0.00, 0.34, 0.44);
  float f = smoothstep(0.0, 1.0, fract(x));
  if (x < 1.0) return mix(voidUv, cyan, f);
  if (x < 2.0) return mix(cyan, acid, f);
  if (x < 3.0) return mix(acid, neonMint, f);
  if (x < 4.0) return mix(neonMint, cobalt, f);
  if (x < 5.0) return mix(cobalt, violet, f);
  if (x < 6.0) return mix(violet, hotMag, f);
  if (x < 7.0) return mix(hotMag, roseUv, f);
  if (x < 8.0) return mix(roseUv, indigo, f);
  if (x < 9.0) return mix(indigo, shock, f);
  if (x < 10.0) return mix(shock, lime, f);
  if (x < 11.0) return mix(lime, deepCyan, f);
  return mix(deepCyan, cyan, f);
}

vec3 v72Palette(float t) {
  float x = fract(t) * 9.0;
  vec3 deepUv  = vec3(0.010, 0.000, 0.20);
  vec3 cyan    = vec3(0.00, 0.96, 0.88);
  vec3 acid    = vec3(0.62, 1.00, 0.06);
  vec3 mint    = vec3(0.00, 0.92, 0.46);
  vec3 cobalt  = vec3(0.00, 0.08, 0.96);
  vec3 violet  = vec3(0.44, 0.00, 0.98);
  vec3 magenta = vec3(0.86, 0.00, 0.90);
  vec3 indigo  = vec3(0.11, 0.00, 0.48);
  vec3 iris    = vec3(0.00, 0.80, 0.92);
  float f = smoothstep(0.0, 1.0, fract(x));
  if (x < 1.0) return mix(deepUv, cyan, f);
  if (x < 2.0) return mix(cyan, acid, f);
  if (x < 3.0) return mix(acid, mint, f);
  if (x < 4.0) return mix(mint, cobalt, f);
  if (x < 5.0) return mix(cobalt, violet, f);
  if (x < 6.0) return mix(violet, magenta, f);
  if (x < 7.0) return mix(magenta, indigo, f);
  if (x < 8.0) return mix(indigo, iris, f);
  return mix(iris, cyan, f);
}

vec3 v73Palette(float t) {
  float x = fract(t) * 10.0;
  vec3 abyss    = vec3(0.004, 0.000, 0.16);
  vec3 cyan     = vec3(0.00, 1.00, 0.92);
  vec3 acid     = vec3(0.78, 1.00, 0.00);
  vec3 emerald  = vec3(0.00, 1.00, 0.34);
  vec3 cobalt   = vec3(0.00, 0.05, 1.00);
  vec3 violet   = vec3(0.52, 0.00, 1.00);
  vec3 magenta  = vec3(1.00, 0.00, 0.92);
  vec3 fuchsia  = vec3(0.92, 0.00, 0.54);
  vec3 blackUv  = vec3(0.08, 0.00, 0.42);
  vec3 electric = vec3(0.00, 0.62, 1.00);
  float f = smoothstep(0.0, 1.0, fract(x));
  if (x < 1.0) return mix(abyss, cyan, f);
  if (x < 2.0) return mix(cyan, acid, f);
  if (x < 3.0) return mix(acid, emerald, f);
  if (x < 4.0) return mix(emerald, cobalt, f);
  if (x < 5.0) return mix(cobalt, violet, f);
  if (x < 6.0) return mix(violet, magenta, f);
  if (x < 7.0) return mix(magenta, fuchsia, f);
  if (x < 8.0) return mix(fuchsia, blackUv, f);
  if (x < 9.0) return mix(blackUv, electric, f);
  return mix(electric, cyan, f);
}

vec3 v74Palette(float t) {
  float x = fract(t) * 8.0;
  vec3 blackUv = vec3(0.010, 0.000, 0.20);
  vec3 cyan    = vec3(0.00, 1.00, 0.96);
  vec3 acid    = vec3(0.62, 1.00, 0.00);
  vec3 mint    = vec3(0.00, 1.00, 0.40);
  vec3 cobalt  = vec3(0.00, 0.05, 1.00);
  vec3 violet  = vec3(0.58, 0.00, 1.00);
  vec3 magenta = vec3(1.00, 0.00, 1.00);
  vec3 sky     = vec3(0.00, 0.62, 1.00);
  float f = smoothstep(0.0, 1.0, fract(x));
  if (x < 1.0) return mix(blackUv, cyan, f);
  if (x < 2.0) return mix(cyan, acid, f);
  if (x < 3.0) return mix(acid, mint, f);
  if (x < 4.0) return mix(mint, cobalt, f);
  if (x < 5.0) return mix(cobalt, violet, f);
  if (x < 6.0) return mix(violet, magenta, f);
  if (x < 7.0) return mix(magenta, sky, f);
  return mix(sky, cyan, f);
}

vec3 v75Palette(float t) {
  vec3 c = iqPal(
    t,
    vec3(0.42, 0.50, 0.58),
    vec3(0.48, 0.48, 0.46),
    vec3(1.0, 1.0, 1.0),
    vec3(0.04, 0.33, 0.64)
  );
  c.r *= 0.82;
  c.gb *= vec2(1.08, 1.16);
  return max(c, vec3(0.0));
}

vec3 v76Palette(float t) {
  float p = fract(t);
  vec3 prism = iqPal(
    p,
    vec3(0.48, 0.52, 0.58),
    vec3(0.52, 0.50, 0.50),
    vec3(1.0, 1.0, 1.0),
    vec3(0.00, 0.28, 0.63)
  );
  vec3 hyper = iqPal(
    p + 0.13,
    vec3(0.54, 0.48, 0.56),
    vec3(0.46, 0.52, 0.50),
    vec3(1.0, 1.0, 1.0),
    vec3(0.64, 0.08, 0.37)
  );
  vec3 c = mix(prism, hyper, 0.34 + 0.16 * sin(TAU * p));
  c = mix(c, c.gbr, 0.10 + 0.08 * sin(TAU * (p * 2.0 + 0.18)));
  c.r *= 1.10;
  c.g *= 1.18;
  c.b *= 1.22;
  return pow(max(c, vec3(0.0)), vec3(0.84));
}

vec3 v77Palette(float t) {
  float x = fract(t) * 10.0;
  vec3 aqua      = vec3(0.00, 1.00, 0.98);
  vec3 lemon     = vec3(0.96, 1.00, 0.08);
  vec3 mint      = vec3(0.00, 1.00, 0.52);
  vec3 sky       = vec3(0.00, 0.62, 1.00);
  vec3 lavender  = vec3(0.58, 0.32, 1.00);
  vec3 fuchsia   = vec3(1.00, 0.00, 0.95);
  vec3 rose      = vec3(1.00, 0.18, 0.62);
  vec3 tangerine = vec3(1.00, 0.48, 0.08);
  vec3 chart     = vec3(0.58, 1.00, 0.00);
  vec3 pearlCyan = vec3(0.64, 1.00, 0.92);
  float f = smoothstep(0.0, 1.0, fract(x));
  if (x < 1.0) return mix(aqua, lemon, f);
  if (x < 2.0) return mix(lemon, mint, f);
  if (x < 3.0) return mix(mint, sky, f);
  if (x < 4.0) return mix(sky, lavender, f);
  if (x < 5.0) return mix(lavender, fuchsia, f);
  if (x < 6.0) return mix(fuchsia, rose, f);
  if (x < 7.0) return mix(rose, tangerine, f);
  if (x < 8.0) return mix(tangerine, chart, f);
  if (x < 9.0) return mix(chart, pearlCyan, f);
  return mix(pearlCyan, aqua, f);
}

vec3 v78Palette(float t) {
  float p = fract(t);
  float h = 0.74
    + 0.17 * sin(TAU * (p + 0.02))
    + 0.045 * sin(TAU * (p * 2.0 + 0.21));
  vec3 neon = hsv2rgb(vec3(fract(h), 0.90, 1.0));
  vec3 pearl = hsv2rgb(vec3(fract(h + 0.018), 0.50, 1.0));
  vec3 glow = hsv2rgb(vec3(fract(h - 0.034), 0.72, 1.0));
  vec3 lime = hsv2rgb(vec3(0.285 + 0.018 * sin(TAU * (p + 0.38)), 0.82, 1.0));
  vec3 col = mix(pearl, neon, 0.72);
  col = mix(col, glow, 0.18 + 0.06 * sin(TAU * (p + 0.19)));
  col = mix(col, lime, 0.055 + 0.050 * pow(0.5 + 0.5 * sin(TAU * (p + 0.08)), 3.0));
  return pow(clamp(col, 0.0, 1.0), vec3(0.86));
}

float circularDist(float a, float b) {
  return abs(fract(a - b + 0.5) - 0.5);
}

float smoothPaletteWeight(float p, float center, float width) {
  float x = 1.0 - smoothstep(0.0, width, circularDist(p, center));
  return x * x * (3.0 - 2.0 * x);
}

vec3 v79Palette(float t) {
  float p = fract(t);
  vec3 c0 = vec3(0.969, 0.949, 0.314); // #f7f250
  vec3 c1 = vec3(0.847, 0.973, 0.816); // #d8f8d0
  vec3 c2 = vec3(0.224, 0.894, 0.953); // #39e4f3
  vec3 c3 = vec3(0.063, 0.678, 0.953); // #10adf3
  vec3 c4 = vec3(0.031, 0.435, 0.949); // #086ff2
  vec3 c5 = vec3(0.016, 0.122, 0.894); // #041fe4
  vec3 c6 = vec3(0.106, 0.016, 0.518); // #1b0484
  vec3 c7 = vec3(0.447, 0.024, 0.722); // #7206b8
  vec3 c8 = vec3(0.686, 0.133, 0.431); // #af226e
  vec3 c9 = vec3(0.867, 0.349, 0.118); // #dd591e
  vec3 c10 = vec3(0.925, 0.675, 0.122); // #ecac1f
  float w0 = smoothPaletteWeight(p, 0.000, 0.145);
  float w1 = smoothPaletteWeight(p, 0.080, 0.145);
  float w2 = smoothPaletteWeight(p, 0.180, 0.150);
  float w3 = smoothPaletteWeight(p, 0.285, 0.150);
  float w4 = smoothPaletteWeight(p, 0.390, 0.150);
  float w5 = smoothPaletteWeight(p, 0.500, 0.150);
  float w6 = smoothPaletteWeight(p, 0.595, 0.135);
  float w7 = smoothPaletteWeight(p, 0.685, 0.140);
  float w8 = smoothPaletteWeight(p, 0.775, 0.145);
  float w9 = smoothPaletteWeight(p, 0.870, 0.150);
  float w10 = smoothPaletteWeight(p, 0.950, 0.145);
  vec3 col = c0 * w0 + c1 * w1 + c2 * w2 + c3 * w3 + c4 * w4
    + c5 * w5 + c6 * w6 + c7 * w7 + c8 * w8 + c9 * w9 + c10 * w10;
  float sumW = max(w0 + w1 + w2 + w3 + w4 + w5 + w6 + w7 + w8 + w9 + w10, 0.0001);
  col /= sumW;
  vec3 pearl = mix(c0, c1, 0.56);
  col = mix(col, pearl, 0.030 + 0.022 * sin(TAU * (p + 0.11)));
  return pow(clamp(col, 0.0, 1.0), vec3(0.90));
}

vec3 tunnelPalette(float t, int mode) {
  // Mode 0: Neon green/magenta/cyan (reference-matched)
  if (mode == 0) return refPalette(t);
  // Mode 1: Warm amber/violet
  if (mode == 1) return iqPal(t,
    vec3(0.55, 0.45, 0.45),
    vec3(0.55, 0.50, 0.55),
    vec3(1.0, 1.0, 1.0),
    vec3(0.0, 0.20, 0.55));
  // Mode 2: Electric cyan/magenta
  if (mode == 2) return iqPal(t,
    vec3(0.5, 0.5, 0.6),
    vec3(0.55, 0.55, 0.55),
    vec3(1.0, 1.0, 1.0),
    vec3(0.1, 0.42, 0.78));
  // Mode 3: full-spectrum LSD trip
  if (mode == 3) return iqPal(t,
    vec3(0.50, 0.48, 0.54),
    vec3(0.58, 0.56, 0.58),
    vec3(1.0, 1.0, 1.0),
    vec3(0.00, 0.31, 0.64));
  // Mode 4: v66 cyan/violet/lime-directed trip
  if (mode == 4) return v66Palette(t);
  // Mode 5: v67 cooler jewel-eye trip cut
  if (mode == 5) return v67Palette(t);
  // Mode 6: v68 hyperchromatic psychedelic trip cut
  if (mode == 6) return v68Palette(t);
  // Mode 7: v69 suction-depth dizzy trip cut
  if (mode == 7) return v69Palette(t);
  // Mode 8: v70 hard trip cut
  if (mode == 8) return v70Palette(t);
  // Mode 9: v71 inward chroma cascade cut
  if (mode == 9) return v71Palette(t);
  // Mode 10: v72 smooth no-cross color cascade cut
  if (mode == 10) return v72Palette(t);
  // Mode 11: v73 dramatic no-cross inward color branch
  if (mode == 11) return v73Palette(t);
  // Mode 12: v74 luminance-preserving depth color grading
  if (mode == 12) return v74Palette(t);
  // Mode 13: v75 smooth seam-safe color-grade branch
  if (mode == 13) return v75Palette(t);
  // Mode 14: v76 smooth hypercolor-only polish
  if (mode == 14) return v76Palette(t);
  // Mode 15: v77 bright-prism branch without black/navy shadow fields
  if (mode == 15) return v77Palette(t);
  // Mode 16: v78 continuous-gradient branch without palette stepping
  if (mode == 16) return v78Palette(t);
  // Mode 17: v79 reference-derived smooth prism branch
  return v79Palette(t);
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════
void main() {
  float t = uTime;
  float time = t * TAU;
  float v66Mode = uPaletteMode == 4 ? 1.0 : 0.0;
  float v67Mode = uPaletteMode == 5 ? 1.0 : 0.0;
  float v68Mode = uPaletteMode == 6 ? 1.0 : 0.0;
  float v69Mode = uPaletteMode == 7 ? 1.0 : 0.0;
  float v70Mode = uPaletteMode == 8 ? 1.0 : 0.0;
  float v71Mode = uPaletteMode == 9 ? 1.0 : 0.0;
  float v72Mode = uPaletteMode == 10 ? 1.0 : 0.0;
  float v73Mode = uPaletteMode == 11 ? 1.0 : 0.0;
  float v74Mode = uPaletteMode == 12 ? 1.0 : 0.0;
  float v75Mode = uPaletteMode == 13 ? 1.0 : 0.0;
  float v76Mode = uPaletteMode == 14 ? 1.0 : 0.0;
  float v77Mode = uPaletteMode == 15 ? 1.0 : 0.0;
  float v78Mode = uPaletteMode == 16 ? 1.0 : 0.0;
  float v79Mode = uPaletteMode == 17 ? 1.0 : 0.0;
  float seamSafeMode = max(max(max(max(v75Mode, v76Mode), v77Mode), v78Mode), v79Mode);
  float noCrossColorMode = max(max(max(max(max(max(max(v72Mode, v73Mode), v74Mode), v75Mode), v76Mode), v77Mode), v78Mode), v79Mode);
  v70Mode = max(v70Mode, v71Mode);
  v69Mode = max(v69Mode, max(v70Mode, noCrossColorMode));
  v68Mode = max(v68Mode, v69Mode);
  v67Mode = max(v67Mode, v68Mode);
  float masterMode = max(v66Mode, v67Mode);
  float tripMode = (uPaletteMode == 3 || uPaletteMode == 4 || uPaletteMode == 5 || uPaletteMode == 6 || uPaletteMode == 7 || uPaletteMode == 8 || uPaletteMode == 9 || uPaletteMode == 10 || uPaletteMode == 11 || uPaletteMode == 12 || uPaletteMode == 13 || uPaletteMode == 14 || uPaletteMode == 15 || uPaletteMode == 16 || uPaletteMode == 17) ? 1.0 : 0.0;
  float crossMute = 1.0 - noCrossColorMode;
  float macro = 0.5 + 0.5 * sin(TAU * t);
  float peak = smoothstep(0.18, 0.88, macro);

  // Screen coord, aspect-correct
  vec2 uv = (vUv - 0.5) * 2.0;
  uv.x *= uResolution.x / uResolution.y;

  float r = length(uv);
  float theta = atan(uv.y, uv.x);
  float baseR = r;
  float baseTheta = theta;
  float v79VerticalCalm = v79Mode * smoothstep(0.42, 0.92, abs(uv.y)) * smoothstep(0.26, 0.98, r);
  float preLog = log(max(r, 1e-6));
  float tripBreath = 0.5 + 0.5 * sin(TAU * t * 2.0);
  float eyePulse = 0.5 + 0.5 * sin(TAU * (t * 2.0 + 0.08));
  float psychPulse = 0.5 + 0.5 * sin(TAU * (t * 3.0 + 0.17));
  float dizzyPulse = 0.5 + 0.5 * sin(TAU * (t * 5.0 + 0.31));

  // Trip branch: loop-safe radial breathing and spiral perception. The base IG
  // branch stays pure log-polar; this only activates for paletteMode 3.
  float tripSwirl = smoothstep(0.018, 0.88, r) * (
    0.22 * sin(TAU * (preLog * 0.36 + t * 3.0)) +
    0.10 * sin(TAU * (r * 2.5 - t * 4.0))
  );
  float swirlBreath = mix(1.0, 0.84 + 0.30 * peak, masterMode);
  theta += tripMode * tripSwirl * swirlBreath;
  theta += v69Mode * smoothstep(0.025, 0.90, r) * (
    0.18 * sin(TAU * (preLog * 0.68 - t * 5.0)) +
    0.10 * sin(TAU * (r * 5.0 + t * 4.0 + theta / TAU * 2.0))
  );
  theta += v70Mode * smoothstep(0.035, 0.94, r) * (
    0.080 * sin(TAU * (preLog * 1.02 + t * 7.0 + theta / TAU * 3.0)) +
    0.055 * sin(TAU * (r * 7.0 - t * 6.0))
  );
  theta += v71Mode * smoothstep(0.04, 0.92, r) * (
    0.048 * sin(TAU * (preLog * 1.55 - t * 8.0 + theta / TAU * 5.0)) +
    0.034 * sin(TAU * (r * 9.0 + t * 7.0))
  );
  r *= 1.0 + tripMode * 0.045 * mix(1.0, 0.72 + 0.30 * peak, masterMode)
    * sin(TAU * (r * 3.0 + t * 2.0)) * smoothstep(0.02, 0.90, r);
  r *= 1.0 + v69Mode * 0.038 * sin(TAU * (preLog * 1.15 + t * 4.0)) * smoothstep(0.04, 0.94, r);
  r *= 1.0 + v70Mode * 0.026 * sin(TAU * (preLog * 1.70 - t * 6.0 + theta / TAU * 2.0)) * smoothstep(0.06, 0.94, r);
  r *= 1.0 + v71Mode * 0.018 * sin(TAU * (preLog * 2.10 + t * 8.0 - theta / TAU * 3.0)) * smoothstep(0.08, 0.92, r);
  theta += v78Mode * smoothstep(0.04, 0.92, r) * (
    0.060 * sin(TAU * (preLog * 0.56 - t * 3.0)) +
    0.034 * sin(TAU * (r * 4.0 + t * 2.0))
  );
  r *= 1.0 + v78Mode * 0.040 * sin(TAU * (preLog * 0.82 + t * 3.0)) * smoothstep(0.06, 0.94, r);
  theta += v79Mode * smoothstep(0.03, 0.78, r) * (
    0.070 * sin(TAU * (preLog * 0.50 - t * 3.0)) +
    0.026 * sin(TAU * (r * 3.0 + t * 2.0))
  );
  r *= 1.0 + v79Mode * 0.030 * sin(TAU * (preLog * 0.72 + t * 3.0)) * smoothstep(0.04, 0.78, r);
  theta = mix(theta, baseTheta, 0.74 * v79VerticalCalm);
  r = mix(r, baseR, 0.58 * v79VerticalCalm);

  // Log-polar radial axis.
  float u = log(max(r, 1e-6));

  // Continuous outward flow. For the IG config, ringFreq * uZoomLoops is an
  // integer so the fast push remains loopable instead of drifting.
  u -= t * uZoomLoops;

  // ─── WAVY RING EDGES (core signature) ───────────────────────────────
  // Multi-harmonic angular triangular waves make the concentric rings read
  // as jagged neon teeth instead of smooth mandala petals.
  float theta01 = theta / TAU + 0.5;
  vec2 roughUv = vec2(theta01 * 48.0 + t * 8.0, u * 14.0 - t * 20.0);
  vec2 grainUv = vec2(theta01 * 128.0 - t * 12.0, u * 42.0 + t * 28.0);
  vec2 brushUv = vec2(theta01 * 24.0 - t * 5.0, u * 8.0 + t * 12.0);
  float rough = mix(fbm2(roughUv), polarFbm(theta01, 48.0, roughUv.y, t * 8.0), seamSafeMode);
  float grain = mix(fbm2(grainUv), polarFbm(theta01, 128.0, grainUv.y, -t * 12.0), seamSafeMode);
  float brush = mix(fbm2(brushUv), polarFbm(theta01, 24.0, brushUv.y, -t * 5.0), seamSafeMode);
  float radialOuter = smoothstep(0.12, 0.92, r);
  float chunk = mix(
    fbm2(vec2(theta01 * 72.0 + t * 9.0, u * 10.0 - t * 16.0)),
    polarFbm(theta01, 72.0, u * 10.0 - t * 16.0, t * 9.0),
    seamSafeMode
  );
  float smear = mix(
    fbm2(vec2(theta01 * 15.0 - t * 3.0, u * 4.0 + t * 5.5)),
    polarFbm(theta01, 15.0, u * 4.0 + t * 5.5, -t * 3.0),
    seamSafeMode
  );
  float stitch = mix(
    fbm2(vec2(theta01 * 176.0 - t * 18.0, u * 16.0 + t * 11.0)),
    polarFbm(theta01, 176.0, u * 16.0 + t * 11.0, -t * 18.0),
    seamSafeMode
  );
  float dreamScale = uSymmetry * 4.0 + 24.0;
  float dream = mix(
    fbm2(vec2(theta01 * dreamScale + t * 14.0, u * 6.0 - t * 9.0)),
    polarFbm(theta01, dreamScale, u * 6.0 - t * 9.0, t * 14.0),
    seamSafeMode
  );
  rough = mix(rough, 0.5, 0.30 * v79VerticalCalm);
  grain = mix(grain, 0.5, 0.26 * v79VerticalCalm);
  brush = mix(brush, 0.5, 0.48 * v79VerticalCalm);
  chunk = mix(chunk, 0.5, 0.58 * v79VerticalCalm);
  smear = mix(smear, 0.5, 0.62 * v79VerticalCalm);
  stitch = mix(stitch, 0.5, 0.42 * v79VerticalCalm);
  dream = mix(dream, 0.5, 0.46 * v79VerticalCalm);

  float wavePrimary = (tri(theta01 * 32.0 + t * 2.0 + (rough - 0.5) * 0.35) - 0.5) * 0.032;
  float waveSecondary = (tri(theta01 * 16.0 - t * 2.0 + u) - 0.5) * 0.024;
  float waveChunk = (tri(theta01 * 18.0 - t * 1.35 + u * 0.42 + smear) - 0.5) * mix(0.006, 0.052, radialOuter);
  float microRipple = 0.012 * sin(TAU * (theta01 * 64.0 + u * 2.0 + t * 5.0));
  float wave = wavePrimary + waveSecondary + waveChunk + microRipple;
  wave += (rough - 0.5) * 0.030 + (grain - 0.5) * 0.012 + (chunk - 0.5) * 0.016 * radialOuter;
  wave += tripMode * mix(1.0, 0.82 + 0.42 * peak, masterMode) * (
    (tri(theta01 * max(uSymmetry, 6.0) + u * 0.70 - t * 2.0) - 0.5) * 0.034 * radialOuter +
    0.018 * sin(TAU * (theta01 * max(uSymmetry, 6.0) * 0.5 - u * 1.1 + t * 3.0)) +
    (dream - 0.5) * 0.028
  );
  wave += v69Mode * (
    0.026 * sin(TAU * (u * 1.80 - t * 5.0 + theta01 * 4.0)) +
    0.020 * (tri(theta01 * max(uSymmetry, 6.0) * 1.5 - u * 1.2 + t * 4.0) - 0.5)
  ) * smoothstep(0.06, 0.92, r);
  wave += v70Mode * (
    0.022 * sin(TAU * (u * 2.30 + theta01 * 9.0 - t * 8.0)) +
    0.018 * (tri(theta01 * max(uSymmetry, 6.0) * 2.0 + u * 1.5 - t * 6.0) - 0.5)
  ) * smoothstep(0.08, 0.94, r);
  wave += v71Mode * (
    0.018 * sin(TAU * (u * 2.70 - theta01 * 12.0 + t * 9.0)) +
    0.014 * (tri(theta01 * max(uSymmetry, 6.0) * 2.35 - u * 1.8 + t * 7.0) - 0.5)
  ) * smoothstep(0.08, 0.94, r);
  wave *= 1.0 - 0.68 * v79VerticalCalm;
  // Subtle global pulse, one cycle per loop.
  wave *= 1.0 + 0.20 * cos(time);
  float u_wavy = u + wave;

  // ─── RING PATTERN ───────────────────────────────────────────────────
  // Many rings per log unit — denser outward (log-space uniform density)
  float ringFreq = 6.0 * uFoldScale;
  float ringCoord = ringFreq * u_wavy + (grain - 0.5) * 0.13 + (brush - 0.5) * 0.12 * radialOuter;
  float v79CalmRingCoord = ringCoord;
  ringCoord += tripMode * ((dream - 0.5) * 0.22 + 0.06 * sin(TAU * (theta01 * max(uSymmetry, 6.0) * 0.5 + t * 3.0)));
  ringCoord += masterMode * mix(0.11, 0.075, v67Mode) * (peak - 0.45) * sin(TAU * (u * 0.5 - theta01 * 3.0 + t * 2.0));
  ringCoord += v68Mode * 0.060 * sin(TAU * (u * 1.25 + theta01 * 7.0 - t * 4.0 + dream));
  ringCoord += v69Mode * 0.135 * sin(TAU * (u * 0.86 - theta01 * 5.0 + t * 6.0))
    * (0.34 + 0.66 * radialOuter);
  ringCoord += v70Mode * 0.105 * sin(TAU * (u * 1.42 + theta01 * 10.0 - t * 8.0 + dream * 0.35))
    * (0.24 + 0.76 * radialOuter);
  ringCoord += v71Mode * 0.090 * sin(TAU * (u * 1.85 - theta01 * 12.0 + t * 9.0 + dream * 0.42))
    * (0.20 + 0.80 * radialOuter);
  ringCoord = mix(ringCoord, v79CalmRingCoord, 0.72 * v79VerticalCalm);
  float ringCell = fract(ringCoord);
  float ringWave = 0.5 + 0.5 * cos(TAU * ringCoord);
  float dCyan = cellDist(ringCell, 0.22 + (rough - 0.5) * 0.040);
  float dMag = cellDist(ringCell, 0.69 + (grain - 0.5) * 0.035);

  float cyanBand = 1.0 - smoothstep(0.068, 0.258, dCyan);
  float magBand = 1.0 - smoothstep(0.062, 0.212, dMag);
  float greenBand = 1.0 - smoothstep(0.044, 0.154, cellDist(ringCell, 0.34 + (smear - 0.5) * 0.030));
  float blueBand = 1.0 - smoothstep(0.040, 0.148, cellDist(ringCell, 0.56));
  float thinLine = pow(1.0 - abs(cos(TAU * ringCoord)), 7.0);
  float ghostRing = tripMode * pow(0.5 + 0.5 * cos(TAU * (ringCoord * 0.50 + 0.34 * sin(TAU * (theta01 * 6.0 + t * 2.0)) + t * 2.0)), 7.0)
    * (0.26 + 0.74 * radialOuter);
  float spoke = tripMode * pow(0.5 + 0.5 * cos(TAU * (theta01 * max(uSymmetry, 6.0) + u * 1.2 - t * max(uCameraLoops, 1.0))), 9.0)
    * smoothstep(0.05, 0.92, r);
  float depthGhost = v69Mode
    * pow(0.5 + 0.5 * cos(TAU * (ringCoord * 0.37 - u * 0.66 - t * 4.0 + 0.20 * sin(TAU * (theta01 * 4.0 + t * 2.0)))), 8.0)
    * smoothstep(0.035, 0.88, r);
  float counterSpoke = v69Mode
    * pow(0.5 + 0.5 * cos(TAU * (theta01 * max(uSymmetry, 6.0) * 1.55 - u * 1.8 + t * 5.0)), 11.0)
    * smoothstep(0.06, 0.90, r);
  ghostRing *= mix(1.0, mix(0.62 + 0.62 * peak, 0.54 + 0.56 * peak, v67Mode), masterMode);
  spoke *= mix(1.0, mix(0.48 + 0.78 * peak, 0.62 + 0.62 * peak, v67Mode), masterMode);

  // Edge-only chatter. This keeps the MASTERPIECE rule: intensity without
  // muddy noise, because noise roughens structure instead of replacing it.
  float edgeMask = clamp(cyanBand + blueBand + magBand + greenBand + thinLine, 0.0, 1.0);
  float tear = smoothstep(0.25, 0.78, chunk + rough * 0.28 + grain * 0.18);
  float dash = smoothstep(0.24, 0.82, stitch + chunk * 0.18);
  float brushBreak = 0.74 + 0.48 * smoothstep(0.34, 0.82, brush + grain * 0.24 + tear * 0.18);
  float chatter = 0.78 + 0.44 * smoothstep(0.32, 0.78, grain + rough * 0.25 + tear * 0.20);
  cyanBand *= chatter * (0.68 + 0.62 * dash + 0.16 * tripMode * dream);
  blueBand *= 0.48 + 0.20 * grain;
  magBand *= (0.98 + 0.34 * rough + 0.20 * tripMode * tripBreath) * (0.74 + 0.50 * dash);
  greenBand *= chatter * (0.62 + 0.54 * dash + 0.10 * tripMode * dream);
  cyanBand *= brushBreak;
  greenBand *= 0.88 + 0.30 * brush;
  magBand *= 0.86 + 0.30 * brush;
  cyanBand *= mix(1.0, 1.08, v67Mode);
  greenBand *= mix(1.0, 1.16, v67Mode);
  blueBand *= mix(1.0, 0.94, v67Mode);
  magBand *= mix(1.0, 0.48, v67Mode);
  cyanBand *= 1.0 + v68Mode * 0.10 * psychPulse;
  greenBand *= 1.0 + v68Mode * 0.20 * (0.55 + 0.45 * dash);
  float earlyMidMask = smoothstep(0.10, 0.32, r) * (1.0 - smoothstep(0.48, 0.78, r));
  magBand *= 1.0 + v68Mode * 0.36 * earlyMidMask;
  magBand *= 1.0 + v70Mode * 0.62 * smoothstep(0.08, 0.86, r);
  greenBand *= 1.0 + v70Mode * 0.24 * (0.40 + 0.60 * dash);
  cyanBand *= 1.0 + v70Mode * 0.10 * psychPulse;
  float depthRamp = smoothstep(0.02, 0.86, r);
  cyanBand *= 1.0 + v71Mode * 0.22 * (1.0 - depthRamp);
  magBand *= 1.0 + v71Mode * 0.34 * smoothstep(0.10, 0.72, r);
  greenBand *= 1.0 + v71Mode * 0.28 * (0.45 + 0.55 * sin(TAU * (u * 0.25 + t * 4.0)));
  float spokeColor = spoke * crossMute;
  float counterSpokeColor = counterSpoke * crossMute;
  float hotBand = clamp(cyanBand + blueBand + magBand + greenBand + thinLine * 0.22 + ghostRing * 0.30 + spokeColor * 0.18 + depthGhost * 0.22 + counterSpokeColor * 0.16, 0.0, 1.0);
  float darkGap = pow(1.0 - hotBand, 1.45);
  float edgeBoost = edgeMask * (0.34 + 0.38 * grain + 0.26 * tear);
  float phosphene = tripMode * smoothstep(0.50, 0.92, dream + stitch * 0.25) * (0.34 + 0.66 * edgeMask);

  // ─── PALETTE: radial hue cycle ──────────────────────────────────────
  // Hue shifts per log-unit → cold-warm radial gradient (reference signature)
  float palPhase = u_wavy * 0.45 + t * uHueSpeed + 0.08;
  vec3 cyanCol = vec3(0.00, 0.88, 0.66);
  vec3 greenCol = vec3(0.00, 0.78, 0.24);
  vec3 blueCol = vec3(0.02, 0.10, 0.84);
  vec3 magCol = vec3(0.30, 0.00, 0.98);
  vec3 violetCol = vec3(0.20, 0.00, 0.78);
  cyanCol = mix(cyanCol, vec3(0.00, 0.98, 0.86), tripMode);
  greenCol = mix(greenCol, vec3(0.22, 1.00, 0.10), tripMode);
  blueCol = mix(blueCol, vec3(0.04, 0.05, 1.00), tripMode);
  magCol = mix(magCol, vec3(0.62, 0.00, 1.00), tripMode);
  violetCol = mix(violetCol, vec3(0.34, 0.00, 0.95), tripMode);
  cyanCol = mix(cyanCol, mix(vec3(0.00, 1.00, 0.90), vec3(0.00, 1.00, 0.96), v67Mode), masterMode);
  greenCol = mix(greenCol, mix(vec3(0.18, 1.00, 0.16), vec3(0.14, 1.00, 0.28), v67Mode), masterMode);
  blueCol = mix(blueCol, mix(vec3(0.02, 0.06, 1.00), vec3(0.01, 0.08, 1.00), v67Mode), masterMode);
  magCol = mix(magCol, mix(vec3(0.56, 0.00, 1.00), vec3(0.18, 0.00, 1.00), v67Mode), masterMode);
  violetCol = mix(violetCol, mix(vec3(0.28, 0.00, 1.00), vec3(0.12, 0.02, 1.00), v67Mode), masterMode);
  cyanCol = mix(cyanCol, vec3(0.00, 0.96, 1.00), v68Mode);
  greenCol = mix(greenCol, vec3(0.52, 1.00, 0.02), v68Mode);
  blueCol = mix(blueCol, vec3(0.00, 0.18, 1.00), v68Mode);
  magCol = mix(magCol, vec3(0.54, 0.00, 1.00), v68Mode);
  violetCol = mix(violetCol, vec3(0.32, 0.00, 1.00), v68Mode);
  cyanCol = mix(cyanCol, vec3(0.00, 1.00, 0.94), v69Mode);
  greenCol = mix(greenCol, vec3(0.64, 1.00, 0.00), v69Mode);
  blueCol = mix(blueCol, vec3(0.00, 0.10, 1.00), v69Mode);
  magCol = mix(magCol, vec3(0.78, 0.00, 1.00), v69Mode);
  violetCol = mix(violetCol, vec3(0.48, 0.00, 1.00), v69Mode);
  cyanCol = mix(cyanCol, vec3(0.00, 1.00, 0.86), v70Mode);
  greenCol = mix(greenCol, vec3(0.76, 1.00, 0.00), v70Mode);
  blueCol = mix(blueCol, vec3(0.01, 0.04, 1.00), v70Mode);
  magCol = mix(magCol, vec3(0.96, 0.00, 1.00), v70Mode);
  violetCol = mix(violetCol, vec3(0.64, 0.00, 1.00), v70Mode);
  cyanCol = mix(cyanCol, vec3(0.00, 1.00, 0.90), v71Mode);
  greenCol = mix(greenCol, vec3(0.78, 1.00, 0.00), v71Mode);
  blueCol = mix(blueCol, vec3(0.02, 0.02, 1.00), v71Mode);
  magCol = mix(magCol, vec3(1.00, 0.00, 0.88), v71Mode);
  violetCol = mix(violetCol, vec3(0.70, 0.00, 1.00), v71Mode);
  cyanCol = mix(cyanCol, vec3(0.00, 0.96, 0.86), v72Mode);
  greenCol = mix(greenCol, vec3(0.58, 1.00, 0.08), v72Mode);
  blueCol = mix(blueCol, vec3(0.02, 0.08, 0.92), v72Mode);
  magCol = mix(magCol, vec3(0.76, 0.00, 0.88), v72Mode);
  violetCol = mix(violetCol, vec3(0.46, 0.00, 0.92), v72Mode);
  cyanCol = mix(cyanCol, vec3(0.00, 1.00, 0.94), v73Mode);
  greenCol = mix(greenCol, vec3(0.76, 1.00, 0.00), v73Mode);
  blueCol = mix(blueCol, vec3(0.00, 0.06, 1.00), v73Mode);
  magCol = mix(magCol, vec3(1.00, 0.00, 0.90), v73Mode);
  violetCol = mix(violetCol, vec3(0.58, 0.00, 1.00), v73Mode);
  cyanCol = mix(cyanCol, vec3(0.00, 1.00, 0.98), v76Mode);
  greenCol = mix(greenCol, vec3(0.72, 1.00, 0.00), v76Mode);
  blueCol = mix(blueCol, vec3(0.01, 0.04, 1.00), v76Mode);
  magCol = mix(magCol, vec3(1.00, 0.00, 0.98), v76Mode);
  violetCol = mix(violetCol, vec3(0.72, 0.00, 1.00), v76Mode);
  cyanCol = mix(cyanCol, vec3(0.00, 1.00, 0.98), v77Mode);
  greenCol = mix(greenCol, vec3(0.90, 1.00, 0.04), v77Mode);
  blueCol = mix(blueCol, vec3(0.20, 0.54, 1.00), v77Mode);
  magCol = mix(magCol, vec3(1.00, 0.04, 0.95), v77Mode);
  violetCol = mix(violetCol, vec3(0.72, 0.34, 1.00), v77Mode);
  float outerMask = smoothstep(0.34, 0.95, r);
  float midMask = smoothstep(0.10, 0.32, r) * (1.0 - smoothstep(0.48, 0.78, r));
  float inwardPhase = fract(-u * 0.22 + t * 5.0 + 0.10 * sin(TAU * (theta01 * 4.0 + t * 2.0)));
  float centerDepth = pow(1.0 - smoothstep(0.045, 0.92, r), 1.35);
  vec3 inwardCol = v71Palette(inwardPhase + centerDepth * 0.58 + dream * 0.10);
  float smoothDepth = pow(1.0 - smoothstep(0.035, 0.94, r), 1.20);
  float v72Phase = fract(-u * 0.18 + t * 4.0 + smoothDepth * 0.52);
  vec3 smoothCascadeCol = v72Palette(v72Phase);
  float dramaticDepth = pow(1.0 - smoothstep(0.028, 0.96, r), 1.08);
  float v73Phase = fract(-u * 0.52 + t * 6.0 + dramaticDepth * 1.34);
  vec3 dramaticCascadeCol = v73Palette(v73Phase);
  vec3 dramaticOffsetCol = v73Palette(v73Phase + 0.31 + dramaticDepth * 0.18);
  float v74Depth = pow(1.0 - smoothstep(0.026, 0.98, r), 0.92);
  vec3 v74OuterCol = v74Palette(t * 3.0 + 0.03);
  vec3 v74MidCol = v74Palette(t * 3.0 + 0.31);
  vec3 v74InnerCol = v74Palette(t * 3.0 + 0.62);
  vec3 v74GradeCol = mix(v74OuterCol, v74MidCol, smoothstep(0.16, 0.72, v74Depth));
  v74GradeCol = mix(v74GradeCol, v74InnerCol, smoothstep(0.62, 0.96, v74Depth));
  float v75Depth = pow(1.0 - smoothstep(0.026, 0.98, r), 0.82);
  vec3 v75OuterCol = v75Palette(t * 2.0 + 0.06);
  vec3 v75MidCol = v75Palette(t * 2.0 + 0.29);
  vec3 v75InnerCol = v75Palette(t * 2.0 + 0.52);
  vec3 v75GradeCol = mix(v75OuterCol, v75MidCol, smoothstep(0.10, 0.78, v75Depth));
  v75GradeCol = mix(v75GradeCol, v75InnerCol, smoothstep(0.58, 0.98, v75Depth));
  float v76Depth = v75Depth;
  vec3 v76OuterCol = v76Palette(t * 2.0 + 0.02);
  vec3 v76MidCol = v76Palette(t * 2.0 + 0.35);
  vec3 v76InnerCol = v76Palette(t * 2.0 + 0.68);
  vec3 v76GradeCol = mix(v76OuterCol, v76MidCol, smoothstep(0.10, 0.78, v76Depth));
  v76GradeCol = mix(v76GradeCol, v76InnerCol, smoothstep(0.58, 0.98, v76Depth));
  float v77Depth = v75Depth;
  vec3 v77OuterCol = v77Palette(t * 2.0 + 0.00);
  vec3 v77MidCol = v77Palette(t * 2.0 + 0.31);
  vec3 v77InnerCol = v77Palette(t * 2.0 + 0.64);
  vec3 v77GradeCol = mix(v77OuterCol, v77MidCol, smoothstep(0.10, 0.78, v77Depth));
  v77GradeCol = mix(v77GradeCol, v77InnerCol, smoothstep(0.58, 0.98, v77Depth));
  float v78Depth = pow(1.0 - smoothstep(0.022, 1.0, r), 0.74);
  float v78Flow = t + v78Depth * 0.34
    + 0.024 * sin(TAU * (t + v78Depth * 0.5));
  vec3 v78GradeCol = v78Palette(v78Flow);
  vec3 v78AccentCol = v78Palette(v78Flow + 0.070);
  vec3 v78UnifiedCol = mix(v78GradeCol, v78AccentCol, 0.18 + 0.12 * v78Depth);
  float v79Depth = pow(1.0 - smoothstep(0.018, 1.0, r), 0.62);
  float v79Flow = t + v79Depth * 0.72
    + 0.030 * sin(TAU * (t + v79Depth * 0.50))
    + 0.010 * sin(TAU * (t * 2.0 + theta01 * 2.0));
  vec3 v79GradeCol = v79Palette(v79Flow);
  vec3 v79AccentCol = v79Palette(v79Flow + 0.095);
  vec3 v79UnifiedCol = mix(v79GradeCol, v79AccentCol, 0.14 + 0.10 * v79Depth);
  cyanCol = mix(cyanCol, v78Palette(v78Flow + 0.000), v78Mode);
  greenCol = mix(greenCol, v78Palette(v78Flow + 0.045), v78Mode);
  blueCol = mix(blueCol, v78Palette(v78Flow + 0.090), v78Mode);
  magCol = mix(magCol, v78Palette(v78Flow + 0.135), v78Mode);
  violetCol = mix(violetCol, v78Palette(v78Flow + 0.180), v78Mode);
  cyanCol = mix(cyanCol, v79Palette(v79Flow + 0.000), v79Mode);
  greenCol = mix(greenCol, v79Palette(v79Flow + 0.135), v79Mode);
  blueCol = mix(blueCol, v79Palette(v79Flow + 0.285), v79Mode);
  magCol = mix(magCol, v79Palette(v79Flow + 0.565), v79Mode);
  violetCol = mix(violetCol, v79Palette(v79Flow + 0.455), v79Mode);
  vec3 rainbowA = tunnelPalette(palPhase + dream * 0.28 + t * 1.5, uPaletteMode);
  vec3 rainbowB = tunnelPalette(palPhase + 0.37 + ringCoord * 0.05 - t * 2.0, uPaletteMode);
  rainbowA = mix(rainbowA, rainbowA.gbr, tripMode * 0.18);
  rainbowB = mix(rainbowB, rainbowB.brg, tripMode * 0.14);
  rainbowA = mix(rainbowA, rainbowA.brg, v68Mode * 0.26);
  rainbowB = mix(rainbowB, rainbowB.gbr, v68Mode * 0.22);
  rainbowA.r *= mix(1.0, mix(0.70, mix(0.60, 0.50, v67Mode), masterMode), tripMode);
  rainbowB.r *= mix(1.0, mix(0.74, mix(0.64, 0.54, v67Mode), masterMode), tripMode);
  rainbowA.gb *= mix(vec2(1.0), mix(vec2(1.08, 1.12), mix(vec2(1.12, 1.20), vec2(1.15, 1.24), v67Mode), masterMode), tripMode);
  rainbowB.gb *= mix(vec2(1.0), mix(vec2(1.06, 1.10), mix(vec2(1.10, 1.18), vec2(1.13, 1.22), v67Mode), masterMode), tripMode);
  rainbowA = mix(rainbowA, v79Palette(v79Flow + 0.180 + dream * 0.045), v79Mode);
  rainbowB = mix(rainbowB, v79Palette(v79Flow + 0.505 + ringWave * 0.018), v79Mode);

  // Mix layers: saturated bands, electric transition edges, colored gaps.
  vec3 col = (vec3(0.000, 0.054, 0.035) + blueCol * 0.030 + violetCol * 0.020) * (0.62 + 0.62 * rough);
  vec3 v77ShadowCol = v77Palette(t * 2.0 + v77Depth * 0.48 + 0.18);
  col = mix(col, max(col, v77ShadowCol * (0.18 + 0.10 * radialOuter)), v77Mode);
  vec3 v78ShadowCol = mix(v78UnifiedCol, v78AccentCol, 0.24);
  col = mix(col, max(col, v78ShadowCol * (0.40 + 0.16 * radialOuter)), v78Mode);
  vec3 v79InkCol = mix(vec3(0.043, 0.004, 0.220), vec3(0.106, 0.016, 0.518), 0.55 + 0.45 * sin(TAU * (v79Flow + 0.19)));
  vec3 v79ShadowCol = mix(v79InkCol, v79UnifiedCol, 0.62);
  col = mix(col, max(col, v79ShadowCol * (0.38 + 0.18 * radialOuter)), v79Mode);
  col += cyanCol * cyanBand * mix(1.12, 1.20, v67Mode);
  col += greenCol * greenBand * mix(0.82, 0.96, v67Mode);
  col += blueCol * blueBand * mix(0.36, 0.32, v67Mode);
  float violetGate = clamp(magBand * (0.42 + 0.46 * midMask) + thinLine * 0.08, 0.0, 1.0);
  col.g *= 1.0 - 0.40 * violetGate;
  col += magCol * magBand * mix(0.34 + 0.12 * midMask, 0.12 + 0.06 * midMask, v67Mode);
  col += violetCol * (magBand + blueBand) * mix(0.22, 0.26, v67Mode);
  col += cyanCol * edgeBoost * 0.20 * uGlow;
  col += (cyanCol * 0.11 + greenCol * 0.07 + violetCol * 0.040) * edgeMask * tear * (0.22 + 0.17 * radialOuter);
  col *= mix(1.0 - 0.105 * darkGap, 1.0 - 0.020 * darkGap, v77Mode);
  col *= mix(1.0, 1.0 - 0.012 * darkGap, v78Mode);
  col *= mix(1.0, 1.0 - 0.010 * darkGap * edgeMask, v79Mode);
  col = mix(col, max(col, v77ShadowCol * (0.14 + 0.10 * darkGap)), v77Mode);
  col = mix(col, max(col, v78ShadowCol * (0.36 + 0.18 * darkGap)), v78Mode);
  col = mix(col, max(col, v79ShadowCol * (0.34 + 0.18 * darkGap * edgeMask)), v79Mode);
  col += vec3(0.0, 0.090, 0.050) * hotBand * (0.35 + 0.28 * rough);
  col += (cyanCol * 0.070 + greenCol * 0.060 + blueCol * 0.030) * (1.0 - hotBand) * (0.30 + 0.52 * rough);
  col += cyanCol * smoothstep(0.62, 0.90, brush + rough * 0.25 + tear * 0.12) * outerMask * 0.14;
  col += violetCol * smoothstep(0.52, 0.86, stitch + rough * 0.22) * magBand * (0.08 + 0.08 * midMask);
  col += tripMode * rainbowA * ghostRing * mix(0.16 + 0.32 * dream, 0.13 + 0.28 * dream, v67Mode) * uGlow;
  col += tripMode * rainbowB * spokeColor * edgeMask * (0.07 + 0.05 * tripBreath) * mix(1.0, mix(0.78 + 0.45 * peak, 0.72 + 0.38 * peak, v67Mode), masterMode);
  col += tripMode * mix(magCol, cyanCol, dream) * phosphene * mix(0.10, mix(0.075 + 0.055 * peak, 0.060 + 0.045 * peak, v67Mode), masterMode);
  vec3 acidCol = mix(greenCol, cyanCol, 0.34);
  vec3 uvCol = mix(magCol, violetCol, 0.42);
  col += mix(cyanCol, violetCol, 0.40 + 0.30 * dizzyPulse) * depthGhost * (0.12 + 0.10 * radialOuter);
  col += mix(acidCol, uvCol, 0.58) * counterSpokeColor * edgeMask * 0.14;
  vec3 v69AcidCol = vec3(0.62, 1.00, 0.00);
  vec3 v69UvCol = vec3(0.44, 0.00, 1.00);
  vec3 v69HotCol = vec3(0.58, 0.00, 1.00);
  float v69UvVein = v69Mode
    * pow(0.5 + 0.5 * sin(TAU * (ringCoord * 0.91 + theta01 * 7.0 + t * 5.0 + dream * 0.35)), 7.0)
    * edgeMask * smoothstep(0.07, 0.92, r);
  float v69AcidVein = v69Mode
    * pow(0.5 + 0.5 * cos(TAU * (ringCoord * 1.19 - theta01 * 4.0 - t * 6.0)), 8.0)
    * smoothstep(0.10, 0.96, r) * (0.34 + 0.66 * radialOuter);
  col += mix(v69UvCol, v69HotCol, dizzyPulse) * v69UvVein * 0.18 * crossMute;
  col += mix(v69AcidCol, cyanCol, 0.34) * v69AcidVein * 0.15 * crossMute;
  float v70HardVein = v70Mode
    * pow(0.5 + 0.5 * sin(TAU * (ringCoord * 1.48 + theta01 * 11.0 - t * 9.0 + dream * 0.40)), 6.0)
    * edgeMask * smoothstep(0.06, 0.96, r);
  float v70AcidFlash = v70Mode
    * pow(0.5 + 0.5 * cos(TAU * (ringCoord * 0.83 - u * 1.25 + theta01 * 6.0 + t * 8.0)), 9.0)
    * smoothstep(0.10, 0.98, r) * (0.30 + 0.70 * radialOuter);
  col += mix(vec3(0.90, 0.00, 1.00), vec3(0.46, 0.00, 1.00), dizzyPulse) * v70HardVein * 0.24;
  col += mix(vec3(0.72, 1.00, 0.00), vec3(0.00, 1.00, 0.82), psychPulse) * v70AcidFlash * 0.18;
  float v71DepthBand = v71Mode
    * pow(0.5 + 0.5 * sin(TAU * (inwardPhase * 5.0 + ringCoord * 0.19 + theta01 * 3.0)), 4.5)
    * smoothstep(0.035, 0.96, r);
  float v71InnerBloom = v71Mode
    * pow(1.0 - smoothstep(0.025, 0.74, r), 1.8)
    * (0.55 + 0.45 * sin(TAU * (inwardPhase + t * 2.0)));
  col = mix(col, col * (0.72 + inwardCol * 0.78) + inwardCol * hotBand * 0.30, v71Mode * (0.20 + 0.22 * edgeMask + 0.16 * centerDepth));
  col += inwardCol * v71DepthBand * edgeMask * 0.22;
  col += mix(inwardCol, violetCol, 0.34 + 0.28 * psychPulse) * v71InnerBloom * 0.16;
  col = mix(
    col,
    col * (0.74 + smoothCascadeCol * 0.48) + smoothCascadeCol * hotBand * (0.18 + 0.12 * smoothDepth),
    v72Mode * (0.18 + 0.20 * smoothDepth + 0.12 * hotBand)
  );
  col = mix(
    col,
    col * (0.42 + dramaticCascadeCol * 0.98) + dramaticCascadeCol * hotBand * (0.50 + 0.32 * dramaticDepth),
    v73Mode * (0.54 + 0.18 * hotBand + 0.18 * dramaticDepth)
  );
  col += dramaticOffsetCol * edgeMask * v73Mode * (0.16 + 0.20 * dramaticDepth);
  col += mix(dramaticCascadeCol, dramaticOffsetCol, psychPulse) * thinLine * v73Mode * 0.16;
  float psychSpark = v68Mode
    * pow(0.5 + 0.5 * cos(TAU * (ringCoord * 1.37 + theta01 * 5.0 - t * 5.0)), 8.0)
    * edgeMask * (0.32 + 0.68 * radialOuter);
  col += acidCol * psychSpark * 0.22;
  col += uvCol * phosphene * v68Mode * (0.08 + 0.08 * psychPulse);
  float psychLine = v68Mode
    * pow(1.0 - abs(cos(TAU * (ringCoord * 0.73 + t * 3.0 + dream * 0.25))), 5.0)
    * smoothstep(0.08, 0.92, r);
  col += mix(acidCol, uvCol, 0.45 + 0.35 * sin(TAU * (t * 4.0 + theta01)))
    * psychLine * edgeMask * 0.16;

  // Angular shards in the outer field keep the frame from becoming plain rings.
  float shard = pow(max(0.0, sin(TAU * (theta01 * 8.0 + u * 1.4 - t * 3.0))), 3.0);
  vec3 shardCol = tunnelPalette(palPhase + 0.17, uPaletteMode);
  shardCol.r *= mix(1.0, 0.36, v67Mode);
  shardCol.gb *= mix(vec2(1.0), vec2(1.08, 1.22), v67Mode);
  col += shardCol * shard * outerMask * edgeMask
    * mix(0.035, mix(0.075, 0.050 + 0.040 * peak, masterMode), tripMode) * crossMute;

  // Keep the trip cut full-spectrum without letting flat red/orange plates
  // dominate the frame; push those hot areas toward violet-magenta.
  float redPlate = tripMode * smoothstep(mix(0.02, -0.02, v67Mode), mix(0.24, 0.16, v67Mode), col.r - max(col.g, col.b))
    * mix(1.0, smoothstep(0.10, 0.92, r), masterMode);
  vec3 violetRed = mix(
    vec3(col.r * 0.70, max(col.g, col.r * 0.16), max(col.b, col.r * 0.92)),
    vec3(col.r * 0.46, max(col.g, col.r * 0.10), max(col.b, col.r * 1.08)),
    masterMode
  );
  violetRed = mix(violetRed, vec3(col.r * 0.10, max(col.g, col.r * 0.18), max(col.b, col.r * 1.42)), v67Mode);
  col = mix(col, violetRed, redPlate * mix(0.62, mix(0.90, 0.98, v67Mode), masterMode));

  // ─── DARK CENTRAL EYE ────────────────────────────────────────────────
  vec3 irisCol = tunnelPalette(t * uHueSpeed + 0.55, uPaletteMode);
  vec3 jewelEye = mix(cyanCol, greenCol, smoothstep(0.16, 0.84, eyePulse));
  jewelEye = mix(jewelEye, violetCol, 0.32 + 0.28 * sin(TAU * (t + 0.18)));
  jewelEye = mix(jewelEye, mix(cyanCol, violetCol, 0.22 + 0.20 * eyePulse), v67Mode * 0.45);
  irisCol = mix(irisCol, jewelEye, masterMode);
  vec3 pupilCol = mix(vec3(0.01, 0.015, 0.09), vec3(0.002, 0.010, 0.065), v67Mode);
  pupilCol = mix(pupilCol, vec3(0.54, 0.00, 0.80), v77Mode);
  pupilCol = mix(pupilCol, v78Palette(v78Flow + 0.24) * 0.56, v78Mode);
  pupilCol = mix(pupilCol, mix(v79InkCol, v79Palette(v79Flow + 0.48), 0.22), v79Mode);
  float coreOuter = mix(0.078, mix(0.066, 0.058, v67Mode), masterMode);
  float pupilOuter = mix(0.026, mix(0.022, 0.019, v67Mode), masterMode);
  float coreMask = 1.0 - smoothstep(0.016, coreOuter, r);
  float pupil = 1.0 - smoothstep(0.008, pupilOuter, r);
  vec3 coreCol = mix(irisCol * mix(0.58, mix(0.70, 0.76, v67Mode), masterMode), pupilCol, pupil);
  col = mix(col, coreCol, coreMask * mix(mix(0.76, 0.70, tripMode), mix(0.78, 0.84, v67Mode), masterMode));
  float irisRadius = mix(0.052, mix(0.048, 0.044, v67Mode), masterMode);
  float irisWidth = mix(0.012, mix(0.010, 0.008, v67Mode), masterMode);
  float irisRing = 1.0 - smoothstep(0.0, irisWidth, abs(r - irisRadius));
  float outerIrisRing = v67Mode * (1.0 - smoothstep(0.0, 0.011, abs(r - 0.071)));
  col += irisCol * irisRing * mix(mix(0.58, 0.68, tripMode), mix(0.78, 0.86, v67Mode), masterMode);
  col += mix(cyanCol, violetCol, 0.36 + 0.16 * eyePulse) * outerIrisRing * 0.28;
  col += tripMode * tunnelPalette(theta01 * 2.0 + u_wavy * 0.4 + t * 2.0, uPaletteMode)
    * pow(1.0 - smoothstep(0.0, 0.36, r), 2.0) * mix(0.024, mix(0.014, 0.010, v67Mode), masterMode);
  col += v69Mode * mix(cyanCol, blueCol, 0.65) * pow(1.0 - smoothstep(0.0, 0.62, r), 3.0)
    * (0.030 + 0.020 * dizzyPulse);
  col += v70Mode * mix(violetCol, magCol, 0.62) * pow(1.0 - smoothstep(0.0, 0.58, r), 3.0)
    * (0.026 + 0.026 * psychPulse);
  col += v71Mode * inwardCol * pow(1.0 - smoothstep(0.0, 0.52, r), 3.2)
    * (0.030 + 0.024 * dizzyPulse);
  col += v72Mode * smoothCascadeCol * pow(1.0 - smoothstep(0.0, 0.54, r), 3.0)
    * (0.020 + 0.016 * psychPulse);
  col += v73Mode * dramaticCascadeCol * pow(1.0 - smoothstep(0.0, 0.56, r), 2.6)
    * (0.060 + 0.040 * psychPulse);

  // Mid-zone brightness boost (keeps whole frame full-color, no black void)
  float midBoost = smoothstep(0.08, 0.35, r) * (1.0 - smoothstep(0.35, 0.9, r));
  col *= 1.0 + 0.08 * midBoost;
  float suctionFocus = v69Mode * pow(1.0 - smoothstep(0.02, 0.92, r), 2.0);
  col *= 1.0 + suctionFocus * 0.12;
  col *= 1.0 + v70Mode * pow(1.0 - smoothstep(0.03, 0.88, r), 2.4) * 0.08;
  col *= 1.0 + v78Mode * pow(1.0 - smoothstep(0.02, 0.90, r), 2.0) * 0.18;
  col *= 1.0 + v79Mode * pow(1.0 - smoothstep(0.018, 0.84, r), 2.1) * 0.24;

  // ─── Saturation + contrast ──────────────────────────────────────────
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  float sat = mix(1.35, 1.58, tripMode);
  sat = mix(sat, mix(1.48, 1.42, v67Mode), masterMode);
  sat = mix(sat, 1.58, v70Mode);
  sat = mix(sat, 1.64, v71Mode);
  sat = mix(sat, 1.44, v72Mode);
  sat = mix(sat, 1.66, v73Mode);
  sat = mix(sat, 1.78, v74Mode);
  sat = mix(sat, 1.52, v75Mode);
  sat = mix(sat, 1.70, v76Mode);
  sat = mix(sat, 1.96, v77Mode);
  sat = mix(sat, 1.62, v78Mode);
  sat = mix(sat, 1.86, v79Mode);
  col = mix(vec3(lum), col, sat);

  // Mild S-curve (already vivid — don't crush)
  col = col*0.6 + 0.4*col*col*(3.0 - 2.0*col);

  // Final hue guard after contrast shaping. This preserves hot energy but
  // prevents red plates from surviving as flat posterized slabs.
  float finalRedPlate = masterMode * smoothstep(0.01, mix(0.18, 0.08, v67Mode), col.r - max(col.g, col.b))
    * smoothstep(0.08, 0.95, r);
  vec3 finalVioletRed = mix(
    vec3(col.r * 0.34, max(col.g, col.r * 0.08), max(col.b, col.r * 1.12)),
    vec3(col.r * 0.08, max(col.g, col.r * 0.18), max(col.b, col.r * 1.48)),
    v67Mode
  );
  col = mix(col, finalVioletRed, finalRedPlate * mix(0.88, 0.98, v67Mode));
  float warmResidue = v67Mode * smoothstep(-0.04, 0.08, col.r - max(col.g, col.b))
    * smoothstep(0.06, 0.96, r) * smoothstep(0.04, 0.28, col.r);
  vec3 cobaltResidue = vec3(col.r * 0.05, max(col.g, col.r * 0.16), max(col.b, col.r * 1.60));
  col = mix(col, cobaltResidue, warmResidue * 0.94);
  float redEnergy = col.r;
  float redBudget = max(col.g, col.b) * 0.34;
  float redCooling = v67Mode * smoothstep(0.02, 0.96, r);
  col.r = mix(col.r, min(col.r, redBudget), redCooling * 0.95);
  col.b = max(col.b, redEnergy * redCooling * 0.58);
  float finalPsyLine = v68Mode * thinLine * smoothstep(0.08, 0.88, r) * (0.40 + 0.60 * dash);
  vec3 finalAcid = vec3(0.10, 0.24, 0.02);
  vec3 finalUv = vec3(0.20, 0.03, 0.44);
  col += mix(finalAcid, finalUv, psychPulse) * finalPsyLine * 0.14;
  float v69Afterimage = v69Mode
    * pow(0.5 + 0.5 * sin(TAU * (u * 0.70 + ringCoord * 0.33 + theta01 * 9.0 + t * 7.0)), 6.0)
    * smoothstep(0.06, 0.94, r);
  col += mix(vec3(0.46, 0.00, 1.00), vec3(0.56, 1.00, 0.00), psychPulse)
    * v69Afterimage * edgeMask * 0.13 * crossMute;
  float v70Afterimage = v70Mode
    * pow(0.5 + 0.5 * cos(TAU * (u * 0.95 + ringCoord * 0.52 - theta01 * 13.0 + t * 9.0)), 5.0)
    * smoothstep(0.05, 0.98, r);
  col += mix(vec3(0.92, 0.00, 1.00), vec3(0.68, 1.00, 0.00), psychPulse)
    * v70Afterimage * edgeMask * 0.16;
  float v71CascadeWake = v71Mode
    * pow(0.5 + 0.5 * sin(TAU * (inwardPhase * 7.0 - theta01 * 8.0 + u * 0.31)), 5.0)
    * smoothstep(0.05, 0.98, r);
  col += mix(inwardCol, vec3(0.92, 0.00, 1.00), 0.42 + 0.28 * psychPulse)
    * v71CascadeWake * edgeMask * 0.18;
  float depthRake = v69Mode
    * pow(0.5 + 0.5 * cos(TAU * (ringCoord * 0.22 - u * 1.55 + t * 6.0)), 6.0)
    * smoothstep(0.12, 0.92, r);
  vec3 depthRakeCol = mix(vec3(0.00, 0.18, 0.28), vec3(0.05, 0.00, 0.22), dizzyPulse);
  depthRakeCol = mix(depthRakeCol, v77Palette(t * 2.0 + v77Depth * 0.30 + 0.42) * 0.42, v77Mode);
  depthRakeCol = mix(depthRakeCol, v78GradeCol * 0.34, v78Mode);
  col += depthRakeCol * depthRake * 0.10;

  float v74Lum = max(dot(col, vec3(0.299, 0.587, 0.114)), 0.001);
  float v74GradeLum = max(dot(v74GradeCol, vec3(0.299, 0.587, 0.114)), 0.001);
  vec3 v74ColorGrade = v74GradeCol * (v74Lum / v74GradeLum);
  col = mix(col, v74ColorGrade, v74Mode * (0.64 + 0.18 * v74Depth));
  float v75Lum = max(dot(col, vec3(0.299, 0.587, 0.114)), 0.001);
  float v75GradeLum = max(dot(v75GradeCol, vec3(0.299, 0.587, 0.114)), 0.001);
  vec3 v75ColorGrade = v75GradeCol * (v75Lum / v75GradeLum);
  col = mix(col, v75ColorGrade, v75Mode * (0.52 + 0.12 * v75Depth));
  float v76Lum = max(dot(col, vec3(0.299, 0.587, 0.114)), 0.001);
  float v76GradeLum = max(dot(v76GradeCol, vec3(0.299, 0.587, 0.114)), 0.001);
  vec3 v76ColorGrade = v76GradeCol * (v76Lum / v76GradeLum);
  vec3 v76RichGrade = mix(vec3(v76Lum), v76ColorGrade, 1.18);
  col = mix(col, v76RichGrade, v76Mode * (0.64 + 0.16 * v76Depth));
  float v78Lum = max(dot(col, vec3(0.299, 0.587, 0.114)), 0.001);
  float v78GradeLum = max(dot(v78UnifiedCol, vec3(0.299, 0.587, 0.114)), 0.001);
  float v78LiftedLum = mix(v78Lum, max(v78Lum, 0.50), 0.62);
  vec3 v78ColorGrade = v78UnifiedCol * (v78LiftedLum / v78GradeLum);
  vec3 v78RichGrade = mix(vec3(v78LiftedLum), v78ColorGrade, 1.10);
  col = mix(col, v78RichGrade, v78Mode * (0.84 + 0.10 * v78Depth));
  float v78PostLum = dot(col, vec3(0.299, 0.587, 0.114));
  float v78DarkMask = v78Mode * (1.0 - smoothstep(0.24, 0.52, v78PostLum));
  vec3 v78LiftCol = mix(v78UnifiedCol, v78AccentCol, 0.34);
  col = mix(col, v78LiftCol * max(v78PostLum, 0.56), v78DarkMask * 0.62);
  float v78MaxCh = max(max(col.r, col.g), col.b);
  float v78GreenGap = v78Mode
    * smoothstep(0.02, 0.18, col.g - max(col.r, col.b))
    * (1.0 - smoothstep(0.48, 0.76, v78MaxCh));
  col = mix(col, mix(v78LiftCol, v78AccentCol, 0.46) * 0.72, v78GreenGap);
  col = mix(col, max(col, v78LiftCol * 0.54), v78Mode);
  float v77Lum = max(dot(col, vec3(0.299, 0.587, 0.114)), 0.001);
  float v77GradeLum = max(dot(v77GradeCol, vec3(0.299, 0.587, 0.114)), 0.001);
  float v77LiftedLum = mix(v77Lum, max(v77Lum, 0.48), 0.68);
  vec3 v77ColorGrade = v77GradeCol * (v77LiftedLum / v77GradeLum);
  vec3 v77RichGrade = mix(vec3(v77LiftedLum), v77ColorGrade, 1.22);
  col = mix(col, v77RichGrade, v77Mode * (0.74 + 0.14 * v77Depth));
  col = mix(col, max(col, v77GradeCol * (0.22 + 0.16 * v77Depth)), v77Mode);
  float v77PostLum = dot(col, vec3(0.299, 0.587, 0.114));
  float v77DarkMask = v77Mode * (1.0 - smoothstep(0.22, 0.46, v77PostLum));
  vec3 v77ShadowLift = mix(v77GradeCol, v77Palette(t * 2.0 + v77Depth * 0.44 + 0.22), 0.52);
  col = mix(col, max(col, v77ShadowLift * 0.52), v77DarkMask);
  float v77MaxCh = max(max(col.r, col.g), col.b);
  float v77MinCh = min(min(col.r, col.g), col.b);
  float v77DullMask = v77Mode * (1.0 - smoothstep(0.16, 0.38, v77MaxCh - v77MinCh));
  vec3 v77CleanCol = v77Palette(t * 2.0 + v77Depth * 0.58 + palPhase * 0.035 + 0.12);
  float v77CleanLum = max(dot(v77CleanCol, vec3(0.299, 0.587, 0.114)), 0.001);
  vec3 v77CleanGrade = v77CleanCol * (max(v77PostLum, 0.42) / v77CleanLum);
  col = mix(col, v77CleanGrade, v77DullMask * 0.58);
  float v77OliveMask = v77Mode
    * smoothstep(0.04, 0.24, col.g - col.b)
    * smoothstep(-0.03, 0.16, col.r - col.b)
    * smoothstep(0.22, 0.62, col.g);
  vec3 v77NeonLime = vec3(max(col.r, col.g * 0.70), max(col.g, 0.84), max(col.b, col.g * 0.34));
  col = mix(col, v77NeonLime, v77OliveMask * 0.62);
  float v79Lum = max(dot(col, vec3(0.299, 0.587, 0.114)), 0.001);
  float v79RibbonPhase = v79Flow + ringWave * 0.012
    + 0.018 * sin(TAU * (t + v79Depth * 0.62));
  vec3 v79RibbonCol = v79Palette(v79RibbonPhase);
  float v79RibbonLum = max(dot(v79RibbonCol, vec3(0.299, 0.587, 0.114)), 0.001);
  float v79LiftedLum = mix(v79Lum, max(v79Lum, 0.54), 0.70);
  vec3 v79ColorGrade = v79RibbonCol * (v79LiftedLum / v79RibbonLum);
  vec3 v79RichGrade = mix(vec3(v79LiftedLum), v79ColorGrade, 1.24);
  col = mix(col, v79RichGrade, v79Mode * (0.90 + 0.07 * v79Depth));
  float v79LineContrast = v79Mode * pow(darkGap, 1.85) * (0.24 + 0.76 * edgeMask) * (0.38 + 0.62 * thinLine);
  col = mix(col, mix(v79InkCol, v79RibbonCol, 0.30) * max(v79LiftedLum, 0.22), v79LineContrast * 0.30);
  float v79PostLum = dot(col, vec3(0.299, 0.587, 0.114));
  float v79WideDark = v79Mode * (1.0 - smoothstep(0.26, 0.52, v79PostLum)) * (1.0 - edgeMask * 0.70);
  col = mix(col, max(col, v79RibbonCol * 0.46), v79WideDark * 0.74);
  vec3 v79CalmCol = v79Palette(v79Flow + 0.060 + ringWave * 0.006);
  float v79CalmLum = max(dot(v79CalmCol, vec3(0.299, 0.587, 0.114)), 0.001);
  vec3 v79CalmGrade = v79CalmCol * (max(v79LiftedLum, 0.50) / v79CalmLum);
  col = mix(col, mix(vec3(max(v79LiftedLum, 0.50)), v79CalmGrade, 1.08), 0.42 * v79VerticalCalm);

  // Mild edge vignette (keep outer visible)
  vec2 vu = vUv - 0.5;
  float r0 = length(vu);
  float vig = 1.0 - mix(0.15, mix(0.09, 0.108, v67Mode), tripMode) * pow(r0*1.6, 2.2);
  vig = mix(vig, max(vig, 0.96), v77Mode);
  vig = mix(vig, max(vig, 0.965), v78Mode);
  vig = mix(vig, max(vig, 0.970), v79Mode);
  col *= max(vig, 0.0);

  col = pow(clamp(col, 0.0, 1.0), vec3(0.95));
  gl_FragColor = vec4(col, 1.0);
}
