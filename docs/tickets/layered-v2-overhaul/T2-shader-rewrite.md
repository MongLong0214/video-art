# T2: layer.frag 셰이더 전면 교체

**PRD Ref**: PRD-layered-v2-psychedelic-overhaul > US-1, US-2, US-3
**Priority**: P0
**Size**: L (4-8h)
**Status**: Todo
**Depends On**: T1

---

## 1. Objective

layer.frag의 색순환 알고리즘을 sin 왕복 → fract linear sweep으로 전환하고, HSL→HSV 색공간 통일, 채도 부스트(saturationBoost), 밝기 기반 차등 shift(luminanceKey), 위상 오프셋(phaseOffset) 구현.

## 2. Acceptance Criteria
- [ ] AC-1: hue가 `fract(time/period × speed + offset)` 형태의 linear sweep으로 360° 연속 순환
- [ ] AC-2: HSL 변환 함수(rgb2hsl, hsl2rgb) 제거, HSV 변환(rgb2hsv, hsv2rgb)으로 전면 교체
- [ ] AC-3: `uSaturationBoost` uniform으로 HSV의 S를 배율 증폭. clamp(0,1)
- [ ] AC-4: `uLuminanceKey` uniform으로 `pow(1.0-lum, 1.0+key)` 기반 차등 shift
- [ ] AC-5: luminance는 **hue shift 적용 전 원본 텍스처 RGB**에서 계산 (seamless 보장)
- [ ] AC-6: `uPhaseOffset` uniform으로 초기 hue 위상 오프셋
- [ ] AC-7: hueRange는 무시 (항상 full 360° sweep)
- [ ] AC-8: 기존 wave, glow, parallax 효과 유지 (uniform 이름/동작 변경 없음)
- [ ] AC-9: 60fps 실시간 렌더링 유지
- [ ] AC-10: luminanceKey=0이면 lum에 무관한 균일 shift (key>0.001 분기)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

GLSL은 직접 단위 테스트 불가하지만, HSV 변환 로직을 JS로 포팅하여 왕복 정합성을 검증한다.

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `rgb2hsv roundtrip` | Unit | RGB→HSV→RGB 왕복 검증 (JS 포팅) | 오차 < 0.001 |
| 2 | `hsv hue shift wrapping` | Unit | fract(h + shift) → 0~1 범위 유지 | 범위 내 |
| 3 | `luminanceKey=0 gives uniform shift` | Unit | pow(1-lum, 1) vs 1.0 분기 | key=0 → multiplier=1.0 |
| 4 | `validate-loop RMSE` | Integration | 새 셰이더로 렌더링 후 frame[0] vs frame[last] | RMSE < 2.0 |
| 5 | `visual: saturation check` | Manual | 프레임 캡처 후 HSV S 측정 | mean_sat > 0.60 |

### 3.2 Test File Location
- Integration: `scripts/validate-loop.ts` (기존, T4에서 업데이트)
- Manual: 프레임 캡처 후 Python 분석 (임시 스크립트)

### 3.3 Mock/Setup Required
- npm run dev 실행 상태에서 브라우저 미리보기 필요
- 테스트 이미지: 기존 `public/layers/` 사용

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `src/shaders/layer.frag` | Modify (전면 교체) | HSV 전환, linear sweep, sat boost, lum key, phase offset |

### 4.2 Implementation Steps (Green Phase)
1. `rgb2hsl`, `hsl2rgb` 함수 제거
2. `rgb2hsv`, `hsv2rgb` 표준 GLSL 함수 추가
3. 새 uniform 선언: `uSaturationBoost`, `uLuminanceKey`, `uPhaseOffset`
4. main() 실행 순서 구현:
   ```
   a. parallax offset 계산 (기존 유지)
   b. wave offset 계산 (기존 유지)
   c. texture2D 샘플링
   d. 원본 RGB에서 luminance 계산: lum = dot(texColor.rgb, vec3(0.299, 0.587, 0.114))
   e. RGB→HSV 변환
   f. luminance factor: `float lumFactor = uLuminanceKey > 0.001 ? pow(1.0-lum, 1.0+uLuminanceKey) : 1.0;`
   g. hue shift: hsv.x = fract(hsv.x + time/period × speed × lumFactor + uPhaseOffset/360.0)
   g. saturation boost: hsv.y = clamp(hsv.y × uSaturationBoost, 0.0, 1.0)
   h. HSV→RGB 변환
   i. glow pulse 적용 (기존 유지)
   j. output: gl_FragColor = vec4(rgb, texColor.a × uOpacity)
   ```
5. 주석 오타 수정 (L4: "uLoopDurationATION")

### 4.3 Refactor Phase
- 불필요한 `uColorCycleHueRange` uniform 참조 제거 (셰이더에서 무시)

## 5. Edge Cases
- EC-1: saturationBoost=0 → 흑백 (HSV S=0)
- EC-2: luminanceKey=0 → 전체 균일 shift (pow(1-lum, 1) = 1-lum, 여전히 약간의 차등)
  주의: luminanceKey=0이면 pow(1-lum, 1.0) = 1-lum이므로 완전 균일이 아님. 완전 균일을 위해 key=0일 때 pow 항을 1.0으로 고정하는 분기 필요
- EC-3: 완전 검정(lum=0) → pow(1, 1+key) = 1 → 최대 shift. 하지만 HSV에서 S=0이므로 hue shift 무효
- EC-4: 완전 흰색(lum=1) → pow(0, 1+key) = 0 → shift 없음

## 6. Review Checklist
- [ ] Red: validate-loop 실행 → 새 셰이더 적용 전 baseline 측정
- [ ] Green: 셰이더 교체 후 → 브라우저 미리보기 정상 + validate-loop RMSE < 2.0
- [ ] Refactor: 불필요 코드 제거 확인
- [ ] AC 전부 충족
- [ ] 60fps 유지 확인
