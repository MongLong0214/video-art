# DMT Tunnel — Masterpiece Kaleidoscopic Hybrid Design

**Date**: 2026-04-23
**Status**: Approved
**Scope**: 새로운 DMT 프랙탈 영상 파이프라인 (레이어드와 독립)

---

## Vision

무한 루프되는 마스터피스급 Kaleidoscopic DMT 터널 영상. 원본 이미지 없는 순수 프로시저럴 GLSL.

- 근경: 2D kaleidoscope warp (log-polar zoom, Droste 효과)
- 원경: 3D Mandelbox SDF ray-march (iterative box-fold + sphere-fold)
- Seamless loop: 20초 @ 30fps, 1632x2912 (세로 9:16)

---

## 4 Variants Matrix

| 버전 | 컬러 | 움직임 | Symmetry |
|------|------|--------|----------|
| v46a | Rainbow | Medium Trance (2-3 loops) | 6-way |
| v46b | Rainbow | Fast Hypnotic (5-8 loops) | 8-way |
| v46c | Ayahuasca (amber+violet) | Medium Trance | 6-way |
| v46d | Ayahuasca | Fast Hypnotic | 8-way |

---

## Architecture

```
src/
├── sketches/dmt-tunnel.ts          # Three.js fullscreen quad entry
├── shaders/dmt-tunnel.frag         # Core shader
└── lib/dmt-scene-schema.ts         # (선택) Zod config

scripts/export-dmt.ts               # Frame capture → mp4
public/dmt-config.json              # 4버전 uniform 값
```

**Post-FX 체인**: Bloom → ChromaticAberration → FilmGrade (vignette/contrast)

---

## Shader Pipeline

```glsl
// 1. Polar + Kaleidoscope fold (6-way)
vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
float r = length(p);
float a = atan(p.y, p.x);
a = mod(a, TWO_PI / uSymmetry);
a = abs(a - PI / uSymmetry);
p = vec2(cos(a), sin(a)) * r;

// 2. Log-polar infinite zoom (Droste loop)
float logR = log(r + 0.01);
float zoom = uPhase;
logR = mod(logR - zoom, 1.0);

// 3. Ray-march Mandelbox
for (int i = 0; i < 80; i++) {
  float d = mandelbox(pos, uFoldScale);
  glow += exp(-d * 8.0);
  t += d * 0.8;
}

// 4. Palette (IQ cosine)
vec3 col = palette(glow * 0.1 + uPhase * 0.05);

// 5. Near-field warp blend
col = mix(col, warpCol, smoothstep(0.3, 0.8, r));
```

**Mandelbox SDF**: box-fold (`clamp(-1,1)*2 - z`) + sphere-fold (`clamp(0.25/r², 0.25)`) + scale iteration × 10

**Palette 함수** (IQ cosine):
- Rainbow: `a=0.5, b=0.5, c=1, d=vec3(0, .33, .67)`
- Ayahuasca: `a=vec3(.3,.1,.2), b=vec3(.6,.4,.2), c=vec3(1,.5,.3), d=vec3(0,.1,.2)`

---

## Seamless Loop Guarantees

| 요소 | 방법 |
|------|------|
| Zoom | `mod(logR - uTime/T, 1.0)` |
| Camera Z | `mod(uTime/T * K, 1.0)` (K=정수) |
| Rotation | `uTime/T * 2π * N` (N=정수 회전수) |
| Palette | `palette(uTime/T)` |
| Fold offset | `vec3(cos(phase), sin(phase), cos(phase*2))` |

검증: 첫 프레임 vs 마지막 프레임 pixel diff < 5% (기존 validate-loop.ts 재사용)

---

## Uniform Parameters

| Uniform | v46a | v46b | v46c | v46d |
|---------|------|------|------|------|
| uZoomLoops | 2.5 | 6.0 | 2.5 | 6.0 |
| uCameraLoops | 2 | 5 | 2 | 5 |
| uFoldScale | 2.0 | 2.0 | 2.2 | 2.2 |
| uSymmetry | 6 | 8 | 6 | 8 |
| uPaletteMode | 0 | 0 | 1 | 1 |
| uHueSpeed | 1.0 | 2.5 | 0.6 | 1.5 |
| uGlow | 1.2 | 1.5 | 0.9 | 1.1 |
| bloomStrength | 0.35 | 0.45 | 0.4 | 0.5 |
| caOffset | 0.04 | 0.08 | 0.03 | 0.06 |

---

## Implementation Order

1. `src/shaders/dmt-tunnel.frag` 작성
2. `src/sketches/dmt-tunnel.ts` — Three.js runner + post-FX
3. `scripts/export-dmt.ts` — 600 frame capture + mp4 encode
4. `public/dmt-config.json` — 4버전 uniform
5. 4버전 순차 렌더 + seamless diff 검증

## Expected Deliverables

- `out/dmt/2026-04-23_v46{a,b,c,d}-dmt-*/v46{a,b,c,d}-dmt.mp4` (각 20s)
- 렌더 1버전당 8-10분. 전체 30-40분.
