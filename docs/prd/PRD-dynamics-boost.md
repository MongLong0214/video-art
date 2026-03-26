# PRD: Dynamics Boost — source.mp4 수준 역동성 달성

**Version**: 0.1
**Author**: Claude + Isaac
**Date**: 2026-03-26
**Status**: Approved
**Size**: S

---

## 1. Problem Statement

### 1.1 Background

goat-garden.mp4 vs source.mp4 정량 비교 결과:

| 지표 | source | goat-garden | 격차 |
|------|--------|-------------|------|
| Hue shift 속도 | 377°/s | 138°/s | 2.7x 열세 |
| 프레임간 변화율 | 23.4% | 1.3% | 18x 열세 |
| 루프 RMSE | 26.5 | 111.6 | 4.2x 열세 |

goat-garden이 우위인 항목(채도, 효과 다양성, 공간감, FPS)은 유지.

### 1.2 Problem Definition

1. `scene-generator.ts`의 `speed: 1.0`이 너무 느려 역동성 부족
2. wave/glow 프리셋이 생략되어 프레임간 변화가 색순환에만 의존
3. `layer.frag`의 luminanceKey가 speed를 **곱셈**으로 적용하여 seamless loop을 수학적으로 불가능하게 만듦 (`fract(K × speed × lumFactor)` — lumFactor가 픽셀마다 다르므로 loop 경계에서 hue 불연속)

### 1.3 Impact of Not Solving

생성 영상이 source.mp4 대비 "느리고 정적인" 인상을 주어 시각적 임팩트가 현저히 떨어짐.

---

## 2. Goals & Non-Goals

### 2.1 Goals
- [ ] G1: Hue shift 속도 ≥ 350°/s (source 377°/s 수준)
- [ ] G2: 프레임간 변화율 ≥ 20% (source 23.4% 수준)
- [ ] G3: 루프 RMSE ≤ 30 (source 26.5 수준. 이상적으로 < 5)
- [ ] G4: 기존 우위 항목 유지 (채도 0.78+, 14레이어 깊이감)

### 2.2 Non-Goals
- NG1: 셰이더 시각 효과 종류 추가 (기존 6종 유지)
- NG2: 스키마(scene-schema.ts) 변경
- NG3: source.mp4와 동일한 콘텐츠 재현 (다른 이미지 기반이므로)

---

## 3. User Stories & Acceptance Criteria

### US-1: 빠른 색순환
**As a** 비디오 아티스트, **I want** source.mp4 수준의 빠른 hue 순환, **so that** 사이키델릭 역동성이 극대화된다.

**Acceptance Criteria:**
- [ ] AC-1.1: scene-generator 프리셋의 colorCycle.speed ≥ 10 (period당 10+ 회전)
- [ ] AC-1.2: 생성 영상의 hue shift ≥ 350°/s (5프레임 평균)
- [ ] AC-1.3: K × speed가 정수 (seamless loop 보장)

### US-2: 활발한 프레임간 변화
**As a** 비디오 아티스트, **I want** 매 프레임 20%+ 픽셀이 변하도록, **so that** 영상이 살아있는 느낌을 준다.

**Acceptance Criteria:**
- [ ] AC-2.1: wave 프리셋 복원 (amplitude, frequency, period)
- [ ] AC-2.2: glow 프리셋 복원 (intensity, pulse, period)
- [ ] AC-2.3: 프레임간 변화율 ≥ 20%

### US-3: Seamless Loop 복원
**As a** 비디오 아티스트, **I want** 무한 루프가 매끄럽게 이어지도록, **so that** 반복 재생 시 끊김이 보이지 않는다.

**Acceptance Criteria:**
- [ ] AC-3.1: luminanceKey를 hue shift rate 곱셈 → **phase offset 덧셈**으로 변경 (셰이더 수정)
- [ ] AC-3.2: K × speed가 정수이면 모든 픽셀에서 pixel-perfect seamless
- [ ] AC-3.3: 루프 RMSE ≤ 30

---

## 4. Technical Design

### 4.4 Key Technical Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| luminanceKey 적용 방식 | A) rate 곱셈 유지 B) phase offset 덧셈 | **B) phase offset** | A는 seamless 수학적 불가능. B는 K×speed 정수면 완벽 seamless. 시각 효과: "밝기별 hue 위상 차이"로 유사한 사이키델릭 효과 유지 |
| speed 값 | A) 5 B) 10 C) 13 | **C) 13** | period=10일 때 K=1, K×speed=13(정수). period=5→K×speed=26. period=2→K×speed=65. period=1→K×speed=130. 모두 정수→seamless. 13회전/period × 36°/rotation = 468°/s (source 377°/s 초과) |

### Seamless 증명 (phase offset 방식)

```
새 수식: hueShift = fract(time/period × speed + lumPhase + offset/360)

lumPhase = pow(1-lum, 1+key) — 시간에 무관한 상수

t=0:        fract(0 + lumPhase + offset) = fract(lumPhase + offset)
t=duration: fract(K×speed + lumPhase + offset)

K×speed = 정수 N이면:
  fract(N + lumPhase + offset) = fract(lumPhase + offset) = t=0 값
  → 모든 픽셀에서 pixel-perfect seamless ✓

lumPhase 값에 무관하게 성립 (덧셈이므로)
```

---

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | luminanceKey=0 | lumPhase=0, 모든 픽셀 동일 phase → 균일 순환 | Low |
| E2 | speed=13, period=10, K×speed=13 | 정수 → seamless | Low |
| E3 | 기존 scene.json (speed=0.3 등) | 새 프리셋으로 재생성 필요. 기존 파일은 기존 셰이더 수식으로 렌더링되므로 호환 이슈 없음 (새 셰이더 적용 시 lumFactor 의미가 달라지나, 시각적으로 유사) | Medium |

---

PRD 확인해주세요. 핵심 결정: **luminanceKey를 rate 곱셈 → phase offset 덧셈으로 변경** (셰이더 1줄 수정)하여 seamless loop을 수학적으로 보장합니다.