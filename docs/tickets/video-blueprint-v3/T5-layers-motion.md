# T5: analyze-layers.py motion (개별 추적 + 줌 감지)

**PRD Ref**: PRD-video-blueprint-v3 > US-2, US-3
**Priority**: P0 (Blocker)
**Size**: L (4-8h)
**Status**: Todo
**Depends On**: T4

---

## 1. Objective

T4에서 감지된 레이어별 도형을 연속 프레임에서 개별 추적하여: (1) 도형별 회전속도 측정, (2) 가변속도 패턴 분류 (linear/geometric), (3) index-scroll 줌 감지.

## 2. Acceptance Criteria
- [ ] AC-1: 연속 프레임 쌍에서 동일 도형을 centroid+area 매칭으로 추적
- [ ] AC-2: 도형별 rotation_delta_deg 측정 (minAreaRect angle diff + 연속성 보정)
- [ ] AC-3: 균일속도 vs 가변속도 자동 분류 (scipy.optimize.curve_fit으로 linear/geometric/exponential 피팅)
- [ ] AC-4: psy.mov back layer: 10개 rect의 회전속도가 (i+1) half-turns/loop 비율임을 감지
- [ ] AC-5: 도형이 중심으로 수렴 + 축소하는 패턴 → zoom_inward (method: index_scroll) 분류
- [ ] AC-6: psy.mov front layer: gold+navy가 index_scroll로 분류, cycles_per_loop ≈ 4 기록
- [ ] AC-7: rotation vs zoom vs spiral 3-way 분류
- [ ] AC-8: layers.json에 motion_type, per_shape_speeds, zoom_summary 추가

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `test_shape_matching_stable` | Unit | 2프레임에서 같은 위치+크기 도형 매칭 | 매칭 성공, score < 0.1 |
| 2 | `test_rotation_measurement_known` | Unit | 5° 회전된 rect 쌍 → delta 측정 | 5.0 ± 0.5 |
| 3 | `test_90deg_ambiguity_resolved` | Unit | 89° → 91° 변화 (실제 2° 회전) → 연속성 보정 | delta = 2.0 (180° 점프 아님) |
| 4 | `test_variable_speed_linear_fit` | Unit | speeds [1,2,3,4,5] → curve_fit | formula: linear, R² > 0.99 |
| 5 | `test_variable_speed_geometric_fit` | Unit | speeds [1,2,4,8,16] → curve_fit | formula: geometric, R² > 0.99 |
| 6 | `test_uniform_speed_detection` | Unit | speeds [5,5,5,5] → 균일 | formula: uniform |
| 7 | `test_zoom_detection_shrinking_shapes` | Unit | 프레임 간 도형이 중심으로 이동+축소 | motion_type: zoom_inward |
| 8 | `test_rotation_not_zoom` | Unit | 프레임 간 도형 각도만 변화 (크기/위치 불변) | motion_type: per_instance_rotation |
| 9 | `test_psy_back_layer_speeds` | Integration | psy.mov burgundy layer | 가변속도 감지, 10개 도형 |
| 10 | `test_psy_front_layer_zoom` | Integration | psy.mov gold+navy layer | zoom_inward, cycles ≈ 4 |
| 11 | `test_spiral_classification` | Unit | rotation + zoom 동시 발생 시 | motion_type: spiral |
| 12 | `test_frame_shape_count_mismatch` | Unit | 프레임 간 도형 수 불일치 시 unmatched 도형 처리 | unmatched 허용, 매칭된 도형만 분석 |

### 3.2 Test File Location
- `.claude/skills/video-blueprint/scripts/tests/test_motion.py`

### 3.3 Mock/Setup Required
- scipy.optimize.curve_fit
- hi-res pair 프레임 (T2 산출물) 또는 PIL 생성 테스트 이미지
- psy.mov 프레임

> **Note**: psy.mov 의존 테스트는 `@pytest.mark.integration` 데코레이터 + conftest.py에서 프레임 파일 존재 확인 후 skip 처리
> **Note**: T5 modifies only motion.py, no conflict with T6

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `.claude/skills/video-blueprint/scripts/analyze_layers/motion.py` | Create | motion tracking + zoom detection 모듈 |

### 4.2 Implementation Steps (Green Phase)
1. match_shapes(): centroid proximity + area similarity로 프레임 간 도형 매칭
2. compute_shape_motion(): angle diff + 90° 모호성 보정 (연속 프레임 angle 연속성)
3. classify_speed_pattern(): scipy.curve_fit으로 linear/geometric/exponential 피팅, R² 비교
4. detect_zoom(): radial_change < -threshold AND scale_change < 1.0 → zoom_inward
5. classify_motion_type(): rotation-only vs zoom-only vs spiral vs static
6. layers.json 업데이트

### 4.3 Refactor Phase
- angle 연속성 보정을 Kalman filter로 대체 검토

## 5. Edge Cases
- EC-1: (E3) 120fps에서 각도 변화 극소 → hi-res pair 간격 자동 조정
- EC-2: (E6) spiral → zoom + rotation 파라미터 동시 기록
- EC-3: 도형 수가 프레임마다 다름 (zoom spawn/disappear) → unmatched 도형 허용

## 6. Review Checklist
- [ ] Red → Green → Refactor 완료
- [ ] psy.mov back: 가변 회전속도 감지 확인
- [ ] psy.mov front: index-scroll zoom 감지 확인
- [ ] 90° 모호성 보정 동작 확인
