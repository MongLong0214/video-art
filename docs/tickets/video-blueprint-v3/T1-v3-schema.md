# T1: v3 스키마 확정 (output-schema.md)

**PRD Ref**: PRD-video-blueprint-v3 > US-1, US-2, US-3, US-4, US-5
**Priority**: P0 (Blocker)
**Size**: L (4-8h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective

blueprint.json v3 스키마를 output-schema.md에 완전 확정한다. PR2/PR3은 이 스키마를 읽기 전용으로 소비하므로, 코드 생성과 검증이 요구하는 모든 필드가 여기서 정의되어야 한다.

## 2. Acceptance Criteria

### 스키마 필드 정의 (기존)
- [ ] AC-1: `blend_mode: "additive" | "alpha" | "multiply"` 필드 추가
- [ ] AC-2: `depth_attenuation: { near, far, curve }` 필드 추가
- [ ] AC-3: `rendering_method: "sdf_stroke" | "sdf_fill" | "sdf_stroke_fill"` 필드 추가 (default: sdf_stroke)
- [ ] AC-4: `per_instance_animation` 스키마 (motion_type, speed_formula enum, 3가지 수식 파라미터)
- [ ] AC-5: `paired_shapes[]` 스키마 (color_id, height_factor, aspect_ratio, corner_radius_ratio)
- [ ] AC-6: `stroke_depth: { near_width_ratio, far_width_ratio }` 필드 추가
- [ ] AC-7: `color_gradient: { near, far }` 필드 추가
- [ ] AC-8: `glow` per-layer 스키마 (amplitude, decay_range, depth_scaling)
- [ ] AC-9: `depth_fade` 확장 (fade_in_instances, fade_out_scale)
- [ ] AC-10: `effects` 섹션 (glow, breathing, CA, grain, vignette) 스키마
- [ ] AC-11: `zoom_inward` 모션 (method: index_scroll | scale_animate, cycles_per_loop, base_exponent)
- [ ] AC-12: `unknown_effects[]` 배열 필드 추가
- [ ] AC-13: v2 필드 전체 하위 호환 (기존 blueprint.json이 v3 validator 통과)
- [ ] AC-14: 모든 v3 필드는 optional (v2 blueprint도 validate 통과)

### v3 필드 검증 (T7에서 병합)
- [ ] AC-15: blend_mode enum 검증 ("additive", "alpha", "multiply")
- [ ] AC-16: speed_formula enum 검증 ("linear", "geometric", "exponential") + 해당 파라미터 존재 확인
- [ ] AC-17: rendering_method enum + default(sdf_stroke) 검증
- [ ] AC-18: zoom_inward method enum ("index_scroll", "scale_animate") 검증
- [ ] AC-19: effects 섹션 필드 타입 검증
- [ ] AC-20: depth_attenuation.near >= depth_attenuation.far 검증 (near이 더 밝아야)
- [ ] AC-21: v2 기존 blueprint가 v3 validator 통과 (AC-13 재확인)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `test_v2_blueprint_passes_v3_validation` | Unit | 기존 v2 blueprint.json을 v3 validator에 통과 | PASS |
| 2 | `test_v3_full_blueprint_passes_validation` | Unit | PRD §4.2 예시의 full v3 blueprint | PASS |
| 3 | `test_blend_mode_additive_accepted` | Unit | blend_mode: "additive" | PASS |
| 4 | `test_per_instance_animation_linear` | Unit | speed_formula: "linear" + step | PASS |
| 5 | `test_per_instance_animation_geometric` | Unit | speed_formula: "geometric" + ratio | PASS |
| 6 | `test_zoom_inward_index_scroll` | Unit | method: "index_scroll" + base_exponent | PASS |
| 7 | `test_invalid_speed_formula_rejected` | Unit | speed_formula: "unknown" | FAIL validation |
| 8 | `test_effects_section_optional` | Unit | effects 섹션 없는 blueprint | PASS |
| 9 | `test_depth_attenuation_valid` | Unit | near >= far인 depth_attenuation | PASS |
| 10 | `test_depth_attenuation_near_less_than_far_rejected` | Unit | near < far인 depth_attenuation | FAIL validation |
| 11 | `test_paired_shapes_schema` | Unit | paired_shapes[] 필수 키 존재 | PASS |
| 12 | `test_stroke_depth_schema` | Unit | stroke_depth near/far 비율 검증 | PASS |
| 13 | `test_color_gradient_schema` | Unit | color_gradient near/far 색상 검증 | PASS |
| 14 | `test_depth_fade_schema` | Unit | depth_fade 확장 필드 검증 | PASS |
| 15 | `test_unknown_effects_array` | Unit | unknown_effects[] 배열 형식 검증 | PASS |

### 3.2 Test File Location
- Python: `.claude/skills/video-blueprint/scripts/tests/test_validate_blueprint.py` (pytest)

### 3.3 Mock/Setup Required
- 테스트용 fixture JSON 파일들 (v2 기존, v3 full, v3 minimal)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `.claude/skills/video-blueprint/references/output-schema.md` | Modify | v3 필드 전체 추가 |
| `.claude/skills/video-blueprint/scripts/validate-blueprint.py` | Modify | v3 필드 검증 로직 추가 |
| `.claude/skills/video-blueprint/scripts/tests/test_validate_blueprint.py` | Create | pytest 테스트 |

### 4.2 Implementation Steps (Green Phase)
1. output-schema.md에 PRD §4.2의 모든 신규 필드 문서화
2. validate-blueprint.py에 v3 필드 검증 추가 (모두 optional — 존재 시만 검증)
3. speed_formula enum 검증, blend_mode enum 검증, rendering_method enum + default
4. v2 기존 blueprint.json으로 하위 호환 테스트
5. validate_per_instance_animation(): speed_formula enum + 파라미터 매칭 (T7 병합)
6. validate_effects(): 각 이펙트 필드 타입 + 범위 (T7 병합)
7. validate_depth_attenuation(): near >= far (T7 병합)
8. validate_rendering_method(): enum + default (T7 병합)
9. zoom_inward method enum ("index_scroll", "scale_animate") 검증 (T7 병합)

### 4.3 Refactor Phase
- validate-blueprint.py의 VALID_* 상수를 스키마에서 자동 추출하는 구조 검토

## 5. Edge Cases
- EC-1: v2 blueprint에 v3 전용 필드가 있으면 → 무시 (forward compatible)
- EC-2: speed_formula: "linear"인데 speed_ratio_per_instance가 non-null → 경고

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] 기존 v2 blueprint.json PASS 확인
