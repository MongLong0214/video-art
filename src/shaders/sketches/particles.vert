// Particles Vertex Shader (T-B3) — reads position from FBO via index lookup
uniform sampler2D uPosition;
uniform float uParticleSize;
attribute float aIndex; // 0..N-1
varying vec3 vColor;
varying float vLife;

#define TEX_SIZE 256.0

void main() {
  // Map index → UV in position texture
  float x = mod(aIndex, TEX_SIZE);
  float y = floor(aIndex / TEX_SIZE);
  vec2 uv = (vec2(x, y) + 0.5) / TEX_SIZE;

  vec4 state = texture2D(uPosition, uv);
  vec2 pos = state.xy;
  vLife = state.z;

  // Color by position + life
  vColor = 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + pos.x * 0.5 + pos.y * 0.3));

  gl_Position = vec4(pos, 0.0, 1.0);
  gl_PointSize = uParticleSize * vLife;
}
