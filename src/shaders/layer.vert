precision highp float;

uniform float uParallaxScale;
uniform float uDepthNorm;
uniform float uTime;

#define TAU 6.28318530718

varying vec2 vUv;

void main() {
  // uTime is 0→1 normalized; sin(uTime*TAU) completes exactly one cycle per loopDuration
  float t = uTime * TAU;
  vUv = uv + uParallaxScale * uDepthNorm * vec2(sin(t), 0.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
