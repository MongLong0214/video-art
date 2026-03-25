uniform sampler2D tDiffuse;
uniform float uTime;

varying vec2 vUv;

#define LOOP_DUR 8.0

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;
  vec2 center = uv - 0.5;

  // chromatic aberration: stronger at edges
  float aberration = length(center) * 0.006;
  vec3 col;
  col.r = texture2D(tDiffuse, uv + center * aberration).r;
  col.g = texture2D(tDiffuse, uv).g;
  col.b = texture2D(tDiffuse, uv - center * aberration).b;

  // dark vignette
  float vig = 1.0 - 0.65 * pow(length(center * 1.6), 2.2);
  col *= max(vig, 0.0);

  // film grain (synced to loop)
  float lt = mod(uTime, LOOP_DUR);
  float grainT = floor(lt * 24.0);
  float grain = (hash(gl_FragCoord.xy + grainT) - 0.5) * 0.05;
  col += grain;

  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, 1.0);
}