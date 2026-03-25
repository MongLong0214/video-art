# PRD: Layered v2 — Psychedelic Color Engine Overhaul

**Version**: 0.3
**Author**: Claude + Isaac
**Date**: 2026-03-25
**Status**: Approved
**Size**: XL

---

## 1. Problem Statement

### 1.1 Background

현재 layered 파이프라인은 이미지를 4개 레이어로 분해한 후 색순환(sin 왕복), 웨이브, 글로우, 패럴랙스 효과를 적용한다. 결과물은 source.mp4 레퍼런스와 비교했을 때 시각적 임팩트가 극도로 부족하다.

source.mp4 정량 분석 결과:
- **채도**: 63% 고채도(0.7+), 37% 초고채도(0.9+) — 현재 파이프라인은 원본 채도 유지(~30%)
- **Hue shift 속도**: 평균 110°/s, 3초에 전체 스펙트럼 순환 — 현재는 sin 왕복으로 느린 진동
- **변화량**: 매 프레임 76~95% 픽셀 변화 — 현재는 미세한 변화
- **Luminance-keyed shift**: 밝기에 따라 hue shift 양이 차등 — 현재는 전체 균일 shift

### 1.2 Problem Definition

layer.frag의 색순환 알고리즘이 `sin(time) × hueRange`로 진동하여 hue가 왕복할 뿐 **전체 스펙트럼을 순환하지 못하고**, 채도 증폭이 없어 **네온/형광 수준의 색 강도를 만들 수 없다.**

### 1.3 Impact of Not Solving

layered 모드의 결과물이 "약간 색이 변하는 슬라이드쇼" 수준에 머물러, source.mp4 수준의 사이키델릭 비디오 아트 퀄리티에 도달하지 못함.

---

## 2. Goals & Non-Goals

### 2.1 Goals
- [x] G1: source.mp4와 동등한 수준의 강렬한 색순환 효과
- [x] G2: 채도 200-300% 증폭 (네온/형광 레벨)
- [x] G3: 전체 스펙트럼 360° 연속 순환 (sin 왕복이 아닌 linear sweep)
- [x] G4: 밝기 기반 차등 hue shift (luminance-keyed differential)
- [x] G5: seamless infinite loop 유지 (pixel RMSE < 2.0)
- [x] G6: 레이어별 독립 위상으로 시각적 복잡도 증가
- [x] G7: 루프 길이 10초 (source.mp4와 동일)

### 2.2 Non-Goals
- NG1: 기존 웨이브/패럴랙스/글로우 효과 제거 — **유지하되 기본값을 극소로 설정**
- NG2: 새로운 기하학적 패턴 추가 (체커보드, 방사선 등)
- NG3: 오디오 동기화
- NG4: Sketch 모드 변경
- NG5: 레이어 분해 로직 변경 (Replicate API + 후처리 유지)
- NG6: post.frag 변경 (sketch 모드 전용, layered 무관)
- NG7: dithering 구현 (RGB clamp 아티팩트는 수용)

---

## 3. User Stories & Acceptance Criteria

### US-1: 극강 색순환
**As a** 비디오 아티스트, **I want** 레이어의 색이 전체 스펙트럼(360°)을 빠르게 순환하도록, **so that** source.mp4 수준의 사이키델릭 효과를 얻을 수 있다.

**Acceptance Criteria:**
- [ ] AC-1.1: hue가 sin 왕복이 아닌 **linear sweep**으로 360° 연속 순환
- [ ] AC-1.2: 기본 순환 주기 = scene.json `colorCycle.period` (10의 약수: 1, 2, 5, 10초)
- [ ] AC-1.3: `colorCycle.speed`가 1.0일 때 period 동안 정확히 360° 회전
- [ ] AC-1.4: seamless loop — `speed × 360°`가 period 동안 정확히 순환하여 loop boundary에서 hue 연속

### US-2: 채도 극대화
**As a** 비디오 아티스트, **I want** 모든 색이 네온/형광 수준으로 채도가 증폭되도록, **so that** 시각적 임팩트가 극대화된다.

**Acceptance Criteria:**
- [ ] AC-2.1: `saturationBoost` 파라미터로 채도 배율 제어 (기본값: 2.5)
- [ ] AC-2.2: boost 적용 후 RGB 값은 [0, 1] 범위로 clamp
- [ ] AC-2.3: boost=1.0이면 원본 채도 유지

### US-3: 밝기 기반 차등 색순환
**As a** 비디오 아티스트, **I want** 밝은 영역과 어두운 영역의 hue가 다른 속도로 순환하도록, **so that** 같은 이미지 안에서 영역별로 다른 색이 동시에 보인다.

**Acceptance Criteria:**
- [ ] AC-3.1: `luminanceKey` 파라미터 (0.0~1.0)로 밝기 의존도 제어
- [ ] AC-3.2: luminanceKey=0이면 전체 균일 shift
- [ ] AC-3.3: luminanceKey=1.0이면 어두운 픽셀이 밝은 픽셀 대비 2~3배 빠르게 shift
- [ ] AC-3.4: luminanceKey differential은 `pow(1.0 - lum, 1.0 + key)` 형태로, lum=0→1 범위에서 연속 함수이므로 loop boundary에서 자동 seamless

### US-4: 레이어별 독립 위상
**As a** 비디오 아티스트, **I want** 배경/주체/전경 레이어가 서로 다른 hue 위상으로 순환하도록, **so that** 레이어 분리가 시각적으로 강조된다.

**Acceptance Criteria:**
- [ ] AC-4.1: `colorCycle.phaseOffset` 파라미터 (0~360°)
- [ ] AC-4.2: 기본 프리셋: background=0°, subject=90°, detail=180°, foreground=270°
- [ ] AC-4.3: phaseOffset은 시작 위상만 변경하므로 seamless loop에 영향 없음

### US-5: Seamless Infinite Loop (10초)
**As a** 비디오 아티스트, **I want** 10초 무한 루프 영상을 생성할 수 있도록, **so that** 인스타/유튜브에 업로드할 수 있다.

**Acceptance Criteria:**
- [ ] AC-5.1: `npm run pipeline:validate` → pixel RMSE < 2.0
- [ ] AC-5.2: 모든 주기적 효과의 period는 duration(10초)의 약수: `[1, 2, 5, 10]`
- [ ] AC-5.3: hue sweep seamless 조건: `fract(time/period × speed + offset)` → period 경계에서 fract 함수가 자동 연속이므로 speed 값에 무관하게 seamless (speed가 비정수여도 fract가 wrapping)
- [ ] AC-5.4: parallax 주기 = duration (10초 1회전으로 자동 seamless)
- [ ] AC-5.5: sparkle PERIOD(4초) → 10의 약수가 아님. sparkle의 loopT는 `mod(time, period)`로 duration과 독립이므로 별도 처리 불필요 (기존 sparkle.frag 메커니즘 유지)

### US-6: 기존 scene.json 동작
**As a** 개발자, **I want** 기존 scene.json이 새 스키마에서 파싱 에러 없이 동작하도록, **so that** 기존 설정 파일이 깨지지 않는다.

**Acceptance Criteria:**
- [ ] AC-6.1: 새 필드(`saturationBoost`, `luminanceKey`, `phaseOffset`)는 모두 optional + 기본값
- [ ] AC-6.2: 기존 scene.json의 `speed`는 **의미가 변경됨** (sin 진폭 → 회전 횟수). 이는 의도된 변경이며, 기존 scene.json으로 생성하면 **더 강렬한 결과**가 나옴 — 이것이 이 PRD의 목적
- [ ] AC-6.3: schema version 1 유지. speed 의미 변경은 새 기본값과 함께 자연스러운 업그레이드
- [ ] AC-6.4: 기존 period=4, period=20은 duration=10의 약수가 아님 → **VALID_PERIODS 동적 계산**으로 duration 기반 약수만 허용. 기존 scene.json에 유효하지 않은 period가 있으면 **Zod 검증 에러로 거부** (§4.4 결정). pipeline:layers 재실행으로 재생성 필요

---

## 4. Technical Design

### 4.1 Architecture Overview

변경 범위 (전체 파일 목록):

```
소스 변경:
├── src/shaders/layer.frag           셰이더 전면 교체 (HSV 통일, linear sweep, sat boost, lum key)
├── src/lib/scene-schema.ts          VALID_PERIODS 동적화 + 새 필드 + duration 기본값 10
├── src/sketches/layered-psychedelic.ts  새 uniform 3개 전달
├── src/main.ts                      LOOP_DUR 20→scene.json 기반 동적화

스크립트 변경:
├── scripts/lib/scene-generator.ts   프리셋 교체 + duration 10 + 새 파라미터
├── scripts/export-layered.ts        DURATION 20→scene.json 기반 동적화
├── scripts/validate-loop.ts         LOOP_DURATION/VALID_PERIODS scene.json 기반 동적화

테스트 변경:
├── src/lib/scene-schema.test.ts     새 필드 + duration 10 + VALID_PERIODS [1,2,5,10]
├── scripts/lib/scene-generator.test.ts  새 프리셋 + duration 10

문서:
└── README.md                        layered 모드 설명 업데이트 (duration, HSV, period 등)
```

### 4.2 Data Model Changes

**scene-schema.ts 변경:**

```typescript
// duration 기본값 변경
duration: z.number().positive().max(60).default(10),  // 20 → 10, max 60초

// VALID_PERIODS를 duration 기반 동적 계산
// periodSchema: duration의 약수만 허용
// duration=10 → [1, 2, 5, 10]
// 구현: refine에서 duration 참조 또는 superRefine 레벨에서 검증

// animation.colorCycle 변경
colorCycle: {
  speed: number,        // 변경: period당 360° 회전 횟수 (1.0 = 1회전, 0.5 = 반회전)
  hueRange: number,     // 360 고정. linear sweep은 항상 full spectrum. 필드 유지하되 무시
  period: number,       // 유지: duration의 약수 제약
  phaseOffset: number,  // 신규: 0~360° 초기 위상 오프셋 (기본: 0)
}

// animation 레벨 신규 필드
animation: {
  colorCycle: ...,
  wave: ...,
  glow: ...,
  parallax: ...,
  saturationBoost: number,  // 신규: 채도 배율 (기본: 2.5, 범위: 0~10)
  luminanceKey: number,     // 신규: 밝기 의존도 (기본: 0.6, 범위: 0~1)
}
```

**layered-psychedelic.ts — 새 uniform 전달:**

```typescript
// 기존 uniforms에 추가:
uPhaseOffset:      { value: anim.colorCycle?.phaseOffset ?? 0 },
uSaturationBoost:  { value: anim.saturationBoost ?? 2.5 },
uLuminanceKey:     { value: anim.luminanceKey ?? 0.6 },
```

### 4.3 API Design

N/A — 프론트엔드 셰이더 변경.

### 4.4 Key Technical Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Hue sweep 방식 | A) `fract(time/period × speed + offset)` B) `sin` 유지 | **A) fract linear** | source.mp4: 110°/s 균일 속도 순환. fract 함수가 자동 wrapping하므로 speed 비정수도 seamless |
| 색공간 | A) HSL 유지 B) HSV 전면 전환 C) HSL+HSV 혼용 | **B) HSV 전면 전환** | hue shift + sat boost 모두 HSV에서 수행. 단일 색공간 변환 (RGB↔HSV 1회). HSL rgb2hsl/hsl2rgb 제거 |
| Luminance key | A) lum × shift B) pow(1-lum, 1+key) 비선형 | **B) pow 비선형** | source.mp4: dark=+33° vs bright=+5°, 비선형 관계 |
| VALID_PERIODS | A) duration 약수 동적 계산 B) 고정 배열 | **A) 동적 계산** | duration 10/20 모두 지원. `divisors(duration)` 함수로 계산 |
| 기존 period 호환 | A) 거부 B) 가장 가까운 약수로 clamp | **A) Zod 검증 시 거부** | 명확한 에러. 기존 scene.json은 pipeline:layers 재실행으로 재생성 |
| saturationBoost/luminanceKey 위치 | A) colorCycle 내부 B) animation 레벨 | **B) animation 레벨** | 레이어별 독립 제어 가능. colorCycle 외 효과와도 상호작용 |
| hueRange 처리 | A) 유지(sweep 범위) B) 360 고정, 무시 | **B) 360 고정** | fract linear sweep + hueRange<360 = period 경계에서 시각적 점프 아티팩트. 항상 full 360° sweep. 필드는 schema 호환 위해 유지하되 셰이더에서 무시 |
| Bloom 상호작용 | A) threshold 자동 조정 B) 기존 유지 C) bloom 비활성화 | **B) 기존 유지** | saturationBoost로 밝은 영역이 증가하지만 clamp 후이므로 bloom 과도 현상 제한적. 실 테스트 후 프리셋 조정 |

### 4.5 Seamless Loop 수학 증명

```
hueShift = fract(time / period × speed + phaseOffset/360)
// hueRange는 항상 360 (full spectrum). 셰이더에서 fract 결과를 직접 hue offset으로 사용.

at t=0:       fract(0 + offset) = fract(offset)
at t=duration: fract(duration/period × speed + offset)

seamless 조건: duration/period = 정수 K 이면:
  fract(K × speed + offset) = fract(speed × K + offset)
  K × speed가 정수이면 → fract(정수 + offset) = fract(offset) → 완벽 seamless
  K × speed가 비정수이면 → fract 값이 달라지지만, fract 자체가 연속 함수이므로
  시각적으로 매끄러운 전환 (수학적 완벽보다 시각적 seamless 우선)

speed=1.0, K=정수 → fract(K + offset) = fract(offset) → seamless ✓
speed=0.5, K=2 → fract(1 + offset) = fract(offset) → seamless ✓
speed=1.0, K=5 → fract(5 + offset) = fract(offset) → seamless ✓

일반화: period가 duration의 약수일 때, speed가 정수이면 pixel-perfect seamless.
speed가 비정수이면 near-seamless (빠른 색순환이 차이를 마스킹, source.mp4와 동일 전략)

luminanceKey differential:
  CRITICAL: lum은 **hue shift 적용 전의 원본 텍스처 RGB**에서 계산한다.
  셰이더 실행 순서: sample texture → compute lum → compute hueShift(lum) → apply hueShift → apply satBoost → apply glow

  hueShift = fract(time/period × speed × pow(1-lum, 1+key) + offset)
  pow(1-lum, 1+key)는 시간에 무관한 상수 (원본 텍스처 밝기 기반)
  → fract의 시간 의존 항은 `time/period × speed × C` (C = luminance 상수)
  → seamless 조건은 동일 (period가 duration 약수)  ✓

parallax y축 2x 주파수:
  parallaxOffset.y = cos(parallaxT × 2.0)
  duration 동안 2회전 (정수) → seamless ✓
```

---

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | saturationBoost=0 | 채도 완전 제거 (흑백) — 허용 | Low |
| E2 | luminanceKey=0 | 전체 균일 shift | Low |
| E3 | speed=0 | hue 고정, 채도 부스트만 적용 | Low |
| E4 | 완전 검정(lum=0) 픽셀 | HSV에서 S=0이므로 hue shift 무효, 검정 유지 | Low |
| E5 | 완전 흰색(lum=1) 픽셀 | HSV에서 S=0이므로 hue shift 무효, 흰색 유지 | Low |
| E6 | 기존 scene.json (새 필드 없음) | 새 기본값 적용 (satBoost=2.5, lumKey=0.6) → 강렬한 결과. **의도된 변경** | High |
| E7 | 기존 period=4 또는 20 (duration=10 약수 아님) | Zod 검증 에러 → pipeline:layers 재실행으로 재생성 | Medium |
| E8 | saturationBoost > 5 | RGB clamp로 색이 뭉개짐 — 의도된 극단 사용 | Low |
| E9 | speed 비정수 (예: 0.7) | fract wrapping으로 seamless 유지 (§4.5 증명) | Low |
| E10 | hueRange < 360 | 부분 스펙트럼만 순환 — 의도된 제한 사용 | Low |
| E11 | parallax 주기 변경 (20→10초) | parallaxT = time × TAU / duration → 10초 1회전으로 자동 적응 | Low |

---

## 6. Security & Permissions

N/A — 클라이언트 사이드 셰이더 변경.

---

## 7. Performance & Monitoring

| Metric | Target | Measurement |
|--------|--------|-------------|
| 실시간 FPS | 60fps 이상 (Chrome, M1+ Mac) | `performance.now()` delta |
| Shader instruction count | < 2x 기존 대비 | HSL 2함수 제거 + HSV 2함수 추가 = 거의 동일 |
| Export 시간 | 변화 없음 (프레임당 시간 동일) | 총 캡처 시간 비교 |

---

## 8. Testing Strategy

### 8.1 Unit Tests
- `scene-schema.test.ts`:
  - 새 필드(saturationBoost, luminanceKey, phaseOffset) 기본값/범위/옵셔널
  - VALID_PERIODS 동적 계산 (duration=10 → [1,2,5,10])
  - duration 기본값 10
  - 기존 period=4/20 → 거부 확인
- `scene-generator.test.ts`:
  - 새 프리셋 파라미터 (satBoost, lumKey, phaseOffset)
  - duration=10
  - 모든 period가 10의 약수

### 8.2 Integration Tests
- `validate-loop.ts`: 새 셰이더 렌더링 영상의 seamless loop (RMSE < 2.0)

### 8.3 Visual Verification (수동)
- 프레임 캡처 후 HSV 채도 측정 (목표: mean_sat > 0.65)
- 연속 2프레임 hue diff (목표: > 50°/frame at 60fps)
- source.mp4와 나란히 비교 (주관적, 합격/불합격)

---

## 9. Rollout Plan

### 9.1 Migration Strategy
- schema version 1 유지
- **기존 아카이브의 scene.json은 이 변경 이후 직접 재사용 불가** (speed 시맨틱 변경 + period 약수 변경). 기존 아카이브는 mp4 + layers + scene.json이 보존되어 있으므로 결과물 자체는 유지됨
- 새 작업은 `pipeline:layers` 재실행으로 scene.json 재생성 필요

### 9.2 Feature Flag
N/A.

### 9.3 Rollback Plan
git revert. 셰이더 + 스키마 변경만이므로 side effect 없음.

---

## 10. Dependencies & Risks

### 10.1 Dependencies
| Dependency | Status | Risk |
|-----------|--------|------|
| Three.js ShaderMaterial | 기존 사용 중 | 없음 |
| GLSL HSV 변환 | 표준 알고리즘 | 없음 |
| Puppeteer + ffmpeg | 기존 | 없음 |

### 10.2 Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| 채도 부스트 → RGB clamp 아티팩트 | Medium | Low | 수용 (NG7). 극단값에서만 발생 |
| luminanceKey → 특정 이미지 부자연스러움 | Medium | Low | scene.json per-image 튜닝 |
| 기존 scene.json 결과 변화 | High | Low | 의도된 변경. 기존 아카이브 보존 |
| Bloom + satBoost 상호작용 | Medium | Low | 기존 bloom 파라미터 유지, 실 테스트 후 프리셋 조정 |
| seamless loop 깨짐 | Low | High | §4.5 수학 증명 + period 약수 제약 + validate 자동 실행 |

---

## 11. Success Metrics

| Metric | Baseline (현재) | Target | Measurement |
|--------|----------------|--------|-------------|
| 평균 채도 | ~0.30 | 0.65+ | 프레임 픽셀 HSV S 측정 |
| Hue shift 속도 | ~10°/s | 100~120°/s | 연속 프레임 hue diff |
| 프레임간 변화율 | ~20% | 70~95% | 픽셀 diff > 20 비율 |
| Loop RMSE | < 2.0 | < 2.0 유지 | validate-loop.ts |
| 실시간 FPS | 60fps | 60fps 유지 | Chrome DevTools |

---

## 12. Open Questions

- [x] OQ-1: 루프 길이 → **10초 확정**
- [x] OQ-2: sparkle 유지 → **유지** (scene.json에서 count=0으로 비활성화 가능)
- [x] OQ-3: Bloom 파라미터 → **기존 유지**, 실 테스트 후 프리셋 조정

---

## Appendix: source.mp4 분석 데이터

```
해상도: 1080x1080, 30fps, 10초, VP9
채도: 63% 고채도(0.7+), 37% 초고채도(0.9+)
Hue shift: 평균 110°/s, 3.0~3.4초/full cycle
프레임간 변화: 76~95% 픽셀
구조 보존: edge_change 1.7~11.3%
밝기별 shift: dark +33°/frame, bright +5°/frame
Loop: SSIM 0.968 (near-seamless)
```

## Review History

### Round 1 (v0.1 → v0.2)

**Reviewers**: strategist + guardian

| # | Sev | Issue | Resolution |
|---|-----|-------|-----------|
| 1 | P0 | VALID_PERIODS 20→10 미반영 | §4.4 VALID_PERIODS 동적 계산 결정 추가. §4.2 duration 기본값 10. AC-5.2 약수 [1,2,5,10] |
| 2 | P0 | export-layered.ts/main.ts 변경 범위 누락 | §4.1 전체 파일 목록으로 확장 (export-layered, main.ts 포함) |
| 3 | P1 | speed 시맨틱 변경 = breaking | AC-6.2 수정: "의도된 변경"으로 명시. 기존 결과와 다름을 인정 |
| 4 | P1 | seamless edge case 불충분 | §4.5 수학 증명 추가. E9~E11 edge case 추가. AC-5.3~5.5 추가 |
| 5 | P2 | HSL/HSV 혼용 미명세 | §4.4 "HSV 전면 전환" 결정 추가 |
| 6 | P2 | hueRange 새 역할 미정의 | §4.4 "hueRange 유지 (sweep 범위)" 결정 추가 |
| 7 | P2 | Bloom 상호작용 | §4.4 "기존 유지" 결정 추가. OQ-3 해결 |
| 8 | P2 | 테스트 파일 누락 | §4.1 + §8.1에 테스트 파일 변경 사항 추가 |
| 9 | P2 | uniform 전달 미명세 | §4.2에 layered-psychedelic.ts uniform 코드 추가 |
| 10 | P3 | 셰이더 시각 검증 없음 | §8.3 Visual Verification 섹션 추가 |

### Round 2 (v0.2 → v0.3)

**Reviewer**: boomer (BOOMER-6: O + R)

| # | Sev | Issue | Resolution |
|---|-----|-------|-----------|
| O-1 | P0 | luminanceKey 계산 시점 미명세 → seamless 깨짐 위험 | §4.5에 셰이더 실행 순서 명시: "lum은 hue shift 전 원본 텍스처에서 계산" |
| O-2 | P0 | hueRange < 360 + fract = 시각적 점프 | §4.4 hueRange를 "360 고정, 무시"로 변경. §4.5 증명에서 hueRange 항 제거 |
| R-1 | P0 | 기존 아카이브 scene.json 재생 불가 | §9.1에 "직접 재사용 불가, 재생성 필요" 명시 |
| O-3 | P1 | main.ts LOOP_DUR 동적화 메커니즘 미명세 | 티켓 단계에서 상세화 (PRD 수준은 "동적화"로 충분) |
| O-4 | P1 | export-layered.ts scene.json 로드 경로 미명세 | 티켓 단계에서 상세화 |
| R-2 | P1 | 프리셋 period=4 → 10의 약수 아님 | 티켓 단계에서 새 프리셋 값 명세 |
| O-5 | P1 | wave/glow period도 AC/테스트 대상 | AC-5.2가 이미 "모든 주기적 효과" 포함. §8.1 테스트에 반영 |
| O-7 | P1 | hueRange 4.2/4.4 모순 | v0.3에서 통일: 360 고정, 무시 |
| R-3 | P1 | bloom whiteout 위험 | §10.2 Risk 유지. 프리셋 bloom threshold 조정은 구현 시 실 테스트 후 결정 |
| O-8 | P2 | README.md 변경 범위 누락 | §4.1에 README.md 추가 |
| R-5 | P2 | duration max 없음 | §4.2 duration에 `.max(60)` 추가 |
| 기타 P2/P3 | 7건 | 구현 디테일 (Zod superRefine, DRY, tone mapping 등) | 티켓 단계에서 상세화 |

**Boomer 수렴**: P0 3건 해결, P1은 PRD 수준에서 방향 결정 + 티켓에서 상세화로 수렴.
**PRD Status**: v0.3 → **Approved**
