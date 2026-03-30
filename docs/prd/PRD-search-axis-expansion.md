# PRD: Autoresearch Search Axis Expansion

**Version**: 0.3
**Author**: Isaac + Claude
**Date**: 2026-03-30
**Status**: Approved
**Size**: XL

---

## 1. Problem Statement

### 1.1 Background

autoresearch 루프가 291회 실험을 완료하고 quality_score 0.6078에 도달. 현재 탐색 가능한 3개 축(SAM 분해, Luminance fallback, Post-processing 6개 multiplier)이 전부 포화 상태. 0.6078 이후 최대 Δ+0.0005만 관측되었으며, promotion threshold(0.01) 미달로 더 이상 개선 불가.

### 1.2 Problem Definition

autoresearch 루프가 탐색할 수 있는 파라미터 공간이 고갈됨. 셰이더, 이펙트 컴포저, 씬 제너레이터에 하드코딩된 상수들이 연구 루프의 접근 범위 밖에 있어 새로운 시각적 변형을 시도할 수 없음.

### 1.3 Impact of Not Solving

- 연구 루프를 아무리 돌려도 점수 개선 불가 — 투입 시간 대비 ROI 0
- 시각적 다양성이 현재 토폴로지 + post-processing 조합에 고정됨
- 이미지별 최적화 불가 (단일 이미지 기준 tuning이 다른 입력에 일반화 안 됨)

## 2. Goals & Non-Goals

### 2.1 Goals

- [ ] G1: research-config.ts에 **14개의 새 tunable parameter** 추가
- [ ] G2: 모든 새 파라미터가 default=1.0 (또는 기존 하드코딩 값 유지)으로 설정되어 **기존 출력과 100% 동일**한 결과 보장
- [ ] G3: `program.md` Parameter Reference에 새 파라미터 전부 문서화 (range, default, description, interdependencies)
- [ ] G4: 새 파라미터 추가 후 기존 테스트 전부 통과 + 새 파라미터에 대한 테스트 추가
- [ ] G5: `npm run research:run` 실행 시 새 파라미터가 파이프라인에 반영됨을 검증

### 2.2 Non-Goals

- NG1: evaluate.ts / metrics / contract.ts 변경 — READ-ONLY 유지
- NG2: 새로운 이펙트 추가 (vignette, scanline, god rays 등) — 별도 PRD로 분리
- NG3: Per-role 6D vector override 시스템 (role별 독립 multiplier 6개) — 복잡도 과다, 별도 PRD
- NG4: Wave animation / mesh tessellation 활성화 — 셰이더 로직 대규모 변경 필요, 별도 PRD
- NG5: 새 메트릭(M11~M14) 추가
- NG6: 연구 루프 자체 로직 변경 (run-once.ts, pipeline-runner.ts 등)
- NG7: 다중 입력 이미지 일반화 — 현재 PRD는 단일 canonical reference 최적화 파이프라인 확장에 집중. 일반화는 별도 PRD

## 3. User Stories & Acceptance Criteria

### US-1: Effect 하드코딩 상수 튜너블화

**As a** autoresearch 루프, **I want** bloom radius/threshold, CA modulation offset를 research-config.ts에서 제어, **so that** 이펙트 파라미터 공간을 탐색할 수 있다.

**Acceptance Criteria:**
- [ ] AC-1.1: `bloomRadiusMul` (0.1~3.0, default 1.0) 추가. `effects.bloom.radius = 0.4 * mul` 적용
- [ ] AC-1.2: `bloomThresholdMul` (0.1~3.0, default 1.0) 추가. `effects.bloom.threshold = 0.7 * mul` 적용
- [ ] AC-1.3: `caModulationOffsetMul` (0.1~3.0, default 1.0) 추가. CA `modulationOffset = 0.3 * mul` 적용
- [ ] AC-1.3.1: `scene-schema.ts` chromaticAberration에 `modulationOffset` 필드 추가
- [ ] AC-1.3.2: `effect-composer.ts`에서 `modulationOffset`을 scene.json effects에서 읽도록 수정 (현재 line 37~38 하드코딩 제거)
- [ ] AC-1.4: default 값(1.0)에서 기존 출력과 scene.json identical (uniform 바인딩까지 검증)

### US-2: 셰이더 상수 튜너블화

**As a** autoresearch 루프, **I want** 셰이더 내 하드코딩된 블렌딩/글로우 상수를 config에서 제어, **so that** 색상 변환 특성을 탐색할 수 있다.

**Acceptance Criteria:**
- [ ] AC-2.1: `satBlendLow` (0.01~0.5, default 0.1) — smoothstep 하한
- [ ] AC-2.2: `satBlendHigh` (0.1~0.8, default 0.4) — smoothstep 상한
- [ ] AC-2.3: `satInjectionMul` (0.1~1.0, default 0.35) — saturation injection 스칼라. GLSL: `float injectedSat = uSaturationBoost * uSatInjectionMul;` (기존 하드코딩 `0.35` 교체)
- [ ] AC-2.4: `glowPulseFloor` (0.0~0.9, default 0.0) — glow pulse 하한 (oscillation minimum). GLSL 공식: `mix(1.0, uGlowPulseFloor + (1.0 - uGlowPulseFloor) * 0.5 * (1.0 + sin(glowT)), uGlowPulse)`. default=0.0에서 `0 + 1.0*0.5*(1+sin) = 0.5+0.5*sin` → 기존 동일. floor=0.5이면 [0.5, 1.0] 범위로 변화 폭 축소
- [ ] AC-2.5: `lumExponent` (0.5~3.0, default 1.0) — luminance phase 지수. GLSL: `pow(1.0 - lum, uLumExponent + uLuminanceKey)`. 셰이더 guard `uLuminanceKey > 0.001` 유지 (lumExponent는 luminanceKey 활성 시에만 작동. luminanceKey=0이면 lumPhase=0으로 기존과 동일 → G2 보장)
- [ ] AC-2.6: layer.frag에 5개 uniform 선언 + layered-psychedelic.ts에서 uniform 바인딩 + scene-generator.ts에서 scene.json에 기록 + scene-schema.ts animationSchema에 필드 추가
- [ ] AC-2.6.1: 각 새 파라미터가 non-default 값에서 scene.json에 다른 값을 생성함을 검증 (config→scene.json 배선 effectiveness). 셰이더 uniform 바인딩은 기존 패턴과 동일하므로 별도 렌더 검증 불필요
- [ ] AC-2.7: default 값에서 기존 셰이더 출력과 동일

### US-3: 씬 제너레이터 상수 튜너블화

**As a** autoresearch 루프, **I want** tempo, phase offset 분포, period 선택 등을 config에서 제어, **so that** 애니메이션 타이밍 공간을 탐색할 수 있다.

**Acceptance Criteria:**
- [ ] AC-3.1: `tempoMul` (0.3~3.0, default 1.0) — 글로벌 tempo multiplier (현재 하드코딩 0.85 → `0.85 * tempoMul`)
- [ ] AC-3.2: `phaseSpreadMul` (0.1~3.0, default 1.0) — phase offset spread 조절 (`360 * i/total * phaseSpreadMul`)
- [ ] AC-3.3: `periodRangeLow` (1.0~10.0, default 1.0) — period 선택 하한 (약수 필터링)
- [ ] AC-3.4: `periodRangeHigh` (5.0~30.0, default 20.0) — period 선택 상한 (약수 필터링)
- [ ] AC-3.5: `glowPeriodMul` (0.3~3.0, default 1.0) — glow period scaling. 적용 후 가장 가까운 유효 약수로 스냅: `quantizeToNearestDivisor(rawPeriod, getValidPeriods(duration))`
- [ ] AC-3.6: default 값에서 기존 애니메이션과 동일

### US-4: 블렌드 모드 튜너블화

**As a** autoresearch 루프, **I want** 레이어 블렌딩 모드를 config에서 선택, **so that** 레이어 합성 방식을 탐색할 수 있다.

**Acceptance Criteria:**
- [ ] AC-4.1: `blendMode` (enum: 'normal'|'add'|'multiply'|'screen', default 'normal') 추가
- [ ] AC-4.2: Three.js blending 매핑: normal→`NormalBlending`, add→`AdditiveBlending`, multiply→`MultiplyBlending`, screen→`CustomBlending` + `blendEquation=AddEquation` + `blendSrc=OneFactor` + `blendDst=OneMinusSrcColorFactor` (수식: `out = src + dst*(1-src)`, 엄밀한 screen `1-(1-src)(1-dst)`의 근사. 연구 목적에 충분)
- [ ] AC-4.3: scene.json layers에 `blending` 필드 추가
- [ ] AC-4.4: default 'normal'에서 기존 렌더링과 동일

### US-5: program.md 문서 업데이트

**As a** autoresearch 루프 운영자, **I want** 새 파라미터가 전부 program.md에 문서화, **so that** LLM이 자율적으로 새 축을 탐색할 수 있다.

**Acceptance Criteria:**
- [ ] AC-5.1: Parameter Reference 테이블에 새 파라미터 14개 전부 추가
- [ ] AC-5.2: Interdependencies 섹션에 새 축 간 상호작용 기술 + Constraints(`satBlendLow < satBlendHigh`, `periodRangeLow < periodRangeHigh`) 명시
- [ ] AC-5.3: Strategy Guide에 카테고리별 순차 탐색 전략 추가: "Effect 축 3개 50회 → Shader 축 5개 50회 → SceneGen 축 5개 50회 → 카테고리 간 조합 100회". blendMode 탐색 시 bloomStrengthMul=0.3~0.5로 낮추는 가이드 포함
- [ ] AC-5.4: Live Knobs 섹션 업데이트

## 4. Technical Design

### 4.1 Architecture Overview

변경은 기존 파이프라인 배선에 한정. 새 모듈/서비스 없음.

```
research-config.ts (Zod schema + defaults)
        │
        ├──→ scene-generator.ts (multiplier 추출 + 적용)
        │         │
        │         ├──→ scene-schema.ts (animation/effects 타입)
        │         │
        │         └──→ scene.json (생성 결과)
        │                  │
        │                  ├──→ layered-psychedelic.ts (uniform 바인딩)
        │                  │         │
        │                  │         └──→ layer.frag (셰이더 처리)
        │                  │
        │                  └──→ effect-composer.ts (bloom/CA 설정)
        │
        └──→ program.md (문서)
```

### 4.2 Data Model Changes

**research-config.ts 스키마 추가:**

```typescript
// ── Effect Composer Axes ─────────────────────────
bloomRadiusMul:           z.number().min(0.1).max(3.0).default(1.0),
bloomThresholdMul:        z.number().min(0.1).max(3.0).default(1.0),
caModulationOffsetMul:    z.number().min(0.1).max(3.0).default(1.0),

// ── Shader Axes ──────────────────────────────────
satBlendLow:              z.number().min(0.01).max(0.5).default(0.1),
satBlendHigh:             z.number().min(0.1).max(0.8).default(0.4),
satInjectionMul:          z.number().min(0.1).max(1.0).default(0.35),
glowPulseFloor:           z.number().min(0.0).max(0.9).default(0.0),
lumExponent:              z.number().min(0.5).max(3.0).default(1.0),

// ── Scene Generator Axes ─────────────────────────
tempoMul:                 z.number().min(0.3).max(3.0).default(1.0),
phaseSpreadMul:           z.number().min(0.1).max(3.0).default(1.0),
periodRangeLow:           z.number().min(1.0).max(10.0).default(1.0),
periodRangeHigh:          z.number().min(5.0).max(30.0).default(20.0),
glowPeriodMul:            z.number().min(0.3).max(3.0).default(1.0),

// ── Blend Mode ───────────────────────────────────
blendMode:                z.enum(['normal','add','multiply','screen']).default('normal'),
```

**Zod refinement 추가:**
```typescript
.refine((c) => c.satBlendLow < c.satBlendHigh, {
  message: "satBlendLow must be < satBlendHigh",
  path: ["satBlendLow"],
})
.refine((c) => c.periodRangeLow < c.periodRangeHigh, {
  message: "periodRangeLow must be < periodRangeHigh",
  path: ["periodRangeLow"],
})
```

**scene-schema.ts 추가 필드:**

```typescript
// animationSchema 확장
satBlendLow: z.number().default(0.1),
satBlendHigh: z.number().default(0.4),
satInjectionMul: z.number().default(0.35),
glowPulseFloor: z.number().default(0.0),
lumExponent: z.number().default(1.0),

// layerSchema 확장
blending: z.enum(['normal','add','multiply','screen']).default('normal'),

// effectsSchema 확장
bloom: z.object({
  strength: ...,
  radius: z.number().min(0).default(0.4),    // 기존
  threshold: z.number().min(0).max(1).default(0.7),  // 기존
}),
chromaticAberration: z.object({
  offset: ...,
  modulationOffset: z.number().min(0).max(1).default(0.3),  // 신규
}),
```

### 4.3 API Design

N/A — CLI 도구, REST API 없음. 인터페이스는 `research-config.ts` 파라미터.

### 4.4 Key Technical Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| 셰이더 파라미터 전달 방식 | (A) scene.json → uniform (B) env var (C) #define | (A) scene.json → uniform | 기존 패턴과 동일. 런타임 변경 가능. 연구 루프 호환 |
| 블렌드 모드 구현 | (A) Three.js blending enum (B) 셰이더 내 수동 블렌딩 (C) MRT | (A) Three.js blending | 가장 단순. WebGL 네이티브. 4가지 모드 충분 |
| satBlendLow/High 전달 | (A) 글로벌 uniform (B) per-layer uniform | (A) 글로벌 | 모든 레이어에 동일 적용. per-role 분화는 NG3(별도 PRD) |
| Period range 구현 | (A) min/max 직접 지정 (B) center+spread | (A) min/max | 직관적. 연구 루프가 이해하기 쉬움 |
| 새 축 default 값 | (A) 1.0 통일 (B) 기존 하드코딩 값 | (B) 기존 값 | G2 충족: default에서 출력 변화 없음 보장. satBlendLow=0.1, glowPulseFloor=0.5 등 |
| glowPeriodMul 약수 충돌 | (A) tier offset (B) 가장 가까운 약수로 스냅 | (B) 스냅 | 연속 배율 유지. 탐색 공간이 이산적으로 축소되나 crash 방지 우선 |
| lumExponent guard 조건 | (A) 기존 `uLuminanceKey > 0.001` 유지 (B) `(uLumExponent + uLuminanceKey) > 0.001` | (A) 기존 guard 유지 | G2 보장 우선. luminanceKey=0인 레이어에서 기존 동작(lumPhase=0) 변경 방지. lumExponent는 luminanceKey 활성 시에만 지수 조절 |
| 빈 period 배열 처리 | (A) Zod에서 사전 차단 (B) runtime 폴백 | (B) runtime 폴백 | 약수 조합은 duration에 의존하므로 Zod만으로 사전 검증 불가. 전체 약수로 폴백 |

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | satBlendLow >= satBlendHigh | Zod refinement에서 parse 실패 → 에러 메시지 | P0 |
| E2 | periodRangeLow >= periodRangeHigh | Zod refinement에서 parse 실패 → 에러 메시지 | P0 |
| E3 | bloomThresholdMul=3.0 (threshold=2.1) | WebGL clamp 0-1. 시각적으로 bloom 비활성화 | P2 |
| E4 | glowPulseFloor=0.9 (glow 거의 변화 없음) | 유효하지만 시각적 효과 미미. 연구 루프가 자연 도태 | P3 |
| E5 | blendMode='add' + 높은 bloom | 과노출 가능. 연구 루프가 낮은 점수로 자연 도태 | P3 |
| E6 | tempoMul=0.3 (극저속) | 20초 루프 내 색 변화 거의 없음. 유효하나 비효율적 | P3 |
| E7 | lumExponent=3.0 (극단적 비선형) | 어두운 영역 과도하게 밝아짐. gate 실패 가능 | P2 |
| E8 | 기존 config 파일에 새 필드 없음 | Zod default 값 적용 → 기존 동작 유지 | P0 |
| E9 | periodRange 필터 후 약수 0개 (예: low=11, high=19, duration=20) | 전체 약수 목록으로 폴백. crash/NaN 방지 | P0 |
| E10 | bloomRadiusMul=3.0 (radius=1.2, postprocessing 범위 초과 가능) | `Math.min(radius, 1.0)` 클램프 적용 | P1 |
| E11 | near-equal satBlend (low=0.49, high=0.50) | 유효. steep smoothstep 생성되나 crash 없음 | P3 |
| E12 | glowPeriodMul 적용 후 비약수 period | 가장 가까운 유효 약수로 스냅 | P1 |

## 6. Security & Permissions

N/A — 로컬 CLI 도구. 인증/인가/데이터 보호 해당 없음.

## 7. Performance & Monitoring

| Metric | Target | Measurement |
|--------|--------|-------------|
| 파이프라인 실행 시간 | ≤ 기존 ~2분 | `npm run research:run` 타이밍 |
| 셰이더 프레임 렌더 시간 | ≤ 기존 (추가 uniform은 성능 영향 무시 가능) | Puppeteer 캡처 속도 |
| 메모리 사용량 | ≤ 기존 | 새 버퍼/텍스처 없음 |

### 7.1 Monitoring & Alerting

N/A — 로컬 CLI. 연구 루프 자체가 점수 기반 모니터링.

## 8. Testing Strategy

### 8.1 Unit Tests

| 대상 | 테스트 내용 | 파일 |
|------|-----------|------|
| ResearchConfig 스키마 | 새 파라미터 default 값, range 검증, refinement | research-config.test.ts |
| SceneGenerator multiplier | 새 multiplier 적용 로직, 기존 multiplier 미영향 | scene-generator.test.ts |
| BlendMode 매핑 | Three.js blending enum 매핑 정확성 | scene-generator.test.ts |

### 8.2 Integration Tests

| 대상 | 테스트 내용 | 파일 |
|------|-----------|------|
| Config → scene.json | 새 파라미터가 scene.json에 올바르게 기록 | config-integration.comprehensive.test.ts |
| Default 출력 동일성 | 새 파라미터 default로 기존 scene.json과 동일 출력 (JSON level 비교) | 신규 테스트 |
| Effectiveness test | 각 새 파라미터를 non-default 극단값으로 설정 → scene.json 값이 default와 다름 확인 | 신규 테스트 |

### 8.3 Edge Case Tests

| 대상 | 테스트 내용 |
|------|-----------|
| satBlendLow >= satBlendHigh | Zod parse 실패 확인 |
| periodRangeLow >= periodRangeHigh | Zod parse 실패 확인 |
| 극단값 (0.1, 3.0) | 파이프라인 크래시 없음 확인 |
| 기존 config 호환성 | 새 필드 없는 config → default 적용 |
| near-equal satBlend (0.49/0.50) | 파이프라인 완료 확인 |
| 빈 period 배열 (low=11, high=19) | 전체 약수 폴백 확인 |
| bloomRadiusMul=3.0 | radius 클램프 확인 |
| glowPeriodMul=1.5 → 비약수 period | 가장 가까운 약수 스냅 확인 |

## 9. Rollout Plan

### 9.1 Migration Strategy

마이그레이션 불필요. 모든 새 파라미터는 Zod default로 기존 동작 유지.

### 9.2 Feature Flag

불필요. 파라미터 default=기존값이 사실상 feature flag 역할.

### 9.3 Rollback Plan

`git revert` 단일 커밋. 외부 상태 변경 없음.

## 10. Dependencies & Risks

### 10.1 Dependencies

| Dependency | Owner | Status | Risk if Delayed |
|-----------|-------|--------|-----------------|
| postprocessing 라이브러리 | npm | 설치됨 | 없음 — 기존 API만 사용 |
| Three.js blending API | npm | 설치됨 | 없음 — 기존 API |

### 10.2 Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| 새 uniform 추가 시 셰이더 컴파일 실패 | LOW | HIGH | 기존 uniform 패턴 따름. E2E 테스트로 검증 |
| Blend mode 'add'가 과노출 유발 | MEDIUM | LOW | 연구 루프가 점수 기반으로 자연 도태 |
| Period range 조합이 quantization과 충돌 | LOW | MEDIUM | quantizeLoopSpeed가 안전하게 반올림 |
| 15개 축 동시 추가 시 탐색 공간 폭발 | MEDIUM | MEDIUM | 연구 루프가 단일 축 sweep → 조합 전략 사용 |
| 기존 promoted config와 새 default 불일치 | LOW | HIGH | G2에서 명시적 검증. default = 현재 하드코딩 값 |
| 셰이더 축의 미묘한 효과가 현재 메트릭(M1-M10)에서 noise 수준 | MEDIUM | MEDIUM | 리스크 수용. Effect 축 우선 탐색. 관측 불가 시 다음 iteration에서 M11+ 검토 |
| 셰이더 컴파일 실패 시 전체 파이프라인 중단 | LOW | HIGH | 구현을 3단계로 분리: Phase A(Effect 3개) → Phase B(Shader 5개) → Phase C(SceneGen 5개+blendMode) |

## 11. Success Metrics

| Metric | Baseline | Target | Measurement Method |
|--------|----------|--------|--------------------|
| 탐색 가능 축 수 | 6개 (현재 multiplier) | 20개 (기존 6 + 신규 14) | research-config.ts 파라미터 수 |
| Default 출력 일치 | N/A | scene.json identical | scene.json JSON diff + effectiveness test |
| 테스트 통과율 | 기존 전체 PASS | 기존 + 신규 전체 PASS | `npm test` |
| 파이프라인 실행 시간 | ~2분 | ≤ ~2분 | `npm run research:run` |
| 연구 루프 1회 실행 | N/A | 새 파라미터 반영 확인 | 수동 검증 1회 |

## 12. Open Questions

- [x] OQ-1: blend mode — 4가지(normal/add/multiply/screen)로 시작. overlay/softLight는 포화 후 별도 확장. **결정: 4가지 유지**
- [x] OQ-2: lumExponent — 옵션 B 채택. key와 독립 분리: `pow(1-lum, uLumExponent + uLuminanceKey)`. default=1.0에서 기존 동작 동일. **결정: 독립 지수**
- [x] OQ-3: periodRange — 방식 A(필터링) 채택. default를 `periodRangeLow: 1.0`, `periodRangeHigh: 20.0`(전체 범위)으로 설정. 약수만 사용. **결정: 약수 필터링 + 전체 범위 default**

---

### Appendix: 전체 신규 파라미터 목록 (14개)

| # | Parameter | Range | Default | Category | Files |
|---|-----------|-------|---------|----------|-------|
| 1 | bloomRadiusMul | 0.1~3.0 | 1.0 | Effect | config, scene-gen, effect-composer |
| 2 | bloomThresholdMul | 0.1~3.0 | 1.0 | Effect | config, scene-gen, effect-composer |
| 3 | caModulationOffsetMul | 0.1~3.0 | 1.0 | Effect | config, scene-gen, effect-composer |
| 4 | satBlendLow | 0.01~0.5 | 0.1 | Shader | config, scene-gen, schema, shader, renderer |
| 5 | satBlendHigh | 0.1~0.8 | 0.4 | Shader | config, scene-gen, schema, shader, renderer |
| 6 | satInjectionMul | 0.1~1.0 | 0.35 | Shader | config, scene-gen, schema, shader, renderer |
| 7 | glowPulseFloor | 0.0~0.9 | 0.0 | Shader | config, scene-gen, schema, shader, renderer |
| 8 | lumExponent | 0.5~3.0 | 1.0 | Shader | config, scene-gen, schema, shader, renderer |
| 9 | tempoMul | 0.3~3.0 | 1.0 | Scene Gen | config, scene-gen |
| 10 | phaseSpreadMul | 0.1~3.0 | 1.0 | Scene Gen | config, scene-gen |
| 11 | periodRangeLow | 1.0~10.0 | 1.0 | Scene Gen | config, scene-gen |
| 12 | periodRangeHigh | 5.0~30.0 | 20.0 | Scene Gen | config, scene-gen |
| 13 | glowPeriodMul | 0.3~3.0 | 1.0 | Scene Gen | config, scene-gen |
| 14 | blendMode | enum 4종 | 'normal' | Renderer | config, scene-gen, schema, renderer |

> 14개 확정. OQ 3건 전부 결정 완료.
