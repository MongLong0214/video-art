# T6: analyze-layers.py effects (depth-varying + 이펙트)

**PRD Ref**: PRD-video-blueprint-v3 > US-4
**Priority**: P1 (High)
**Size**: M (2-4h)
**Status**: Done
**Depends On**: T4

---

## 1. Objective

T4에서 감지된 레이어별 도형의 depth-varying 속성(stroke width, opacity, glow, color gradient)과 글로벌 이펙트(breathing, CA, grain, vignette)를 감지한다.

## 2. Acceptance Criteria
- [ ] AC-1: depth-varying stroke width 감지 (outermost vs innermost 도형의 stroke 비교)
- [ ] AC-2: depth-varying opacity/brightness 감지 (도형별 주변 픽셀 밝기 비교)
- [ ] AC-3: glow 감지: 도형 엣지 주변 exp decay 패턴 + decay_range + amplitude
- [ ] AC-4: depth-varying color gradient 감지 (outermost vs innermost 색상 LAB 차이)
- [ ] AC-5: breathing 감지: 프레임 간 최대 도형 크기 진폭 + scipy.signal.find_peaks로 주기 추출
- [ ] AC-6: chromatic aberration 감지: R/G/B 채널 엣지 위치 shift
- [ ] AC-7: vignette 감지: radial brightness profile + start_radius + darkening_ratio
- [ ] AC-8: grain 감지: high-frequency residual energy
- [ ] AC-9: 미감지 이펙트 → unknown_effects[]에 기록

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `test_stroke_depth_detection` | Unit | 3개 동심 rect, stroke 10→5→2 px | near=10, far=2 |
| 2 | `test_glow_exponential_decay` | Unit | rect 주변에 exp(-d*k) 밝기 패턴 | has_glow=True, decay ±20% |
| 3 | `test_breathing_sinusoidal` | Unit | 10프레임, 도형 크기 sin 진동 ±2% | amplitude=0.02, period 감지 |
| 4 | `test_vignette_radial_profile` | Unit | radial gradient 이미지 | start_radius, darkening_ratio ±0.05 |
| 5 | `test_ca_channel_shift` | Unit | R채널 2px 우측 시프트 이미지 | max_shift=2.0 ±0.5 |
| 6 | `test_grain_detection` | Unit | 균일 이미지 + random noise σ=10 | has_grain=True |
| 7 | `test_no_effects_clean_image` | Unit | 이펙트 없는 깨끗한 기하학 이미지 | 모든 effect enabled=False |
| 8 | `test_depth_varying_opacity` | Unit | depth별 opacity 변화 감지 | near/far opacity 차이 측정 |
| 9 | `test_color_gradient_detection` | Unit | outermost vs innermost 색상 LAB 차이 감지 | gradient near/far 기록 |
| 10 | `test_unknown_effects_recorded` | Unit | 미감지 이펙트가 unknown_effects[]에 기록 | 배열에 기록됨 |

### 3.2 Test File Location
- `.claude/skills/video-blueprint/scripts/tests/test_effects.py`

### 3.3 Mock/Setup Required
- PIL + numpy로 합성 테스트 이미지 생성 (glow, vignette, CA, grain 각각)
- scipy.signal.find_peaks

> **Note**: psy.mov 의존 테스트는 `@pytest.mark.integration` 데코레이터 + conftest.py에서 프레임 파일 존재 확인 후 skip 처리
> **Note**: T6 modifies only effects.py, no conflict with T5

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `.claude/skills/video-blueprint/scripts/analyze_layers/effects.py` | Create | effect detection 모듈 |

### 4.2 Implementation Steps (Green Phase)
1. detect_depth_varying_stroke(): outermost/innermost shape의 stroke_width 비교
2. detect_depth_varying_brightness(): 도형 주변 픽셀 밝기를 depth 순서로 비교
3. detect_glow(): 도형 엣지에서 거리별 밝기 프로파일 → exp decay 피팅
4. detect_breathing(): 프레임 간 최대 도형 width 변화 → find_peaks
5. detect_chromatic_aberration(): R/G/B 채널별 엣지 phaseCorrelate
6. detect_vignette_profile(): radial brightness binning
7. detect_noise_grain(): Gaussian blur residual energy

## 5. Edge Cases
- EC-1: (E1) 어두운 영상에서 glow가 배경과 구분 안됨 → threshold 완화
- EC-2: breathing amplitude < 0.5% → 무시 (noise와 구분 불가)

## 6. Review Checklist
- [ ] Red → Green → Refactor 완료
- [ ] psy.mov에서 glow, breathing 감지 확인
- [ ] 이펙트 없는 단순 영상에서 false positive 없음 확인
