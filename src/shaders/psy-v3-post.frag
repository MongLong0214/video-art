uniform sampler2D tDiffuse;
uniform float uTime;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;
  vec2 center = uv - 0.5;

  // Chromatic aberration
  float aberration = length(center) * 0.006;
  vec3 col;
  col.r = texture2D(tDiffuse, uv + center * aberration).r;
  col.g = texture2D(tDiffuse, uv).g;
  col.b = texture2D(tDiffuse, uv - center * aberration).b;

  // Vignette
  float vigDist = length(center * 2.0);
  float vig = smoothstep(0.7, 1.4, vigDist);
  col *= 1.0 - vig * 0.85;

  // Grain (looped)
  float grainT = floor(uTime * float(24));
  float grain = (hash(gl_FragCoord.xy + grainT) - 0.5) * 0.02;
  col += grain;

  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, 1.0);
}
