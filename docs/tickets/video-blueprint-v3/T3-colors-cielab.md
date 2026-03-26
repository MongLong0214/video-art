# T3: analyze-colors.py CIELAB 업그레이드

**PRD Ref**: PRD-video-blueprint-v3 > US-1 (AC-1.3: ΔE2000 ≤ 15 병합 기준)
**Priority**: P1 (High)
**Size**: M (2-4h)
**Status**: Done
**Depends On**: None

---

## 1. Objective

analyze-colors.py의 색상 클러스터링과 거리 계산을 RGB 유클리드에서 CIELAB ΔE2000으로 업그레이드한다. 지각적으로 균일한 색공간에서 클러스터링하여 "비슷해 보이는" 색상을 정확히 병합한다.

## 2. Acceptance Criteria
- [ ] AC-1: k-means 클러스터링을 CIELAB 공간에서 수행
- [ ] AC-2: 색상 병합 기준을 RGB distance에서 ΔE2000 ≤ 15로 변경
- [ ] AC-3: colors.json 출력에 `lab` 값과 `delta_e2000` 거리 포함
- [ ] AC-4: canonical_palette의 hex 정확도가 원본 대비 ΔE2000 < 8
- [ ] AC-5: 기존 colors.json 출력 구조(hex, rgb, percentage 등) 하위 호환

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `test_lab_conversion_accuracy` | Unit | 알려진 RGB→LAB 변환 (#FF0000 → L53 a80 b67) | ±2 이내 |
| 2 | `test_delta_e2000_known_pair` | Unit | 알려진 색상 쌍의 ΔE2000 | 공식 값 ±0.5 |
| 3 | `test_merge_similar_colors_lab` | Unit | ΔE2000 < 15인 두 색상 → 병합 | 1개 canonical color |
| 4 | `test_keep_distinct_colors_lab` | Unit | ΔE2000 > 15인 두 색상 → 비병합 | 2개 canonical colors |
| 5 | `test_output_contains_lab_values` | Unit | colors.json에 lab 필드 존재 | [L, a, b] 배열 |
| 6 | `test_backward_compatible_output` | Unit | hex, rgb, percentage 필드 유지 | 기존 키 전부 존재 |

### 3.2 Test File Location
- `.claude/skills/video-blueprint/scripts/tests/test_analyze_colors.py`

### 3.3 Mock/Setup Required
- colorspacious 또는 scikit-image.color 의존
- 테스트용 단색/다색 이미지 (PIL로 생성)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `.claude/skills/video-blueprint/scripts/analyze-colors.py` | Modify | CIELAB 변환 + ΔE2000 거리 + 병합 로직 |

### 4.2 Implementation Steps (Green Phase)
1. `colorspacious`로 RGB→CIELAB 변환 함수 추가
2. `colorspacious.deltaE` 로 ΔE2000 계산 함수 추가
3. k-means 입력을 RGB→LAB 변환 후 수행
4. merge_palettes의 tolerance를 ΔE2000 기반으로 변경
5. colors.json 출력에 `lab` 필드 추가

## 5. Edge Cases
- EC-1: 매우 어두운 색상 (L < 5)에서 LAB 변환 정밀도 저하 → tolerance 완화
- EC-2: colorspacious 미설치 시 scikit-image.color.rgb2lab 폴백

## 6. Review Checklist
- [ ] Red → Green → Refactor 완료
- [ ] AC 전부 충족
- [ ] 기존 colors.json 출력 구조 하위 호환
