# PRD: Depth Cinematic Effects (Phase 2)

**Version**: 0.4
**Author**: Isaac + Claude
**Date**: 2026-03-30
**Status**: Approved
**Size**: XL
**Prerequisite**: PRD-depth-anything-v2 (Phase 1) — Approved, implemented

---

## 1. Problem Statement

### 1.1 Background

Phase 1(PRD-depth-anything-v2)에서 DA V2 depth map 통합 + depth-보강 role assignment 완료. 각 레이어에 `meanDepth` (0=far, 255=near) 값이 채워져 있고, manifest에 `depthStats` + `roleComparison` 데이터가 기록됨.

현재 상태: depth 데이터는 있으나 **시각적으로 활용하지 않음**. 모든 레이어가 role 프리셋에 따라 동일한 방식으로 애니메이션됨 — 가까운 물체와 먼 물체의 시각적 차이가 없어 평면적.

### 1.2 Problem Definition

depth 정보가 role assignment에만 사용되고, 실제 렌더링(셰이더, 애니메이션, 이펙트)에는 반영되지 않음. "가까운 건 빠르고 선명하게, 먼 건 느리고 흐릿하게"라는 자연스러운 깊이 인식이 없음.

### 1.3 Impact of Not Solving

- 모든 레이어가 동일한 색 순환 속도/강도 → 평면적 시각 경험
- 상업화 경쟁력 부족 (parallax, DOF는 프로 영상 제작의 기본 기법)
- Phase 1에서 확보한 depth 데이터의 ROI = 0 (role 보정에만 사용)

## 2. Goals & Non-Goals

### 2.1 Goals

- [ ] G1: Depth 연동 Animation — 가까운 레이어가 더 빠르게/강하게 애니메이션
- [ ] G2: Parallax — 가까운 레이어가 더 많이 움직이는 2.5D 효과
- [ ] G3: Atmospheric Haze — 먼 레이어 desaturation
- [ ] G4: Edge Vignette — UV 경계 alpha softening (캔버스 가장자리 fade)
- [ ] G5: 5개 autoresearch axes 추가 + program.md 문서화 (Phase 1 §10.2의 7개 중 DOF 2개는 NG1으로 분리)
- [ ] G6: 모든 새 효과가 default=0 (비활성)에서 기존 출력과 동일 (하위 호환)
- [ ] G7: 기존 테스트 전부 통과 + 새 기능 테스트 추가

### 2.2 Non-Goals

- NG1: DOF Blur (per-layer Gaussian convolution) — 셰이더 multi-sampling은 성능 비용 높음. 후속 PRD로 분리
- NG2: evaluate.ts / metrics 변경
- NG3: run-once.ts / pipeline-runner.ts 변경
- NG4: decomposition / role assignment 로직 변경 (Phase 1 영역)
- NG5: 새 Replicate API 호출 추가

## 3. User Stories & Acceptance Criteria

### US-1: Depth 연동 Animation

**As a** 파이프라인, **I want** depth에 비례하는 색 순환 속도와 glow 강도, **so that** 가까운 물체가 더 활발하게 애니메이션된다.

**Acceptance Criteria:**
- [ ] AC-1.1: `depthSpeedInfluence` (0.0~2.0, default 0.0) — scene-generator.ts에서 `colorCycleSpeed *= 1.0 + depthSpeedInfluence * depthNorm`. depthNorm = meanDepth / 255 (0=far, 1=near). 가까울수록 speed 증가
- [ ] AC-1.2: `depthGlowInfluence` (0.0~2.0, default 0.0) — `glow.intensity *= 1.0 + depthGlowInfluence * depthNorm`. 가까울수록 glow 강화
- [ ] AC-1.3: `depthNorm` 계산은 scene-generator.ts에서 `retainedLayer.meanDepth / 255` (meanDepth 없으면 128/255=0.502)
- [ ] AC-1.4: default=0에서 기존 출력과 동일 (기존 role 프리셋 유지)
- [ ] AC-1.5: depth modulation은 role preset의 `colorCycle()` 내부 `baseSpeed`에 곱셈으로 적용, quantizeLoopSpeed() 이전에 반영됨 → seamless loop 보장. depth influence가 quantize로 약간 손실될 수 있으나 seamless loop 우선
- [ ] AC-1.6: depth 분산 가드: scene-generator.ts의 `generateSceneJson()` 내부에서 `layers` 배열의 `meanDepth` 값으로 stddev를 직접 계산 (별도 파라미터 불필요. meanDepth 없는 레이어는 계산에서 제외). stddev < 5이면 cinematic depth axes(depthSpeedInfluence, depthGlowInfluence, depthParallaxScale, hazeIntensity, featherRadius) 전부 강제 0 처리

### US-2: Parallax

**As a** 렌더러, **I want** 가까운 레이어가 시간에 따라 UV 오프셋되어 움직이는 효과, **so that** 2.5D 깊이감을 느낄 수 있다.

**Acceptance Criteria:**
- [ ] AC-2.1: `depthParallaxScale` (0.0~0.1, default 0.0) — vertex shader에서 UV offset 적용
- [ ] AC-2.2: parallax GLSL 공식 (vertex shader): `float t = uTime * TAU; vUv = uv + uParallaxScale * uDepthNorm * vec2(sin(t), 0.0);` — uTime은 0~1 normalized, sin(uTime*TAU)가 loopDuration 동안 정확히 1 cycle → seamless loop 자동 보장. X축 수평 이동만
- [ ] AC-2.3: `uDepthNorm` uniform을 layered-psychedelic.ts에서 per-layer 바인딩: `(layerConfig.meanDepth ?? 128) / 255`. scene.json에 depthNorm을 별도 저장하지 않음 — `meanDepth`(0-255)가 이미 있으므로 renderer에서 런타임 계산
- [ ] AC-2.4: layer.vert에 `uniform float uParallaxScale`, `uniform float uDepthNorm`, `uniform float uTime` 추가. ShaderMaterial uniforms 공유로 uTime은 추가 바인딩 불필요
- [ ] AC-2.5: default=0에서 UV offset 없음 → 기존 출력과 동일
- [ ] AC-2.6: `uTime`을 vertex shader에도 전달 (현재 fragment only)

### US-3: Atmospheric Haze

**As a** 렌더러, **I want** 먼 레이어의 채도가 감소하는 효과, **so that** 대기 원근감을 표현할 수 있다.

**Acceptance Criteria:**
- [ ] AC-3.1: `hazeIntensity` (0.0~1.0, default 0.0) — fragment shader에서 saturation 감소
- [ ] AC-3.2: haze 공식: `hsv.y *= 1.0 - hazeIntensity * (1.0 - depthNorm)`. 먼 레이어(depthNorm→0)일수록 saturation 감소
- [ ] AC-3.3: `uHazeIntensity`, `uDepthNorm` uniform 바인딩
- [ ] AC-3.4: default=0에서 saturation 변화 없음 → 기존 출력과 동일

### US-4: Edge Vignette

**As a** 렌더러, **I want** 캔버스 가장자리가 부드럽게 alpha fade되는 vignette 효과, **so that** 프레임 경계가 자연스러워진다.

**Acceptance Criteria:**
- [ ] AC-4.1: `featherRadius` (0.0~0.2, default 0.0) — fragment shader에서 UV 경계 alpha fade
- [ ] AC-4.2: feather 공식 (guard 포함): `float d = min(min(vUv.x, 1.0-vUv.x), min(vUv.y, 1.0-vUv.y)); float feather = uFeatherRadius < 1e-4 ? 1.0 : smoothstep(0.0, uFeatherRadius, d); alpha *= feather;` — `featherRadius=0` 시 `smoothstep(0,0,x)` undefined behavior 방지
- [ ] AC-4.3: `uFeatherRadius` uniform 바인딩
- [ ] AC-4.4: default=0에서 alpha 변화 없음 → 기존 출력과 동일 (guard가 1.0 반환)
- [ ] AC-4.5: 효과 범위: UV 경계 = 캔버스 전체 가장자리 (레이어 오브젝트 경계가 아님)

### US-5: Autoresearch Config + Documentation

**As a** autoresearch 루프, **I want** 5개 새 axis가 research-config.ts에 등록되고 program.md에 문서화, **so that** 자율 최적화가 가능하다.

**Acceptance Criteria:**
- [ ] AC-5.1: 5개 axis를 research-config.ts Zod 스키마에 추가 (모두 default=0)
- [ ] AC-5.2: program.md Parameter Reference에 5개 추가
- [ ] AC-5.3: program.md Interdependencies에 depth 축 상호작용 최소 3건 기술: (1) haze vs saturationBoostMul — haze는 boost 이후 적용, 높은 boost에서 haze 효과 증폭 (2) feather + parallax — parallax UV shift가 feather 경계를 이동시켜 미세 깜빡임 가능 → feather 사용 시 parallax 낮추기 권고 (3) depthSpeedInfluence + depthGlowInfluence 동시 활성화 → 가까운 레이어 과도하게 활발, 하나씩 sweep 권고
- [ ] AC-5.4: program.md Strategy Guide에 depth 효과 탐색 전략 추가
- [ ] AC-5.5: scene-schema.ts에 새 animation/effects 필드 추가

## 4. Technical Design

### 4.1 Architecture Overview

```
meanDepth (LayerCandidate, 0-255)
    ↓
scene-generator.ts:
    ├──→ depth-modulated speed/glow (baseSpeed *= 1 + influence * depthNorm)
    └──→ scene.json: meanDepth 그대로 저장 (depthNorm 별도 저장 안 함)
              ↓
layered-psychedelic.ts: uDepthNorm = (meanDepth ?? 128) / 255 런타임 계산
    ├──→ uDepthNorm (per-layer uniform)
    ├──→ uParallaxScale, uHazeIntensity, uFeatherRadius (config → per-layer)
    ↓
layer.vert: parallax UV offset (uDepthNorm * uParallaxScale)
    ↓
layer.frag: haze desaturation + edge vignette
```

### 4.2 Data Model Changes

**depthNorm 전달 경로 (animationSchema 추가 없음):**
```
layerSchema.meanDepth (0-255, 이미 Phase 1에서 존재)
  → layered-psychedelic.ts: uDepthNorm = (layerConfig.meanDepth ?? 128) / 255
  → vertex/fragment shader uniform
```

**scene-schema.ts — effectsSchema 확장 (scene-level global 파라미터):**
```typescript
// 이 값들은 config에서 읽어 scene.json effects에 기록.
// renderer가 per-layer uniform으로 전달 (depthNorm과 조합)
parallax: z.object({
  scale: z.number().min(0).max(0.1).default(0),
}).default({ scale: 0 }),
haze: z.object({
  intensity: z.number().min(0).max(1).default(0),
}).default({ intensity: 0 }),
feather: z.object({
  radius: z.number().min(0).max(0.2).default(0),
}).default({ radius: 0 }),
```
> Note: parallax/haze/feather는 config에서 global 값 1개를 설정하고, renderer에서 per-layer `depthNorm`과 조합하여 적용. per-layer 독립 값이 아님.

**research-config.ts — 5개 axis:**
```typescript
depthSpeedInfluence: z.number().min(0.0).max(2.0).default(0.0),
depthGlowInfluence: z.number().min(0.0).max(2.0).default(0.0),
depthParallaxScale: z.number().min(0.0).max(0.1).default(0.0),
hazeIntensity: z.number().min(0.0).max(1.0).default(0.0),
featherRadius: z.number().min(0.0).max(0.2).default(0.0),
```

### 4.3 Shader Changes

**layer.vert (수정):**
```glsl
uniform float uParallaxScale;
uniform float uDepthNorm;
uniform float uTime;

#define TAU 6.28318530718

void main() {
  float t = uTime * TAU;  // uTime is 0~1 normalized, sin(t) = 1 full cycle per loop
  vUv = uv + uParallaxScale * uDepthNorm * vec2(sin(t), 0.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

**layer.frag (추가, glow 이후):**
```glsl
uniform float uHazeIntensity;
uniform float uDepthNorm;
uniform float uFeatherRadius;

// Atmospheric haze: far layers lose saturation
// (haze는 saturationBoost 이후, hsv2rgb 이전에 적용 — hsv.y에 곱셈)

// Edge feathering: alpha fade at layer boundaries
// (feather는 최종 alpha 계산에 적용)
```

### 4.4 Key Technical Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| DOF Blur 포함 여부 | (A) 포함 (B) 제외 | (B) 제외 | per-layer Gaussian 9-tap sampling은 성능 2-3x 저하. 별도 PRD로 분리 |
| Parallax 방향 | (A) X+Y (B) X만 (C) 원형 | (B) X만 | Y축 이동은 수평선이 깨져 부자연스러움. X축 수평 이동이 가장 자연스러운 2.5D |
| Haze 적용 위치 | (A) HSV 변환 후 saturation 감소 (B) RGB 블렌딩 | (A) HSV | 기존 색상 파이프라인과 일관성. saturationBoost 이전에 적용하면 boost가 haze를 덮어쓸 수 있으므로 boost 이후 적용 |
| Feather 기준 | (A) UV 경계 (B) alpha 경계 (C) depth 경계 | (A) UV 경계 | 모든 레이어에 일관 적용. alpha/depth 기반은 per-pixel depth buffer 필요 |
| 새 axis default | (A) 0 (비활성) (B) 중간값 | (A) 0 | G6 (하위 호환) 보장. autoresearch가 최적값 탐색 |
| depthNorm 전달 방식 | (A) uniform per-layer (B) texture | (A) uniform | 레이어당 단일 값. texture는 per-pixel depth가 필요할 때 |
| depthNorm 저장 위치 | (A) scene.json animation 필드 (B) renderer 런타임 계산 | (B) 런타임 | layerSchema.meanDepth(0-255)가 이미 존재. depthNorm은 redundant. renderer에서 `meanDepth/255` 계산 |
| depth 분산 부족 시 | (A) 무시 (B) cinematic axes 강제 0 | (B) 강제 0 | stddev < 5이면 모든 레이어가 동일 depth → cinematic 효과 의미 없음 |
| quantize vs depth influence | (A) depth 후 재quantize (B) depth를 quantize 전에 적용 | (B) 전에 적용 | seamless loop 보장 우선. depth 영향이 quantize로 약간 손실 허용 |

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | meanDepth 없는 레이어 (DA V2 실패) | depthNorm = 128/255 = 0.502 (중간값) | P0 |
| E2 | depthParallaxScale=0.1 + 극단적 depthNorm | UV offset 최대 ~0.1 → 텍스처 범위 내 | P2 |
| E3 | hazeIntensity=1.0 + 먼 레이어 | 완전 탈색 (saturation=0) + glow만 남아 흰빛. 극단적이나 gate failure로 자연 도태 | P2 |
| E4 | featherRadius=0.2 → 레이어 80% 영역만 보임 | 유효. 연구 루프가 자연 도태 | P3 |
| E5 | parallax UV offset으로 텍스처 범위 초과 | texture2D wrapping (ClampToEdgeWrapping) → 가장자리 픽셀 반복. layered-psychedelic.ts에서 `texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping` 명시 설정 | P2 |
| E6 | 모든 효과 동시 활성화 | 조합 효과 예측 어려움. 연구 루프 자연 도태 | P3 |
| E7 | depthStats.stddev < 5 (depth 분산 부족) | cinematic 축 5개가 의미없이 적용됨. scene-generator에서 stddev < 5 시 cinematic depth axes 강제 0 | P1 |

## 6. Security & Permissions

N/A — 로컬 CLI 도구.

## 7. Performance & Monitoring

| Metric | Target | Measurement |
|--------|--------|-------------|
| 셰이더 프레임 렌더 시간 | ≤ 기존 x1.1 (10% 이내) | Puppeteer 캡처 속도 비교 |
| 파이프라인 실행 시간 | ≤ 기존 ~2분 | `npm run research:run` |
| GPU 메모리 | ≤ 기존 (추가 텍스처 없음) | uniform 6개 추가뿐 |

## 8. Testing Strategy

### 8.1 Unit Tests
- scene-generator: depthNorm 계산, depth-modulated speed/glow
- scene-generator: default=0에서 기존 출력 동일
- research-config: 5개 axis schema 검증 (range, default)

### 8.2 Integration Tests
- scene.json에 parallax, haze, feather effects 값 포함 확인 (depthNorm은 scene.json 미저장 — renderer 런타임 계산)
- default config에서 scene.json 동일성 (haze=0, feather=0, parallax=0)

### 8.3 Shader Tests
- layer.frag에 uHazeIntensity, uDepthNorm, uFeatherRadius uniform 선언 확인
- layer.vert에 uParallaxScale, uDepthNorm, uTime uniform 선언 확인
- layered-psychedelic.ts에서 uniform 바인딩 확인

### 8.4 Edge Case Tests
- meanDepth undefined → depthNorm = 0.502
- featherRadius=0 → alpha 변화 없음
- hazeIntensity=0 → saturation 변화 없음
- depthParallaxScale=0 → UV offset 없음

## 9. Rollout Plan

### 9.1 Migration Strategy
마이그레이션 불필요. 모든 새 파라미터는 default=0 (비활성).

### 9.2 Rollback Plan
`git revert` 단일 커밋.

## 10. Dependencies & Risks

### 10.1 Dependencies
| Dependency | Status |
|------------|--------|
| Phase 1 (DAv2, meanDepth) | Implemented |
| Three.js ShaderMaterial | In use |
| postprocessing library | In use (DOF 제외) |

### 10.2 Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Parallax UV offset이 텍스처 경계 아티팩트 유발 | MEDIUM | LOW | GL_CLAMP_TO_EDGE + scale 범위 0.0~0.1로 제한 |
| Haze + saturationBoost 상호작용이 비직관적 | LOW | LOW | haze는 saturationBoost 이후 적용 (최종 hsv.y에 곱셈) |
| Vertex shader에 uTime 추가 시 기존 fragment와 중복 | LOW | LOW | varying으로 공유하지 않고 독립 uniform으로 전달 |
| 5개 axis + 기존 20+ axis = 탐색 공간 폭발 | MEDIUM | MEDIUM | program.md에 순차 탐색 전략 (depth 축 먼저, 이후 조합) |
| depthStats.stddev < 5 시 cinematic 효과 무의미 | MEDIUM | MEDIUM | scene-generator에서 stddev 기반 가드: cinematic axes 강제 0 (E7) |

## 11. Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| 탐색 가능 축 수 | 20 (현재) | 25 (+ depth 5개) | research-config.ts |
| Default 출력 일치 | N/A | 100% | scene.json diff |
| 테스트 통과율 | 전체 PASS | 전체 PASS | `npx vitest run` |
| 시각적 깊이감 | 없음 (평면적) | parallax+haze 활성 시 체감 | 수동 검증 |

## 12. Open Questions

- [x] OQ-1: DOF Blur 포함 여부 → **제외. 별도 PRD로 분리** (성능 문제)
- [x] OQ-2: parallax 텍스처 경계 → **ClampToEdgeWrapping 명시 설정. 가장자리 픽셀 반복으로 검은 줄 방지**
- [x] OQ-3: haze 적용 순서 → **saturationBoost 이후 적용 (최종 hsv.y에 곱셈). §4.4에 결정 기록**

---

### Appendix: 신규 파라미터 목록 (5개)

| # | Parameter | Range | Default | Category | Files |
|---|-----------|-------|---------|----------|-------|
| 1 | depthSpeedInfluence | 0.0~2.0 | 0.0 | Animation | config, scene-gen |
| 2 | depthGlowInfluence | 0.0~2.0 | 0.0 | Animation | config, scene-gen |
| 3 | depthParallaxScale | 0.0~0.1 | 0.0 | Shader | config, scene-gen, schema, vert, renderer |
| 4 | hazeIntensity | 0.0~1.0 | 0.0 | Shader | config, scene-gen, schema, frag, renderer |
| 5 | featherRadius | 0.0~0.2 | 0.0 | Shader | config, scene-gen, schema, frag, renderer |
