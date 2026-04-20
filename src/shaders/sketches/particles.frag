// Particles Display (T-B3) — soft circular point with life-modulated alpha
precision highp float;
varying vec3 vColor;
varying float vLife;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d) * vLife * 0.6;
  gl_FragColor = vec4(vColor * a, a);
}
