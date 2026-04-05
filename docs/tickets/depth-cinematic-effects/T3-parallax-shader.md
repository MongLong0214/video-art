# T3: Parallax (Vertex Shader + Renderer)

**PRD Ref**: PRD-depth-cinematic-effects > US-2 (AC-2.1 ~ AC-2.6)
**Priority**: P1 (High)
**Size**: M (2-3h)
**Status**: Todo
**Depends On**: T1, T2

---

## 1. Objective

layer.vert에 parallax UV offset 구현 + layered-psychedelic.ts에서 uDepthNorm, uParallaxScale uniform 바인딩. sin(uTime*TAU) X축 수평 이동으로 seamless loop 2.5D 효과.

## 2. Acceptance Criteria

- [ ] AC-1: layer.vert에 `uniform float uParallaxScale`, `uniform float uDepthNorm`, `uniform float uTime` 선언
- [ ] AC-2: parallax 공식: `vUv = uv + uParallaxScale * uDepthNorm * vec2(sin(uTime * TAU), 0.0)` — X축만
- [ ] AC-3: `uDepthNorm` = `(layerConfig.meanDepth ?? 128) / 255` per-layer uniform (layered-psychedelic.ts)
- [ ] AC-4: `uParallaxScale` = `config.effects.parallax.scale` uniform 바인딩
- [ ] AC-5: `uTime`을 vertex shader에도 전달 (기존 fragment shader와 동일 값)
- [ ] AC-6: default=0에서 UV offset 없음 → 기존 출력 동일
- [ ] AC-7: texture wrapping = `THREE.ClampToEdgeWrapping` 명시 설정

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `layer.vert declares uParallaxScale uniform` | Unit | shader source grep | uniform found |
| 2 | `layer.vert declares uDepthNorm uniform` | Unit | shader source grep | uniform found |
| 3 | `layer.vert declares uTime uniform` | Unit | shader source grep | uniform found |
| 4 | `layer.vert contains TAU constant` | Unit | shader source grep | `#define TAU` or `const float TAU` found |
| 5 | `layer.vert parallax formula uses sin(uTime*TAU)` | Unit | shader source grep | `sin(uTime * TAU)` or equivalent found |
| 6 | `layer.vert parallax is X-axis only (vec2(_, 0.0))` | Unit | shader source grep | `vec2(sin(...), 0.0)` pattern |
| 7 | `layered-psychedelic binds uDepthNorm per-layer` | Unit | source grep | `uDepthNorm: { value:` present |
| 8 | `layered-psychedelic binds uParallaxScale` | Unit | source grep | `uParallaxScale: { value:` present |
| 9 | `layered-psychedelic uDepthNorm fallback is 128/255` | Unit | source grep | `(meanDepth ?? 128) / 255` or equivalent |
| 10 | `layered-psychedelic sets ClampToEdgeWrapping` | Unit | source grep | `ClampToEdgeWrapping` present |
| 11 | `parallax offset math: uParallaxScale=0.1 depthNorm=1.0 → max offset ≤ 0.1` | Unit | JS-port: `0.1 * 1.0 * Math.sin(t)` for t in [0, TAU] | max absolute offset = 0.1 |
| 12 | `default=0 produces parallax.scale===0 in scene.json` | Integration | T2 Test #11과 동일 커버 — depthParallaxScale=0 → scene.json effects.parallax.scale === 0 | behavioral default verification |

### 3.2 Test File Location

- `src/shaders/layer-vert.test.ts` (new — shader source validation)
- `src/sketches/layered-psychedelic.test.ts` (new — uniform binding validation)

### 3.3 Mock/Setup Required

- Vitest: shader source를 `fs.readFileSync`로 로드하여 정규식 검증 (기존 vitest 환경에 vite-plugin-glsl 미설정 — `?raw` import 미사용)
  ```typescript
  import { readFileSync } from "fs";
  import { resolve } from "path";
  const vertSrc = readFileSync(resolve(__dirname, "../shaders/layer.vert"), "utf-8");
  ```
- layered-psychedelic.ts도 동일하게 fs.readFileSync로 소스 문자열 로드 후 패턴 검증
- JS-port parallax math test: 순수 JS로 오프셋 계산 검증 (Three.js 의존 없음)
- Note: ESM 환경이면 `__dirname` 미지원 — `import.meta.dirname` (Node 22+) 또는 `fileURLToPath(new URL('.', import.meta.url))` 사용. 기존 테스트 파일 패턴 확인 후 결정

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `src/shaders/layer.vert` | Modify | uParallaxScale, uDepthNorm, uTime uniform + TAU 상수 + parallax UV offset |
| `src/sketches/layered-psychedelic.ts` | Modify | uDepthNorm, uParallaxScale uniform 바인딩 + ClampToEdgeWrapping |
| `src/shaders/layer-vert.test.ts` | Create | vertex shader uniform/formula 검증 |
| `src/sketches/layered-psychedelic.test.ts` | Create | uniform binding 검증 |

### 4.2 Implementation Steps (Green Phase)

1. layer.vert 전면 재작성 (현재 8줄 → ~15줄):
   ```glsl
   precision highp float;

   uniform float uParallaxScale;
   uniform float uDepthNorm;
   uniform float uTime;

   #define TAU 6.28318530718

   varying vec2 vUv;

   void main() {
     float t = uTime * TAU;
     vUv = uv + uParallaxScale * uDepthNorm * vec2(sin(t), 0.0);
     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
   }
   ```
2. layered-psychedelic.ts ShaderMaterial uniforms에 추가:
   ```typescript
   uDepthNorm: { value: (layerConfig.meanDepth ?? 128) / 255 },
   uParallaxScale: { value: config.effects?.parallax?.scale ?? 0 },
   ```
3. layered-psychedelic.ts texture 로딩 후, ShaderMaterial 생성 이전에 wrapping 설정 (texture.colorSpace 설정 직후):
   ```typescript
   texture.wrapS = THREE.ClampToEdgeWrapping;
   texture.wrapT = THREE.ClampToEdgeWrapping;
   ```
4. uTime은 이미 fragment shader에 바인딩되어 있음 — ShaderMaterial이 vertex/fragment 공유하므로 별도 바인딩 불필요. 단, layer.vert에 uniform 선언은 필요

### 4.3 Refactor Phase

- vertex shader 포맷 정리
- uniform 바인딩 코드가 너무 길어지면 effects 바인딩을 별도 블록으로 그룹핑

## 5. Edge Cases

- EC-1 (E5): parallax UV offset으로 텍스처 범위 초과 → ClampToEdgeWrapping으로 가장자리 픽셀 반복
- EC-2 (E2): depthParallaxScale=0.1 + depthNorm=1.0 → max UV offset ≈ 0.1 (안전 범위)
- EC-3: effects.parallax가 scene.json에 없는 경우 (이전 버전 호환) → optional chaining + default 0

## 6. Review Checklist

- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] uTime이 vertex shader에서 접근 가능
- [ ] ClampToEdgeWrapping 설정됨
- [ ] default=0에서 UV offset 없음
