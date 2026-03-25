precision highp float;

uniform float uTime;
uniform vec2 uResolution;

varying vec2 vUv;

#define PI 3.14159265359
#define TAU 6.28318530718
#define LOOP_DUR 1.08

// ─── Rainbow: hue-based HSV ─────────────────────────────
vec3 hsv2rgb(float h, float s, float v) {
  vec3 c = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return v * mix(vec3(1.0), c, s);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);

  float lt = mod(uTime, LOOP_DUR);
  float rotAngle = -lt * TAU / LOOP_DUR;

  // Rotate
  float cs = cos(rotAngle), sn = sin(rotAngle);
  uv = mat2(cs, -sn, sn, cs) * uv;

  float r = length(uv);
  float theta = atan(uv.y, uv.x);

  // ─── Spiral tiling ────────────────────────────────────
  // Parameters
  float numRings = 18.0;
  float numArms = 8.0;
  float spiralTwist = 2.5; // total spiral twist across all rings (radians)

  // Radial: power-map r to create roughly equal-visual-size rings
  float rMapped = pow(r / 0.75, 0.7) * numRings;
  float ringIdx = floor(rMapped);
  float ringFrac = fract(rMapped);

  // Angular: twist by ring index to create spiral
  float twistPerRing = spiralTwist / numRings;
  float twistedTheta = theta + ringIdx * twistPerRing;

  // Sector within this ring
  float sectorF = twistedTheta * numArms / TAU;
  float sectorIdx = floor(sectorF);
  float sectorFrac = fract(sectorF);

  // ─── Triangle split ───────────────────────────────────
  // Split each rectangular cell diagonally into 2 triangles
  float inUpperTri = step(sectorFrac, ringFrac);  // diagonal: sectorFrac < ringFrac

  // Edge distances for black border
  float borderWidth = 0.08;
  float dLeft = sectorFrac;
  float dRight = 1.0 - sectorFrac;
  float dBottom = ringFrac;
  float dTop = 1.0 - ringFrac;
  float dDiag = abs(sectorFrac - ringFrac) / 1.414;

  float minDist = min(min(dLeft, dRight), min(dBottom, dTop));
  minDist = min(minDist, dDiag);
  float border = smoothstep(0.0, borderWidth, minDist);

  // ─── Color ────────────────────────────────────────────
  // Each triangle gets a rainbow hue based on its spiral position
  float hue = (sectorIdx + ringIdx * 0.38 + inUpperTri * 0.5) / numArms;

  // Internal gradient within each triangle
  float internalT = mix(sectorFrac, ringFrac, 0.5);
  hue += internalT * 0.15;

  vec3 col = hsv2rgb(hue, 0.95, 0.95);

  // Apply border (black gaps)
  col *= border;

  // Hide rings beyond outer radius
  col *= step(ringIdx, numRings - 1.0);

  // Fade near center
  col *= smoothstep(0.0, 2.0, rMapped);

  // Fade at edge
  col *= 1.0 - smoothstep(numRings - 2.0, numRings, rMapped);

  gl_FragColor = vec4(col, 1.0);
}
