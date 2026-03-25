precision highp float;

uniform float uTime;
uniform vec2 uResolution;

varying vec2 vUv;

#define PI 3.14159265359
#define LOOP_DUR 10.403
#define NUM_RECTS 12

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

mat2 rot(float a) {
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c);
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;

  vec3 bg = vec3(0.118, 0.188, 0.125);
  vec3 col = bg;

  vec3 colors[3];
  colors[0] = vec3(0.482, 0.427, 0.259); // gold #7B6D42
  colors[1] = vec3(0.463, 0.106, 0.200); // red  #761B33
  colors[2] = vec3(0.110, 0.184, 0.373); // blue #1C2F5F

  float lt = mod(uTime, LOOP_DUR);
  float globalAngle = lt / LOOP_DUR * (2.0 * PI / 3.0);

  float baseHalfW = 0.86 * aspect * 0.5;
  float baseHalfH = 0.84 * 0.5;
  float strokeW = 0.0147 * 0.5;

  for (int i = 0; i < NUM_RECTS; i++) {
    float fi = float(i);
    float s = pow(0.78, fi);
    float angle = fi * 15.0 * PI / 180.0 + globalAngle;

    vec3 strokeColor;
    int ci = int(mod(fi, 3.0));
    if (ci == 0) strokeColor = colors[0];
    else if (ci == 1) strokeColor = colors[1];
    else strokeColor = colors[2];

    vec2 p = rot(-angle) * uv;
    vec2 halfSize = vec2(baseHalfW, baseHalfH) * s;
    float cr = halfSize.x * 0.7; // corner_radius 0.35 of full width
    float d = sdRoundedBox(p, halfSize, cr);

    float sw = strokeW * s;
    float edge = fwidth(d);
    float strokeMask = smoothstep(edge, -edge, abs(d) - sw);

    col = mix(col, strokeColor, strokeMask);
  }

  // vignette: darken edges from 70% radius outward
  vec2 vc = gl_FragCoord.xy / uResolution - 0.5;
  float vigDist = length(vc * 2.0);
  float vig = smoothstep(0.7, 1.4, vigDist);
  col *= 1.0 - vig * 0.85;

  gl_FragColor = vec4(col, 1.0);
}