precision highp float;

uniform sampler2D inputBuffer;
uniform sampler2D uPrevFrame;
uniform float uFeedbackStrength;
uniform float uFeedbackWarp;
uniform float uFeedbackDecay;
uniform float uFeedbackHueShift;
uniform float uFeedbackZoom;
uniform float uFeedbackRotate;
uniform sampler2D uFeedbackMaskTex;
uniform float uFeedbackMaskOn;
uniform float uReactionDiffusionAmount;
uniform float uReactionDiffusionSpeed;
uniform float uFeedbackLoopPhase;
uniform vec2 uFeedbackTexel;
varying vec2 vUv;

#define TAU 6.28318530718

void writeOutput(vec4 color) {
  gl_FragColor = color;
}

float atan2Safe(float y, float x) {
  float ax = abs(x), ay = abs(y);
  if (ax < 1e-9 && ay < 1e-9) return 0.0;
  if (ax >= ay) {
    float a = atan(y / x);
    return x >= 0.0 ? a : (y >= 0.0 ? a + 3.14159265358979 : a - 3.14159265358979);
  }
  float a = atan(x / y);
  return (y >= 0.0 ? 1.57079632679490 : -1.57079632679490) - a;
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float luminanceAt(vec2 uv) {
  vec3 c = texture2D(uPrevFrame, clamp(uv, 0.0, 1.0)).rgb;
  return dot(c, vec3(0.299, 0.587, 0.114));
}

float reactionDiffusionLite(vec2 uv, float currentLum, out float localMean) {
  vec2 px = max(uFeedbackTexel, vec2(1.0 / 4096.0));
  float center = luminanceAt(uv);
  float n = luminanceAt(uv + vec2(0.0, px.y));
  float s = luminanceAt(uv - vec2(0.0, px.y));
  float e = luminanceAt(uv + vec2(px.x, 0.0));
  float w = luminanceAt(uv - vec2(px.x, 0.0));
  float ne = luminanceAt(uv + px);
  float nw = luminanceAt(uv + vec2(-px.x, px.y));
  float se = luminanceAt(uv + vec2(px.x, -px.y));
  float sw = luminanceAt(uv - px);
  localMean = (n + s + e + w + 0.7071 * (ne + nw + se + sw)) / 6.8284;
  float lap = localMean - center;
  float loopSin = sin(TAU * uFeedbackLoopPhase);
  float loopCos = cos(TAU * uFeedbackLoopPhase);
  float periodicSeed = (hash12(uv * 713.17) - 0.5) * loopCos
    + (hash12(uv * 719.31 + vec2(17.0, 29.0)) - 0.5) * loopSin;
  float seeded = clamp(mix(currentLum, center, smoothstep(0.02, 0.22, center)) + periodicSeed * 0.06, 0.0, 1.0);
  float sharpened = smoothstep(0.37, 0.63, seeded + lap * 2.15);
  float coarsen = (sharpened - seeded) * 0.18 + lap * 0.72;
  return clamp(seeded + coarsen * clamp(uReactionDiffusionSpeed, 0.0, 1.0), 0.0, 1.0);
}

void main() {
  vec4 cur = texture2D(inputBuffer, vUv);
  if (uFeedbackStrength < 0.001 && uReactionDiffusionAmount < 0.001) {
    writeOutput(cur);
    return;
  }

  vec2 c = vUv - 0.5;
  float r = length(c) * (uFeedbackZoom > 0.001 ? uFeedbackZoom : 1.0);
  float a = atan2Safe(c.y, c.x) + uFeedbackWarp * r + uFeedbackRotate;
  vec2 warpUv = 0.5 + vec2(cos(a), sin(a)) * r;
  vec3 prev = texture2D(uPrevFrame, warpUv).rgb * uFeedbackDecay;
  if (uFeedbackHueShift > 0.001) {
    vec3 hsv = rgb2hsv(prev);
    hsv.x = fract(hsv.x + uFeedbackHueShift);
    prev = hsv2rgb(hsv);
  }

  float m = 1.0;
  if (uFeedbackMaskOn > 0.5) {
    vec4 maskTex = texture2D(uFeedbackMaskTex, vUv);
    m = maskTex.a < 0.999 ? maskTex.a : maskTex.r;
  }

  vec3 accum = cur.rgb + prev * uFeedbackStrength * m;
  if (uReactionDiffusionAmount > 0.001) {
    float curLum = dot(cur.rgb, vec3(0.299, 0.587, 0.114));
    float localMean = 0.0;
    float pattern = reactionDiffusionLite(warpUv, curLum, localMean);
    float rdEnvelope = smoothstep(0.06, 0.18, uFeedbackLoopPhase) * (1.0 - smoothstep(0.72, 0.90, uFeedbackLoopPhase));
    float rdSigned = clamp((pattern - localMean) * 2.0, -1.0, 1.0);
    float rdGain = clamp(1.0 + rdSigned * 0.12 * uReactionDiffusionAmount * m * rdEnvelope, 0.92, 1.12);
    // RD is luminance-only: an unrelated scalar must never choose hue.
    accum *= rdGain;
  }

  vec3 curHsv = rgb2hsv(clamp(cur.rgb, 0.0, 1.0));
  vec3 accumHsv = rgb2hsv(clamp(accum, 0.0, 1.0));
  float feedbackLoad = clamp(uFeedbackStrength * uFeedbackDecay * m, 0.0, 1.0);
  float brightFeedback = smoothstep(0.55, 0.85, accumHsv.z);
  float satTarget = clamp(max(curHsv.y, brightFeedback * 0.35) + feedbackLoad * 0.6, curHsv.y, 1.0);
  accumHsv.y = max(accumHsv.y, satTarget);
  accum = hsv2rgb(accumHsv);
  writeOutput(vec4(clamp(accum, 0.0, 1.0), cur.a));
}
