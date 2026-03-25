uniform sampler2D tDiffuse;
uniform float uTime;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;
  vec2 center = uv - 0.5;

  vec3 col = texture2D(tDiffuse, uv).rgb;

  // Vignette
  float vigDist = length(center * 2.0);
  float vig = smoothstep(0.75, 1.4, vigDist);
  col *= 1.0 - vig * 0.3;


  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, 1.0);
}
