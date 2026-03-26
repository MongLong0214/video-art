# T4: analyze-layers.py core (색상-마스크 분리 + 도형 감지)

**PRD Ref**: PRD-video-blueprint-v3 > US-1
**Priority**: P0 (Blocker)
**Size**: L (4-8h)
**Status**: Done
**Depends On**: T1, T3

---

## 1. Objective

색상-마스크 기반으로 프레임의 시각적 요소를 독립 레이어로 분리하고, 각 레이어 내 도형을 감지/측정하는 analyze-layers.py의 핵심 기능을 구현한다.

## 2. Acceptance Criteria
- [ ] AC-1: colors.json의 canonical_palette를 읽어 각 색상별 binary mask 생성
- [ ] AC-2: morphological erosion으로 anti-aliased 경계 제거 후 컨투어 추출
- [ ] AC-3: psy.mov에서 최소 2개 색상 그룹(burgundy / gold+navy) 분리
- [ ] AC-4: CIELAB ΔE2000 ≤ 15 기준으로 색상 계열 자동 병합 (gold/gold2 → gold family)
- [ ] AC-5: 각 색상 그룹 내 도형 측정 (centroid, width, height, angle, area, stroke_width)
- [ ] AC-6: 도형 간 scale_ratio, rotation_step 계산
- [ ] AC-7: layers.json 출력 (color_hex, shape_count, shapes_in_first_frame, scale_ratios, rotation_steps)
- [ ] AC-8: glow border zone 픽셀은 이펙트 영역으로 분류 (도형에 포함하지 않음)
- [ ] AC-9: analyze-layers.py는 `analyze_layers/` 패키지로 구조화. `__init__.py` (CLI + orchestration), `color_mask.py` (T4), `motion.py` (T5), `effects.py` (T6)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `test_color_mask_single_color` | Unit | 단색 이미지에서 마스크 생성 | 전체 픽셀 마스크됨 |
| 2 | `test_color_mask_two_colors` | Unit | 2색 이미지에서 각 색상 마스크 분리 | 2개 독립 마스크 |
| 3 | `test_morphological_erosion_removes_aa` | Unit | AA 경계 있는 이미지에서 erosion 후 깨끗한 컨투어 | 컨투어 수 안정적 |
| 4 | `test_shape_measurement_known_rect` | Unit | 알려진 크기/각도의 rect → 측정 | width/height/angle ±2% |
| 5 | `test_concentric_scale_ratio` | Unit | 3개 동심 rect (scale 0.8) → ratio 측정 | 0.78~0.82 |
| 6 | `test_color_family_merge` | Unit | ΔE2000 < 15인 2색 → 1개 family | 병합됨 |
| 7 | `test_layers_json_output_structure` | Unit | 출력 JSON에 필수 키 존재 | layer_analyses, color_families 등 |
| 8 | `test_psy_mov_two_layers` | Integration | psy.mov 프레임에서 burgundy + gold 분리 | 2+ 레이어 |
| 9 | `test_glow_border_excluded_from_shapes` | Unit | glow border zone 픽셀이 도형에 포함되지 않음 | border 영역 제외 |

### 3.2 Test File Location
- `.claude/skills/video-blueprint/scripts/tests/test_color_mask.py`

### 3.3 Mock/Setup Required
- PIL로 생성한 테스트 이미지 (단색, 2색, 동심 rect)
- psy.mov 프레임 (video-blueprint-frames/frame_000.png)

> **Note**: psy.mov 의존 테스트는 `@pytest.mark.integration` 데코레이터 + conftest.py에서 프레임 파일 존재 확인 후 skip 처리

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `.claude/skills/video-blueprint/scripts/analyze_layers/__init__.py` | Create | CLI + orchestration |
| `.claude/skills/video-blueprint/scripts/analyze_layers/color_mask.py` | Create | 색상-마스크 분리 + 도형 감지 핵심 모듈 |

### 4.2 Implementation Steps (Green Phase)
1. colors.json 로드 → canonical_palette에서 non-bg 색상 추출
2. CIELAB ΔE2000로 색상 계열 그룹핑
3. 각 색상 계열별: create_color_mask → morphological erosion → findContours
4. 각 컨투어: minAreaRect → centroid, width, height, angle 측정
5. 동심 패턴 감지: 같은 center 근처의 도형들 → scale_ratio, rotation_step 계산
6. layers.json 출력

### 4.3 Refactor Phase
- 대형 이미지에서 mask 생성 성능 최적화 (다운스케일 후 업스케일)

## 5. Edge Cases
- EC-1: (E1) 어두운 영상 → color tolerance 40→60 자동 조정
- EC-2: (E2) 도형 겹침 → erosion 후에도 병합 시 면적 기반 추정
- EC-3: (E5) 2색 이하 → 단일 레이어 처리

## 6. Review Checklist
- [ ] Red → Green → Refactor 완료
- [ ] psy.mov에서 2+ 레이어 분리 확인
- [ ] morphological erosion이 AA 경계를 제거하는지 확인
